const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function run() {
  try {
    console.log("Testing with URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Testing with Key:", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    
    // Select a public table or just attempt getSession
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("getSession error:", error);
    } else {
      console.log("getSession success:", data);
    }
  } catch (err) {
    console.error("Caught error during Supabase call:", err);
  }
}

run();
