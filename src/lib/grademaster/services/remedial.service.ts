import { supabase } from '@/lib/supabase/client';
import { assessClientRisk, assessServerRisk, mergeRiskAssessments } from './risk-engine.service';
import { calculateEssayScore } from '../scoring';
import { generateAttemptToken, verifyAttemptToken } from '../token';

const VALID_TRANSITIONS: Record<string, string[]> = {
  NONE: ['INITIATED'],
  INITIATED: ['ACTIVE', 'FAILED'],
  ACTIVE: ['COMPLETED', 'CHEATED', 'TIMEOUT'],
  FAILED: ['INITIATED'],
};

function validateStateTransition(current: string | null, target: string): void {
  const normalizedCurrent = current || 'NONE';
  const allowed = VALID_TRANSITIONS[normalizedCurrent];
  if (!allowed || !allowed.includes(target)) {
    throw new Error(
      `Transisi status tidak valid: ${normalizedCurrent} → ${target}. ` +
      `Status yang diizinkan dari ${normalizedCurrent}: ${allowed?.join(', ') || 'tidak ada'}`
    );
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries = 3
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const errorMessage = err instanceof Error 
        ? err.message 
        : (typeof err === 'object' && err !== null) 
          ? JSON.stringify(err) 
          : String(err);
      
      console.error(`[Retry ${attempt}/${maxRetries}] ${context}: ${errorMessage}`);

      if (attempt < maxRetries) {
        const delay = 200 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const finalMessage = lastError instanceof Error 
    ? lastError.message 
    : (typeof lastError === 'object' && lastError !== null)
      ? JSON.stringify(lastError)
      : String(lastError);

  throw new Error(`${context} gagal setelah ${maxRetries} percobaan: ${finalMessage}`);
}

export async function submitRemedial(
  sessionId: string,
  studentId: string,
  studentName: string,
  status: string,
  answers: string[],
  note: string,
  location: string,
  elapsedTimeMs: number,
  clientCheatingFlags: string[] = [],
  photo?: string,
  examMode?: string,
  cameraStatus?: string,
  riskLevel?: string
) {
  const { data: student, error: fetchErr } = await supabase
    .from('gm_students')
    .select('id, name, final_score, original_score, remedial_status, remedial_attempts, mcq_answers, mcq_score, essay_score')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) {
    throw new Error(`Siswa tidak ditemukan (id: ${studentId}, session: ${sessionId})`);
  }

  const { data: session, error: sessErr } = await supabase
    .from('gm_sessions')
    .select('id, scoring_config, kkm, remedial_timer')
    .eq('id', sessionId)
    .single();

  if (sessErr || !session) {
    throw new Error(`Sesi tidak ditemukan (id: ${sessionId})`);
  }

  // ── INITIATED: Create new attempt (transactional) ──
  if (status === 'INITIATED') {
    if (student.remedial_attempts >= 1) {
      throw new Error('Maksimal kesempatan remedial hanya 1 kali. Status ini bersifat permanen.');
    }

    if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(student.remedial_status)) {
      throw new Error(`Remedial sudah pernah dilakukan atau dikunci (status: ${student.remedial_status}). Status ini bersifat permanen.`);
    }

    // Validate state transition (allow NONE, FAILED → INITIATED)
    if (student.remedial_status && !['NONE', 'FAILED'].includes(student.remedial_status)) {
      validateStateTransition(student.remedial_status, 'INITIATED');
    }

    const attemptToken = generateAttemptToken(sessionId, studentId);
    const attemptNumber = (student.remedial_attempts || 0) + 1;
    const originalScore = (student.original_score === 0 || student.original_score == null)
      ? student.final_score
      : null;

    // Use RPC for atomic insert + update
    const attemptId = await withRetry(async () => {
      const { data, error } = await supabase.rpc('start_remedial_attempt', {
        p_session_id: sessionId,
        p_student_id: studentId,
        p_attempt_number: attemptNumber,
        p_attempt_token: attemptToken,
        p_location: location,
        p_photo: photo || null,
        p_original_score: originalScore,
      });

      if (error) throw new Error(`RPC start_remedial_attempt: ${error.message}`);
      if (!data) throw new Error('RPC returned null attempt ID');
      return data as string;
    }, `Membuat attempt remedial untuk ${studentName} (session: ${sessionId})`);

    console.log(`[Remedial] INITIATED: student=${studentName}, attemptId=${attemptId}, session=${sessionId}`);

    return {
      ...student,
      remedial_status: 'INITIATED',
      remedial_attempts: attemptNumber,
      remedial_location: location,
      remedial_photo: photo,
      original_score: originalScore ?? student.original_score,
      attempt_id: attemptId,
      attempt_token: attemptToken,
    };
  }

  // ── COMPLETED / CHEATED / TIMEOUT: Finalize attempt ──

  // Find active attempt with auto-recovery
  let attempt = await findActiveAttempt(sessionId, studentId, studentName);

  const attemptUpdate: Record<string, unknown> = {
    status,
    completed_at: new Date().toISOString(),
  };

  const studentUpdate: Record<string, unknown> = {
    remedial_status: status,
    exam_mode: examMode || 'STRICT',
    camera_status: cameraStatus || 'ACTIVE',
    risk_level: riskLevel || 'LOW',
  };

  if (status === 'COMPLETED' || status === 'CHEATED') {
    // Risk assessment
    const clientRisk = assessClientRisk(clientCheatingFlags);

    const { data: allStudents } = await supabase
      .from('gm_students')
      .select('id, name, remedial_answers')
      .eq('session_id', sessionId);

    const serverRisk = assessServerRisk(
      answers,
      (allStudents || []).map(s => ({
        id: s.id,
        name: s.name,
        remedialAnswers: s.remedial_answers || [],
      })),
      studentId,
      elapsedTimeMs,
      session.remedial_timer || 15
    );

    const combinedRisk = mergeRiskAssessments(clientRisk, serverRisk);
    const isFlagged = combinedRisk.shouldAutoFlag || status === 'CHEATED';

    // Essay scoring (server-side only)
    const answerKeys: string[] = session.scoring_config?.remedialAnswerKeys || [];
    const essayResult = calculateEssayScore(answers, answerKeys);

    // Update attempt
    attemptUpdate.answers = answers;
    attemptUpdate.note = note;
    attemptUpdate.risk_score = (attempt.risk_score || 0) + combinedRisk.totalScore;
    attemptUpdate.risk_level = combinedRisk.level;
    attemptUpdate.risk_flags = combinedRisk.flags;
    attemptUpdate.essay_score_auto = essayResult.score;
    attemptUpdate.essay_auto_details = essayResult.details;
    attemptUpdate.essay_score_final = essayResult.score;

    // Update student cache
    studentUpdate.remedial_answers = answers;
    studentUpdate.remedial_note = note;
    studentUpdate.is_cheated = isFlagged;
    studentUpdate.cheating_flags = combinedRisk.flags.map(f => f.event);
    studentUpdate.essay_score_auto = essayResult.score;
    studentUpdate.essay_score_final = essayResult.score;
    studentUpdate.essay_auto_details = essayResult.details;

    if (isFlagged) {
      attemptUpdate.status = 'CHEATED';
      studentUpdate.remedial_status = 'CHEATED';
      studentUpdate.remedial_score = 0;
      studentUpdate.final_score = 0;
      studentUpdate.final_score_locked = 0;
      studentUpdate.essay_score_final = 0;
      studentUpdate.teacher_reviewed = false;
    } else {
      studentUpdate.remedial_score = essayResult.score;

      if (answerKeys.length > 0) {
        const sessionKkm = session.kkm || 70;
        const remedialResult = Math.min(essayResult.score, sessionKkm);
        const finalScore = Math.max(student.original_score || student.final_score || 0, remedialResult);

        studentUpdate.final_score = finalScore;
        studentUpdate.final_score_locked = finalScore;
        
        // Conditional Retry: If still below KKM, allow another attempt by NOT setting to COMPLETED
        if (remedialResult < sessionKkm) {
          studentUpdate.remedial_status = 'REMEDIAL';
          studentUpdate.teacher_reviewed = false;
        } else {
          studentUpdate.remedial_status = 'COMPLETED';
          studentUpdate.teacher_reviewed = true;
        }
        
        attemptUpdate.status = 'COMPLETED';
      } else {
        studentUpdate.remedial_status = 'REMEDIAL';
        studentUpdate.teacher_reviewed = false;
      }
    }
  } else if (status === 'TIMEOUT') {
    attemptUpdate.answers = answers;
    attemptUpdate.status = 'TIMEOUT';
    studentUpdate.remedial_answers = answers;
    studentUpdate.remedial_status = 'TIMEOUT';
  }

  // ── FINALIZATION: Transactional Update (Attempt + Student) ──
  
  const result = await withRetry(async () => {
    try {
      const { data, error } = await supabase.rpc('finalize_remedial_attempt', {
        p_attempt_id: attempt.id,
        p_student_id: studentId,
        p_attempt_data: attemptUpdate,
        p_student_data: studentUpdate
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      if (err.message && err.message.includes('column') && err.message.includes('does not exist')) {
        console.warn(`[Safe Update Fallback] Menghapus kolom opsional yang belum dimigrasi di tabel gm_students.`);
        
        // Remove columns that might not exist in an older schema
        const safeStudentUpdate = { ...studentUpdate };
        delete safeStudentUpdate.exam_mode;
        delete safeStudentUpdate.camera_status;
        delete safeStudentUpdate.risk_level;

        const { data, error } = await supabase.rpc('finalize_remedial_attempt', {
          p_attempt_id: attempt.id,
          p_student_id: studentId,
          p_attempt_data: attemptUpdate,
          p_student_data: safeStudentUpdate
        });

        if (error) throw error;
        return data;
      } else {
        throw err;
      }
    }
  }, `Finalisasi remedial (id: ${studentId}, student: ${studentName})`);

  console.log(`[Remedial] FINALIZED: student=${studentName}, status=${status}, result=SUCCESS`);

  return { 
    ...student, 
    ...studentUpdate,
    newFinalScore: studentUpdate.final_score,
    attempt_id: attempt.id,
    attempt_token: (attempt as any).attempt_token || null
  };
}

async function findActiveAttempt(
  sessionId: string,
  studentId: string,
  studentName: string
): Promise<{ id: string; attempt_token: string; risk_score: number }> {
  // 0. Check student status first - if null/NONE, we should NOT try to recover an old attempt
  const { data: student } = await supabase
    .from('gm_students')
    .select('remedial_status')
    .eq('id', studentId)
    .single();

  if (!student || !student.remedial_status || student.remedial_status === 'NONE') {
    throw new Error('RESET_REQUIRED');
  }

  // 1. Try finding ACTIVE attempt
  const { data: activeAttempt } = await supabase
    .from('gm_remedial_attempts')
    .select('id, attempt_token, risk_score')
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (activeAttempt) return activeAttempt;

  // 2. Auto-recovery: check for INITIATED attempt and auto-activate
  console.warn(`[Remedial Recovery] No ACTIVE attempt found for ${studentName} (session: ${sessionId}). Checking INITIATED...`);

  const { data: initiatedAttempt } = await supabase
    .from('gm_remedial_attempts')
    .select('id, attempt_token, risk_score, session_id')
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .eq('status', 'INITIATED')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (initiatedAttempt) {
    console.warn(`[Remedial Recovery] Found INITIATED attempt ${initiatedAttempt.id}. Auto-activating...`);

    await supabase
      .from('gm_remedial_attempts')
      .update({ status: 'ACTIVE', started_at: new Date().toISOString() })
      .eq('id', initiatedAttempt.id);

    await supabase
      .from('gm_students')
      .update({ remedial_status: 'ACTIVE' })
      .eq('id', studentId);

    return initiatedAttempt;
  }

  // 3. Last resort: create recovery attempt to prevent data loss
  console.error(`[Remedial Recovery] No attempt found at all for ${studentName} (session: ${sessionId}). Creating recovery attempt...`);

  const recoveryToken = generateAttemptToken(sessionId, studentId);

  const { data: recoveryAttempt, error: recoveryErr } = await supabase
    .from('gm_remedial_attempts')
    .insert({
      session_id: sessionId,
      student_id: studentId,
      attempt_number: 1,
      attempt_token: recoveryToken,
      status: 'ACTIVE',
      started_at: new Date().toISOString(),
      location: 'RECOVERY',
    })
    .select('id, attempt_token, risk_score')
    .single();

  if (recoveryErr || !recoveryAttempt) {
    throw new Error(
      `Gagal membuat recovery attempt untuk ${studentName} (session: ${sessionId}): ${recoveryErr?.message || 'unknown'}`
    );
  }

  await supabase
    .from('gm_students')
    .update({ remedial_status: 'ACTIVE' })
    .eq('id', studentId);

  console.warn(`[Remedial Recovery] Recovery attempt created: ${recoveryAttempt.id} for ${studentName}`);

  return recoveryAttempt;
}

export async function reviewRemedial(
  studentId: string,
  essayScoreManual: number,
  sessionKkm: number
) {
  const { data: student, error: fetchErr } = await supabase
    .from('gm_students')
    .select('is_cheated, essay_score_auto')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) throw new Error(`Siswa tidak ditemukan (id: ${studentId})`);

  if (student.is_cheated) {
    throw new Error('Tidak bisa mengoreksi nilai siswa yang terdeteksi curang');
  }

  const { error } = await supabase
    .from('gm_students')
    .update({
      essay_score_manual: essayScoreManual,
      essay_score_final: essayScoreManual,
      remedial_score: essayScoreManual,
      teacher_reviewed: true,
    })
    .eq('id', studentId);

  if (error) throw error;
  return true;
}

export async function finalizeRemedial(
  studentId: string,
  sessionKkm: number
) {
  const { data: student, error: fetchErr } = await supabase
    .from('gm_students')
    .select('essay_score_final, remedial_score, is_cheated, teacher_reviewed, original_score, final_score')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) throw new Error(`Siswa tidak ditemukan (id: ${studentId})`);
  if (student.is_cheated) throw new Error('Siswa curang, nilai sudah di 0');
  if (!student.teacher_reviewed) throw new Error('Guru belum mengoreksi nilai remedial');

  const remedialResult = Math.min(student.essay_score_final || student.remedial_score || 0, sessionKkm);
  const finalScore = Math.max(student.original_score || student.final_score || 0, remedialResult);

  const { error } = await supabase
    .from('gm_students')
    .update({
      final_score: finalScore,
      final_score_locked: finalScore,
      remedial_status: 'COMPLETED',
    })
    .eq('id', studentId);

  if (error) throw error;
  return finalScore;
}

