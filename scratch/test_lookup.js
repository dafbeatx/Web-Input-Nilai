import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const sessionId = '1cd0299f-cb25-48c3-9015-b25012b5a872'; // UTS KELAS 9B
  const studentName = 'ANDIKA PRATAMA';
  
  const { data: student, error } = await supabase
    .from('gm_students')
    .select('id')
    .eq('session_id', sessionId)
    .ilike('name', studentName.trim())
    .single();
    
  console.log({ student, error });
}

run();
