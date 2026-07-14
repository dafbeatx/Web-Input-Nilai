import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { 
      attemptId, 
      networkStatus = 'ONLINE', 
      latencyMs = 0,
      eventType = 'HEARTBEAT',
      severity = 'LOW',
      metadata = {}
    } = await req.json();

    if (!attemptId) {
      return NextResponse.json({ error: 'Attempt ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 1. Update the main attempt record
    const { error: updateError } = await supabase
      .from('gm_remedial_attempts')
      .update({
        last_heartbeat_at: now,
        last_network_status: networkStatus,
        last_latency_ms: latencyMs,
        ...(eventType !== 'HEARTBEAT' ? { status: metadata.examState || 'IN_PROGRESS' } : {})
      })
      .eq('id', attemptId);

    if (updateError) throw updateError;

    // 2. Record the event log
    const { error: logError } = await supabase
      .from('gm_attempt_logs')
      .insert({
        attempt_id: attemptId,
        event_type: eventType,
        severity: severity,
        metadata: {
          ...metadata,
          network: networkStatus,
          client_timestamp: now,
          latency: latencyMs
        }
      });

    if (logError) {
      console.warn('Logging error (non-critical):', logError);
    }

    return NextResponse.json({ 
      success: true, 
      timestamp: now,
      serverTime: Date.now()
    });
  } catch (err: any) {
    console.error('Heartbeat/Log Handler Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