export async function resetRemedial(studentId: string) {
  const { data: student, error: fetchErr } = await supabase
    .from('gm_students')
    .select('original_score, final_score, session_id, mcq_score, essay_score')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) throw new Error(`Siswa tidak ditemukan (id: ${studentId})`);

  const { data: session } = await supabase
    .from('gm_sessions')
    .select('scoring_config')
    .eq('id', student.session_id)
    .single();

  const config = session?.scoring_config || {};
  const pgWeight = (typeof config.pgWeight === 'number') ? config.pgWeight : 0.7;
  const essayWeight = (typeof config.essayWeight === 'number') ? config.essayWeight : 0.3;

  const recoveredUtsScore = Math.round(
    (Number(student.mcq_score || 0) * pgWeight) +
    (Number(student.essay_score || 0) * essayWeight)
  );

  const scoreToRestore = (student.original_score != null && Number(student.original_score) !== 0)
    ? Number(student.original_score)
    : recoveredUtsScore;

  // Clean up attempt data
  await supabase
    .from('gm_remedial_attempts')
    .delete()
    .eq('student_id', studentId);

  const { error } = await supabase
    .from('gm_students')
    .update({
      remedial_status: null,
      remedial_score: null,
      remedial_answers: null,
      remedial_note: null,
      remedial_location: null,
      remedial_photo: null,
      remedial_attempts: 0,
      is_cheated: false,
      cheating_flags: null,
      teacher_reviewed: false,
      essay_score_auto: null,
      essay_score_manual: null,
      essay_score_final: null,
      essay_auto_details: null,
      final_score: scoreToRestore,
      final_score_locked: null,
    })
    .eq('id', studentId);

  if (error) throw error;
  return true;
}

