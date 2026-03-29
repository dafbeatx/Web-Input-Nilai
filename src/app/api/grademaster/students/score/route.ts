import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function PATCH(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        final_score: newScore
      })
      .eq('id', studentId);

    if (error) throw error;

    return NextResponse.json({ message: 'Nilai berhasil diperbarui', newScore });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui nilai';
    console.error('Score update error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
