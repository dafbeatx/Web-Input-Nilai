import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { syncAllStudentData } from '@/lib/grademaster/services/studentSync.service';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET: Cek status sinkronisasi antara Pusat Data, Akun Siswa, dan Perilaku (Behavior)
 */
export async function GET() {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang dapat melihat status sinkronisasi' }, { status: 403 });
    }

    const { count: accountsCount } = await supabaseAdmin
      .from('gm_student_accounts')
      .select('*', { count: 'exact', head: true });

    const { count: behaviorsCount } = await supabaseAdmin
      .from('gm_behaviors')
      .select('*', { count: 'exact', head: true });

    const { count: scoresCount } = await supabaseAdmin
      .from('gm_students')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    const { count: smartAbsensiCount } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true });

    const isFullyInSync = (accountsCount || 0) === (behaviorsCount || 0) && 
      (accountsCount || 0) > 0 &&
      (smartAbsensiCount !== null ? (smartAbsensiCount || 0) >= (behaviorsCount || 0) : true);

    return NextResponse.json({
      success: true,
      stats: {
        accountsCount: accountsCount || 0,
        behaviorsCount: behaviorsCount || 0,
        scoresCount: scoresCount || 0,
        smartAbsensiCount: smartAbsensiCount || 0,
        isFullyInSync
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memeriksa status sinkronisasi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST: Jalankan sinkronisasi menyeluruh (Pusat Data, Sikap/Behavior, Akun Siswa & Nilai)
 * Bersifat non-destruktif: tidak ada data yang hilang, nilai, poin sikap, atau password lama tetap terjaga.
 */
export async function POST() {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang dapat menjalankan sinkronisasi data' }, { status: 403 });
    }

    const result = await syncAllStudentData();

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[POST /api/grademaster/data-center/sync] Error:', err);
    const msg = err instanceof Error ? err.message : 'Gagal menyinkronkan data siswa';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

