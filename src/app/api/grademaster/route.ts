import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { hashPassword, verifyPassword, validateSessionInput, checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json();
    const {
      sessionName,
      password,
      answerKey,
      teacher,
      subject,
      className,
      schoolLevel,
      studentList,
      scoringConfig,
    } = body;

    const validationError = validateSessionInput({ sessionName, password, teacher, subject });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('gm_sessions')
      .select('id, password_hash')
      .eq('session_name', sessionName.trim())
      .single();

    if (existing) {
      const valid = await verifyPassword(password.trim(), existing.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Password salah untuk sesi ini' }, { status: 403 });
      }

      const { error } = await supabase
        .from('gm_sessions')
        .update({
          answer_key: answerKey || [],
          teacher: teacher || '',
          subject: subject || '',
          class_name: className || '',
          school_level: schoolLevel || 'SMA',
          student_list: studentList || [],
          scoring_config: scoringConfig || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
      return NextResponse.json({ message: 'Sesi berhasil diperbarui', sessionId: existing.id });
    }

    const passwordHash = await hashPassword(password.trim());

    const { data: newSession, error } = await supabase
      .from('gm_sessions')
      .insert({
        session_name: sessionName.trim(),
        password_hash: passwordHash,
        answer_key: answerKey || [],
        teacher: teacher || '',
        subject: subject || '',
        class_name: className || '',
        school_level: schoolLevel || 'SMA',
        student_list: studentList || [],
        scoring_config: scoringConfig || undefined,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Nama sesi kelas ini sudah digunakan. Vercel/Supabase mewajibkan nama sesi yang unik. Silakan tambahkan kode unik, misal: "UTS SMA N 1 - Kelas 10A".');
      throw new Error(`Error Basis Data (${error.code || 'Unknown'}): ${error.message}`);
    }
    return NextResponse.json({ message: 'Sesi berhasil dibuat', sessionId: newSession?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as Record<string, unknown>).message) : 'Gagal menyimpan sesi';
    const code = (typeof err === 'object' && err !== null && 'code' in err) ? String((err as Record<string, unknown>).code) : '';
    console.error('Session save error:', code, message, err);
    return NextResponse.json({ error: `${code ? `[${code}] ` : ''}${message}` }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const password = searchParams.get('password');

    // List all sessions (no auth needed)
    if (!name && !password) {
      const { data, error } = await supabase
        .from('gm_sessions')
        .select('id, session_name, teacher, subject, class_name, school_level, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Attach student count per session
      const sessionsWithCounts = await Promise.all(
        (data || []).map(async (s) => {
          const { count } = await supabase
            .from('gm_students')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id);
          return { ...s, student_count: count || 0 };
        })
      );

      return NextResponse.json({ sessions: sessionsWithCounts });
    }

    if (!name) {
      return NextResponse.json({ error: 'Nama sesi wajib diisi' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`get:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const { data: session, error } = await supabase
      .from('gm_sessions')
      .select('*')
      .eq('session_name', name.trim())
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    let isPublic = false;
    if (password) {
      const valid = await verifyPassword(password.trim(), session.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Password salah' }, { status: 403 });
      }
    } else {
      isPublic = true;
    }

    // Fetch students for this session
    const { data: students } = await supabase
      .from('gm_students')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      sessionId: session.id,
      sessionName: session.session_name,
      answerKey: isPublic ? [] : session.answer_key,
      teacher: session.teacher,
      subject: session.subject,
      className: session.class_name,
      schoolLevel: session.school_level,
      studentList: session.student_list,
      scoringConfig: session.scoring_config,
      gradedStudents: (students || []).map(s => ({
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
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as Record<string, unknown>).message) : 'Gagal memuat sesi';
    const code = (typeof err === 'object' && err !== null && 'code' in err) ? String((err as Record<string, unknown>).code) : '';
    console.error('Session load error:', code, message, err);
    return NextResponse.json({ error: `${code ? `[${code}] ` : ''}${message}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`del:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const body = await req.json();
    const { sessionName, password } = body;

    if (!sessionName || !password) {
      return NextResponse.json({ error: 'Nama sesi dan password wajib diisi' }, { status: 400 });
    }

    const { data: session, error: fetchError } = await supabase
      .from('gm_sessions')
      .select('id, password_hash')
      .eq('session_name', sessionName.trim())
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const valid = await verifyPassword(password.trim(), session.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Password salah' }, { status: 403 });
    }

    // CASCADE delete handles students & answers
    const { error: deleteError } = await supabase
      .from('gm_sessions')
      .delete()
      .eq('id', session.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Sesi berhasil dihapus' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus sesi';
    console.error('Session delete error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
