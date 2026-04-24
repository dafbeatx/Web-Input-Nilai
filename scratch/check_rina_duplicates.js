import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDuplicates() {
  const { data, error } = await supabase
    .from('gm_students')
    .select('id, name, session_id, gm_sessions(session_name)')
    .ilike('name', '%RINA SUHARYATI%');
  
  console.log('RINA records in gm_students:', JSON.stringify(data, null, 2));
}

checkDuplicates();
