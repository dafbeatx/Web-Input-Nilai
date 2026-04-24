import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkZeroPoints() {
  const { data, count, error } = await supabase
    .from('gm_behaviors')
    .select('student_name, class_name, total_points', { count: 'exact' })
    .eq('total_points', 0);
  
  console.log('Students with 0 points:', count);
  if (data && data.length > 0) {
    console.log('Sample students:', data.slice(0, 5));
  }
}

checkZeroPoints();
