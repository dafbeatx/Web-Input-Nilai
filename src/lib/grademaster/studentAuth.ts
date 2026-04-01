import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase/client';
import { randomBytes } from 'crypto';

const SESSION_COOKIE = 'gm_student_token';
const SESSION_EXPIRY_DAYS = 7;

export async function createStudentSession(accountId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const { error } = await supabase
    .from('gm_student_sessions')
    .insert({
      account_id: accountId,
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

export async function getStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const { data, error } = await supabase
    .from('gm_student_sessions')
    .select(`
      account_id,
      gm_students!inner (
        id,
        name,
        class_name,
        academic_year,
        username,
        photo_url
      )
    `)
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;

  const account = data.gm_students as any;

  return {
    account_id: data.account_id,
    role: 'student' as const,
    student: {
      id: account.id,
      name: account.name,
      class_name: account.class_name,
      academic_year: account.academic_year,
      username: account.username,
      photo_url: account.photo_url,
    },
  };
}

export async function clearStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await supabase
      .from('gm_student_sessions')
      .delete()
      .eq('token', token);
  }

  cookieStore.delete(SESSION_COOKIE);
}
