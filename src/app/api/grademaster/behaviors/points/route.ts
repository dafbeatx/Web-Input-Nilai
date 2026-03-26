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

    // Step 1: Get existing record to append to log array
    const { data: record, error: fetchErr } = await supabase
      .from('gm_behaviors')
      .select('total_points, behavior_logs')
      .eq('id', id)
      .single();

    if (fetchErr || !record) {
      return NextResponse.json({ error: 'Data siswa tidak ditemukan' }, { status: 404 });
    }

    const currentPoints = Number(record.total_points);
    const newPoints = currentPoints + pointsDelta;
    const currentLogs = Array.isArray(record.behavior_logs) ? record.behavior_logs : [];

    const newLogEntry = {
      type,
      points: pointsDelta,
      reason,
      timestamp: new Date().toISOString()
    };

    const newLogs = [newLogEntry, ...currentLogs];

    // Step 2: Update record
    const { data: updatedRecord, error: updateErr } = await supabase
      .from('gm_behaviors')
      .update({
        total_points: newPoints,
        behavior_logs: newLogs,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ student: updatedRecord, message: 'Poin berhasil diperbarui' });

  } catch (err: any) {
    console.error('Update points error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
