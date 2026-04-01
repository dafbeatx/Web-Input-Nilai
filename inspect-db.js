const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.from('gm_students').select('*').limit(1);
  if (error) {
    console.error("Error reading gm_students:", error.message);
  } else {
    console.log("Columns of gm_students:", Object.keys(data[0] || {}));
  }
}
inspect();
