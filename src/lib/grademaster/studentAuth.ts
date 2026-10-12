import { cookies } from 'next/headers';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import { randomBytes } from 'crypto';

const SESSION_COOKIE = 'gm_student_token';
const SESSION_EXPIRY_DAYS = 90; // 90 days persistent login (1 full school quarter/semester)

export async function createStudentSession(accountId: string, userAgent?: string, ipAddress?: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const { error } = await supabase
    .from('gm_student_sessions')
    .insert({
      account_id: accountId,
      token,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent || 'unknown',
      ip_address: ipAddress || 'unknown'
    });

  if (error) throw error;

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'lax' ensures cookies are sent when opening links from WhatsApp / bookmarks / external apps
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
  });

  return token;
}

export async function getStudentSession(explicitToken?: string) {
  const cookieStore = await cookies();
  const token = explicitToken || cookieStore.get(SESSION_COOKIE)?.value;

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
        profile_photo_url,
        google_email,
        study_streak,
        last_active_date
      )
    `)
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;

  const accountData = data.gm_student_accounts as any;

  // Sliding session window: extend expiration so active students stay logged in indefinitely
  try {
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + SESSION_EXPIRY_DAYS);
    await supabase
      .from('gm_student_sessions')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('token', token);

    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
    });
  } catch (slideErr) {
    // Non-blocking sliding expiration failure
    console.warn('[StudentAuth] Sliding session update skipped:', slideErr);
  }

  // Look up the behavior record to get behavior_id and total_points
  const { data: behaviorData } = await supabase
    .from('gm_behaviors')
    .select('id, total_points, avatar_url')
    .eq('student_name', accountData.student_name)
    .eq('class_name', accountData.class_name)
    .maybeSingle();

  return {
    account_id: data.account_id,
    token,
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
      avatar_url: behaviorData?.avatar_url ?? null,
      email: accountData.google_email ?? null,
      study_streak: accountData.study_streak || 0,
      last_active_date: accountData.last_active_date || null,
      isGoogleLinked: true,
    },
  };
}

export async function clearStudentSession(explicitToken?: string) {
  const cookieStore = await cookies();
  const token = explicitToken || cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await supabase
      .from('gm_student_sessions')
      .delete()
      .eq('token', token);
  }

  cookieStore.delete(SESSION_COOKIE);
}
