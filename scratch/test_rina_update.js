import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testUpdate() {
  const studentId = '44d61815-5755-456d-bb0f-905dfe9d3fd4'; // RINA SUHARYATI in ASAJ B. INGGRIS
  
  console.log(`Attempting to update student ${studentId}`);
  
  const { data, error } = await supabase
    .from('gm_students')
    .update({ final_score: 40 })
    .eq('id', studentId)
    .select();
  
  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful:', data);
    // Revert
    await supabase.from('gm_students').update({ final_score: 39 }).eq('id', studentId);
  }
}

testUpdate();
