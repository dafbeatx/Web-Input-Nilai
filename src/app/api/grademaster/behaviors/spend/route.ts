import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`behaviors_spend:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { studentName, className, academicYear, pointsToSpend } = body;

    if (!studentName || !className || !academicYear || typeof pointsToSpend !== 'number') {
      return NextResponse.json({ error: 'Data permintaan tidak lengkap' }, { status: 400 });
    }

    if (pointsToSpend <= 0 || pointsToSpend > 10) {
      return NextResponse.json({ error: 'Poin yang ditukar harus berada di antara 1 - 10 poin.' }, { status: 400 });
    }

    // Attempt to lookup student point record
    const { data: record, error: fetchErr } = await supabase
      .from('gm_behaviors')
      .select('id, total_points, behavior_logs, points_used_today, points_date')
      .eq('student_name', studentName)
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .single();

    if (fetchErr || !record) {
      return NextResponse.json({ error: 'Data histori poin siswa tidak ditemukan' }, { status: 404 });
    }

    // Date logic: Check resetting daily max limit to 0 if a new day has arrived
    const currentDate = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    let currentUsedToday = record.points_used_today || 0;
    
    if (record.points_date !== currentDate) {
      currentUsedToday = 0; // Reset for the new day
    }

    if (currentUsedToday + pointsToSpend > 10) {
      return NextResponse.json({ 
        error: `Anda sudah melebihi batas penggunaan poin hari ini. Kapasitas tersisa hari ini: ${10 - currentUsedToday} poin.` 
      }, { status: 403 });
    }

    if (record.total_points < pointsToSpend) {
      return NextResponse.json({ 
        error: `Saldo poin tidak mencukupi. (Saldo Anda: ${record.total_points})` 
      }, { status: 403 });
    }

    // Spend points
    const newTotalPoints = record.total_points - pointsToSpend;
    const newUsedToday = currentUsedToday + pointsToSpend;
    const currentLogs = Array.isArray(record.behavior_logs) ? record.behavior_logs : [];

    const newLogEntry = {
      type: 'BAD', // Using BAD since it's a deduction logic per the usual point UI
      points: -pointsToSpend,
      reason: `Tukar poin untuk ekstensi waktu selama ${pointsToSpend} menit pada ujian remedial`,
      timestamp: new Date().toISOString()
    };

    const newLogs = [newLogEntry, ...currentLogs];

    // Atomically Update Request
    const { error: updateErr } = await supabase
      .from('gm_behaviors')
      .update({
        total_points: newTotalPoints,
        behavior_logs: newLogs,
        points_used_today: newUsedToday,
        points_date: currentDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', record.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ 
      success: true, 
      message: `${pointsToSpend} menit berhasil ditambahkan.`,
      newPoints: newTotalPoints
    });

  } catch (err: any) {
    console.error('Spend behaviors error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
