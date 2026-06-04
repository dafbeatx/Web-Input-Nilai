const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) { console.error('Missing SUPABASE env vars in .env.local'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const sessionId = 'a75f3a6f-d27e-4a33-a13f-5a54c1ffe841';

  // 1. Check session exists
  const { data: session, error: sessErr } = await supabase
    .from('gm_sessions')
    .select('id, session_name, subject, class_name, student_list, scoring_config')
    .eq('id', sessionId)
    .single();

  if (sessErr) {
    console.error('Session error:', sessErr);
  } else {
    console.log('=== SESSION ===');
    console.log('Name:', session.session_name);
    console.log('Subject:', session.subject);
    console.log('Class:', session.class_name);
    console.log('Student list:', session.student_list);
    console.log('Has remedial questions:', Array.isArray(session.scoring_config?.remedialQuestions) ? session.scoring_config.remedialQuestions.length : 0);
  }

  // 2. Check if JUNAEDI exists in gm_students for this session
  const { data: students, error: stuErr } = await supabase
    .from('gm_students')
    .select('id, name, final_score, remedial_status, is_deleted')
    .eq('session_id', sessionId);

  if (stuErr) {
    console.error('Students error:', stuErr);
  } else {
    console.log('\n=== ALL STUDENTS IN SESSION ===');
    students.forEach(s => {
      const match = s.name.toUpperCase().includes('JUNAEDI') ? ' *** MATCH ***' : '';
      console.log(`  ${s.name} | score=${s.final_score} | remedial=${s.remedial_status} | deleted=${s.is_deleted}${match}`);
    });
  }

  // 3. Check if JUNAEDI exists anywhere in gm_students (any session)
  const { data: allJunaedi, error: allErr } = await supabase
    .from('gm_students')
    .select('id, name, session_id, final_score, remedial_status, is_deleted')
    .ilike('name', '%JUNAEDI%');

  console.log('\n=== JUNAEDI IN ALL SESSIONS ===');
  if (allErr) {
    console.error('Error:', allErr);
  } else if (allJunaedi.length === 0) {
    console.log('  NOT FOUND in any session!');
  } else {
    allJunaedi.forEach(s => {
      console.log(`  ${s.name} | session=${s.session_id} | score=${s.final_score} | remedial=${s.remedial_status} | deleted=${s.is_deleted}`);
    });
  }

  // 4. Check if JUNAEDI exists in gm_behaviors or gm_student_accounts
  const { data: behaviors } = await supabase
    .from('gm_behaviors')
    .select('id, student_name, class_name')
    .ilike('student_name', '%JUNAEDI%');

  console.log('\n=== JUNAEDI IN gm_behaviors ===');
  console.log(behaviors);

  const { data: accounts } = await supabase
    .from('gm_student_accounts')
    .select('id, student_name, class_name')
    .ilike('student_name', '%JUNAEDI%');

  console.log('\n=== JUNAEDI IN gm_student_accounts ===');
  console.log(accounts);
}

test();
