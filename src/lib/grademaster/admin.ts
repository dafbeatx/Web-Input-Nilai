import { createClient } from '@/lib/supabase/server';

export async function getAdminSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Verify they are actually an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return null;
  }

  return {
    user_id: user.id,
    admin_users: { username: user.email || '' }, // Mock old structure to avoid breaking dependent APIs
  };
}

// These are now obsolete due to Supabase Auth, kept as no-ops to prevent immediate crashes
export async function createAdminSession(userId: string) { return null; }
export async function clearAdminSession() { }
