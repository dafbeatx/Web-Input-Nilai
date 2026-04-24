import { createClient } from '@supabase/supabase-js';

// Read env variables safely
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: behaviors, error } = await supabase.from('gm_behaviors').select('id, student_name, class_name').limit(10);
  console.log('Behaviors data:', behaviors);
  console.log('Error:', error);
}
check();
