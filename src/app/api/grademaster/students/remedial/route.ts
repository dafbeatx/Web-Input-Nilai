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
    const { sessionId, studentName, status, location } = body;
    // status: 'STARTED' | 'COMPLETED' | 'CHEATED' | 'TIMEOUT'

    if (!sessionId || !studentName || !status) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Find the student
    const { data: student, error: fetchErr } = await supabase
      .from('gm_students')
      .select('id, final_score, remedial_status, remedial_location')
      .eq('session_id', sessionId)
      .eq('name', studentName)
      .single();

    if (fetchErr || !student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    // Check if already did remedial or locked out
    if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(student.remedial_status)) {
      if (status === 'STARTED') {
        return NextResponse.json({ error: 'Remedial sudah pernah dilakukan atau akses telah diblokir secara permanen untuk nama ini.' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Remedial sudah pernah dilakukan atau dikunci.' }, { status: 403 });
    }

    // Enforce location checks if it's an ongoing exam attempting to cheat with different location (optional strictness)
    if (status !== 'STARTED' && student.remedial_location && location && student.remedial_location !== location) {
      // Different location mid-exam means they swapped devices
      return NextResponse.json({ error: 'Perangkat atau lokasi terdeteksi berpindah di tengah ujian.' }, { status: 403 });
    }

    let newFinalScore = Number(student.final_score);
    let newStatus = status;

    if (status === 'STARTED') {
      newStatus = 'IN_PROGRESS';
    } else if (status === 'COMPLETED') {
      const { data: session } = await supabase.from('gm_sessions').select('kkm').eq('id', sessionId).single();
      if (session) {
        newFinalScore = Number(session.kkm);
      }
    } else if (status === 'CHEATED') {
      newFinalScore = 0; // Penalty
    }

    const updateData: any = {
      final_score: newFinalScore,
      remedial_status: newStatus,
    };

    if (location) {
      updateData.remedial_location = location;
    }

    // Update the student
    const { error: updateErr } = await supabase
      .from('gm_students')
      .update(updateData)
      .eq('id', student.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ message: 'Remedial status tersimpan', newFinalScore, status: newStatus });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan data remedial';
    console.error('Remedial error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

