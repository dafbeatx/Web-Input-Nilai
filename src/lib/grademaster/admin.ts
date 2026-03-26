import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase/client';
import { randomBytes } from 'crypto';

const SESSION_COOKIE = 'gm_admin_token';
const SESSION_EXPIRY_DAYS = 7;

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const { error } = await supabase.rpc('create_admin_session', {
    p_user_id: userId,
    p_token: token,
    p_expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
  });

  return token;
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const { data: sessionData, error } = await supabase.rpc('get_admin_session_data', {
    p_token: token,
  });

  if (error || !sessionData || sessionData.length === 0) return null;

  return {
    user_id: sessionData[0].user_id,
    admin_users: { username: sessionData[0].username },
  };
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await supabase.rpc('delete_admin_session', { p_token: token });
  }

  cookieStore.delete(SESSION_COOKIE);
}
