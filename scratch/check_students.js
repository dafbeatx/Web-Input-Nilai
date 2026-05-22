const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data } = await supabase.from('gm_students').select('id, name, session_id');
  console.log(data.length, 'students found');
  const names = data.map(d => d.name);
  const duplicates = names.filter((item, index) => names.indexOf(item) !== index);
  console.log('Duplicates:', duplicates);
}
run();
