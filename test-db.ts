import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: scores, error: scoresError } = await supabase
      .from('gm_students')
      .select('id, name, final_score, is_deleted, gm_sessions(subject, exam_type, is_deleted)')
      .eq('is_deleted', false)
      .limit(1);
  console.log("SCORES ERROR:", scoresError);
}
run();
