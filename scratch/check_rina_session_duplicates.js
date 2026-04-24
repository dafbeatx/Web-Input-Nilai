import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSessionDuplicates() {
  const name = 'RINA SUHARYATI';
  const sessionId = '311098f9-ba47-4239-9d3c-e8cdfe8eedad'; // ASAJ B. INGGRIS KELAS 9A

  const { data, error } = await supabase
    .from('gm_students')
    .select('*')
    .eq('session_id', sessionId)
    .ilike('name', `%${name}%`);
  
  console.log(`RINA records in session ${sessionId}:`, JSON.stringify(data, null, 2));
}

checkSessionDuplicates();
