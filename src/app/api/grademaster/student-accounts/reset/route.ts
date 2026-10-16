import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ADMIN_DOMAINS = ['@guru.smp.belajar.id', '@guru.belajar.id', '@smp.belajar.id', '@admin.belajar.id'];
const ADMIN_SPECIFIC_EMAILS = ['dafbeatx@gmail.com'];

function isProtectedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (ADMIN_SPECIFIC_EMAILS.includes(lower)) return true;
  return ADMIN_DOMAINS.some((domain) => lower.endsWith(domain));
}

async function getProtectedAdminIdsAndEmails() {
  const protectedEmails = new Set<string>(ADMIN_SPECIFIC_EMAILS);
  const protectedIds = new Set<string>();

  try {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role');

    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        if (p.role === 'admin' || isProtectedAdminEmail(p.email)) {
          if (p.id) protectedIds.add(p.id);
          if (p.email) protectedEmails.add(p.email.toLowerCase().trim());
        }
      }
    }
  } catch (err) {
    console.warn('[ResetAccounts] Failed to fetch admin profiles:', err);
  }

  return { protectedIds, protectedEmails };
}

async function deleteStudentAuthUsers(targetEmails?: Set<string>): Promise<number> {
  const { protectedIds, protectedEmails } = await getProtectedAdminIdsAndEmails();
  let deletedCount = 0;
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data || !data.users || data.users.length === 0) {
      break;
    }

    for (const user of data.users) {
      const email = user.email?.toLowerCase().trim() || '';

      // Strictly protect admins and teachers
      if (
        protectedIds.has(user.id) ||
        protectedEmails.has(email) ||
        isProtectedAdminEmail(email) ||
        user.app_metadata?.role === 'admin'
      ) {
        continue;
      }

      // If filtering by target emails (class scope)
      if (targetEmails && targetEmails.size > 0 && !targetEmails.has(email)) {
        continue;
      }

      // Delete this student Google auth account
      try {
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (!delErr) {
          deletedCount++;
        } else {
          console.warn(`[ResetAccounts] Failed to delete auth user ${user.id} (${email}):`, delErr.message);
        }
      } catch (userErr) {
        console.warn(`[ResetAccounts] Exception deleting auth user ${user.id}:`, userErr);
      }
    }

    if (data.users.length < perPage) {
      break;
    }
    page++;
  }

  return deletedCount;
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang dapat mereset akun siswa' }, { status: 403 });
    }

    const body = await req.json();
    const {
      scope = 'class',
      className,
      academicYear = '2025/2026',
      resetGoogle = true,
    } = body;

    if (scope === 'class' && !className) {
      return NextResponse.json({ error: 'Nama kelas wajib diisi untuk reset per kelas' }, { status: 400 });
    }

    let deletedAccountsCount = 0;
    let deletedGoogleCount = 0;

    if (scope === 'all') {
      // 1. Reset all student accounts
      // First, get count of existing accounts to report back
      const { count: totalAccounts } = await supabaseAdmin
        .from('gm_student_accounts')
        .select('*', { count: 'exact', head: true });

      // If resetGoogle is requested, delete all non-admin student users from Supabase Auth
      if (resetGoogle) {
        deletedGoogleCount = await deleteStudentAuthUsers();
      }

      // Delete all student accounts from gm_student_accounts
      // Cascades automatically delete gm_student_sessions, gm_student_login_logs, gm_push_subscriptions
      const { error: delError } = await supabaseAdmin
        .from('gm_student_accounts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (delError) {
        console.error('[ResetAccounts] Error resetting all student accounts:', delError);
        return NextResponse.json({ error: `Gagal mereset akun siswa: ${delError.message}` }, { status: 500 });
      }

      deletedAccountsCount = totalAccounts || 0;

      return NextResponse.json({
        success: true,
        message: `Berhasil mereset seluruh akun siswa (${deletedAccountsCount} akun) dan ${deletedGoogleCount} sesi Google. Data nilai dan perilaku siswa tetap aman!`,
        deletedAccountsCount,
        deletedGoogleCount,
      });
    } else {
      // 2. Reset accounts for specific class
      const { data: classAccounts, error: fetchErr } = await supabaseAdmin
        .from('gm_student_accounts')
        .select('id, google_email')
        .eq('class_name', className)
        .eq('academic_year', academicYear);

      if (fetchErr) {
        console.error('[ResetAccounts] Error fetching class accounts:', fetchErr);
        return NextResponse.json({ error: `Gagal memuat akun kelas ${className}: ${fetchErr.message}` }, { status: 500 });
      }

      const accountsList = classAccounts || [];
      const classGoogleEmails = new Set<string>();

      for (const acc of accountsList) {
        if (acc.google_email) {
          classGoogleEmails.add(acc.google_email.toLowerCase().trim());
        }
      }

      if (resetGoogle && classGoogleEmails.size > 0) {
        deletedGoogleCount = await deleteStudentAuthUsers(classGoogleEmails);
      }

      const { error: delError } = await supabaseAdmin
        .from('gm_student_accounts')
        .delete()
        .eq('class_name', className)
        .eq('academic_year', academicYear);

      if (delError) {
        console.error(`[ResetAccounts] Error deleting accounts for class ${className}:`, delError);
        return NextResponse.json({ error: `Gagal mereset akun kelas ${className}: ${delError.message}` }, { status: 500 });
      }

      deletedAccountsCount = accountsList.length;

      return NextResponse.json({
        success: true,
        message: `Berhasil mereset akun siswa kelas ${className} (${deletedAccountsCount} akun) dan ${deletedGoogleCount} akun Google terkait. Data nilai dan perilaku tetap aman!`,
        deletedAccountsCount,
        deletedGoogleCount,
      });
    }
  } catch (err: unknown) {
    console.error('[ResetAccounts] Critical error:', err);
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat mereset akun siswa';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
