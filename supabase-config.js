// Supabase configuration and initialization
// Make sure to include the Supabase CDN in index.html before this script

// ---------------------------------------------------------
// MASUKKAN KREDENSIAL SUPABASE ANDA DI SINI (UNTUK VERCEL):
// ---------------------------------------------------------
const MY_SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const MY_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
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
