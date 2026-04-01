import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const { className, academicYear = '2025/2026' } = body;

    let query = supabase
      .from('gm_students')
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
  } catch (err: any) {
    console.error('Clear passwords error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
