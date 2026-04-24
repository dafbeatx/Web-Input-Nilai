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
  
  const { data: students } = await supabase
    .from('gm_students')
    .select('id, name')
    .ilike('name', `%${name}%`);
  
  if (!students || students.length === 0) {
    console.log('No students found');
    return;
  }

  const studentIds = students.map(s => s.id);

  const { data: attempts } = await supabase
    .from('gm_remedial_attempts')
    .select('id, student_id, status, created_at, gm_sessions(session_name)')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });
  
  console.log('Remedial Attempts Summary:');
  attempts.forEach(a => {
    console.log(`- Session: ${a.gm_sessions.session_name}, Status: ${a.status}, Date: ${a.created_at}`);
  });
}

checkRemedial();
