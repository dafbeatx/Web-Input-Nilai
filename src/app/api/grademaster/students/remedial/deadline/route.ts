import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';

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

    // Fetch students in session
    const { data: students, error: studErr } = await supabase
      .from('gm_students')
      .select('id, name, final_score, original_score, remedial_status, final_score_locked')
      .eq('session_id', sessionId)
      .eq('is_deleted', false);

    if (studErr) {
      throw studErr;
    }

    const list = students || [];
    const kkm = session.kkm || 75;

    // Students eligible to be zeroed (not yet completed, score < kkm or in active/pending states)
    const pendingStudents = list.filter(s => {
      if (s.remedial_status === 'COMPLETED') return false;
      if (s.final_score === 0 && s.remedial_status === 'TIME_UP') return false;
      return (s.final_score < kkm) || ['INITIATED', 'ACTIVE', 'SUBMITTED', 'FAILED_EFFORT', 'TIMEOUT', 'TIME_UP'].includes(s.remedial_status || '');
    });

    // Students already zeroed with TIME_UP
    const zeroedStudents = list.filter(s => {
      return s.remedial_status === 'TIME_UP' && (s.final_score === 0 || s.final_score_locked === 0);
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
      zeroedStudents: zeroedStudents.map(s => ({ id: s.id, name: s.name, originalScore: s.original_score ?? s.final_score }))
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

    // ACTION 1: ZERO_EXPIRED (Jadikan Nilai 0 karena melewati batas waktu)
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

      // Query students in this session
      let query = supabase
        .from('gm_students')
        .select('id, name, final_score, original_score, remedial_status, mcq_score, essay_score')
        .eq('session_id', sessionId)
        .eq('is_deleted', false);

      if (studentId) {
        query = query.eq('id', studentId);
      } else if (Array.isArray(studentIds) && studentIds.length > 0) {
        query = query.in('id', studentIds);
      } else {
        // Apply to all students not yet completed
        query = query.neq('remedial_status', 'COMPLETED');
      }

      const { data: targetStudents, error: targetErr } = await query;
      if (targetErr) throw targetErr;

      const list = targetStudents || [];
      if (list.length === 0) {
        return NextResponse.json({ 
          message: 'Tidak ada siswa yang memenuhi kriteria untuk dijadikan nilai 0 pada sesi ini.', 
          affectedCount: 0 
        });
      }

      const updatedNames: string[] = [];
      const nowIso = new Date().toISOString();

      for (const st of list) {
        // Calculate and preserve original score safely
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
            remedial_note: `Nilai diset 0 karena batas waktu remedial habis (Dikonfirmasi Admin: Kelas ${session.class_name}, TA ${session.academic_year}).`,
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

      return NextResponse.json({
        success: true,
        affectedCount: updatedNames.length,
        studentNames: updatedNames,
        message: `Berhasil menetapkan nilai 0 untuk ${updatedNames.length} siswa di Kelas ${session.class_name} (${session.academic_year}) karena melewati batas waktu remedial.`
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

    return NextResponse.json({ error: `Aksi "${action}" tidak dikenali.` }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST Remedial Deadline Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
