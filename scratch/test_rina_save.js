import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testSave() {
  const studentId = 'f29947d0-cec7-42da-8761-b924350d331b'; // RINA SUHARYATI in gm_behaviors
  
  console.log(`Attempting to save test behavior log for student ${studentId}`);
  
  const { data, error } = await supabase
    .from('gm_behavior_logs')
    .insert({
      student_id: studentId,
      points_delta: 10,
      reason: 'Test Save (System Investigation)',
      violation_date: new Date().toISOString()
    })
    .select();
  
  if (error) {
    console.error('Save failed:', error);
  } else {
    console.log('Save successful:', data);
    // Cleanup
    await supabase.from('gm_behavior_logs').delete().eq('id', data[0].id);
  }
}

testSave();
