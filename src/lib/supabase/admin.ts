import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let clientInstance: SupabaseClient | null = null;

/**
 * Helper to retrieve the Supabase Admin Client.
 * Throws an explicit error if the required environment variables are not configured.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase Admin Client configuration is missing. " +
      "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment variables."
    );
  }

  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
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

