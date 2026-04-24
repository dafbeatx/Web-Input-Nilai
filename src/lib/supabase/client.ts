import { createBrowserClient } from '@supabase/ssr';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Only initialize if keys are present to avoid build-time crashes
export const supabase = (supabaseUrl && supabaseKey) 
  ? createBrowserClient(supabaseUrl, supabaseKey)
  : null as any;
