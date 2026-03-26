import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyPassword } from '@/lib/grademaster/security';
import { createAdminSession } from '@/lib/grademaster/admin';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, password_hash')
      .eq('username', username)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    await createAdminSession(user.id);

    return NextResponse.json({ message: 'Login berhasil', username });
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json({ error: 'Gagal login admin' }, { status: 500 });
  }
}
