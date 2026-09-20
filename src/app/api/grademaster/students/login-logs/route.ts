import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getStudentSession } from '@/lib/grademaster/studentAuth';
import { getAdminSession } from '@/lib/grademaster/admin';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

async function getDb(): Promise<SupabaseClient> {
  try {
    return supabaseAdmin;
  } catch {
    return await createClient();
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentName = searchParams.get('name');
    const className = searchParams.get('class');

    let db: SupabaseClient = await getDb();

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
    let accountQuery = db
      .from('gm_student_accounts')
      .select('id')
      .eq('student_name', targetStudentName);

    if (targetClassName) {
      accountQuery = accountQuery.eq('class_name', targetClassName);
    }

    let { data: account, error: accountError } = await accountQuery.maybeSingle();

    if (accountError && accountError.message?.includes('Invalid API key')) {
      db = await createClient();
      let retryQuery = db
        .from('gm_student_accounts')
        .select('id')
        .eq('student_name', targetStudentName);
      if (targetClassName) retryQuery = retryQuery.eq('class_name', targetClassName);
      const retryRes = await retryQuery.maybeSingle();
      account = retryRes.data;
      accountError = retryRes.error;
    }

    if (accountError) throw accountError;

    if (!account) {
      return NextResponse.json({ logs: [] });
    }

    // 2. Fetch login logs
    let { data: logs, error: logsError } = await db
      .from('gm_student_login_logs')
      .select('id, ip_address, user_agent, created_at')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (logsError && logsError.message?.includes('Invalid API key')) {
      db = await createClient();
      const retryLogs = await db
        .from('gm_student_login_logs')
        .select('id, ip_address, user_agent, created_at')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(50);
      logs = retryLogs.data;
      logsError = retryLogs.error;
    }

    if (logsError) throw logsError;

    return NextResponse.json({ logs: logs || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat riwayat login';
    console.error('Failed to get student login logs:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
