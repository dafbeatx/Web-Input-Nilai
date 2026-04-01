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

    if (mode === 'login') {
      const username = searchParams.get('username');
      if (!username) {
        return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('gm_students')
        .select('id, name, class_name, academic_year, username, password_hash, photo_url')
        .eq('username', username)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json({ account: data });
    }

    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    let query = supabase
      .from('gm_students')
      .select('*')
      .eq('academic_year', academicYear)
      .order('class_name', { ascending: true })
      .order('name', { ascending: true });

    if (className) {
      query = query.eq('class_name', className);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ accounts: data || [] });
  } catch (err: any) {
    console.error('Fetch student accounts error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { className, academicYear = '2025/2026' } = body;

    if (!className) {
      return NextResponse.json({ error: 'Nama kelas wajib diisi' }, { status: 400 });
    }

    const { data: behaviorStudents, error: fetchError } = await supabase
      .from('gm_behaviors')
      .select('name, class_name')
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .order('name', { ascending: true });

    if (fetchError) throw fetchError;

    if (!behaviorStudents || behaviorStudents.length === 0) {
      return NextResponse.json({ error: 'Tidak ada siswa ditemukan di kelas ini' }, { status: 404 });
    }

    const { data: existingAccounts } = await supabase
      .from('gm_students')
      .select('name')
      .eq('class_name', className)
      .eq('academic_year', academicYear);

    const existingNames = new Set((existingAccounts || []).map(a => a.name));

    const newStudents = behaviorStudents.filter(s => !existingNames.has(s.name));

    if (newStudents.length === 0) {
      return NextResponse.json({ message: 'Semua siswa sudah memiliki akun', created: 0 });
    }

    const { data: allUsernames } = await supabase
      .from('gm_students')
      .select('username');

    const usedUsernames = new Set((allUsernames || []).map(a => a.username));

    const accountRows = [];

    for (const student of newStudents) {
      let baseUsername = generateUsername(student.name, student.class_name);
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
        name: student.name,
        class_name: student.class_name,
        academic_year: academicYear,
        username,
        password_hash: hashedPassword,
        password_plain: plainPassword,
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('gm_students')
      .insert(accountRows)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({
      message: `${inserted?.length || 0} akun siswa berhasil dibuat untuk ${className}`,
      created: inserted?.length || 0,
    });
  } catch (err: any) {
    console.error('Create student accounts error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
      .from('gm_students')
      .delete()
      .eq('id', accountId);

    if (error) throw error;

    return NextResponse.json({ message: 'Akun siswa berhasil dihapus' });
  } catch (err: any) {
    console.error('Delete student account error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
