import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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

    // Lookup student behavior record
    const { data: record, error: fetchErr } = await supabaseAdmin
      .from('gm_behaviors')
      .select('id, total_points, points_used_today, points_date')
      .eq('student_name', studentName)
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .single();

    if (fetchErr || !record) {
      return NextResponse.json({ error: 'Data histori poin siswa tidak ditemukan' }, { status: 404 });
    }

    // Daily limit guard
    const currentDate = new Date().toISOString().split('T')[0];
    let currentUsedToday = record.points_used_today || 0;
    if (record.points_date !== currentDate) {
      currentUsedToday = 0;
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

    // Insert a spend entry into gm_behavior_logs so the deduction is traceable
    // and total_points stays consistent with the log-based recompute system.
    const { error: logInsertErr } = await supabaseAdmin
      .from('gm_behavior_logs')
      .insert({
        student_id: record.id,
        points_delta: -pointsToSpend,
        reason: `Tukar poin untuk ekstensi waktu selama ${pointsToSpend} menit pada ujian remedial`,
        violation_date: new Date().toISOString(),
      });

    if (logInsertErr) throw logInsertErr;

    // Recompute total_points from all logs as the single source of truth
    const { data: allLogs } = await supabaseAdmin
      .from('gm_behavior_logs')
      .select('points_delta')
      .eq('student_id', record.id);

    const deltaSum = (allLogs || []).reduce((sum: number, log: any) => sum + (log.points_delta || 0), 0);
    const newTotalPoints = 100 + deltaSum;

    const newUsedToday = currentUsedToday + pointsToSpend;

    // Persist recomputed total + daily tracking
    const { error: updateErr } = await supabaseAdmin
      .from('gm_behaviors')
      .update({
        total_points: newTotalPoints,
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
