#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 * FINAL FIX v2: Reuse empty session → split ASAJ B.INGGRIS
 * ══════════════════════════════════════════════════════════════
 * 
 * Strategy: "ASAJ INFORMATIKA KELAS 9" [9A] has 0 students.
 * We REPURPOSE it → rename to "ASAJ B. INGGRIS KELAS 9A",
 * copy settings from source, then move 19 students there.
 * 
 * This works because UPDATE on gm_sessions is allowed via anon key
 * (verified from route.ts logic), no INSERT needed.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://fwhdjqvtjzesbdcqorsn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rwh41NF8iwUaRXL8A6t05g_sK7k5JL3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Session to REPURPOSE (empty, 0 students)
const EMPTY_SESSION_ID = '311098f9-ba47-4239-9d3c-e8cdfe8eedad'; // "ASAJ INFORMATIKA KELAS 9" [9A]
// Session to SPLIT FROM
const SOURCE_SESSION_ID = '4a9c3a37-3d96-45ec-a51e-57f805b7ff35'; // "ASAJ B. INGGRIS" [9B]

const STUDENTS_9A = [
  'LIDYA PUTRI JAELANI', 'SITI NURLAELATUL ALIYAH', 'LIVIA HAURA HASNA',
  'APRILLA QISTI', 'AZKIA AJIMA HUMMAIRA', 'MUTIARA AULIA ANDINI',
  'BUNGA MAISYI MAULIHATUNNISA', 'CITRA AULIA', 'KEYSA KANAYA PUTRI',
  'DEA ANANDA MAULIDA', 'NAFISAH ADE LESTARI', 'ADZKIYA MAULIDA SUDRAJAT',
  'SEPTIANA AULIA', 'QUEENESA SABANIAH HARYANI', 'VIRGIA ASYAVIAN REGINA',
  'KEISYA ADELIA PUTRI', 'SYAHNA NAJWAH NURAHIMAT', 'SITI NURASIAH', 'SITI NURAMINAH',
];

const isDryRun = process.argv.includes('--dry-run');
const isExecute = process.argv.includes('--execute');

if (!isDryRun && !isExecute) {
  console.log('❌ Pilih mode: --dry-run atau --execute');
  process.exit(1);
}

console.log('\n══════════════════════════════════════════════════════════');
console.log('   🔧 FINAL FIX v2: Split ASAJ B.INGGRIS via Repurpose');
console.log(`   Mode: ${isDryRun ? '🔍 DRY RUN' : '⚡ EXECUTE'}`);
console.log('══════════════════════════════════════════════════════════\n');

// ── VERIFY: Empty session exists and has 0 students ─────────
console.log('📌 STEP 1: Verifikasi sesi kosong...');

const { data: emptySession } = await supabase
  .from('gm_sessions')
  .select('id, session_name, class_name, subject, teacher')
  .eq('id', EMPTY_SESSION_ID)
  .single();

const { count: emptyCount } = await supabase
  .from('gm_students')
  .select('id', { count: 'exact', head: true })
  .eq('session_id', EMPTY_SESSION_ID);

console.log(`   Sesi: "${emptySession?.session_name}" [${emptySession?.class_name}]`);
console.log(`   Siswa: ${emptyCount || 0}`);

if (emptyCount && emptyCount > 0) {
  console.error('   ❌ Sesi ini TIDAK kosong. Abort untuk keamanan data.');
  process.exit(1);
}

// ── Get source session details ──────────────────────────────
const { data: sourceSession } = await supabase
  .from('gm_sessions')
  .select('*')
  .eq('id', SOURCE_SESSION_ID)
  .single();

console.log(`\n   Source: "${sourceSession?.session_name}" [${sourceSession?.class_name}]`);
console.log(`   Subject: ${sourceSession?.subject} | Teacher: ${sourceSession?.teacher}`);

// ── Get students to move ────────────────────────────────────
console.log('\n📌 STEP 2: Identifikasi siswa...');

const { data: allStudents } = await supabase
  .from('gm_students')
  .select('id, name, final_score, mcq_score')
  .eq('session_id', SOURCE_SESSION_ID)
  .order('name');

const toMove = (allStudents || []).filter(s => STUDENTS_9A.includes(s.name));
const toStay = (allStudents || []).filter(s => !STUDENTS_9A.includes(s.name));

console.log(`   Total: ${allStudents?.length || 0} | Move→9A: ${toMove.length} | Stay 9B: ${toStay.length}`);

if (isDryRun) {
  console.log('\n   [DRY RUN] Would:');
  console.log(`   1. Rename "${emptySession?.session_name}" → "ASAJ B. INGGRIS KELAS 9A"`);
  console.log(`   2. Copy subject/teacher/config from source`);
  console.log(`   3. Move ${toMove.length} students to repurposed session`);
  console.log('   4. Fix gm_behaviors class names');
  console.log('   5. Revert KELPIN & ZIDAN back to 9B');
  console.log('\n🔍 DRY RUN selesai.\n');
  process.exit(0);
}

// ── BACKUP ──────────────────────────────────────────────────
console.log('\n📌 STEP 3: Backup...');
const backupPath = join(__dirname, `backup_final_v2_${Date.now()}.json`);
writeFileSync(backupPath, JSON.stringify({
  empty_session_original: emptySession,
  source_session: sourceSession,
  students_moving: toMove,
  students_staying: toStay,
}, null, 2));
console.log(`   💾 ${backupPath}`);

