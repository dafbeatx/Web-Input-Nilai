import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAttendance() {
  const name = 'RINA SUHARYATI';
  const { data, error } = await supabase
    .from('gm_attendance')
    .select('*')
    .ilike('student_name', `%${name}%`);
  
  console.log('Attendance found:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

checkAttendance();
