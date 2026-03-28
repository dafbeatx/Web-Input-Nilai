import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`activity-log:${ip}`)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { attemptId, events } = body;

    if (!attemptId || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'attemptId and events[] required' }, { status: 400 });
    }

    // Cap batch size to prevent abuse
    const batch = events.slice(0, 50);

    const rows = batch.map((evt: { eventType: string; severity: string; riskPoints: number; metadata?: Record<string, unknown> }) => ({
      attempt_id: attemptId,
      event_type: evt.eventType,
      severity: evt.severity || 'LOW',
      risk_points: evt.riskPoints || 0,
      metadata: evt.metadata || {},
    }));

    const { error: insertErr } = await supabase
      .from('gm_attempt_logs')
      .insert(rows);

    if (insertErr) {
      console.error('Activity log insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to save logs' }, { status: 500 });
    }

    // Accumulate risk score on the attempt
    const totalNewPoints = rows.reduce((sum: number, r: { risk_points: number }) => sum + r.risk_points, 0);
    if (totalNewPoints > 0) {
      const { data: attempt } = await supabase
        .from('gm_remedial_attempts')
        .select('risk_score')
        .eq('id', attemptId)
        .single();

      if (attempt) {
        const newScore = (attempt.risk_score || 0) + totalNewPoints;
        let newLevel = 'CLEAN';
        if (newScore >= 90) newLevel = 'AUTO_FLAGGED';
        else if (newScore >= 60) newLevel = 'SUSPICIOUS';
        else if (newScore >= 30) newLevel = 'WARNING';

        await supabase
          .from('gm_remedial_attempts')
          .update({ risk_score: newScore, risk_level: newLevel })
          .eq('id', attemptId);
      }
    }

    return NextResponse.json({ ok: true, logged: rows.length });
  } catch (err) {
    console.error('Activity log error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
