import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function list9A() {
  const { data, error } = await supabase
    .from('gm_behaviors')
    .select('student_name')
    .eq('class_name', '9A')
    .order('student_name');
  
  console.log('Students in 9A:', data.map(d => d.student_name));
}

list9A();
