
let supabaseClient = null;

function initSupabase(url, key) {
    if (url && key && url !== 'YOUR_SUPABASE_PROJECT_URL' && url !== 'undefined' && key !== 'undefined') {
        try {
            supabaseClient = supabase.createClient(url, key);
            console.log('Supabase initialized successfully.');
            return true;
        } catch (e) {
            console.error('Failed to create Supabase client:', e);
            return false;
        }
    }
    console.warn('Supabase credentials not configured.');
    return false;
}
