import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function PUT(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`behaviors_points:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { id, type, pointsDelta, reason } = body;

    // type: 'GOOD' | 'BAD'
    // pointsDelta: 10 or -10
    // reason: string

    if (!id || !type || typeof pointsDelta !== 'number' || !reason) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Call the new RPC for atomic and consistent updates
    const { data, error: rpcError } = await supabase.rpc('log_behavior_points', {
      p_student_id: id,
      p_type: type,
      p_points: pointsDelta,
      p_reason: reason
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      throw new Error(rpcError.message);
    }

    return NextResponse.json({ student: data, message: 'Poin berhasil diperbarui' });

  } catch (err: any) {
    console.error('Update points error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
