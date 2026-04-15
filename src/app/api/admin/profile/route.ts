import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/grademaster/admin';
import { hashPassword } from '@/lib/grademaster/security';

export async function PUT(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak ada akses (Unauthorized)' }, { status: 401 });
    }

    const { username, password, remedialPassword } = await req.json();

    if (!username || username.trim().length < 3) {
      return NextResponse.json({ error: 'Username minimal 3 karakter' }, { status: 400 });
    }

    if (!password || password.trim().length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    const { data: existingUser, error: checkError } = await supabase.rpc('get_admin_user', {
      p_username: username.trim()
    });

    if (!checkError && existingUser && existingUser.length > 0 && existingUser[0].id !== session.user_id) {
      return NextResponse.json({ error: 'Username sudah digunakan oleh admin lain' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password.trim());

    const { error: updateError } = await supabase.rpc('update_admin_user', {
      p_user_id: session.user_id,
      p_username: username.trim(),
      p_password_hash: passwordHash
    });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ message: 'Profil admin berhasil diperbarui' });
  } catch (err: any) {
    console.error('Update admin profile error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui profil admin' }, { status: 500 });
  }
}
