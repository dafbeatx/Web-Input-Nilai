import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAdminSession } from '@/lib/grademaster/admin';
import { checkRateLimit } from '@/lib/grademaster/security';
import { hashPassword } from '@/lib/grademaster/security';

export const dynamic = 'force-dynamic';

function generateUsername(name: string, className: string): string {
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');

  const classSuffix = className
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return `${cleanName}.${classSuffix}`;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');
    const academicYear = searchParams.get('year') || '2026/2027';
    const mode = searchParams.get('mode');

    // Special mode for login check (does not require admin session)
    if (mode === 'login') {
      const username = searchParams.get('username');
      if (!username) {
        return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('gm_student_accounts')
        .select(`
          id, 
          student_name, 
          class_name, 
          academic_year, 
          username, 
          password_hash, 
          profile_photo_url
        `)
        .eq('username', username.trim().toLowerCase())
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Akun siswa tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json({ account: data });
    }

    // mode: claim - Public directory for student identification (limited fields)
    if (mode === 'claim') {
      const { data, error } = await supabase
        .from('gm_behaviors')
        .select('id, student_name, class_name')
        .order('student_name', { ascending: true });

      if (error) {
        console.error('[GET Student Accounts - Claim] Database error:', error);
        return NextResponse.json({ error: 'Gagal memuat daftar siswa' }, { status: 500 });
      }

      return NextResponse.json({ students: data || [] });
    }

    if (mode === 'classes') {
      const { data, error } = await supabase
        .from('gm_student_accounts')
        .select('class_name')
        .eq('academic_year', academicYear);

      if (error) {
        console.error('[GET Student Accounts - Classes] Database error:', error);
        return NextResponse.json({ error: 'Gagal memuat daftar kelas' }, { status: 500 });
      }

      const classes = Array.from(new Set(((data as { class_name: string }[]) || []).map((d) => d.class_name)));
      return NextResponse.json({ classes });
    }

    // All other modes require admin session
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Sesi admin tidak valid' }, { status: 403 });
    }

    let query = supabase
      .from('gm_student_accounts')
      .select('*')
      .eq('academic_year', academicYear)
      .order('class_name', { ascending: true })
      .order('student_name', { ascending: true });

    if (className) {
      query = query.eq('class_name', className);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[GET Student Accounts] Database error:', error);
      throw error;
    }

    return NextResponse.json({ accounts: data || [] });
  } catch (err: unknown) {
    console.error('Fetch student accounts critical error:', err);
    const msg = err instanceof Error ? err.message : 'Gagal memuat akun siswa';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang dapat membuat akun siswa' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`student_accounts_post:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json();
    const { className, academicYear = '2026/2027', regenerateMissingPasswords = false } = body;

    if (!className) {
      return NextResponse.json({ error: 'Nama kelas wajib diisi' }, { status: 400 });
    }

    // Optional: Regenerate passwords for existing accounts in this class
    if (regenerateMissingPasswords) {
      const { data: accountsToRegen, error: fetchRegenErr } = await supabaseAdmin
        .from('gm_student_accounts')
        .select('id, student_name')
        .eq('class_name', className)
        .eq('academic_year', academicYear);

      if (fetchRegenErr) {
        return NextResponse.json({ error: `Gagal memuat akun: ${fetchRegenErr.message}` }, { status: 500 });
      }

      if (!accountsToRegen || accountsToRegen.length === 0) {
        return NextResponse.json({ error: `Tidak ada akun siswa di kelas ${className} (${academicYear})` }, { status: 404 });
      }

      for (const acc of accountsToRegen) {
        const plainPass = generatePassword();
        const hashPass = await hashPassword(plainPass);
        await supabaseAdmin
          .from('gm_student_accounts')
          .update({
            password_hash: hashPass,
            password_plain: plainPass,
            updated_at: new Date().toISOString()
          })
          .eq('id', acc.id);
      }

      return NextResponse.json({
        message: `Kata sandi berhasil dibuat ulang untuk ${accountsToRegen.length} akun siswa ${className}`,
        regenerated: accountsToRegen.length,
      });
    }

    // Step 1: Fetch students from gm_behaviors (master registry for behavioral tracking)
    const { data: behaviorStudents, error: fetchError } = await supabaseAdmin
      .from('gm_behaviors')
      .select('student_name, class_name')
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .order('student_name', { ascending: true });

    if (fetchError) {
      console.error('[POST Student Accounts] Error fetching from gm_behaviors:', fetchError);
      return NextResponse.json({ error: `Gagal mengambil data siswa: ${fetchError.message}` }, { status: 500 });
    }

    if (!behaviorStudents || behaviorStudents.length === 0) {
      return NextResponse.json({ error: `Tidak ada siswa ditemukan di kelas ${className} (${academicYear})` }, { status: 404 });
    }

    // Step 2: Filter out students who already have an account (strict case-insensitive)
    const { data: existingAccounts, error: existingError } = await supabaseAdmin
      .from('gm_student_accounts')
      .select('student_name')
      .eq('class_name', className)
      .eq('academic_year', academicYear);

    if (existingError) {
      console.error('[POST Student Accounts] Error checking existing accounts:', existingError);
    }

    const existingNames = new Set(((existingAccounts as { student_name: string }[]) || []).map((a) => a.student_name.trim().toLowerCase()));
    const newStudents = ((behaviorStudents as { student_name: string; class_name: string }[]) || []).filter((s) => !existingNames.has(s.student_name.trim().toLowerCase()));

    if (newStudents.length === 0) {
      return NextResponse.json({ message: 'Semua siswa di kelas ini sudah memiliki akun', created: 0 });
    }

    // Step 3: Check all usernames to avoid collisions
    const { data: allUsernames } = await supabaseAdmin
      .from('gm_student_accounts')
      .select('username');

    const usedUsernames = new Set(((allUsernames as { username: string }[]) || []).map((a) => a.username.toLowerCase()));
    interface AccountRow {
      student_name: string;
      class_name: string;
      academic_year: string;
      username: string;
      password_hash: string;
      password_plain: string;
    }
    const accountRows: AccountRow[] = [];

    for (const student of newStudents) {
      const baseUsername = generateUsername(student.student_name, student.class_name);
      let username = baseUsername;
      let counter = 1;

      while (usedUsernames.has(username.toLowerCase())) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
      usedUsernames.add(username.toLowerCase());

      const plainPassword = generatePassword();
      const hashedPassword = await hashPassword(plainPassword);

      accountRows.push({
        student_name: student.student_name,
        class_name: student.class_name,
        academic_year: academicYear,
        username,
        password_hash: hashedPassword,
        password_plain: plainPassword,
      });
    }

    // Step 4: Batch insert the new accounts
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('gm_student_accounts')
      .insert(accountRows)
      .select();

    if (insertError) {
      console.error('[POST Student Accounts] Insert error:', insertError);
      return NextResponse.json({ error: `Gagal menyimpan akun: ${insertError.message}` }, { status: 500 });
    }

    // Step 5: Auto-create behavior records in gm_behaviors
    if (inserted && inserted.length > 0) {
      const behaviorPayload = (inserted as { student_name: string; class_name: string; academic_year?: string }[]).map((acc) => ({
        student_name: acc.student_name,
        class_name: acc.class_name,
        academic_year: acc.academic_year || academicYear,
        total_points: 0,
        behavior_logs: []
      }));
      await supabaseAdmin
        .from('gm_behaviors')
        .upsert(behaviorPayload, { onConflict: 'student_name,class_name,academic_year', ignoreDuplicates: true });
    }

    return NextResponse.json({
      message: `${inserted?.length || 0} akun siswa berhasil dibuat untuk ${className}`,
      created: inserted?.length || 0,
    });
  } catch (err: unknown) {
    console.error('Create student accounts critical error:', err);
    const msg = err instanceof Error ? err.message : 'Gagal membuat akun siswa';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang dapat mereset kata sandi' }, { status: 403 });
    }

    const body = await req.json();
    const { accountId, customPassword } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID wajib diisi' }, { status: 400 });
    }

    let newPassword = '';
    if (typeof customPassword === 'string' && customPassword.trim().length > 0) {
      if (customPassword.trim().length < 4) {
        return NextResponse.json({ error: 'Kata sandi minimal 4 karakter' }, { status: 400 });
      }
      newPassword = customPassword.trim();
    } else {
      newPassword = generatePassword();
    }

    const hashedPassword = await hashPassword(newPassword);

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('gm_student_accounts')
      .update({
        password_hash: hashedPassword,
        password_plain: newPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .select('id, student_name, class_name, academic_year, username, password_plain')
      .single();

    if (updateErr || !updated) {
      console.error('[PATCH Student Accounts] Update error:', updateErr);
      return NextResponse.json({ error: `Gagal memperbarui kata sandi: ${updateErr?.message || 'Akun tidak ditemukan'}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Kata sandi untuk ${updated.student_name} berhasil dibuat ulang: ${newPassword}`,
      account: updated,
      newPassword
    });
  } catch (err: unknown) {
    console.error('Reset student password critical error:', err);
    const msg = err instanceof Error ? err.message : 'Gagal mereset kata sandi siswa';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID wajib diisi' }, { status: 400 });
    }

    // Look up account first to check if there is a linked google_email, student_name, class_name, academic_year
    const { data: account } = await supabaseAdmin
      .from('gm_student_accounts')
      .select('id, google_email, student_name, class_name, academic_year')
      .eq('id', accountId)
      .maybeSingle();

    if (account?.google_email) {
      const email = account.google_email.toLowerCase().trim();
      const adminDomains = ['@guru.smp.belajar.id', '@guru.belajar.id', '@smp.belajar.id', '@admin.belajar.id'];
      const isWhitelisted = adminDomains.some(d => email.endsWith(d)) || email === 'dafbeatx@gmail.com';
      if (!isWhitelisted) {
        try {
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          const targetUser = usersData?.users?.find(u => u.email?.toLowerCase().trim() === email);
          if (targetUser && targetUser.app_metadata?.role !== 'admin') {
            await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
          }
        } catch (e) {
          console.warn('[DELETE Student Account] Could not delete Google auth user:', e);
        }
      }
    }

    // 1. Delete from gm_student_accounts (both by accountId and case-insensitive student_name in that class & year)
    if (account?.student_name && account?.class_name) {
      const { error: delAccErr } = await supabaseAdmin
        .from('gm_student_accounts')
        .delete()
        .ilike('student_name', account.student_name.trim())
        .eq('class_name', account.class_name)
        .eq('academic_year', account.academic_year || '2026/2027');

      if (delAccErr) {
        console.error('[DELETE Student Account] Error deleting matching accounts:', delAccErr);
      }
    } else {
      const { error } = await supabaseAdmin
        .from('gm_student_accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('[DELETE Student Account] Error:', error);
        throw error;
      }
    }

    // 2. Also delete from gm_behaviors so the student does not resurrect when Generate / sync runs!
    if (account?.student_name && account?.class_name) {
      const { error: delBehErr } = await supabaseAdmin
        .from('gm_behaviors')
        .delete()
        .ilike('student_name', account.student_name.trim())
        .eq('class_name', account.class_name)
        .eq('academic_year', account.academic_year || '2026/2027');

      if (delBehErr) {
        console.warn('[DELETE Student Account] Warning deleting from gm_behaviors:', delBehErr);
      }
    }

    return NextResponse.json({ message: `Akun dan data siswa ${account?.student_name || ''} berhasil dihapus permanen` });
  } catch (err: unknown) {
    console.error('Delete student account critical error:', err);
    const msg = err instanceof Error ? err.message : 'Gagal menghapus akun siswa';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
