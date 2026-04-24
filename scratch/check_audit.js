import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAuditLogs() {
  const { data, error } = await supabase
    .from('gm_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  
  console.log('Recent Audit Logs:', JSON.stringify(data, null, 2));
}

checkAuditLogs();