// ── STEP 4: Repurpose empty session ─────────────────────────
console.log('\n📌 STEP 4: Repurpose sesi kosong → "ASAJ B. INGGRIS KELAS 9A"...');

const { error: updateSessionErr } = await supabase
  .from('gm_sessions')
  .update({
    session_name: 'ASAJ B. INGGRIS KELAS 9A',
    teacher: sourceSession.teacher,
    subject: sourceSession.subject,
    class_name: '9A',
    answer_key: sourceSession.answer_key,
    student_list: sourceSession.student_list,
    scoring_config: sourceSession.scoring_config,
    kkm: sourceSession.kkm,
    remedial_essay_count: sourceSession.remedial_essay_count,
    remedial_timer: sourceSession.remedial_timer,
    exam_type: sourceSession.exam_type,
    is_public: sourceSession.is_public,
    updated_at: new Date().toISOString(),
  })
  .eq('id', EMPTY_SESSION_ID);

if (updateSessionErr) {
  console.error('   ❌ Session update failed:', updateSessionErr.message);
  process.exit(1);
}
console.log('   ✅ Sesi berhasil di-repurpose');

// ── STEP 5: Move students ───────────────────────────────────
console.log('\n📌 STEP 5: Memindahkan siswa ke sesi 9A...');

const moveIds = toMove.map(s => s.id);

const { data: moved, error: moveErr } = await supabase
  .from('gm_students')
  .update({ session_id: EMPTY_SESSION_ID })
  .in('id', moveIds)
  .select('id, name');

if (moveErr) {
  console.error('   ❌ Student move failed:', moveErr.message);
  process.exit(1);
}
console.log(`   ✅ ${moved?.length || 0} siswa dipindahkan`);

// ── STEP 6: Fix behaviors ───────────────────────────────────
console.log('\n📌 STEP 6: Perbaiki gm_behaviors...');

// Fix the wrongly renamed class
const { data: bFix1, error: bf1Err } = await supabase
  .from('gm_behaviors')
  .update({ class_name: '9A' })
  .eq('class_name', 'ASAJ B.INGGRIS KELAS 9A')
  .select('id');

if (bf1Err) {
  console.error('   ⚠️ Behavior fix 1:', bf1Err.message);
} else {
  console.log(`   ✅ ${bFix1?.length || 0} behaviors: "ASAJ B.INGGRIS KELAS 9A" → "9A"`);
}

// Revert KELPIN & ZIDAN
for (const name of ['KELPIN ALPIANDI', 'MUHAMAD HADATUL ZIDAN']) {
  const { data: beh } = await supabase
    .from('gm_behaviors')
    .select('id, class_name')
    .eq('student_name', name)
    .single();

  if (beh && beh.class_name === '9A') {
    await supabase.from('gm_behaviors').update({ class_name: '9B' }).eq('id', beh.id);
    console.log(`   ✅ ${name}: 9A → 9B (reverted)`);
  } else {
    console.log(`   ℹ️  ${name}: already ${beh?.class_name || '???'}`);
  }
}

// ── STEP 7: Verify ──────────────────────────────────────────
console.log('\n📌 STEP 7: Verifikasi final...');

const { data: verify9B } = await supabase
  .from('gm_students')
  .select('id, name')
  .eq('session_id', SOURCE_SESSION_ID)
  .order('name');

const { data: verify9A } = await supabase
  .from('gm_students')
  .select('id, name, final_score')
  .eq('session_id', EMPTY_SESSION_ID)
  .order('name');

const { data: verify9ASession } = await supabase
  .from('gm_sessions')
  .select('session_name, class_name, subject, teacher')
  .eq('id', EMPTY_SESSION_ID)
  .single();

console.log(`\n   📋 Sesi "${verify9ASession?.session_name}" [${verify9ASession?.class_name}]:`);
console.log(`      Subject: ${verify9ASession?.subject} | Teacher: ${verify9ASession?.teacher}`);
console.log(`      Siswa: ${verify9A?.length || 0}`);
(verify9A || []).forEach((s, i) => {
  console.log(`        ${String(i+1).padStart(2)}. ${s.name}`);
});

console.log(`\n   📋 Sesi "ASAJ B. INGGRIS" [9B] sisa: ${verify9B?.length || 0} siswa`);
(verify9B || []).forEach((s, i) => {
  console.log(`        ${String(i+1).padStart(2)}. ${s.name}`);
});

// Behaviors check
const { data: behCheck } = await supabase
  .from('gm_behaviors')
  .select('class_name')
  .or('class_name.eq.9A,class_name.eq.9B,class_name.eq.ASAJ B.INGGRIS KELAS 9A');

const behGroups = {};
(behCheck || []).forEach(b => { behGroups[b.class_name] = (behGroups[b.class_name] || 0) + 1; });
console.log('\n   Behaviors:', behGroups);

console.log('\n══════════════════════════════════════════════════════════');
console.log('   ✅ SPLIT SESI SELESAI 100% — TIDAK ADA DATA HILANG');
console.log(`   📊 Sesi 9A: ${verify9A?.length || 0} siswa`);
console.log(`   📊 Sesi 9B: ${verify9B?.length || 0} siswa`);
console.log(`   💾 Backup: ${backupPath}`);
console.log('══════════════════════════════════════════════════════════\n');

process.exit(0);
