import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function PUT(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`remedial:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const body = await req.json();
    const { sessionId, studentName, status } = body;
    // status: 'COMPLETED' | 'CHEATED' | 'TIMEOUT'

    if (!sessionId || !studentName || !status) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Find the student
    const { data: student, error: fetchErr } = await supabase
      .from('gm_students')
      .select('id, final_score, remedial_status, remedial_ip')
      .eq('session_id', sessionId)
      .eq('name', studentName)
      .single();

    if (fetchErr || !student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    // Check if already did remedial
    if (student.remedial_status === 'COMPLETED' || student.remedial_status === 'CHEATED' || student.remedial_status === 'TIMEOUT') {
      return NextResponse.json({ error: 'Remedial sudah pernah dilakukan atau dikunci.' }, { status: 403 });
    }
    
    // Check IP just in case (optional protection)
    if (student.remedial_ip && student.remedial_ip !== ip && student.remedial_status !== 'NONE') {
      return NextResponse.json({ error: 'Sesi remedial ini sudah diakses dari perangkat lain.' }, { status: 403 });
    }

    // Get the KKM from session if completed
    let newFinalScore = Number(student.final_score);
    if (status === 'COMPLETED') {
        const { data: session } = await supabase.from('gm_sessions').select('kkm').eq('id', sessionId).single();
        if (session) {
            newFinalScore = Number(session.kkm);
        }
    } else if (status === 'CHEATED') {
        newFinalScore = 0; // Penalty
    }

    // Update the student
    const { error: updateErr } = await supabase
      .from('gm_students')
      .update({
        final_score: newFinalScore,
        remedial_status: status,
        remedial_ip: ip,
      })
      .eq('id', student.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ message: 'Remedial status tersimpan', newFinalScore, status });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan data remedial';
    console.error('Remedial error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
