import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`student:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const body = await req.json();
    const { sessionId, id, name, mcqAnswers, essayScores, mcqScore, essayScore, finalScore, csi, lps, correct, wrong, answerKey } = body;

    if (!sessionId || !name) {
      return NextResponse.json({ error: 'Session ID dan nama siswa wajib diisi' }, { status: 400 });
    }

    let studentData: { id: string } | null = null;
    const isExistingStudent = id && isUUID(id);

    if (isExistingStudent) {
      // Update existing student
      const { data, error } = await supabase
        .from('gm_students')
        .update({
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
        .eq('id', id)
        .eq('session_id', sessionId)
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

    return NextResponse.json({ message: isExistingStudent ? 'Nilai siswa berhasil diperbarui' : 'Siswa berhasil ditambahkan', studentId: studentData?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan siswa';
    console.error('Student save error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gm_students')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

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
    const body = await req.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase
      .from('gm_students')
      .delete()
      .eq('id', studentId);

    if (error) throw error;

    return NextResponse.json({ message: 'Siswa berhasil dihapus' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus siswa';
    console.error('Student delete error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
