import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: students } = await supabase.from('gm_behaviors').select('*').limit(1);
  if (!students || students.length === 0) return console.log("No students");
  
  const s = students[0];
  console.log("Student:", s.student_name);
  
  const { data: attData } = await supabase
    .from('gm_attendance')
    .select('status')
    .eq('student_name', s.student_name)
    .eq('academic_year', '2025/2026');
    
  console.log("Attendance:", attData?.length);
  
  const totalAttendance = attData?.length || 0;
  const presentCount = attData?.filter(a => a.status === 'Hadir').length || 0;
  console.log("Present:", presentCount, "/", totalAttendance);
}

test();
