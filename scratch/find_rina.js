import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function findStudent() {
  const name = 'RINA SUHARYATI';
  const className = '9A';

  console.log(`Searching for student: ${name} in class: ${className}`);

  const { data: accounts, error: accountError } = await supabase
    .from('gm_student_accounts')
    .select('*')
    .ilike('student_name', `%${name}%`);
  
  console.log('Student Accounts:', accounts);
  if (accountError) console.error('Account Error:', accountError);

  const { data: students, error: studentError } = await supabase
    .from('gm_students')
    .select('*, gm_sessions(session_name)')
    .ilike('name', `%${name}%`);

  console.log('Exam Students:', students);
  if (studentError) console.error('Student Error:', studentError);

  const { data: behaviors, error: behaviorError } = await supabase
    .from('gm_behaviors')
    .select('*')
    .ilike('student_name', `%${name}%`);

  console.log('Behaviors:', behaviors);
  if (behaviorError) console.error('Behavior Error:', behaviorError);
}

findStudent();
