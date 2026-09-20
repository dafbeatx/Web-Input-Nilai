import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;
let fallbackClientInstance: SupabaseClient | null = null;
let isServiceRoleForceDisabled = false;

/**
 * Helper to clean and validate API keys from environment variables.
 * Strips accidental wrapping quotes and rejects placeholder/dummy values.
 */
function cleanKey(key?: string | null): string | null {
  if (!key) return null;
  const trimmed = key.trim().replace(/^["']|["']$/g, '').trim();
  if (
    !trimmed ||
    trimmed.startsWith('your_') ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed.length < 20
  ) {
    return null;
  }
  return trimmed;
}

/**
 * Verifies whether a JWT token belongs to the project ref defined in Supabase URL.
 */
function isMatchingProjectRef(token: string, supabaseUrl: string): boolean {
  try {
    const urlMatch = supabaseUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
    if (!urlMatch) return true; // Non-standard or custom domain

    const targetRef = urlMatch[1].toLowerCase();

    // Check if token is a standard JWT with 3 dot-separated parts
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.ref && typeof payload.ref === 'string') {
        const tokenRef = payload.ref.toLowerCase();
        if (tokenRef !== targetRef) {
          console.warn(
            `[SupabaseAdmin] SUPABASE_SERVICE_ROLE_KEY project ref (${tokenRef}) does not match URL project ref (${targetRef}). Discarding invalid key.`
          );
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    console.warn('[SupabaseAdmin] Error verifying JWT project ref:', err);
    return false;
  }
}

/**
 * Marks the service role client as invalid (e.g. if Supabase returns 'Invalid API key')
 * and forces all future queries to use the fallback client.
 */
export function markServiceRoleInvalid() {
  if (!isServiceRoleForceDisabled) {
    console.warn('[SupabaseAdmin] Service role key revoked or invalid. Switching to fallback client.');
    isServiceRoleForceDisabled = true;
    clientInstance = null;
  }
}

/**
 * Helper to retrieve the Supabase Admin Client.
 * Dynamically sanitizes keys and falls back to publishable/anon key if service role is missing, invalid, or for another project.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawServiceKey = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const fallbackKey =
    cleanKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing in environment variables.');
  }

  // Determine valid service role key
  let validServiceKey: string | null = null;
  if (!isServiceRoleForceDisabled && rawServiceKey) {
    if (isMatchingProjectRef(rawServiceKey, supabaseUrl)) {
      validServiceKey = rawServiceKey;
    }
  }

  const selectedKey = validServiceKey || fallbackKey;

  if (!selectedKey) {
    throw new Error(
      'Supabase Client configuration is missing. ' +
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, selectedKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return clientInstance;
}

/**
 * Retrieves the fallback Supabase client using public/anon credentials.
 */
export function getSupabaseFallback(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const fallbackKey =
    cleanKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !fallbackKey) {
    throw new Error('Fallback Supabase client credentials missing.');
  }

  if (!fallbackClientInstance) {
    fallbackClientInstance = createClient(supabaseUrl, fallbackKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return fallbackClientInstance;
}

// Guarded export for backward compatibility without using unsafe 'null as any'
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const adminClient = getSupabaseAdmin();
    const value = Reflect.get(adminClient, prop);
    return typeof value === 'function' ? value.bind(adminClient) : value;
  },
});
