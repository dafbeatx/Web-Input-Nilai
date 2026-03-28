import { supabase } from '@/lib/supabase/client';
import { assessClientRisk, assessServerRisk, mergeRiskAssessments } from './risk-engine.service';
import { calculateEssayScore } from '../scoring';
import { generateAttemptToken, verifyAttemptToken } from '../token';

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

  if (fetchErr || !student) throw new Error('Siswa tidak ditemukan');

  const { data: session, error: sessErr } = await supabase
    .from('gm_sessions')
    .select('id, scoring_config, kkm, remedial_timer')
    .eq('id', sessionId)
    .single();

  if (sessErr || !session) throw new Error('Sesi tidak ditemukan');

  // ── INITIATED: Create new attempt ──
  if (status === 'INITIATED') {
    if (student.remedial_attempts >= 1) {
      throw new Error('Maksimal kesempatan remedial hanya 1 kali.');
    }

    if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(student.remedial_status)) {
      throw new Error('Remedial sudah pernah dilakukan atau dikunci.');
    }

    const attemptToken = generateAttemptToken(sessionId, studentId);

    // Create isolated attempt row
    const { data: attempt, error: attemptErr } = await supabase
      .from('gm_remedial_attempts')
      .insert({
        session_id: sessionId,
        student_id: studentId,
        attempt_number: (student.remedial_attempts || 0) + 1,
        attempt_token: attemptToken,
        status: 'INITIATED',
        location,
        photo,
      })
      .select('id, attempt_token')
      .single();

    if (attemptErr) throw new Error(`Gagal membuat attempt: ${attemptErr.message}`);

    // Update student cache
    const updateData: Record<string, unknown> = {
      remedial_status: 'INITIATED',
      remedial_attempts: (student.remedial_attempts || 0) + 1,
      remedial_location: location,
      remedial_photo: photo,
    };

    if (student.original_score === 0 || student.original_score == null) {
      updateData.original_score = student.final_score;
    }

    await supabase.from('gm_students').update(updateData).eq('id', studentId);

    return {
      ...student,
      ...updateData,
      attempt_id: attempt.id,
      attempt_token: attempt.attempt_token,
    };
  }

  // ── COMPLETED / CHEATED / TIMEOUT: Finalize attempt ──

  // Find active attempt
  const { data: attempt } = await supabase
    .from('gm_remedial_attempts')
    .select('id, attempt_token, risk_score')
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!attempt) {
    throw new Error('Tidak ditemukan sesi remedial aktif.');
  }

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
        studentUpdate.remedial_status = 'COMPLETED';
        studentUpdate.teacher_reviewed = true;
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

  // Persist attempt
  await supabase
    .from('gm_remedial_attempts')
    .update(attemptUpdate)
    .eq('id', attempt.id);

  // Persist student cache
  const { error: updateErr, data } = await supabase
    .from('gm_students')
    .update(studentUpdate)
    .eq('id', studentId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  return data;
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

  if (fetchErr || !student) throw new Error('Siswa tidak ditemukan');

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

  if (fetchErr || !student) throw new Error('Siswa tidak ditemukan');
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

  if (fetchErr || !student) throw new Error('Siswa tidak ditemukan');

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

  if (fetchErr || !attempt) throw new Error('Attempt tidak ditemukan');
  
  if (attempt.status === 'ACTIVE') return true; // Already activated
  // Only allow activating an INITIATED attempt
  if (attempt.status !== 'INITIATED') throw new Error(`Attempt sudah dalam status ${attempt.status}`);

  // Validate token
  const { valid } = verifyAttemptToken(token, attempt.session_id, studentId);
  if (!valid) throw new Error('Token tidak valid atau kadaluarsa');

  const { error } = await supabase
    .from('gm_remedial_attempts')
    .update({ 
      status: 'ACTIVE',
      started_at: new Date().toISOString()
    })
    .eq('id', attemptId);

  if (error) throw error;

  await supabase
    .from('gm_students')
    .update({ remedial_status: 'ACTIVE' })
    .eq('id', studentId);

  return true;
}

export async function markRemedialFailed(attemptId: string, studentId: string) {
  const { data: attempt, error: fetchErr } = await supabase
    .from('gm_remedial_attempts')
    .select('id, status')
    .eq('id', attemptId)
    .eq('student_id', studentId)
    .single();

  if (fetchErr || !attempt) throw new Error('Attempt tidak ditemukan');
  
  // Can only fail if INITIATED
  if (attempt.status !== 'INITIATED') {
    throw new Error(`Tidak bisa mengubah status ${attempt.status} menjadi FAILED`);
  }

  const { error } = await supabase
    .from('gm_remedial_attempts')
    .update({ 
      status: 'FAILED',
      completed_at: new Date().toISOString()
    })
    .eq('id', attemptId);

  if (error) throw error;

  // Restore student attempts count to allow retry
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

  return true;
}
