import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';
import { getStudentSession } from '@/lib/grademaster/studentAuth';
import { logActivity } from '@/lib/grademaster/audit';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`student:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang dapat menambahkan/mengubah data siswa' }, { status: 403 });
    }

    const body = await req.json();
    const { sessionId, id, name, mcqAnswers, essayScores, mcqScore, essayScore, finalScore, csi, lps, correct, wrong, answerKey } = body;

    if (!sessionId || !name) {
      return NextResponse.json({ error: 'Session ID dan nama siswa wajib diisi' }, { status: 400 });
    }

    let studentData: { id: string } | null = null;

    // Check if student with same name already exists in this session
    const { data: existingStudent } = await supabase
      .from('gm_students')
      .select('id')
      .eq('session_id', sessionId)
      .eq('name', name.trim())
      .single();

    if (existingStudent) {
      // Update existing student
      const { data, error } = await supabase
        .from('gm_students')
        .update({
          mcq_answers: mcqAnswers || {},
          essay_scores: essayScores || [],
          mcq_score: mcqScore || 0,
          essay_score: essayScore || 0,
          final_score: finalScore || 0,
          csi: csi || 0,
          lps: lps || 0,
          correct: correct || 0,
          wrong: wrong || 0,
        })
        .eq('id', existingStudent.id)
        .select('id')
        .single();

      if (error) throw error;
      studentData = data;

      // Delete old answers to avoid duplicates
      if (studentData) {
        await supabase.from('gm_answers').delete().eq('student_id', studentData.id);
      }
    } else {
      // Insert new student
      const { data, error } = await supabase
        .from('gm_students')
        .insert({
          session_id: sessionId,
          name: name.trim(),
          mcq_answers: mcqAnswers || {},
          essay_scores: essayScores || [],
          mcq_score: mcqScore || 0,
          essay_score: essayScore || 0,
          final_score: finalScore || 0,
          csi: csi || 0,
          lps: lps || 0,
          correct: correct || 0,
          wrong: wrong || 0,
        })
        .select('id')
        .single();

      if (error) throw error;
      studentData = data;
    }

    // Insert per-question answers for analytics
    const returnedStudentId = studentData?.id;
    if (returnedStudentId && mcqAnswers && answerKey && Array.isArray(answerKey)) {
      const answerRows = Object.entries(mcqAnswers as Record<string, string>).map(([qNum, selected]) => ({
        student_id: returnedStudentId,
        question_number: parseInt(qNum),
        selected_answer: selected,
        is_correct: answerKey[parseInt(qNum) - 1] === selected,
      }));

      if (answerRows.length > 0) {
        const { error: ansError } = await supabase
          .from('gm_answers')
          .insert(answerRows);
        if (ansError) console.error('Answer insert error:', ansError);
      }
    }

    // Log the student addition/update
    logActivity({
      adminId: adminSession.user_id,
      adminUsername: adminSession.admin_users.username,
      actionType: 'UPDATE_GRADE',
      entityType: 'STUDENT',
      entityId: studentData?.id,
      payload: { name: name.trim(), finalScore, isUpdate: !!existingStudent },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ message: existingStudent ? 'Nilai siswa berhasil diperbarui' : 'Siswa berhasil ditambahkan', studentId: studentData?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan siswa';
    console.error('Student save error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID wajib diisi' }, { status: 400 });
    }

    const adminSession = await getAdminSession();
    const studentSession = await getStudentSession();

    if (!adminSession && !studentSession) {
      return NextResponse.json({ error: 'Akses ditolak: Anda harus login untuk melihat data ini' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('gm_students')
      .select('*')
      .eq('session_id', sessionId)
      .order('name', { ascending: true });

    if (error) throw error;

    const students = (data || []).map(s => ({
      id: s.id,
      name: s.name,
      answers: s.mcq_answers,
      essayScores: s.essay_scores,
      correct: s.correct,
      wrong: s.wrong,
      mcqScore: Number(s.mcq_score),
      essayScore: Number(s.essay_score),
      finalScore: Number(s.final_score),
      percentage: Number(s.final_score),
      csi: s.csi,
      lps: s.lps,
      remedialStatus: s.remedial_status,
      remedialLocation: s.remedial_location,
      remedialAnswers: s.remedial_answers,
      remedialNote: s.remedial_note,
      originalScore: s.original_score,
      remedialScore: s.remedial_score,
      finalScoreLocked: s.final_score_locked,
      isCheated: s.is_cheated,
      teacherReviewed: s.teacher_reviewed,
      cheatingFlags: s.cheating_flags,
      remedialAttempts: s.remedial_attempts,
      essayScoreAuto: s.essay_score_auto,
      essayScoreManual: s.essay_score_manual,
      essayScoreFinal: s.essay_score_final,
      essayAutoDetails: s.essay_auto_details,
    }));

    return NextResponse.json({ students });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat siswa';
    console.error('Student load error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID wajib diisi' }, { status: 400 });
    }

    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang dapat menghapus siswa' }, { status: 403 });
    }

    const { error } = await supabase
      .from('gm_students')
      .delete()
      .eq('id', studentId);

    if (error) throw error;

    logActivity({
      adminId: adminSession.user_id,
      adminUsername: adminSession.admin_users.username,
      actionType: 'DELETE_STUDENT',
      entityType: 'STUDENT',
      entityId: studentId,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ message: 'Siswa berhasil dihapus' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus siswa';
    console.error('Student delete error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
