import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionName, password, answerKey, studentAnswers, essayScores, totalQuestions } = body;

    if (!sessionName || !password) {
      return NextResponse.json({ error: 'Nama sesi dan password wajib diisi' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('grade_sessions')
      .select('id, password')
      .eq('session_name', sessionName)
      .single();

    if (existing) {
      if (existing.password !== password) {
        return NextResponse.json({ error: 'Password salah untuk sesi ini' }, { status: 403 });
      }

      const { error } = await supabase
        .from('grade_sessions')
        .update({
          answer_key: answerKey,
          student_answers: studentAnswers,
          essay_scores: essayScores,
          total_questions: totalQuestions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
      return NextResponse.json({ message: 'Sesi berhasil diperbarui' });
    }

    const { error } = await supabase
      .from('grade_sessions')
      .insert({
        session_name: sessionName,
        password,
        answer_key: answerKey,
        student_answers: studentAnswers,
        essay_scores: essayScores,
        total_questions: totalQuestions,
      });

    if (error) throw error;
    return NextResponse.json({ message: 'Sesi berhasil disimpan' });
  } catch (err: any) {
    console.error('Grade save error:', err);
    return NextResponse.json({ error: err.message || 'Gagal menyimpan sesi' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const password = searchParams.get('password');

    if (!name || !password) {
      return NextResponse.json({ error: 'Nama sesi dan password wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('grade_sessions')
      .select('*')
      .eq('session_name', name)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    if (data.password !== password) {
      return NextResponse.json({ error: 'Password salah' }, { status: 403 });
    }

    return NextResponse.json({
      sessionName: data.session_name,
      answerKey: data.answer_key,
      studentAnswers: data.student_answers,
      essayScores: data.essay_scores,
      totalQuestions: data.total_questions,
    });
  } catch (err: any) {
    console.error('Grade load error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat sesi' }, { status: 500 });
  }
}
