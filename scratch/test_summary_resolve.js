const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testResolve() {
  const targetStudentName = 'MUTIARA AULIA ANDINI';
  const className = 'LULUS';
  const academicYear = '2026/2027';

  let targetClassName = className;
  let targetAcademicYear = academicYear;

  if (className === 'LULUS' || className === 'ALUMNI' || !className) {
    const { data: pastBehavior, error } = await supabase
      .from('gm_behaviors')
      .select('class_name, academic_year')
      .eq('student_name', targetStudentName)
      .not('class_name', 'eq', 'LULUS')
      .not('class_name', 'eq', 'ALUMNI')
      .order('academic_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching past behavior:', error);
      return;
    }

    if (pastBehavior) {
      targetClassName = pastBehavior.class_name;
      targetAcademicYear = pastBehavior.academic_year;
    }
  }

  console.log('=== TEST RESOLVE RESULT ===');
  console.log(`Original query: Class = ${className}, Year = ${academicYear}`);
  console.log(`Resolved query: Class = ${targetClassName}, Year = ${targetAcademicYear}`);
  
  if (targetClassName === '9A' && targetAcademicYear === '2025/2026') {
    console.log('✅ SUCCESS: Successfully resolved to last active class 9A (2025/2026)');
  } else {
    console.log('❌ FAILURE: Resolved incorrectly');
  }
}

testResolve();
