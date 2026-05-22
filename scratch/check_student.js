const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('gm_students')
    .select('name')
    .eq('session_id', 'a75f3a6f-d27e-4a33-a13f-5a54c1ffe841')
    .ilike('name', 'junaedi');
  
  console.log('Results:', data);
  if (error) console.error('Error:', error);
}

check();
