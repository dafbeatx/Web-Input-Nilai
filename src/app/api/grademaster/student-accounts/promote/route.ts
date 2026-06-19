import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { checkRateLimit } from '@/lib/grademaster/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Sesi admin tidak valid' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`student_accounts_promote:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const { fromClass, toClass, fromYear, toYear } = body;

    if (!fromClass || !toClass || !fromYear || !toYear) {
      return NextResponse.json({ error: 'Seluruh parameter (fromClass, toClass, fromYear, toYear) wajib diisi' }, { status: 400 });
    }

    // 1. Ambil daftar siswa yang aktif di kelas asal
    const { data: studentsToPromote, error: selectError } = await supabase
      .from('gm_student_accounts')
      .select('student_name')
      .eq('class_name', fromClass.trim())
      .eq('academic_year', fromYear.trim());

    if (selectError) {
      console.error('[PROMOTE Student Accounts] Select error:', selectError);
      return NextResponse.json({ error: `Gagal mengambil data siswa kelas asal: ${selectError.message}` }, { status: 500 });
    }

    if (!studentsToPromote || studentsToPromote.length === 0) {
      return NextResponse.json({ error: `Tidak ada siswa ditemukan di kelas ${fromClass} untuk tahun ajaran ${fromYear}` }, { status: 404 });
    }

    // 2. Pembaruan massal (mass update) tabel gm_student_accounts
    const { error: updateError } = await supabase
      .from('gm_student_accounts')
      .update({
        class_name: toClass.trim(),
        academic_year: toYear.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('class_name', fromClass.trim())
      .eq('academic_year', fromYear.trim());

    if (updateError) {
      console.error('[PROMOTE Student Accounts] Update error:', updateError);
      return NextResponse.json({ error: `Gagal memperbarui akun siswa: ${updateError.message}` }, { status: 500 });
    }

    // 3. Masukkan baris baru di gm_behaviors untuk pencatatan perilaku di kelas & tahun ajaran baru
    const behaviorRows = studentsToPromote.map(student => ({
      student_name: student.student_name,
      class_name: toClass.trim(),
      academic_year: toYear.trim(),
      total_points: 100,
      behavior_logs: []
    }));

    const { error: behaviorError } = await supabase
      .from('gm_behaviors')
      .upsert(behaviorRows, { onConflict: 'student_name,class_name,academic_year' });

    if (behaviorError) {
      console.error('[PROMOTE Student Accounts] Error inserting new behaviors:', behaviorError);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mempromosikan ${studentsToPromote.length} siswa dari kelas ${fromClass} (${fromYear}) ke kelas ${toClass} (${toYear})`
    });

  } catch (err: any) {
    console.error('[PROMOTE Student Accounts] Critical error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memproses kenaikan kelas' }, { status: 500 });
  }
}
