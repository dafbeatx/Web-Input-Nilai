import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyPassword } from '@/lib/grademaster/security';
import { checkRateLimit } from '@/lib/grademaster/security';
import { createStudentSession } from '@/lib/grademaster/studentAuth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`student_login:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan login' }, { status: 429 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const { data: account, error } = await supabase
      .from('gm_student_accounts')
      .select('id, student_name, class_name, academic_year, username, password_hash, profile_photo_url')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const valid = await verifyPassword(password, account.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    await createStudentSession(account.id);

    return NextResponse.json({
      message: 'Login berhasil',
      student: {
        id: account.id,
        name: account.student_name,
        class_name: account.class_name,
        academic_year: account.academic_year,
        username: account.username,
        photo_url: account.profile_photo_url,
      },
    });
  } catch (err) {
    console.error('Student login error:', err);
    return NextResponse.json({ error: 'Gagal login' }, { status: 500 });
  }
}
