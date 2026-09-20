import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;

/**
 * Helper to retrieve the Supabase Admin Client.
 * Dynamically resolves environment variables and falls back to publishable/anon key if service role is not set.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase Client configuration is missing. " +
      "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set."
    );
  }

  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return clientInstance;
}

// Guarded export for backward compatibility without using unsafe 'null as any'
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const adminClient = getSupabaseAdmin();
    const value = Reflect.get(adminClient, prop);
    return typeof value === 'function' ? value.bind(adminClient) : value;
  },
});
