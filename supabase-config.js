// Supabase configuration and initialization
// Make sure to include the Supabase CDN in index.html before this script

// ---------------------------------------------------------
// MASUKKAN KREDENSIAL SUPABASE ANDA DI SINI (UNTUK VERCEL):
// ---------------------------------------------------------
const SUPABASE_URL = 'https://fwhdjqvtjzesbdcqorsn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwh41NF8iwUaRXL8A6t05g_sK7k5JL3';
// ---------------------------------------------------------

let supabaseClient = null;

function initSupabase(url, key) {
    if (url && key && url !== 'YOUR_SUPABASE_PROJECT_URL') {
        try {
            supabaseClient = supabase.createClient(url, key);
            console.log('Supabase initialized successfully for:', url);
            return true;
        } catch (e) {
            console.error('Failed to create Supabase client:', e);
            return false;
        }
    }
    console.warn('Supabase credentials not configured.');
    return false;
}
