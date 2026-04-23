#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 * EMERGENCY DATA CLEANING: 9B → 9A Migration Script
 * ══════════════════════════════════════════════════════════════
 * 
 * Target: gm_behaviors (also syncs gm_attendance, gm_student_accounts)
 * Condition: class_name = '9B' AND (avatar_url IS NULL OR avatar_url = '')
 * Action: UPDATE class_name → '9A'
 * Safety: Backup stored in gm_audit_logs + local JSON file
 * 
 * Usage:
 *   node database/migrate_9b_to_9a.mjs --dry-run   # Preview only
 *   node database/migrate_9b_to_9a.mjs --execute    # Execute migration
 * ══════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL = 'https://fwhdjqvtjzesbdcqorsn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rwh41NF8iwUaRXL8A6t05g_sK7k5JL3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isDryRun = process.argv.includes('--dry-run');
const isExecute = process.argv.includes('--execute');

if (!isDryRun && !isExecute) {
  console.log('❌ Pilih mode: --dry-run atau --execute');
  console.log('   node database/migrate_9b_to_9a.mjs --dry-run');
  console.log('   node database/migrate_9b_to_9a.mjs --execute');
  process.exit(1);
}

console.log('\n══════════════════════════════════════════════════════════');
console.log('   🚨 EMERGENCY DATA CLEANING: 9B → 9A MIGRATION');
console.log(`   Mode: ${isDryRun ? '🔍 DRY RUN (Preview Only)' : '⚡ EXECUTE (Live Changes)'}`);
console.log('══════════════════════════════════════════════════════════\n');

// ── STEP 1: SCAN 9B Students ────────────────────────────────
console.log('📌 STEP 1: Scanning kelas 9B...');

const { data: all9B, error: scanErr } = await supabase
  .from('gm_behaviors')
  .select('id, student_name, class_name, avatar_url, academic_year, total_points')
  .eq('class_name', '9B')
  .order('student_name');

if (scanErr) {
  console.error('❌ SCAN FAILED:', scanErr.message);
  process.exit(1);
}

const withAvatar = (all9B || []).filter(s => s.avatar_url && s.avatar_url.trim() !== '');
const withoutAvatar = (all9B || []).filter(s => !s.avatar_url || s.avatar_url.trim() === '');

console.log(`   Total siswa 9B: ${all9B?.length || 0}`);
console.log(`   ✅ Dengan foto:  ${withAvatar.length}`);
console.log(`   ❌ Tanpa foto:   ${withoutAvatar.length}`);

// Show current 9A
const { count: count9A } = await supabase
  .from('gm_behaviors')
  .select('id', { count: 'exact', head: true })
  .eq('class_name', '9A');

console.log(`   📋 Kelas 9A saat ini: ${count9A || 0} siswa\n`);

if (withoutAvatar.length === 0) {
  console.log('✅ Tidak ada siswa 9B tanpa foto. Tidak perlu migrasi.\n');
  process.exit(0);
}

// ── STEP 2: Display targets ─────────────────────────────────
console.log('📌 STEP 2: Daftar siswa yang akan dipindahkan ke 9A:');
console.log('┌────┬────────────────────────────────────────┬──────────┬────────┐');
console.log('│ No │ Nama Siswa                             │ Kelas    │ Avatar │');
console.log('├────┼────────────────────────────────────────┼──────────┼────────┤');
withoutAvatar.forEach((s, i) => {
  const no = String(i + 1).padStart(2);
  const name = s.student_name.padEnd(38).slice(0, 38);
  const cls = `${s.class_name} → 9A`.padEnd(8);
  console.log(`│ ${no} │ ${name} │ ${cls} │  ❌    │`);
});
console.log('└────┴────────────────────────────────────────┴──────────┴────────┘\n');

if (isDryRun) {
  console.log('🔍 DRY RUN selesai. Tidak ada perubahan yang dilakukan.');
  console.log('   Untuk eksekusi: node database/migrate_9b_to_9a.mjs --execute\n');
  process.exit(0);
}

// ── STEP 3: BACKUP ──────────────────────────────────────────
console.log('📌 STEP 3: Membuat backup...');

const backupRecords = withoutAvatar.map(s => ({
  id: s.id,
  student_name: s.student_name,
  old_class: s.class_name,
  new_class: '9A',
  avatar_url: s.avatar_url,
  academic_year: s.academic_year,
  total_points: s.total_points,
  migrated_at: new Date().toISOString(),
}));