export async function getRemainingStudents(sessionId: string) {
  const { data, error } = await supabase
    .from('gm_students')
    .select('id, name, final_score, remedial_status')
    .eq('session_id', sessionId)
    .is('remedial_status', null)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function activateRemedialAttempt(attemptId: string, studentId: string, token: string) {
  const { data: attempt, error: fetchErr } = await supabase
    .from('gm_remedial_attempts')
    .select('id, status, session_id')
    .eq('id', attemptId)
    .eq('student_id', studentId)
    .single();

  if (fetchErr || !attempt) {
    throw new Error('RESET_REQUIRED');
  }
  
  if (attempt.status === 'ACTIVE') return true;

  if (attempt.status !== 'INITIATED') {
    throw new Error(`Attempt sudah dalam status ${attempt.status}, tidak bisa diaktivasi (attempt: ${attemptId})`);
  }

  // Validate token
  const { valid } = verifyAttemptToken(token, attempt.session_id, studentId);
  if (!valid) {
    throw new Error(`Token tidak valid atau kadaluarsa (attempt: ${attemptId}, student: ${studentId})`);
  }

  await withRetry(async () => {
    const { error } = await supabase
      .from('gm_remedial_attempts')
      .update({ 
        status: 'ACTIVE',
        started_at: new Date().toISOString()
      })
      .eq('id', attemptId);
    if (error) throw error;
  }, `Mengaktivasi attempt (id: ${attemptId})`);

  await withRetry(async () => {
    const { error } = await supabase
      .from('gm_students')
      .update({ remedial_status: 'ACTIVE' })
      .eq('id', studentId);
    if (error) throw error;
  }, `Update status siswa ke ACTIVE (id: ${studentId})`);

  console.log(`[Remedial] ACTIVATED: attempt=${attemptId}, student=${studentId}`);

  return true;
}

export async function markRemedialFailed(attemptId: string, studentId: string) {
  const { data: attempt, error: fetchErr } = await supabase
    .from('gm_remedial_attempts')
    .select('id, status')
    .eq('id', attemptId)
    .eq('student_id', studentId)
    .single();

  if (fetchErr || !attempt) {
    throw new Error('RESET_REQUIRED');
  }
  
  if (attempt.status !== 'INITIATED') {
    throw new Error(`Tidak bisa mengubah status ${attempt.status} menjadi FAILED (attempt: ${attemptId})`);
  }

  const { error } = await supabase
    .from('gm_remedial_attempts')
    .update({ 
      status: 'FAILED',
      completed_at: new Date().toISOString()
    })
    .eq('id', attemptId);

  if (error) throw error;

  const { data: student } = await supabase
    .from('gm_students')
    .select('remedial_attempts')
    .eq('id', studentId)
    .single();

  const currentAttempts = Math.max(0, (student?.remedial_attempts || 1) - 1);

  await supabase
    .from('gm_students')
    .update({ 
      remedial_status: 'FAILED',
      remedial_attempts: currentAttempts 
    })
    .eq('id', studentId);

  console.log(`[Remedial] FAILED: attempt=${attemptId}, student=${studentId}`);

  return true;
}
