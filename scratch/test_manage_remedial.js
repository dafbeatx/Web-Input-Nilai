// Test script for bulk remedial manager route
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local!");
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  console.log("=========================================");
  console.log("TESTING BULK REMEDIAL MANAGE ROUTE");
  console.log("=========================================");

  // 1. Fetch some matching session to mock
  console.log("Fetching matching gm_sessions to test...");
  const { data: sessions, error } = await supabaseAdmin
    .from('gm_sessions')
    .select('id, session_name, subject, exam_type, academic_year, scoring_config')
    .limit(1);

  if (error) {
    console.error("Error fetching sessions:", error);
    return;
  }

  if (!sessions || sessions.length === 0) {
    console.log("No sessions found in database to test bulk update.");
    return;
  }

  const session = sessions[0];
  console.log(`Found session: ${session.session_name} for subject: ${session.subject}`);

  // Mock body payload
  const payload = {
    subject: session.subject,
    exam_type: session.exam_type,
    academic_year: session.academic_year,
    timer: 20, // 20 minutes duration
    questions: [
      "1. Apa kelebihan utama dari topologi star?",
      "2. Jelaskan kegunaan protokol HTTPS."
    ],
    answer_keys: [
      "1. Mudah mendeteksi kerusakan kabel dan tidak mengganggu komputer lain.",
      "2. Mengenkripsi komunikasi data sehingga aman dari pencurian informasi."
    ],
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
  };

  console.log("\nExecuting mock update logic safely...");
  let config = session.scoring_config;
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch(e) { config = {}; }
  }
  if (!config || typeof config !== 'object') config = {};

  const newConfig = {
    ...config,
    remedialQuestions: payload.questions,
    remedialAnswerKeys: payload.answer_keys,
    remedialDeadline: payload.deadline
  };

  const { data, error: updateError } = await supabaseAdmin
    .from('gm_sessions')
    .update({ 
      remedial_timer: payload.timer,
      scoring_config: newConfig,
      updated_at: new Date().toISOString()
    })
    .eq('id', session.id)
    .select();

  if (updateError) {
    console.error("Update failed:", updateError);
  } else {
    console.log("Update SUCCESSFUL! Mock Session Config updated successfully.");
    console.log("Updated config details:", JSON.stringify(data[0].scoring_config, null, 2));
  }
}

run();
