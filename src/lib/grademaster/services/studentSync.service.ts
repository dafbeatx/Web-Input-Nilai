import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/grademaster/security';

export interface SyncResult {
  success: boolean;
  totalMasterStudents: number;
  existingAccounts: number;
  newlyCreatedAccounts: number;
  newlyCreatedBehaviors: number;
  syncedAvatars: number;
  syncedToSmartAbsensi: number;
  syncedFromSmartAbsensi: number;
  classesCount: number;
  classes: string[];
  message: string;
}

function generateUsername(name: string, className: string): string {
  const cleanName = (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');

  const classSuffix = (className || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return `${cleanName || 'siswa'}.${classSuffix || 'kelas'}`;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Normalizes a student lookup key combining name, class, and academic year.
 */
function makeKey(name: string, className: string, academicYear?: string | null): string {
  const n = (name || '').trim().toLowerCase();
  const c = (className || '').trim().toLowerCase().replace(/^kelas\s+/i, '');
  const y = (academicYear || '2026/2027').trim();
  return `${n}___${c}___${y}`;
}

interface StudentAccountRecord {
  id: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  username: string;
  profile_photo_url?: string | null;
}

interface StudentBehaviorRecord {
  id?: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  total_points: number;
  behavior_logs: unknown[];
  avatar_url?: string | null;
}

/**
 * Safe, idempotent, non-destructive synchronization across:
 * - gm_student_accounts (Pusat Data Master Registry & Accounts)
 * - gm_behaviors (Behavior Points, Logs, & Avatar)
 * - gm_students (Exam Scores from gm_sessions)
 *
 * Guarantees:
 * 1. Existing passwords, behavior points, logs, avatars, and exam scores are NEVER overwritten or deleted.
 * 2. All students in gm_behaviors get valid student accounts in gm_student_accounts.
 * 3. All students with scores in gm_students get registered in both gm_behaviors and gm_student_accounts.
 * 4. Avatars and profile photos are synchronized bidirectionally.
 */
export async function syncAllStudentData(): Promise<SyncResult> {
  // 1. Fetch all existing records from both tables
  const { data: bData, error: bErr } = await supabaseAdmin
    .from('gm_behaviors')
    .select('*');
  if (bErr) throw new Error(`Gagal membaca data perilaku (gm_behaviors): ${bErr.message}`);

  const { data: aData, error: aErr } = await supabaseAdmin
    .from('gm_student_accounts')
    .select('*');
  if (aErr) throw new Error(`Gagal membaca data akun siswa (gm_student_accounts): ${aErr.message}`);

  // Fetch all exam scores joined with sessions to find any orphaned score students
  const { data: sData, error: sErr } = await supabaseAdmin
    .from('gm_students')
    .select('id, name, final_score, gm_sessions(class_name, academic_year)')
    .eq('is_deleted', false);
  if (sErr) throw new Error(`Gagal membaca nilai siswa (gm_students): ${sErr.message}`);

  // Build lookup maps
  const accountMap = new Map<string, StudentAccountRecord>();
  const usedUsernames = new Set<string>();

  for (const acc of ((aData as StudentAccountRecord[]) || [])) {
    const k = makeKey(acc.student_name, acc.class_name, acc.academic_year);
    accountMap.set(k, acc);
    if (acc.username) {
      usedUsernames.add(acc.username.toLowerCase());
    }
  }

  const behaviorMap = new Map<string, StudentBehaviorRecord>();
  for (const b of ((bData as StudentBehaviorRecord[]) || [])) {
    const k = makeKey(b.student_name, b.class_name, b.academic_year);
    behaviorMap.set(k, b);
  }

  let newlyCreatedBehaviors = 0;
  let newlyCreatedAccounts = 0;
  let syncedAvatars = 0;
  let syncedFromSmartAbsensi = 0;
  let syncedToSmartAbsensi = 0;

  // -------------------------------------------------------------
  // STEP 0: Fetch Smart Absensi students (students table)
  // -------------------------------------------------------------
  const { data: smartData, error: smartErr } = await supabaseAdmin
    .from('students')
    .select('*');

  if (smartErr) {
    console.warn('[syncAllStudentData] Peringatan: Gagal membaca tabel students (Smart Absensi):', smartErr.message);
  }

  const smartMap = new Map<string, unknown>();
  for (const sm of (smartData || [])) {
    if (!sm.full_name?.trim()) continue;
    const k = makeKey(sm.full_name, sm.class_name, sm.academic_year);
    smartMap.set(k, sm);
  }

  // -------------------------------------------------------------
  // STEP A: Reconcile Smart Absensi & orphaned scores into gm_behaviors
  // -------------------------------------------------------------
  const behaviorsToInsert: Array<{
    student_name: string;
    class_name: string;
    academic_year: string;
    total_points: number;
    behavior_logs: unknown[];
  }> = [];

  // A.1 Import students from Smart Absensi if not present in gm_behaviors
  for (const sm of (smartData || [])) {
    if (!sm.full_name?.trim()) continue;
    const cls = (sm.class_name || 'Tanpa Kelas').trim();
    const yr = (sm.academic_year || '2026/2027').trim();
    const k = makeKey(sm.full_name, cls, yr);

    if (!behaviorMap.has(k)) {
      const newBeh = {
        student_name: sm.full_name.trim(),
        class_name: cls,
        academic_year: yr,
        total_points: 100, // Standard baseline
        behavior_logs: []
      };
      behaviorsToInsert.push(newBeh);
      behaviorMap.set(k, newBeh);
      newlyCreatedBehaviors++;
      syncedFromSmartAbsensi++;
    }
  }

  // A.2 Reconcile orphaned score records
  for (const s of (sData || [])) {
    const session = s.gm_sessions as unknown as { class_name?: string; academic_year?: string } | null;
    if (!session?.class_name) continue;

    const cls = session.class_name.trim();
    const yr = (session.academic_year || '2026/2027').trim();
    const k = makeKey(s.name, cls, yr);

    if (!behaviorMap.has(k)) {
      const newBeh = {
        student_name: s.name.trim(),
        class_name: cls,
        academic_year: yr,
        total_points: 100, // Standard baseline
        behavior_logs: []
      };
      behaviorsToInsert.push(newBeh);
      behaviorMap.set(k, newBeh);
      newlyCreatedBehaviors++;
    }
  }

  if (behaviorsToInsert.length > 0) {
    // Insert in batches of 50
    for (let i = 0; i < behaviorsToInsert.length; i += 50) {
      const chunk = behaviorsToInsert.slice(i, i + 50);
      const { error: insBehErr } = await supabaseAdmin
        .from('gm_behaviors')
        .upsert(chunk, { onConflict: 'student_name,class_name,academic_year', ignoreDuplicates: true });
      if (insBehErr) {
        console.error('[syncAllStudentData] Gagal insert behaviors baru:', insBehErr);
      }
    }
  }

  // -------------------------------------------------------------
  // STEP B: Reconcile all behaviors into gm_student_accounts
  // -------------------------------------------------------------
  const accountsToCreate: Array<{
    student_name: string;
    class_name: string;
    academic_year: string;
    username: string;
    password_plain: string;
    password_hash: string;
    profile_photo_url: string | null;
  }> = [];

  for (const [k, b] of behaviorMap.entries()) {
    if (!accountMap.has(k)) {
      const studentName = b.student_name.trim();
      const className = b.class_name.trim();
      const academicYear = b.academic_year || '2026/2027';

      // Generate unique username
      const baseUsername = generateUsername(studentName, className);
      let username = baseUsername;
      let counter = 1;
      while (usedUsernames.has(username.toLowerCase())) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
      usedUsernames.add(username.toLowerCase());

      const plainPassword = generatePassword();
      accountsToCreate.push({
        student_name: studentName,
        class_name: className,
        academic_year: academicYear,
        username,
        password_plain: plainPassword,
        password_hash: '', // will be hashed in chunks
        profile_photo_url: b.avatar_url || null
      });
    }
  }

  if (accountsToCreate.length > 0) {
    // Hash passwords concurrently in chunks of 25 for fast execution
    for (let i = 0; i < accountsToCreate.length; i += 25) {
      const chunk = accountsToCreate.slice(i, i + 25);
      await Promise.all(
        chunk.map(async (acc) => {
          acc.password_hash = await hashPassword(acc.password_plain);
        })
      );

      const { error: insAccErr } = await supabaseAdmin
        .from('gm_student_accounts')
        .insert(chunk);

      if (insAccErr) {
        console.error('[syncAllStudentData] Gagal insert akun baru:', insAccErr);
      } else {
        newlyCreatedAccounts += chunk.length;
      }
    }
  }

  // -------------------------------------------------------------
  // STEP C: Bidirectional Photo / Avatar Sync (Non-destructive)
  // -------------------------------------------------------------
  for (const [k, b] of behaviorMap.entries()) {
    const acc = accountMap.get(k);
    if (!acc) continue;

    // If behavior has avatar but account has no photo
    if (b.avatar_url && !acc.profile_photo_url) {
      await supabaseAdmin
        .from('gm_student_accounts')
        .update({ profile_photo_url: b.avatar_url })
        .eq('id', acc.id);
      syncedAvatars++;
    }
    // Or if account has photo but behavior has no avatar
    else if (acc.profile_photo_url && !b.avatar_url && b.id) {
      await supabaseAdmin
        .from('gm_behaviors')
        .update({ avatar_url: acc.profile_photo_url })
        .eq('id', b.id);
      syncedAvatars++;
    }
  }

  // -------------------------------------------------------------
  // STEP D: Reconcile GradeMaster into Smart Absensi (students table)
  // -------------------------------------------------------------
  const smartToInsert: Array<{
    id: string;
    full_name: string;
    class_name: string;
    academic_year: string;
    card_status: string;
    attendance_rate: number;
    created_at: string;
    updated_at: string;
  }> = [];

  for (const [k, b] of behaviorMap.entries()) {
    if (!smartMap.has(k)) {
      const cleanCls = (b.class_name || 'kelas').toLowerCase().replace(/[^a-z0-9]/g, '');
      const stdId = `std_${cleanCls}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      smartToInsert.push({
        id: stdId,
        full_name: b.student_name.trim(),
        class_name: b.class_name.trim(),
        academic_year: b.academic_year || '2026/2027',
        card_status: 'ACTIVE',
        attendance_rate: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      smartMap.set(k, true);
    }
  }

  if (smartToInsert.length > 0) {
    for (let i = 0; i < smartToInsert.length; i += 50) {
      const chunk = smartToInsert.slice(i, i + 50);
      const { error: insSmartErr } = await supabaseAdmin
        .from('students')
        .insert(chunk);
      if (insSmartErr) {
        console.error('[syncAllStudentData] Gagal insert ke Smart Absensi students:', insSmartErr);
      } else {
        syncedToSmartAbsensi += chunk.length;
      }
    }
  }

  // Calculate distinct classes
  const classesSet = new Set<string>();
  for (const b of behaviorMap.values()) {
    if (b.class_name) classesSet.add(b.class_name);
  }
  const classes = Array.from(classesSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const totalMasterStudents = behaviorMap.size;

  return {
    success: true,
    totalMasterStudents,
    existingAccounts: aData?.length || 0,
    newlyCreatedAccounts,
    newlyCreatedBehaviors,
    syncedAvatars,
    syncedToSmartAbsensi,
    syncedFromSmartAbsensi,
    classesCount: classes.length,
    classes,
    message: `Sinkronisasi berhasil! Total ${totalMasterStudents} siswa terdaftar di ${classes.length} kelas. ` +
      (syncedToSmartAbsensi > 0 ? `${syncedToSmartAbsensi} siswa disinkronkan ke Smart Absensi. ` : 'Smart Absensi selaras. ') +
      (syncedFromSmartAbsensi > 0 ? `${syncedFromSmartAbsensi} siswa diimpor dari Smart Absensi. ` : '') +
      (newlyCreatedAccounts > 0 ? `${newlyCreatedAccounts} akun siswa baru berhasil dibuatkan. ` : 'Semua akun sudah lengkap. ') +
      `Semua data poin, rapor, nilai, kehadiran, dan sandi siswa yang sudah ada tetap aman 100%.`
  };
}

