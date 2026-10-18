import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';

interface StudentRecord {
  id: string;
  name: string;
  final_score?: number | null;
  original_score?: number | null;
  remedial_status?: string | null;
  final_score_locked?: number | null;
  teacher_reviewed?: boolean | null;
  essay_score_manual?: number | null;
  essay_score_final?: number | null;
  remedial_score?: number | null;
  remedial_answers?: string[] | null;
  remedial_mcq_answers?: string[] | null;
  cheating_flags?: string[] | null;
  mcq_score?: number | null;
  essay_score?: number | null;
}

/**
 * Menganalisis apakah siswa SUDAH pernah menyelesaikan remedial, sedang menunggu teman,
 * atau nilainya telah diedit oleh guru. Siswa seperti ini TIDAK BOLEH dijadikan nilai 0.
 */
function isStudentExemptFromZeroPenalty(s: StudentRecord, kkm: number = 75): boolean {
  // 1. Status pengerjaan selesai atau diserahkan
  if (s.remedial_status === 'COMPLETED' || s.remedial_status === 'SUBMITTED') {
    return true;
  }

  // 2. Nilai remedial ditahan sementara menunggu teman sekelas selesai (artinya siswa ini SUDAH selesai remedial!)
  const flags = Array.isArray(s.cheating_flags) ? s.cheating_flags : [];
  if (flags.some((f: string) => typeof f === 'string' && (f.includes('Nilai remedial ditahan') || f.includes('menunggu')))) {
    return true;
  }

  // 3. Nilai telah diperiksa atau diedit secara manual oleh guru
  if (s.teacher_reviewed === true && s.remedial_status !== 'TIME_UP') {
    return true;
  }
  if (s.essay_score_manual !== null && s.essay_score_manual !== undefined) {
    return true;
  }

  // 4. Memiliki skor remedial yang valid (> 0)
  if (s.remedial_score !== null && s.remedial_score !== undefined && Number(s.remedial_score) > 0) {
    return true;
  }

  // 5. Memiliki bukti jawaban remedial yang telah dikerjakan/dikirimkan (essay / PG)
  const hasEssayAnswers = Array.isArray(s.remedial_answers) && 
    s.remedial_answers.some((a: unknown) => typeof a === 'string' && a.trim().length > 0);
  const hasMcqAnswers = Array.isArray(s.remedial_mcq_answers) && 
    s.remedial_mcq_answers.length > 0;
  if (hasEssayAnswers || hasMcqAnswers) {
    return true;
  }

  // 6. Nilai akhir sudah mencapai atau melampaui KKM (misal 75)
  const lockedOrFinal = (s.final_score_locked !== null && s.final_score_locked !== undefined) 
    ? Number(s.final_score_locked) 
    : (s.final_score !== null && s.final_score !== undefined ? Number(s.final_score) : 0);
  if (lockedOrFinal >= kkm) {
    return true;
  }

  return false;
}

/**
 * Siswa yang berhak dijadikan nilai 0:
 * - Nilai awalnya di bawah KKM (siswa wajib remedial)
 * - Belum pernah mengerjakan / menyelesaikan remedial sama sekali
 * - Belum pernah bernilai 0 dengan status TIME_UP
 * - Bukan siswa yang dikecualikan (tidak dalam status menunggu teman / nilai diedit guru)
 */
function isEligibleForZeroPenalty(s: StudentRecord, kkm: number = 75): boolean {
  // Jika sudah 0 dengan status TIME_UP, tidak perlu diproses lagi
  if (s.remedial_status === 'TIME_UP' && (s.final_score === 0 || s.final_score_locked === 0)) {
    return false;
  }

  // Jika sudah selesai, menunggu teman, atau diedit guru -> DILARANG JADIKAN 0
  if (isStudentExemptFromZeroPenalty(s, kkm)) {
    return false;
  }

  // Harus siswa yang nilai aslinya di bawah KKM (kandidat remedial)
  const orig = (s.original_score !== null && s.original_score !== undefined && Number(s.original_score) > 0)
    ? Number(s.original_score)
    : Number(s.final_score || 0);

  return orig < kkm;
}