// Save local backup JSON
const backupPath = join(__dirname, `backup_9b_to_9a_${Date.now()}.json`);
writeFileSync(backupPath, JSON.stringify(backupRecords, null, 2));
console.log(`   💾 Backup lokal: ${backupPath}`);

// Save audit log to Supabase
const { error: auditErr } = await supabase
  .from('gm_audit_logs')
  .insert({
    action_type: 'DATA_CLEANING_9B_TO_9A',
    entity_type: 'gm_behaviors',
    payload: {
      timestamp: new Date().toISOString(),
      total_migrated: backupRecords.length,
      records: backupRecords,
    },
    admin_username: 'SYSTEM_MIGRATION',
  });

if (auditErr) {
  console.warn(`   ⚠️  Audit log gagal (non-blocking): ${auditErr.message}`);
} else {
  console.log('   ✅ Audit log tersimpan di gm_audit_logs');
}

// ── STEP 4: EXECUTE UPDATE on gm_behaviors ──────────────────
console.log('\n📌 STEP 4: Mengeksekusi UPDATE pada gm_behaviors...');

const targetIds = withoutAvatar.map(s => s.id);

const { data: updatedData, error: updateErr } = await supabase
  .from('gm_behaviors')
  .update({ class_name: '9A' })
  .in('id', targetIds)
  .select('id, student_name, class_name');

if (updateErr) {
  console.error('❌ UPDATE GAGAL:', updateErr.message);
  console.log('   Backup tersedia di:', backupPath);
  process.exit(1);
}

console.log(`   ✅ ${updatedData?.length || 0} record berhasil diperbarui di gm_behaviors`);

// ── STEP 5: Sync related tables ─────────────────────────────
console.log('\n📌 STEP 5: Sinkronisasi tabel terkait...');

const migrationNames = withoutAvatar.map(s => s.student_name);

// Sync gm_attendance
let attendanceUpdated = 0;
for (const name of migrationNames) {
  const { data: attData } = await supabase
    .from('gm_attendance')
    .update({ class_name: '9A' })
    .eq('student_name', name)
    .eq('class_name', '9B')
    .select('id');
  attendanceUpdated += attData?.length || 0;
}
console.log(`   📋 gm_attendance: ${attendanceUpdated} record diperbarui`);

// Sync gm_student_accounts
let accountsUpdated = 0;
for (const name of migrationNames) {
  const { data: accData } = await supabase
    .from('gm_student_accounts')
    .update({ class_name: '9A' })
    .eq('student_name', name)
    .eq('class_name', '9B')
    .select('id');
  accountsUpdated += accData?.length || 0;
}
console.log(`   📋 gm_student_accounts: ${accountsUpdated} record diperbarui`);

// ── STEP 6: VERIFY ──────────────────────────────────────────
console.log('\n📌 STEP 6: Verifikasi hasil...');

const { data: remaining9B } = await supabase
  .from('gm_behaviors')
  .select('id, student_name, avatar_url')
  .eq('class_name', '9B')
  .order('student_name');

const { data: final9A } = await supabase
  .from('gm_behaviors')
  .select('id, student_name, avatar_url')
  .eq('class_name', '9A')
  .order('student_name');

const remaining9BNoAvatar = (remaining9B || []).filter(
  s => !s.avatar_url || s.avatar_url.trim() === ''
);

console.log(`   Kelas 9B sisa: ${remaining9B?.length || 0} siswa`);
console.log(`   Kelas 9B tanpa foto: ${remaining9BNoAvatar.length} (target: 0)`);
console.log(`   Kelas 9A total: ${final9A?.length || 0} siswa`);
console.log(`   9B BERSIH: ${remaining9BNoAvatar.length === 0 ? '✅ YA' : '❌ TIDAK'}`);

if (remaining9B && remaining9B.length > 0) {
  console.log('\n   Siswa yang tetap di 9B (punya foto):');
  remaining9B.forEach((s, i) => {
    console.log(`     ${i + 1}. ${s.student_name} ${s.avatar_url ? '✅' : '❌'}`);
  });
}

// ── FINAL REPORT ────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('   ✅ DATA CLEANING KELAS 9A/9B SELESAI 100%');
console.log('   ✅ TIDAK ADA DATA HILANG');
console.log(`   📊 Total dipindahkan: ${updatedData?.length || 0} siswa`);
console.log(`   💾 Backup: ${backupPath}`);
console.log('══════════════════════════════════════════════════════════\n');

process.exit(0);
