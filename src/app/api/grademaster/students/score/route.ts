import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function PATCH(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Admin session required' }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, newScore } = body;

    if (!studentId || typeof newScore !== 'number') {
      return NextResponse.json({ error: 'Student ID dan nilai baru wajib diisi' }, { status: 400 });
    }

    if (newScore < 0 || newScore > 100) {
      return NextResponse.json({ error: 'Nilai harus antara 0 dan 100' }, { status: 400 });
    }

    const { error } = await supabase
      .from('gm_students')
      .update({
        final_score: newScore,
        remedial_status: 'NONE',
        remedial_score: 0,
        remedial_location: null,
        remedial_note: null,
        remedial_answers: null,
        is_cheated: false,
        cheating_flags: [],
        violation_count: 0,
        is_blocked: false,
        teacher_reviewed: true,
        final_score_locked: newScore
      })
      .eq('id', studentId);

    if (error) {
      console.error('[PATCH Score] DB Error:', error);
      throw error;
    }

    return NextResponse.json({ message: 'Nilai berhasil diperbarui', newScore });
  } catch (err: any) {
    console.error('Score override failure:', err);
    return NextResponse.json({ error: err.message || 'Gagal memperbarui nilai' }, { status: 500 });
  }
}
