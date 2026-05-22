const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fwhdjqvtjzesbdcqorsn.supabase.co', '[REDACTED_SUPABASE_SERVICE_ROLE_KEY]');

async function test() {
  const { data, error } = await supabase.from('gm_behaviors').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

test();
