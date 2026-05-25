const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const studentId = 'cb2d01e0-e7a1-4e6c-a8c6-8e8c2b5646cc'; // Galang's ID in ASAJ INFORMATIKA KELAS 9B
  const { data: attempts, error } = await supabase
    .from('gm_remedial_attempts')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    console.error("Error fetching attempts:", error);
    return;
  }

  console.log("Attempts for Galang in ASAJ INFORMATIKA KELAS 9B:", JSON.stringify(attempts, null, 2));
}

run();
