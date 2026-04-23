#!/usr/bin/env node
/**
 * DIAGNOSTIC: Full scan of 9A/9B data across all tables
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwhdjqvtjzesbdcqorsn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rwh41NF8iwUaRXL8A6t05g_sK7k5JL3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n══════════════════════════════════════════════════════════');
console.log('   📊 FULL DIAGNOSTIC: KELAS 9A / 9B');
console.log('══════════════════════════════════════════════════════════\n');

// ── 1. gm_sessions — Sesi ujian yang terkait 9A/9B ──────────
console.log('═══ gm_sessions (Sesi Ujian) ═══');
const { data: sessions } = await supabase
  .from('gm_sessions')
  .select('id, session_name, class_name, subject, teacher, exam_type, academic_year')
  .or('class_name.ilike.%9A%,class_name.ilike.%9B%')
  .order('class_name');

(sessions || []).forEach(s => {
  console.log(`  [${s.class_name}] "${s.session_name}" | ${s.subject} | ${s.teacher} | ${s.exam_type} | ID: ${s.id}`);
});
console.log(`  Total: ${sessions?.length || 0} sesi\n`);

// ── 2. gm_students per session ───────────────────────────────
console.log('═══ gm_students (Siswa per Sesi Ujian) ═══');
for (const ses of (sessions || [])) {
  const { data: students } = await supabase
    .from('gm_students')
    .select('id, name, final_score, mcq_score, remedial_status')
    .eq('session_id', ses.id)
    .order('name');
  
  console.log(`\n  📋 Sesi: "${ses.session_name}" [${ses.class_name}] — ${students?.length || 0} siswa`);
  (students || []).forEach((s, i) => {
    console.log(`     ${String(i+1).padStart(2)}. ${s.name.padEnd(40)} Score: ${String(s.final_score).padStart(3)} | PG: ${s.mcq_score} | ${s.remedial_status || '-'}`);
  });
}

// ── 3. gm_behaviors — Kedisiplinan ──────────────────────────
console.log('\n\n═══ gm_behaviors (Kedisiplinan) ═══');
const { data: behaviors } = await supabase
  .from('gm_behaviors')
  .select('id, student_name, class_name, avatar_url, total_points')
  .or('class_name.ilike.%9A%,class_name.ilike.%9B%')
  .order('class_name, student_name');

const behaviorGroups = {};
(behaviors || []).forEach(b => {
  if (!behaviorGroups[b.class_name]) behaviorGroups[b.class_name] = [];
  behaviorGroups[b.class_name].push(b);
});

for (const [cls, students] of Object.entries(behaviorGroups)) {
  console.log(`\n  📋 Kelas: "${cls}" — ${students.length} siswa`);
  students.forEach((s, i) => {
    console.log(`     ${String(i+1).padStart(2)}. ${s.student_name.padEnd(40)} ${s.avatar_url ? '✅ foto' : '❌ no foto'} | ${s.total_points} pts`);
  });
}

// ── 4. Cross-reference: siswa di gm_students 9B yang seharusnya 9A ──
console.log('\n\n═══ CROSS-REFERENCE: Siswa 9B di exam vs behaviors ═══');
const session9B = (sessions || []).filter(s => s.class_name === '9B');
const session9A = (sessions || []).filter(s => s.class_name === '9A');

if (session9B.length > 0) {
  for (const ses of session9B) {
    const { data: exam9B } = await supabase
      .from('gm_students')
      .select('id, name')
      .eq('session_id', ses.id)
      .order('name');
    
    // Check which of these have behavior records in 9A or ASAJ
    console.log(`\n  Sesi 9B "${ses.session_name}" — ${exam9B?.length || 0} siswa:`);
    for (const st of (exam9B || [])) {
      const { data: beh } = await supabase
        .from('gm_behaviors')
        .select('class_name')
        .eq('student_name', st.name)
        .limit(1);
      
      const behClass = beh?.[0]?.class_name || '???';
      const mismatch = behClass !== '9B' ? ' ⚠️  MISMATCH' : '';
      console.log(`     ${st.name.padEnd(40)} exam=9B  behavior=${behClass}${mismatch}`);
    }
  }
}

console.log('\n══════════════════════════════════════════════════════════');
console.log('   DIAGNOSTIC SELESAI');
console.log('══════════════════════════════════════════════════════════\n');
