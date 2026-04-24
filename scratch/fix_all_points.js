import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fixPoints() {
  console.log('Fetching all behaviors...');
  const { data: behaviors, error: fetchErr } = await supabase
    .from('gm_behaviors')
    .select('id, student_name');

  if (fetchErr) throw fetchErr;

  console.log(`Processing ${behaviors.length} students...`);

  for (const student of behaviors) {
    const { data: logs, error: logErr } = await supabase
      .from('gm_behavior_logs')
      .select('points_delta')
      .eq('student_id', student.id);

    if (logErr) {
      console.error(`Error fetching logs for ${student.student_name}:`, logErr);
      continue;
    }

    const total = (logs || []).reduce((sum, log) => sum + (log.points_delta || 0), 100);

    const { error: updateErr } = await supabase
      .from('gm_behaviors')
      .update({ total_points: total, updated_at: new Date().toISOString() })
      .eq('id', student.id);

    if (updateErr) {
      console.error(`Error updating points for ${student.student_name}:`, updateErr);
    }
  }

  console.log('Fix complete!');
}

fixPoints();
