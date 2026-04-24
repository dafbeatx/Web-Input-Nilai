import { cookies } from 'next/headers';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
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
      gm_student_accounts!inner (
        id,
        student_name,
        class_name,
        academic_year,
        username,
        profile_photo_url
      )
    `)
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;

  const accountData = data.gm_student_accounts as any;

  // Look up the behavior record to get behavior_id and total_points
  // gm_behavior_logs uses gm_behaviors.id (not gm_student_accounts.id)
  const { data: behaviorData } = await supabase
    .from('gm_behaviors')
    .select('id, total_points')
    .eq('student_name', accountData.student_name)
    .eq('class_name', accountData.class_name)
    .maybeSingle();

  return {
    account_id: data.account_id,
    role: 'student' as const,
    student: {
      id: accountData.id,
      behavior_id: behaviorData?.id ?? null,
      total_points: behaviorData?.total_points ?? 0,
      name: accountData.student_name,
      class_name: accountData.class_name,
      academic_year: accountData.academic_year,
      username: accountData.username,
      photo_url: accountData.profile_photo_url,
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
