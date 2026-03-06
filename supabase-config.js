// Supabase configuration and initialization
// Make sure to include the Supabase CDN in index.html before this script

// ---------------------------------------------------------
// MASUKKAN KREDENSIAL SUPABASE ANDA DI SINI (UNTUK VERCEL):
// ---------------------------------------------------------
const MY_SUPABASE_URL = 'https://fwhdjqvtjzesbdcqorsn.supabase.co';
const MY_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aGRqcXZ0anplc2JkY3FvcnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3MjMxMTUsImV4cCI6MjA1NjI5OTExNX0.fDIfTfWeM-3l_XzF9mN0xV1YdKsV9QfV1r1J7R_5XWQ';
// ---------------------------------------------------------

let supabaseClient = null;

function initSupabase(url, key) {
    if (url && key && url !== 'YOUR_SUPABASE_PROJECT_URL') {
        supabaseClient = supabase.createClient(url, key);
        console.log('Supabase initialized successfully.');
        return true;
    }
    console.warn('Supabase credentials not configured. Cloud features disabled.');
    return false;
}

// Auto-initialize if credentials are provided above
if (MY_SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL' && MY_SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    initSupabase(MY_SUPABASE_URL, MY_SUPABASE_ANON_KEY);
}
