const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Checking gm_student_accounts columns...');
  const { data, error } = await supabase
    .from('gm_student_accounts')
    .select('id, student_name, class_name, study_streak, last_active_date')
    .limit(1);

  if (error) {
    console.error('Error selecting columns:', error.message);
    if (error.message.includes('study_streak') || error.message.includes('last_active_date')) {
      console.log('❌ Columns do not exist yet. Migration is required!');
    }
  } else {
    console.log('✅ Columns exist! Data sample:', data);
  }
}
run();
