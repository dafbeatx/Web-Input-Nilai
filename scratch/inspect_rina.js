import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectStudent() {
  const { data, error } = await supabase
    .from('gm_behaviors')
    .select('student_name')
    .ilike('student_name', '%RINA SUHARYATI%');
  
  if (data && data.length > 0) {
    const name = data[0].student_name;
    console.log(`Exact Name: "${name}"`);
    console.log(`Length: ${name.length}`);
    console.log(`Hex: ${Buffer.from(name).toString('hex')}`);
  } else {
    console.log('Not found in gm_behaviors');
  }
}

inspectStudent();
