import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/grademaster/security';
import { analyzeSnapshot } from '@/lib/grademaster/services/proctoring-analyzer.service';

export async function POST(req: NextRequest) {
  try {
      const supabase = await createClient();
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

    const { data: inserted, error: insertErr } = await supabase
      .from('gm_proctoring_snapshots')
      .insert({
        attempt_id: attemptId,
        violation_type: violationType,
        image_data: imageData || null,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('Snapshot insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 });
    }

    // Fire-and-forget: async AI analysis on the snapshot image (non-blocking)
    if (imageData && inserted?.id) {
      analyzeSnapshot(imageData).then(async (analysis) => {
        try {
          const sbUpdate = await createClient();
          await sbUpdate
            .from('gm_proctoring_snapshots')
            .update({ ai_analysis: analysis })
            .eq('id', inserted.id);
          console.log(`[AI Proctoring] Snapshot ${inserted.id} analyzed: ${analysis.threat_level}`);
        } catch (updateErr) {
          console.error('[AI Proctoring] Failed to update snapshot with analysis:', updateErr);
        }
      }).catch(err => {
        console.error('[AI Proctoring] Async analysis failed:', err);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Snapshot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
