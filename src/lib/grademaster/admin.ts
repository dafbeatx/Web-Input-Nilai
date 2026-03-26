import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase/client';
import { randomBytes } from 'crypto';

const SESSION_COOKIE = 'gm_admin_token';
const SESSION_EXPIRY_DAYS = 7;

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const { error } = await supabase
    .from('gm_admin_sessions')
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
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

  const { data: session, error } = await supabase
    .from('gm_admin_sessions')
    .select('user_id, admin_users(username)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !session) return null;

  return session;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await supabase
      .from('gm_admin_sessions')
      .delete()
      .eq('token', token);
  }

  cookieStore.delete(SESSION_COOKIE);
}
