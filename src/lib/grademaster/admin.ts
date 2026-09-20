import { createClient } from '@/lib/supabase/server';

export async function getAdminSession() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const email = user.email?.toLowerCase() || '';
    const adminDomains = ['@guru.smp.belajar.id', '@guru.belajar.id', '@smp.belajar.id', '@admin.belajar.id'];
    const isWhitelisted = adminDomains.some(domain => email.endsWith(domain)) || email === 'dafbeatx@gmail.com';

    // Verify they are actually an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin' && !isWhitelisted) {
      return null;
    }

    return {
      user_id: user.id,
      admin_users: { username: user.email || '' }, // Mock old structure to avoid breaking dependent APIs
    };
  } catch (err) {
    console.warn('getAdminSession caught error, defaulting to null:', err);
    return null;
  }
}

// These are now obsolete due to Supabase Auth, kept as no-ops to prevent immediate crashes
export async function createAdminSession() { return null; }
export async function clearAdminSession() { }

