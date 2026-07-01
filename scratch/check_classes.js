const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClasses() {
  const { data: dataAll, error: errorAll } = await supabase
    .from('gm_student_accounts')
    .select('class_name, academic_year');
    
  if (errorAll) {
    console.error('Error fetching:', errorAll);
    return;
  }

  const counts = {};
  dataAll.forEach(row => {
    const key = `${row.class_name} (${row.academic_year})`;
    counts[key] = (counts[key] || 0) + 1;
  });

  console.log('=== CLASS COUNTS ===');
  console.log(counts);
}

checkClasses();
