// Supabase configuration and initialization
// Make sure to include the Supabase CDN in index.html before this script

// ---------------------------------------------------------
// MASUKKAN KREDENSIAL SUPABASE ANDA DI SINI (UNTUK VERCEL):
// ---------------------------------------------------------
var SUPABASE_URL = 'https://fwhdjqvtjzesbdcqorsn.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aGRqcXZ0anplc2JkY3FvcnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3MjMxMTUsImV4cCI6MjA1NjI5OTExNX0.fDIfTfWeM-3l_XzF9mN0xV1YdKsV9QfV1r1J7R_5XWQ';
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
