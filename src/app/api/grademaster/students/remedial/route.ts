export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/grademaster/security';

import { submitRemedial } from '@/lib/grademaster/services/remedial.service';

export async function GET(req: NextRequest) {
  try {
      const supabase = supabaseAdmin;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const studentName = searchParams.get('studentName');

    if (!sessionId || !studentName) {
      return NextResponse.json({ error: 'Session ID dan Nama Siswa wajib diisi' }, { status: 400 });
    }

    let queryResult = await supabase
      .from('gm_students')
      .select('id, name, final_score, remedial_status, cheating_flags, essay_score_manual, essay_score_auto, teacher_reviewed, violation_count, is_blocked, remedial_extended_time, remedial_answers, essay_auto_details, remedial_score, original_score')
      .eq('session_id', sessionId)
      .ilike('name', studentName.trim())
      .eq('is_deleted', false)
      .single();

    if (queryResult.error && queryResult.error.message.includes('remedial_extended_time')) {
      console.warn('[Remedial GET API] Column remedial_extended_time is missing, retrying query without it.');
      queryResult = await supabase
        .from('gm_students')
        .select('id, name, final_score, remedial_status, cheating_flags, essay_score_manual, essay_score_auto, teacher_reviewed, violation_count, is_blocked, remedial_answers, essay_auto_details, remedial_score, original_score')
        .eq('session_id', sessionId)
        .ilike('name', studentName.trim())
        .eq('is_deleted', false)
        .single();
    }

    const student = queryResult.data;
    const error = queryResult.error;

    if (error || !student) {
      return NextResponse.json({ error: 'RESET_REQUIRED', message: 'Siswa tidak ditemukan' }, { status: 400 });
    }

    let currentStatus = student.remedial_status;

    // Auto-recovery for stuck INITIATED attempts
    if (currentStatus === 'INITIATED') {
      const { data: attempt } = await supabaseAdmin
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

    let remedialQuestions: string[] = [];
    let remedialAnswerKeys: string[] = [];
    let kkm = 70;
    if (sessionId) {
      const { data: session } = await supabase
        .from('gm_sessions')
        .select('scoring_config, kkm')
        .eq('id', sessionId)
        .single();
      if (session) {
        kkm = session.kkm || 70;
        if (session.scoring_config) {
          remedialQuestions = session.scoring_config.remedialQuestions || [];
          remedialAnswerKeys = session.scoring_config.remedialAnswerKeys || [];
        }
      }
    }

    // Holdback calculation for GET
    const { data: siblingStudents } = await supabaseAdmin
      .from('gm_students')
      .select('id, name, final_score, original_score, remedial_status')
      .eq('session_id', sessionId)
      .eq('is_deleted', false);

    const isCandidate = (s: any) => {
      const orig = s.original_score !== null && s.original_score !== undefined ? Number(s.original_score) : 0;
      const fin = s.final_score !== null && s.final_score !== undefined ? Number(s.final_score) : 0;
      const baseScore = (orig > 0) ? orig : fin;
      return baseScore < kkm;
    };

    const pendingRemedialSiblings = (siblingStudents || []).filter(s => {
      if (s.id === student.id) return false;
      if (!isCandidate(s)) return false;
      const finishedStates = ['COMPLETED', 'CHEATED', 'TIMEOUT', 'FAILED_EFFORT', 'TIME_UP', 'SUBMITTED'];
      return !finishedStates.includes(s.remedial_status || 'NONE');
    });

    const ownCheated = student.remedial_status === 'CHEATED' || student.cheating_flags?.some((f: string) => f.toLowerCase().includes('curang') || f.toLowerCase().includes('sanksi') || f.toLowerCase().includes('didiskualifikasi'));
    const isHeldBack = pendingRemedialSiblings.length > 0 && !ownCheated && (student.remedial_status === 'SUBMITTED' || student.remedial_status === 'TIME_UP' || student.remedial_status === 'COMPLETED');

    let failedReason: string | null = null;
    if (student.remedial_status === 'FAILED_EFFORT') {
      const flags = student.cheating_flags || [];
      const hasFast = flags.some((f: string) => f.includes('cepat') || f.includes('FAST_COMPLETION'));
      const hasLowEffort = flags.some((f: string) => f.includes('pendek') || f.includes('asal-asalan') || f.includes('LOW_EFFORT'));
      if (hasFast && hasLowEffort) {
        failedReason = "Durasi pengerjaan terlalu cepat (di bawah 5 menit) dan sebagian besar jawaban tidak valid/asal-asalan.";
      } else if (hasFast) {
        failedReason = "Durasi pengerjaan terlalu cepat (di bawah 5 menit). Minimal pengerjaan adalah 5 menit.";
      } else {
        failedReason = "Sebagian besar jawaban terdeteksi asal-asalan, terlalu pendek, atau tidak memenuhi kriteria kelayakan esai.";
      }
    } else if (student.remedial_status === 'TIME_UP' && student.remedial_score === 0) {
      failedReason = "Ujian remedial ditutup karena batas waktu habis tanpa ada jawaban esai yang cukup valid/memadai.";
    }

    const response = NextResponse.json({ 
      status: currentStatus,
      finalScore: student.final_score,
      cheatingFlags: student.cheating_flags,
      teacherReviewed: student.teacher_reviewed,
      violationCount: student.violation_count || 0,
      isBlocked: student.is_blocked || false,
      remedialExtendedTime: student.remedial_extended_time || 0,
      remedialAnswers: student.remedial_answers || [],
      essayAutoDetails: student.essay_auto_details || [],
      remedialQuestions,
      remedialAnswerKeys,
      // NEW holdback fields:
      isHeldBack,
      remedialScore: student.remedial_score,
      pendingRemedialCount: pendingRemedialSiblings.length,
      holdbackReason: isHeldBack ? 'Nilai remedial ditahan sementara menunggu teman sekelas selesai' : null,
      rawScore: student.essay_score_auto,
      displayedScore: isHeldBack ? student.remedial_score : student.final_score,
      failedReason
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
      const supabase = supabaseAdmin;
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
      .ilike('name', studentName.trim())
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

    if (status === 'INITIATED') {
      import('@/lib/grademaster/services/push-notification.service').then(m => {
        m.notifyClassmatesRemedialStarted(sessionId, studentName || data.name || '');
      }).catch(err => {
        console.error('[Remedial API] Classmate notification trigger failed:', err);
      });
    }

    return NextResponse.json({ 
      success: true, 
      attemptId: data.attempt_id,
      attemptToken: data.attempt_token,
      studentId: data.id,
      newFinalScore: data.newFinalScore,
      status: data.remedial_status,
      cheatingFlags: data.cheating_flags,
      subject: data.subject,
      className: data.class_name,
      remedialQuestions: data.remedialQuestions,
      essayDetails: data.essay_auto_details || [],
      remedialAnswerKeys: data.remedialAnswerKeys || [],
      // NEW FIELDS
      isHeldBack: data.isHeldBack,
      remedialScore: data.remedialScore,
      pendingRemedialCount: data.pendingRemedialCount,
      holdbackReason: data.holdbackReason,
      rawScore: data.rawScore,
      displayedScore: data.displayedScore,
      scoringReason: data.scoringReason,
      failedReason: data.failedReason,
      penaltyApplied: data.penaltyApplied
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
      const supabase = supabaseAdmin;
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
