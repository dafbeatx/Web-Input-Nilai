const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Searching for Galang in all students...");
  const { data: students, error: err } = await supabase
    .from('gm_students')
    .select('id, name, session_id, remedial_status, final_score, is_deleted')
    .ilike('name', '%Galang%');

  if (err) {
    console.error("Error searching students:", err);
    return;
  }

  console.log("Found students:", JSON.stringify(students, null, 2));

  // If we found students, get their session details
  if (students && students.length > 0) {
    const sessionIds = students.map(s => s.session_id);
    const { data: sessions, error: err2 } = await supabase
      .from('gm_sessions')
      .select('id, session_name, class_name, subject, exam_type, academic_year, semester')
      .in('id', sessionIds);

    if (err2) {
      console.error("Error fetching sessions:", err2);
      return;
    }

    console.log("Session details:", JSON.stringify(sessions, null, 2));
  }
}

run();
