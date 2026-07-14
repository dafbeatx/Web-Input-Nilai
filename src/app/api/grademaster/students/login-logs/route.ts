import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/grademaster/studentAuth';
import { getAdminSession } from '@/lib/grademaster/admin';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentName = searchParams.get('name');
    const className = searchParams.get('class');

    const adminSession = await getAdminSession();
    const studentSession = await getStudentSession();
    
    let targetStudentName = studentName;
    let targetClassName = className;

    if (studentSession) {
      // Siswa login: paksa agar hanya mengambil data dirinya sendiri
      targetStudentName = studentSession.student.name;
      targetClassName = studentSession.student.class_name;
    } else if (!adminSession) {
      // Orang tua / Guest: periksa cookie gm_parent_student
      const cookieStore = await cookies();
      const parentStudent = cookieStore.get('gm_parent_student')?.value;
      if (parentStudent) {
        targetStudentName = parentStudent;
      } else {
        // Jika tidak ada session admin, siswa, maupun parent cookie, tolak akses demi keamanan data
        return NextResponse.json({ error: 'Akses ditolak: Sesi tidak valid' }, { status: 403 });
      }
    }

    if (!targetStudentName) {
      return NextResponse.json({ error: 'Nama siswa wajib diisi atau ditentukan' }, { status: 400 });
    }

    // 1. Resolve student account
    let accountQuery = supabaseAdmin
      .from('gm_student_accounts')
      .select('id')
      .eq('student_name', targetStudentName);

    if (targetClassName) {
      accountQuery = accountQuery.eq('class_name', targetClassName);
    }

    const { data: account, error: accountError } = await accountQuery.maybeSingle();

    if (accountError) throw accountError;

    if (!account) {
      return NextResponse.json({ logs: [] });
    }

    // 2. Fetch login logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('gm_student_login_logs')
      .select('id, ip_address, user_agent, created_at')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (logsError) throw logsError;

    return NextResponse.json({ logs: logs || [] });
  } catch (err: any) {
    console.error('Failed to get student login logs:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat riwayat login' }, { status: 500 });
  }
}
