import { supabase } from '@/lib/supabase/client';
import { detectCheating } from '../security';

export async function submitRemedial(
  sessionId: string,
  studentId: string,
  studentName: string,
  status: string,
  answers: string[],
  note: string,
  location: string,
  elapsedTimeMs: number,
  clientCheatingFlags: string[] = []
) {
  // 1. Fetch Student & Session
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

  // Verify attempts and status
  if (student.remedial_attempts >= 1 && status === 'STARTED') {
    throw new Error('Maksimal kesempatan remedial hanya 1 kali.');
  }
  
  if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(student.remedial_status)) {
    throw new Error('Remedial sudah pernah disubmit atau dikunci.');
  }

  let updateData: any = {
    remedial_status: status,
    remedial_location: location
  };

  if (status === 'IN_PROGRESS') {
    updateData.remedial_attempts = student.remedial_attempts + 1;
    // Set original_score to current final_score when starting
    if (student.original_score === 0 || student.original_score == null) {
       updateData.original_score = student.final_score;
    }
  } else if (status === 'COMPLETED' || status === 'CHEATED') {
    // Determine cheating from server
    const { data: allStudents } = await supabase.from('gm_students').select('*').eq('session_id', sessionId);
    
    // Build object format expected by detectCheating
    const currentStudentPayload = {
      id: student.id,
      name: student.name,
      mcqAnswers: student.mcq_answers,
      remedialAnswers: answers
    };
    
    // Server-side check
    const serverCheatingResult = detectCheating(currentStudentPayload, allStudents || [], session, elapsedTimeMs);
    
    // Combine server flags with client flags (from ProctoringCamera, etc)
    const combinedFlags = [...serverCheatingResult.flags, ...clientCheatingFlags];
    const isCheated = serverCheatingResult.isCheated || clientCheatingFlags.length > 0 || status === 'CHEATED';
    
    updateData.remedial_answers = answers;
    updateData.remedial_note = note;
    updateData.is_cheated = isCheated;
    updateData.cheating_flags = combinedFlags;
    updateData.teacher_reviewed = false;
    
    if (isCheated) {
      updateData.remedial_score = 0;
      updateData.final_score = 0;
      updateData.final_score_locked = 0;
      updateData.remedial_status = 'CHEATED';
    } else {
      // Pending teacher review, just set the answers.
      updateData.remedial_status = 'REMEDIAL'; // Belum dikoreksi
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
  newRemedialScore: number,
  sessionKkm: number
) {
  const { data: student, error: fetchErr } = await supabase
    .from('gm_students')
    .select('is_cheated')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) throw new Error('Siswa tidak ditemukan');

  if (student.is_cheated) {
    throw new Error('Tidak bisa mengoreksi nilai siswa yang terdeteksi curang');
  }

  // Teacher reviewed
  const { error } = await supabase
    .from('gm_students')
    .update({
      remedial_score: newRemedialScore,
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
    .select('remedial_score, is_cheated, teacher_reviewed')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) throw new Error('Siswa tidak ditemukan');

  if (student.is_cheated) {
    throw new Error('Siswa curang, nilai sudah di 0');
  }

  if (!student.teacher_reviewed) {
    throw new Error('Guru belum mengoreksi nilai remedial');
  }

  // Final score logic
  const finalScore = Math.min(student.remedial_score || 0, sessionKkm);

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
