const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) { console.error('Missing SUPABASE env vars in .env.local'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function fixRemedialScores() {
  console.log('Fetching students with SUBMITTED or COMPLETED remedial status...');
  
  const { data: students, error: fetchErr } = await supabase
    .from('gm_students')
    .select('id, name, final_score, remedial_status, session_id, remedial_score, essay_score_final')
    .in('remedial_status', ['SUBMITTED', 'COMPLETED']);

  if (fetchErr) {
    console.error('Error fetching students:', fetchErr);
    return;
  }

  console.log(`Found ${students.length} students who have completed remedial.`);

  let updatedCount = 0;

  for (const student of students) {
    const { data: session } = await supabase
      .from('gm_sessions')
      .select('kkm')
      .eq('id', student.session_id)
      .single();

    if (session) {
      const kkm = session.kkm || 75;
      
      // If their final score is less than KKM, fix it
      if (student.final_score < kkm) {
        console.log(`Updating ${student.name} (Score: ${student.final_score} -> ${kkm})`);
        
        const { error: updateErr } = await supabase
          .from('gm_students')
          .update({
            final_score: kkm,
            final_score_locked: kkm,
            remedial_score: kkm,
            essay_score_final: kkm
          })
          .eq('id', student.id);

        if (updateErr) {
          console.error(`Error updating ${student.name}:`, updateErr);
        } else {
          updatedCount++;
        }
      }
    }
  }

  console.log(`Successfully fixed ${updatedCount} students.`);
}

fixRemedialScores();
