import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: accounts, error: err1 } = await supabase.from('gm_student_accounts').select('*');
  const { data: behaviors, error: err2 } = await supabase.from('gm_behaviors').select('*');
  console.log('gm_student_accounts count:', accounts?.length);
  if (accounts?.length > 0) console.log('accounts sample:', accounts[0]);
  console.log('gm_behaviors count:', behaviors?.length);
  if (behaviors?.length > 0) console.log('behaviors sample:', behaviors[0]);
}
check();
