import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRemedial() {
  const name = 'RINA SUHARYATI';
  
  // First get her student_id from gm_students
  const { data: students } = await supabase
    .from('gm_students')
    .select('id')
    .ilike('name', `%${name}%`);
  
  if (!students || students.length === 0) {
    console.log('No students found in gm_students');
    return;
  }

  const studentIds = students.map(s => s.id);
  console.log('Student IDs:', studentIds);

  const { data: attempts, error } = await supabase
    .from('gm_remedial_attempts')
    .select('*, gm_sessions(session_name)')
    .in('student_id', studentIds);
  
  console.log('Remedial Attempts:', JSON.stringify(attempts, null, 2));
}

checkRemedial();
