import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { count } = await supabase.from('gm_sessions').select('*', { count: 'exact', head: true });
  console.log('Total sessions:', count);
}
run();
