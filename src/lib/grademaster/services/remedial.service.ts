import { supabase } from '@/lib/supabase/client';
import { detectCheating } from '../security';
import { calculateEssayScore } from '../scoring';

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
  photo?: string
) {
  const { data: student, error: fetchErr } = await supabase
    .from('gm_students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) throw new Error('Siswa tidak ditemukan');

  const { data: session, error: sessErr } = await supabase
    .from('gm_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessErr || !session) throw new Error('Sesi tidak ditemukan');

  if (student.remedial_attempts >= 1 && status === 'STARTED') {
    throw new Error('Maksimal kesempatan remedial hanya 1 kali.');
  }
  
  if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(student.remedial_status)) {
    throw new Error('Remedial sudah pernah disubmit atau dikunci.');
  }

  const updateData: Record<string, unknown> = {
    remedial_status: status,
    remedial_location: location,
    remedial_photo: photo
  };

  if (status === 'IN_PROGRESS') {
    updateData.remedial_attempts = student.remedial_attempts + 1;
    if (student.original_score === 0 || student.original_score == null) {
       updateData.original_score = student.final_score;
    }
  } else if (status === 'COMPLETED' || status === 'CHEATED') {
    const { data: allStudents } = await supabase.from('gm_students').select('*').eq('session_id', sessionId);
    
    const currentStudentPayload = {
      id: student.id,
      name: student.name,
      mcqAnswers: student.mcq_answers,
      remedialAnswers: answers
    };
    
    const serverCheatingResult = detectCheating(currentStudentPayload, allStudents || [], session, elapsedTimeMs);
    const combinedFlags = [...serverCheatingResult.flags, ...clientCheatingFlags];
    const isCheated = serverCheatingResult.isCheated || clientCheatingFlags.length > 0 || status === 'CHEATED';

    // Auto Essay Scoring
    const answerKeys: string[] = session.scoring_config?.remedialAnswerKeys || [];
    const essayResult = calculateEssayScore(answers, answerKeys);
    
    updateData.remedial_answers = answers;
    updateData.remedial_note = note;
    updateData.is_cheated = isCheated;
    updateData.cheating_flags = combinedFlags;
    updateData.essay_score_auto = essayResult.score;
    updateData.essay_score_final = essayResult.score;
    updateData.essay_auto_details = essayResult.details;
    
    if (isCheated) {
      updateData.remedial_score = 0;
      updateData.final_score = 0;
      updateData.final_score_locked = 0;
      updateData.essay_score_final = 0;
      updateData.remedial_status = 'CHEATED';
      updateData.teacher_reviewed = false;
    } else {
      updateData.remedial_score = essayResult.score;
      
      // If answer keys exist, we can AUTO-FINALIZE immediately
      if (answerKeys.length > 0) {
        const sessionKkm = session.kkm || 70;
        const remedialResult = Math.min(essayResult.score, sessionKkm);
        const finalScore = Math.max(student.original_score || student.final_score || 0, remedialResult);
        
        updateData.final_score = finalScore;
        updateData.final_score_locked = finalScore;
        updateData.remedial_status = 'COMPLETED';
        updateData.teacher_reviewed = true; // Auto-reviewed by system
      } else {
        // No keys, wait for teacher review
        updateData.remedial_status = 'REMEDIAL';
        updateData.teacher_reviewed = false;
      }
    }
  } else if (status === 'TIMEOUT') {
    updateData.remedial_answers = answers;
    updateData.remedial_status = 'TIMEOUT';
  }

  const { error: updateErr, data } = await supabase
    .from('gm_students')
    .update(updateData)
    .eq('id', student.id)
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
      teacher_reviewed: true
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

  if (student.is_cheated) {
    throw new Error('Siswa curang, nilai sudah di 0');
  }

  if (!student.teacher_reviewed) {
    throw new Error('Guru belum mengoreksi nilai remedial');
  }

  // The new remedial score is already calculated (essay_score_final)
  // We cap the remedial improvement at KKM, but ensure we don't LOWER their original score
  const remedialResult = Math.min(student.essay_score_final || student.remedial_score || 0, sessionKkm);
  const finalScore = Math.max(student.original_score || student.final_score || 0, remedialResult);

  const { error } = await supabase
    .from('gm_students')
    .update({
      final_score: finalScore,
      final_score_locked: finalScore,
      remedial_status: 'COMPLETED'
    })
    .eq('id', studentId);

  if (error) throw error;
  
  return finalScore;
}

export async function resetRemedial(studentId: string) {
  const { data: student, error: fetchErr } = await supabase
    .from('gm_students')
    .select('original_score, final_score')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) throw new Error('Siswa tidak ditemukan');

  // Revert to original score if it exists, otherwise use current final_score (which should be the original if remedial never finished)
  const scoreToRestore = student.original_score !== null ? student.original_score : student.final_score;

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
       final_score_locked: null
    })
    .eq('id', studentId);

  if (error) throw error;
  
  return true;
}
