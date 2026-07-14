import { createBrowserClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';

// Safe storage polyfill for strict webviews (e.g. Telegram Mini Apps)
if (typeof window !== 'undefined') {
  try {
    const _test = window.sessionStorage;
  } catch (e) {
    const mockStorage = {
      _data: {} as Record<string, string>,
      setItem: function(id: string, val: string) { return this._data[id] = String(val); },
      getItem: function(id: string) { return this._data.hasOwnProperty(id) ? this._data[id] : null; },
      removeItem: function(id: string) { return delete this._data[id]; },
      clear: function() { return this._data = {}; },
      key: function(i: number) { return Object.keys(this._data)[i] || null; },
      get length() { return Object.keys(this._data).length; }
    };
    try { Object.defineProperty(window, 'sessionStorage', { value: mockStorage, configurable: true, enumerable: true, writable: false }); } catch (err) {}
    try { Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true, enumerable: true, writable: false }); } catch (err) {}
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;
let currentStorageType: 'local' | 'session' | null = null;

/**
 * Helper to retrieve the client-side Supabase Client.
 * Throws an explicit error if the required environment variables are not configured.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase Client configuration is missing. " +
      "Please ensure NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment variables."
    );
  }

  const targetStorageType = typeof window !== 'undefined' && localStorage.getItem('gm_remember_me') === 'false' ? 'session' : 'local';

  if (!clientInstance || currentStorageType !== targetStorageType) {
    currentStorageType = targetStorageType;
    clientInstance = createBrowserClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: typeof window !== 'undefined'
          ? (targetStorageType === 'local' ? window.localStorage : window.sessionStorage)
          : undefined,
        persistSession: true,
      },
      cookieOptions: {
        maxAge: targetStorageType === 'local' ? 60 * 60 * 24 * 365 : undefined,
      }
    });
  }

  return clientInstance;
}

// Guarded export for backward compatibility without using unsafe 'null as any'
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
