const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function run() {
  try {
    console.log("Testing getUser...");
    const { data, error } = await supabase.auth.getUser();
    console.log("getUser response:", { data, error });
  } catch (err) {
    console.error("getUser threw error:", err);
  }
}

run();
