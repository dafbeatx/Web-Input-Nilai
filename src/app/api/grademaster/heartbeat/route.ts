import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { attemptId, networkStatus, latencyMs } = await req.json();

    if (!attemptId) {
      return NextResponse.json({ error: 'Attempt ID is required' }, { status: 400 });
    }

    // Update the heartbeat timestamp in the database
    const { error } = await supabase
      .from('gm_remedial_attempts')
      .update({
        last_heartbeat_at: new Date().toISOString(),
        last_network_status: networkStatus || 'ONLINE',
        last_latency_ms: latencyMs || 0
      })
      .eq('id', attemptId);

    if (error) {
      console.error('Heartbeat error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
