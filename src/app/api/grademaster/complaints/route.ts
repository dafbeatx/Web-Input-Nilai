import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';
import {
  adjudicateComplaint,
  type ComplaintInput,
  type ComplaintCategory,
  type AdjudicationResult,
} from '@/lib/grademaster/services/complaint-adjudicator.service';

const VALID_CATEGORIES: ComplaintCategory[] = [
  'CAMERA_ISSUE',
  'CONNECTION_LOSS',
  'TAB_SWITCH_FALSE_POSITIVE',
  'SCORE_DISPUTE',
  'TIME_EXTENSION',
  'SYSTEM_ERROR',
  'OTHER',
];

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`complaint:${ip}`)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { attemptId, studentId, complaintCategory, complaintText } = body;

    if (!attemptId || !studentId || !complaintCategory || !complaintText) {
      return NextResponse.json(
        { error: 'attemptId, studentId, complaintCategory, and complaintText are required' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(complaintCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch system logs for this attempt
    const { data: logs, error: logErr } = await supabase
      .from('gm_attempt_logs')
      .select('event_type, severity, risk_points, metadata, created_at')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true });

    if (logErr) {
      console.error('Complaint log fetch error:', logErr);
      return NextResponse.json({ error: 'Failed to fetch system logs' }, { status: 500 });
    }

    // Fetch attempt metadata
    const { data: attempt } = await supabase
      .from('gm_remedial_attempts')
      .select('risk_score, risk_level, status, started_at, completed_at, session_id')
      .eq('id', attemptId)
      .eq('student_id', studentId)
      .single();

    // Fetch session timer if attempt exists
    let timerMinutes = 15;
    if (attempt?.session_id) {
      const { data: session } = await supabase
        .from('gm_sessions')
        .select('remedial_timer')
        .eq('id', attempt.session_id)
        .single();
      timerMinutes = session?.remedial_timer || 15;
    }

    // Fetch student-level metadata
    const { data: student } = await supabase
      .from('gm_students')
      .select('camera_status, remedial_status')
      .eq('id', studentId)
      .single();

    // Calculate elapsed time from attempt timestamps
    let elapsedMs = 0;
    if (attempt?.started_at && attempt?.completed_at) {
      elapsedMs = new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime();
    }

    const input: ComplaintInput = {
      complaintCategory: complaintCategory as ComplaintCategory,
      complaintText,
      systemLogs: (logs || []).map(l => ({
        event_type: l.event_type,
        severity: l.severity,
        risk_points: l.risk_points,
        metadata: l.metadata,
        created_at: l.created_at,
      })),
      attemptMeta: attempt
        ? {
            riskScore: attempt.risk_score || 0,
            riskLevel: attempt.risk_level || 'CLEAN',
            status: attempt.status || 'UNKNOWN',
            elapsedMs,
            timerMinutes,
            cameraStatus: student?.camera_status || undefined,
          }
        : undefined,
    };

    const result: AdjudicationResult = adjudicateComplaint(input);

    return NextResponse.json({
      verdict: result.verdict,
      reason: result.reason,
      confidence: result.confidence,
      logCount: (logs || []).length,
      attemptStatus: attempt?.status || null,
    });
  } catch (err) {
    console.error('Complaint adjudication error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
