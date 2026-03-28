import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    // Strict rate limit: max 2 snapshots per 30 seconds
    if (!checkRateLimit(`snapshot:${ip}`)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { attemptId, violationType, imageData } = body;

    if (!attemptId || !violationType) {
      return NextResponse.json({ error: 'attemptId and violationType required' }, { status: 400 });
    }

    // Check snapshot count for this attempt (cap at 10)
    const { count } = await supabase
      .from('gm_proctoring_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('attempt_id', attemptId);

    if ((count || 0) >= 10) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Max snapshots reached' });
    }

    const { error: insertErr } = await supabase
      .from('gm_proctoring_snapshots')
      .insert({
        attempt_id: attemptId,
        violation_type: violationType,
        image_data: imageData || null,
      });

    if (insertErr) {
      console.error('Snapshot insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Snapshot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