export async function GET(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Admin session required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID wajib diberikan' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: session, error: sessErr } = await supabase
      .from('gm_sessions')
      .select('id, session_name, class_name, academic_year, kkm, scoring_config')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const deadline = session.scoring_config?.remedialDeadline;
    const isExpired = deadline ? new Date() > new Date(deadline) : false;

    // Fetch students in session with complete analysis fields
    const { data: students, error: studErr } = await supabase
      .from('gm_students')
      .select('id, name, final_score, original_score, remedial_status, final_score_locked, teacher_reviewed, essay_score_manual, essay_score_final, remedial_score, remedial_answers, remedial_mcq_answers, cheating_flags, mcq_score, essay_score')
      .eq('session_id', sessionId)
      .eq('is_deleted', false);

    if (studErr) {
      throw studErr;
    }

    const list: StudentRecord[] = students || [];
    const kkm = Number(session.kkm || 75);

    // Siswa yang berhak dikenakan nilai 0 (hanya yang belum pernah selesai mengerjakan remedial)
    const pendingStudents = list.filter(s => isEligibleForZeroPenalty(s, kkm));

    // Siswa yang sudah berstatus TIME_UP dan nilai 0
    const zeroedStudents = list.filter(s => {
      return s.remedial_status === 'TIME_UP' && (s.final_score === 0 || s.final_score_locked === 0);
    });

    // Siswa yang sudah remedial namun nilainya ditahan menunggu teman sekelas selesai
    const heldBackStudents = list.filter(s => {
      const flags = Array.isArray(s.cheating_flags) ? s.cheating_flags : [];
      return flags.some((f: string) => typeof f === 'string' && f.includes('Nilai remedial ditahan'));
    });

    return NextResponse.json({
      sessionId,
      sessionName: session.session_name,
      className: session.class_name,
      academicYear: session.academic_year || '2025/2026',
      kkm,
      deadline,
      isExpired,
      pendingCount: pendingStudents.length,
      pendingStudents: pendingStudents.map(s => ({ id: s.id, name: s.name, currentScore: s.final_score })),
      zeroedCount: zeroedStudents.length,
      zeroedStudents: zeroedStudents.map(s => ({ id: s.id, name: s.name, originalScore: s.original_score ?? s.final_score })),
      heldBackCount: heldBackStudents.length,
      heldBackStudents: heldBackStudents.map(s => ({ id: s.id, name: s.name, remedialScore: s.remedial_score }))
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GET Remedial Deadline Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Admin session required' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`remedial_deadline:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.sessionId) {
      return NextResponse.json({ error: 'Session ID wajib diberikan' }, { status: 400 });
    }

    const {
      sessionId,
      action = 'ZERO_EXPIRED',
      studentClass,
      academicYear,
      studentId,
      studentIds
    } = body;

    const supabase = await createClient();

    // 1. Fetch Session
    const { data: session, error: sessErr } = await supabase
      .from('gm_sessions')
      .select('id, session_name, class_name, academic_year, kkm, scoring_config')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ error: 'Sesi remedial tidak ditemukan' }, { status: 404 });
    }

    const kkm = Number(session.kkm || 75);

    // ACTION 1: ZERO_EXPIRED (Jadikan Nilai 0 karena belum mengerjakan setelah batas waktu)
    if (action === 'ZERO_EXPIRED' || action === 'APPLY_ZERO') {
      // WAJIB VERIFIKASI KELAS & TAHUN AJARAN SESUAI PERMINTAAN USER
      if (!studentClass || !academicYear) {
        return NextResponse.json({ 
          error: 'Konfirmasi tidak lengkap: Kelas dan Tahun Ajaran wajib diisi untuk menerapkan sanksi nilai 0.' 
        }, { status: 400 });
      }

      const inputClassNorm = String(studentClass).trim().toLowerCase();
      const sessionClassNorm = String(session.class_name || '').trim().toLowerCase();

      const inputYearNorm = String(academicYear).trim().toLowerCase();
      const sessionYearNorm = String(session.academic_year || '2025/2026').trim().toLowerCase();

      if (inputClassNorm !== sessionClassNorm) {
        return NextResponse.json({
          error: `Validasi Kelas tidak cocok! Kelas yang Anda masukkan ("${studentClass}") berbeda dengan kelas sesi aktif ("${session.class_name}").`
        }, { status: 400 });
      }

      if (inputYearNorm !== sessionYearNorm) {
        return NextResponse.json({
          error: `Validasi Tahun Ajaran tidak cocok! Tahun Ajaran yang Anda masukkan ("${academicYear}") berbeda dengan tahun ajaran sesi aktif ("${session.academic_year || '2025/2026'}").`
        }, { status: 400 });
      }

      // Query all students in this session with full criteria fields
      const { data: allStudents, error: targetErr } = await supabase
        .from('gm_students')
        .select('id, name, final_score, original_score, remedial_status, final_score_locked, teacher_reviewed, essay_score_manual, essay_score_final, remedial_score, remedial_answers, remedial_mcq_answers, cheating_flags, mcq_score, essay_score')
        .eq('session_id', sessionId)
        .eq('is_deleted', false);

      if (targetErr) throw targetErr;

      const list: StudentRecord[] = allStudents || [];

      // Filter siswa target yang berhak dijadikan 0
      let targetToZero: StudentRecord[] = [];

      if (studentId) {
        const singleStudent = list.find(s => s.id === studentId);
        if (!singleStudent) {
          return NextResponse.json({ error: 'Siswa tidak ditemukan dalam sesi ini.' }, { status: 404 });
        }
        if (!isEligibleForZeroPenalty(singleStudent, kkm)) {
          if (singleStudent.teacher_reviewed && singleStudent.remedial_status !== 'TIME_UP') {
            return NextResponse.json({ 
              error: `Siswa "${singleStudent.name}" tidak dapat dijadikan nilai 0 karena nilainya telah diedit atau diverifikasi oleh guru.` 
            }, { status: 400 });
          }
          if (isStudentExemptFromZeroPenalty(singleStudent, kkm)) {
            return NextResponse.json({ 
              error: `Siswa "${singleStudent.name}" tidak dapat dijadikan nilai 0 karena telah mengerjakan/menyelesaikan remedial atau sedang menunggu teman sekelas.` 
            }, { status: 400 });
          }
          return NextResponse.json({ 
            error: `Siswa "${singleStudent.name}" tidak memenuhi kriteria sanksi nilai 0.` 
          }, { status: 400 });
        }
        targetToZero = [singleStudent];
      } else if (Array.isArray(studentIds) && studentIds.length > 0) {
        targetToZero = list.filter(s => studentIds.includes(s.id) && isEligibleForZeroPenalty(s, kkm));
      } else {
        // Mode massal: analisa otomatis hanya siswa yang belum pernah selesai mengerjakan remedial
        targetToZero = list.filter(s => isEligibleForZeroPenalty(s, kkm));
      }

      if (targetToZero.length === 0) {
        return NextResponse.json({ 
          message: 'Tidak ada siswa yang belum mengerjakan remedial untuk dikenakan nilai 0 pada sesi ini.', 
          affectedCount: 0 
        });
      }

      const updatedNames: string[] = [];
      const nowIso = new Date().toISOString();

      // 1. Eksekusi penguncian nilai 0 untuk siswa yang belum pernah mengerjakan remedial
      for (const st of targetToZero) {
        const origScore = (st.original_score !== null && st.original_score !== undefined && Number(st.original_score) > 0)
          ? Number(st.original_score)
          : (st.final_score !== 0 && st.final_score !== null && st.final_score !== undefined)
            ? Number(st.final_score)
            : Math.round((Number(st.mcq_score || 0) * 0.7) + (Number(st.essay_score || 0) * 0.3));

        const { error: updErr } = await supabase
          .from('gm_students')
          .update({
            original_score: origScore,
            final_score: 0,
            remedial_score: 0,
            remedial_status: 'TIME_UP',
            final_score_locked: 0,
            teacher_reviewed: true,
            remedial_note: `Nilai diset 0 karena batas waktu remedial habis tanpa pengerjaan (Dikonfirmasi Admin: Kelas ${session.class_name}, TA ${session.academic_year}).`,
            updated_at: nowIso
          })
          .eq('id', st.id);

        if (!updErr) {
          updatedNames.push(st.name);

          // Update active attempt if exists
          await supabase
            .from('gm_remedial_attempts')
            .update({ status: 'TIME_UP', updated_at: nowIso })
            .eq('student_id', st.id)
            .in('status', ['INITIATED', 'ACTIVE', 'SUBMITTED']);
        }
      }

      // 2. OTOMATIS RILIS NILAI SISWA YANG MENUNGGU TEMAN
      // Karena siswa yang belum mengerjakan sekarang sudah difinalisasi (nilai 0),
      // maka siswa yang sudah remedial dan sebelumnya tertahan sekarang dapat dirilis nilainya (KKM / 75)!
      const heldBackStudents = list.filter(s => {
        if (targetToZero.some(t => t.id === s.id)) return false;
        const flags = Array.isArray(s.cheating_flags) ? s.cheating_flags : [];
        return flags.some((f: string) => typeof f === 'string' && f.includes('Nilai remedial ditahan')) || s.remedial_status === 'SUBMITTED';
      });

      const releasedNames: string[] = [];
      for (const hb of heldBackStudents) {
        const releaseScore = Math.min(
          (hb.remedial_score !== null && hb.remedial_score !== undefined && Number(hb.remedial_score) > 0)
            ? Number(hb.remedial_score)
            : (hb.essay_score_final !== null && hb.essay_score_final !== undefined && Number(hb.essay_score_final) > 0)
              ? Number(hb.essay_score_final)
              : kkm,
          kkm
        );

        const cleanedFlags = (Array.isArray(hb.cheating_flags) ? hb.cheating_flags : []).filter(
          (f: string) => typeof f === 'string' && !f.includes('Nilai remedial ditahan')
        );

        const { error: releaseErr } = await supabase
          .from('gm_students')
          .update({
            final_score: releaseScore,
            final_score_locked: releaseScore,
            remedial_score: releaseScore,
            remedial_status: 'COMPLETED',
            teacher_reviewed: true,
            cheating_flags: cleanedFlags,
            updated_at: nowIso
          })
          .eq('id', hb.id);

        if (!releaseErr) {
          releasedNames.push(hb.name);

          await supabase
            .from('gm_remedial_attempts')
            .update({ status: 'COMPLETED', updated_at: nowIso })
            .eq('student_id', hb.id)
            .in('status', ['INITIATED', 'ACTIVE', 'SUBMITTED']);
        }
      }

      let message = `Berhasil menetapkan nilai 0 untuk ${updatedNames.length} siswa di Kelas ${session.class_name} (${session.academic_year}) karena tidak mengerjakan remedial hingga batas waktu.`;
      if (releasedNames.length > 0) {
        message += ` Serta merilis nilai ${releasedNames.length} siswa yang telah selesai remedial ke nilai KKM (${kkm}).`;
      }

      return NextResponse.json({
        success: true,
        affectedCount: updatedNames.length,
        studentNames: updatedNames,
        releasedCount: releasedNames.length,
        releasedNames,
        message
      });
    }

    // ACTION 2: RESTORE_ORIGINAL (Pulihkan ke nilai asli sebelum dijadikan 0)
    if (action === 'RESTORE_ORIGINAL') {
      let query = supabase
        .from('gm_students')
        .select('id, name, original_score, final_score, mcq_score, essay_score, remedial_status')
        .eq('session_id', sessionId)
        .eq('is_deleted', false);

      if (studentId) {
        query = query.eq('id', studentId);
      } else if (Array.isArray(studentIds) && studentIds.length > 0) {
        query = query.in('id', studentIds);
      } else {
        // Restore all zeroed / TIME_UP students in this session
        query = query.eq('remedial_status', 'TIME_UP').eq('final_score', 0);
      }

      const { data: targetStudents, error: targetErr } = await query;
      if (targetErr) throw targetErr;

      const list = targetStudents || [];
      if (list.length === 0) {
        return NextResponse.json({ 
          message: 'Tidak ada siswa bernilai 0 yang ditemukan untuk dipulihkan ke nilai asli.', 
          restoredCount: 0 
        });
      }

      const restoredNames: string[] = [];
      const nowIso = new Date().toISOString();

      const config = session.scoring_config || {};
      const pgWeight = (typeof config.pgWeight === 'number') ? config.pgWeight : 0.7;
      const essayWeight = (typeof config.essayWeight === 'number') ? config.essayWeight : 0.3;

      for (const st of list) {
        const recoveredUtsScore = Math.round(
          (Number(st.mcq_score || 0) * pgWeight) +
          (Number(st.essay_score || 0) * essayWeight)
        );

        const scoreToRestore = (st.original_score !== null && st.original_score !== undefined && Number(st.original_score) > 0)
          ? Number(st.original_score)
          : recoveredUtsScore;

        const { error: updErr } = await supabase
          .from('gm_students')
          .update({
            final_score: scoreToRestore,
            final_score_locked: null, // Buka kunci nilai
            remedial_score: null,
            remedial_status: null, // Reset status agar bisa di-remedial ulang bila diinginkan
            remedial_note: 'Nilai asli dipulihkan oleh Admin.',
            updated_at: nowIso
          })
          .eq('id', st.id);

        if (!updErr) {
          restoredNames.push(st.name);

          // Delete attempts to give a fresh start
          await supabase
            .from('gm_remedial_attempts')
            .delete()
            .eq('student_id', st.id);
        }
      }

      return NextResponse.json({
        success: true,
        restoredCount: restoredNames.length,
        studentNames: restoredNames,
        message: `Berhasil memulihkan ${restoredNames.length} siswa ke nilai asli.`
      });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST Remedial Deadline Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
