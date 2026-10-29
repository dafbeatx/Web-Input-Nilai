import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const { className, academicYear = '2026/2027' } = body;

    let query = supabaseAdmin
      .from('gm_student_accounts')
      .update({ password_plain: null, updated_at: new Date().toISOString() })
      .eq('academic_year', academicYear);

    if (className) {
      query = query.eq('class_name', className);
    }

    const { error } = await query;
    if (error) throw error;

    const scope = className || 'semua kelas';
    return NextResponse.json({
      message: `Password plain berhasil dihapus untuk ${scope} (${academicYear})`,
    });
  } catch (err: unknown) {
    console.error('Clear passwords error:', err);
    const msg = err instanceof Error ? err.message : 'Gagal menghapus password';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
