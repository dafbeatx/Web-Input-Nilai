import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

import { submitRemedial } from '@/lib/grademaster/services/remedial.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const studentName = searchParams.get('studentName');

    if (!sessionId || !studentName) {
      return NextResponse.json({ error: 'Session ID dan Nama Siswa wajib diisi' }, { status: 400 });
    }

    const { data: student, error } = await supabase
      .from('gm_students')
      .select('id, name, final_score, remedial_status, cheating_flags, essay_score_manual, essay_score_auto, teacher_reviewed')
      .eq('session_id', sessionId)
      .eq('name', studentName)
      .eq('is_deleted', false)
      .single();

    if (error || !student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ 
      status: student.remedial_status,
      finalScore: student.final_score,
      cheatingFlags: student.cheating_flags,
      teacherReviewed: student.teacher_reviewed
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Gagal mengambil status' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`remedial:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    
    if (!body) {
      console.error('Remedial error: Invalid JSON payload');
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    console.log('Incoming remedial request:', JSON.stringify(body, null, 2));

    const { sessionId, studentId, studentName, status, location, answers, note, elapsedTimeMs, clientCheatingFlags, photo } = body;
    // status: 'STARTED' | 'COMPLETED' | 'CHEATED' | 'TIMEOUT'

    if (!sessionId || (!studentName && !studentId) || !status) {
      console.error('Remedial error: Missing required fields', { sessionId, studentName, studentId, status });
      return NextResponse.json({ error: 'Data wajib tidak lengkap. Periksa pengiriman session dan nama.' }, { status: 400 });
    }

    // Since old API used name mainly, let's first get ID if we only have name
    let finalStudentId = studentId;
    if (!finalStudentId) {
      const { data: fetchStu } = await supabase
        .from('gm_students')
        .select('id')
        .eq('session_id', sessionId)
        .eq('name', studentName)
        .eq('is_deleted', false)
        .single();
        
      if (!fetchStu) return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
      finalStudentId = fetchStu.id;
    }

    const data = await submitRemedial(
       sessionId, 
       finalStudentId, 
       studentName, 
       status, 
       answers || [], 
       note || '', 
       location || '',
       elapsedTimeMs || 1000 * 60 * 30, // Fallback to 30 mins if not provided
       clientCheatingFlags || [],
       photo
    );

    return NextResponse.json({ 
        message: 'Remedial status tersimpan', 
        newFinalScore: data.final_score, 
        status: data.remedial_status,
        attemptId: data.attempt_id || undefined,
        attemptToken: data.attempt_token || undefined,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan data remedial';
    console.error('Remedial error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID wajib diisi' }, { status: 400 });
    }

    const { resetRemedial } = await import('@/lib/grademaster/services/remedial.service');
    await resetRemedial(studentId);

    return NextResponse.json({ message: 'Data remedial berhasil direset' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mereset data remedial';
    console.error('Remedial reset error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


