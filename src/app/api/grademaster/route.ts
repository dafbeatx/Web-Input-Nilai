import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      sessionName, 
      password, 
      answerKey, 
      studentAnswers, 
      essayScores, 
      totalQuestions,
      gradedStudents,
      teacherName,
      subject,
      className,
      schoolLevel,
      studentList
    } = body;

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
          graded_students: gradedStudents,
          teacher_name: teacherName,
          subject: subject,
          class_name: className,
          school_level: schoolLevel,
          student_list: studentList,
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
        graded_students: gradedStudents,
        teacher_name: teacherName,
        subject: subject,
        class_name: className,
        school_level: schoolLevel,
        student_list: studentList,
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

    if (!name && !password) {
      const { data, error } = await supabase
        .from('grade_sessions')
        .select('id, session_name, teacher_name, subject, class_name, school_level, updated_at')
        .order('updated_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: 'Gagal memuat daftar sesi' }, { status: 500 });
      }

      return NextResponse.json({ sessions: data });
    }

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
      gradedStudents: data.graded_students,
      teacherName: data.teacher_name,
      subject: data.subject,
      className: data.class_name,
      schoolLevel: data.school_level,
      studentList: data.student_list
    });
  } catch (err: any) {
    console.error('Grade load error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat sesi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionName, password } = body;

    if (!sessionName || !password) {
      return NextResponse.json({ error: 'Nama sesi dan password wajib diisi' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('grade_sessions')
      .select('id, password')
      .eq('session_name', sessionName)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    if (existing.password !== password) {
      return NextResponse.json({ error: 'Password salah' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('grade_sessions')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ message: 'Sesi berhasil dihapus' });
  } catch (err: any) {
    console.error('Grade delete error:', err);
    return NextResponse.json({ error: err.message || 'Gagal menghapus sesi' }, { status: 500 });
  }
}
