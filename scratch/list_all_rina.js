import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function listAllAccounts() {
  const { data, error } = await supabase
    .from('gm_student_accounts')
    .select('student_name, class_name, username');
  
  console.log('All Accounts Count:', data?.length);
  const rinas = (data || []).filter(a => a.student_name.toUpperCase().includes('RINA'));
  console.log('Rinas in accounts:', rinas);
}

listAllAccounts();
