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
      .select('id, name, final_score, remedial_status, cheating_flags, essay_score_manual, essay_score_auto, teacher_reviewed, violation_count, is_blocked')
      .eq('session_id', sessionId)
      .eq('name', studentName)
      .eq('is_deleted', false)
      .single();

    if (error || !student) {
      return NextResponse.json({ error: 'RESET_REQUIRED', message: 'Siswa tidak ditemukan' }, { status: 400 });
    }

    let currentStatus = student.remedial_status;

    // Auto-recovery for stuck INITIATED attempts
    if (currentStatus === 'INITIATED') {
      const { data: attempt } = await supabase
        .from('gm_remedial_attempts')
        .select('id, created_at')
        .eq('student_id', student.id)
        .eq('status', 'INITIATED')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (attempt) {
        const attemptAgeMs = Date.now() - new Date(attempt.created_at).getTime();
        if (attemptAgeMs > 2 * 60 * 1000) { // 2 minutes
          console.log(`Auto-recovering stuck INITIATED attempt for ${studentName}`);
          const { markRemedialFailed } = await import('@/lib/grademaster/services/remedial.service');
          try {
            await markRemedialFailed(attempt.id, student.id);
            currentStatus = 'FAILED';
          } catch (e) {
            console.error('Failed to auto-recover attempt', e);
          }
        }
      }
    }

    const response = NextResponse.json({ 
      status: currentStatus,
      finalScore: student.final_score,
      cheatingFlags: student.cheating_flags,
      teacherReviewed: student.teacher_reviewed,
      violationCount: student.violation_count || 0,
      isBlocked: student.is_blocked || false
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Gagal mengambil status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, any> | null = null;
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`remedial:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    body = await req.json().catch(() => null);
    
    if (!body) {
      console.error('Remedial error: Invalid JSON payload');
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    console.log('Incoming remedial request:', JSON.stringify(body, null, 2));

    const { sessionId, studentId, studentName, status, location, answers, note, elapsedTimeMs, clientCheatingFlags, photo, examMode, cameraStatus, riskLevel, isPenaltyApplied } = body;
    // status: 'STARTED' | 'COMPLETED' | 'CHEATED' | 'TIMEOUT'

    if (!sessionId || (!studentName && !studentId) || !status) {
      console.error('Remedial error: Missing required fields', { sessionId, studentName, studentId, status });
      return NextResponse.json({ error: 'Data wajib tidak lengkap. Periksa pengiriman session dan nama.' }, { status: 400 });
    }

    // Since old API used name mainly, let's first get ID if we only have name
    let finalStudentId = studentId;
    if (!finalStudentId) {
      const { data: student } = await supabase
      .from('gm_students')
      .select('id')
      .eq('session_id', sessionId)
      .eq('name', studentName)
      .single();
        
      if (!student) return NextResponse.json({ error: 'RESET_REQUIRED', message: 'Siswa tidak ditemukan' }, { status: 400 });
      finalStudentId = student.id;
    }

    const data = (await submitRemedial(
       sessionId, 
       finalStudentId, 
       studentName, 
       status, 
       answers || [], 
       note || '', 
       location || 'UNAVAILABLE',
       elapsedTimeMs || 1000 * 60 * 30, // Fallback to 30 mins if not provided
       clientCheatingFlags || [],
       photo,
       examMode,
       cameraStatus,
       riskLevel,
       isPenaltyApplied || false
    )) as any;

    return NextResponse.json({ 
      success: true, 
      attemptId: data.attempt_id,
      attemptToken: data.attempt_token,
      newFinalScore: data.newFinalScore,
      status: data.remedial_status,
      subject: data.subject,
      className: data.class_name,
      remedialQuestions: data.remedialQuestions,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const studentRef = body?.studentName || body?.studentId || 'unknown';
    console.error(`[Remedial API Error] student=${studentRef}, session=${body?.sessionId}, status=${body?.status}, error=${message}`);
    
    if (message === 'RESET_REQUIRED') {
      return NextResponse.json({ error: 'RESET_REQUIRED', message: 'Sesi anda telah direset. Silakan mulai ulang.' }, { status: 400 });
    }

    const isPermenant = message.includes('permanen') || message.includes('sudah pernah');
    return NextResponse.json(
      { error: message }, 
      { status: isPermenant ? 403 : 400 }
    );
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
    const message = err instanceof Error ? err.message : String(err);
    console.error('Remedial error:', message);
    
    if (message === 'RESET_REQUIRED') {
      return NextResponse.json({ error: 'RESET_REQUIRED', message: 'Sesi anda telah direset. Silakan mulai ulang.' }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Gagal memproses remedial', detail: message },
      { status: 500 }
    );
  }
}
