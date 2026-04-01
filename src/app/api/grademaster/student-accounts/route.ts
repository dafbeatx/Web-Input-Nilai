import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/grademaster/admin';
import { checkRateLimit } from '@/lib/grademaster/security';
import { hashPassword } from '@/lib/grademaster/security';

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
    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');
    const academicYear = searchParams.get('year') || '2025/2026';
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
  } catch (err: any) {
    console.error('Fetch student accounts critical error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat akun siswa' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang dapat membuat akun siswa' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`student_accounts_post:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json();
    const { className, academicYear = '2025/2026' } = body;

    if (!className) {
      return NextResponse.json({ error: 'Nama kelas wajib diisi' }, { status: 400 });
    }

    // Step 1: Fetch students from gm_behaviors (master registry for behavioral tracking)
    const { data: behaviorStudents, error: fetchError } = await supabase
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

    // Step 2: Filter out students who already have an account
    const { data: existingAccounts, error: existingError } = await supabase
      .from('gm_student_accounts')
      .select('student_name')
      .eq('class_name', className)
      .eq('academic_year', academicYear);

    if (existingError) {
      console.error('[POST Student Accounts] Error checking existing accounts:', existingError);
    }

    const existingNames = new Set((existingAccounts || []).map(a => a.student_name));
    const newStudents = behaviorStudents.filter(s => !existingNames.has(s.student_name));

    if (newStudents.length === 0) {
      return NextResponse.json({ message: 'Semua siswa di kelas ini sudah memiliki akun', created: 0 });
    }

    // Step 3: Check all usernames to avoid collisions
    const { data: allUsernames } = await supabase
      .from('gm_student_accounts')
      .select('username');

    const usedUsernames = new Set((allUsernames || []).map(a => a.username));
    const accountRows = [];

    for (const student of newStudents) {
      let baseUsername = generateUsername(student.student_name, student.class_name);
      let username = baseUsername;
      let counter = 1;

      while (usedUsernames.has(username)) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
      usedUsernames.add(username);

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
    const { data: inserted, error: insertError } = await supabase
      .from('gm_student_accounts')
      .insert(accountRows)
      .select();

    if (insertError) {
      console.error('[POST Student Accounts] Insert error:', insertError);
      return NextResponse.json({ error: `Gagal menyimpan akun: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      message: `${inserted?.length || 0} akun siswa berhasil dibuat untuk ${className}`,
      created: inserted?.length || 0,
    });
  } catch (err: any) {
    console.error('Create student accounts critical error:', err);
    return NextResponse.json({ error: err.message || 'Gagal membuat akun siswa' }, { status: 500 });
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

    const { error } = await supabase
      .from('gm_student_accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      console.error('[DELETE Student Account] Error:', error);
      throw error;
    }

    return NextResponse.json({ message: 'Akun siswa berhasil dihapus' });
  } catch (err: any) {
    console.error('Delete student account critical error:', err);
    return NextResponse.json({ error: err.message || 'Gagal menghapus akun siswa' }, { status: 500 });
  }
}
