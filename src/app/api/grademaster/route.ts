import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPassword, verifyPassword, validateSessionInput, checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';
import { getStudentSession } from '@/lib/grademaster/studentAuth';
import { generateQuestionDifficulties } from '@/lib/grademaster/analytics';
import { GradedStudent } from '@/lib/grademaster/types';
import { calculateStudentResult } from '@/lib/grademaster/scoring';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json();
    const {
      action,
      sessionId,
      sessionName,
      password,
      answerKey,
      teacher,
      subject,
      className,
      schoolLevel,
      studentList,
      scoringConfig,
      examType,
      academicYear,
      semester,
      kkm,
      remedialEssayCount,
      remedialTimer,
      isDemo,
    } = body;

    // Determine if we are updating or creating
    let existing = null;
    if (sessionId) {
      const { data } = await supabase.from('gm_sessions').select('id, session_name, password_hash').eq('id', sessionId).single();
      existing = data;
    } else if (sessionName?.trim()) {
      const { data } = await supabase.from('gm_sessions').select('id, session_name, password_hash').eq('session_name', sessionName.trim()).single();
      existing = data;
    }

    // RESYNC LOGIC
    if (action === 'resync') {
      const targetId = sessionId || existing?.id;
      if (!targetId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
      
      // 1. Fetch current session key and config
      const { data: session, error: sessError } = await supabase
        .from('gm_sessions')
        .select('answer_key, scoring_config')
        .eq('id', targetId)
        .single();
      
      if (sessError || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      
      // 2. Fetch all students
      const { data: students, error: stuError } = await supabase
        .from('gm_students')
        .select('*')
        .eq('session_id', targetId);
        
      if (stuError || !students) return NextResponse.json({ error: 'Students not found' }, { status: 404 });
      
      // 3. Re-calculate and update each student
      const updates = students.map((s: any) => {
        const result = calculateStudentResult(
          session.answer_key, 
          s.mcq_answers, 
          s.essay_scores, 
          session.scoring_config
        );
        
        return supabase
          .from('gm_students')
          .update({
            mcq_score: Math.round(result.score),
            essay_score: Math.round(result.essayScore),
            final_score: Math.round(result.finalScore),
            correct: result.correct,
            wrong: result.wrong,
            csi: result.csi,
            lps: result.lps
          })
          .eq('id', s.id);
      });
      
      await Promise.all(updates);
      
      return NextResponse.json({ message: `Berhasil sinkronisasi ${students.length} siswa.` });
    }

    if (existing) {
      // UPDATE LOGIC
      // 1. Verify Access: Either Global Admin or Correct Session Password
      if (!adminSession) {
        if (!password) {
          return NextResponse.json({ error: 'Password wajib diisi untuk memperbarui sesi' }, { status: 400 });
        }
        const valid = await verifyPassword(password.trim(), existing.password_hash);
        if (!valid) {
          return NextResponse.json({ error: 'Password salah untuk sesi ini' }, { status: 403 });
        }
      }

      // 2. Performance update
      const { error } = await supabase
        .from('gm_sessions')
        .update({
          answer_key: answerKey || undefined,
          teacher: teacher || undefined,
          subject: subject || undefined,
          class_name: className || undefined,
          school_level: schoolLevel || undefined,
          student_list: studentList || undefined,
          scoring_config: scoringConfig || undefined,
          exam_type: examType || undefined,
          academic_year: academicYear || undefined,
          semester: semester || undefined,
          kkm: kkm || undefined,
          remedial_essay_count: remedialEssayCount || undefined,
          remedial_timer: remedialTimer || undefined,
          is_public: body.isPublic === undefined ? undefined : body.isPublic,
          is_demo: body.isDemo === undefined ? undefined : body.isDemo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
      return NextResponse.json({ message: 'Sesi berhasil diperbarui', sessionId: existing.id });
    }

    // CREATE LOGIC - REQUIRE ADMIN LOGIN
    if (!adminSession) {
      return NextResponse.json({ 
        error: 'Hanya Admin yang diizinkan membuat sesi kelas baru. Silakan login terlebih dahulu.' 
      }, { status: 401 });
    }

    const validationError = validateSessionInput({ sessionName, password, teacher, subject });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const passwordHash = await hashPassword(password.trim());

    const { data: newSession, error } = await supabase
      .from('gm_sessions')
      .insert({
        session_name: sessionName.trim(),
        password_hash: passwordHash,
        answer_key: answerKey || [],
        teacher: teacher || '',
        subject: subject || '',
        class_name: className || '',
        school_level: schoolLevel || 'SMA',
        student_list: studentList || [],
        scoring_config: scoringConfig || undefined,
        exam_type: examType || 'UTS',
        academic_year: academicYear || '2025/2026',
        semester: semester || 'Ganjil',
        kkm: kkm || 70,
        remedial_essay_count: remedialEssayCount || 5,
        remedial_timer: remedialTimer || 15,
        is_public: body.isPublic === true,
        is_demo: body.isDemo === true,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Nama sesi kelas ini sudah digunakan. Vercel/Supabase mewajibkan nama sesi yang unik. Silakan tambahkan kode unik, misal: "UTS SMA N 1 - Informatika".');
      throw new Error(`Error Basis Data (${error.code || 'Unknown'}): ${error.message}`);
    }
    return NextResponse.json({ message: 'Sesi berhasil dibuat', sessionId: newSession?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as Record<string, unknown>).message) : 'Gagal menyimpan sesi';
    const code = (typeof err === 'object' && err !== null && 'code' in err) ? String((err as Record<string, unknown>).code) : '';
    console.error('Session save error:', code, message, err);
    return NextResponse.json({ error: `${code ? `[${code}] ` : ''}${message}` }, { status: 500 });
  }
}

  export async function GET(req: NextRequest) {
    try {
      const supabase = await createClient();
      const adminSession = await getAdminSession();
      const studentSession = await getStudentSession();
      const { searchParams } = new URL(req.url);
      const name = searchParams.get('name');
      const password = searchParams.get('password');
  
      // List all sessions (auth conditionally modifies results)
      if (!name && !password) {
        let query = supabase
          .from('gm_sessions')
          .select('id, session_name, teacher, subject, class_name, school_level, exam_type, academic_year, updated_at, kkm, remedial_essay_count, remedial_timer, is_public, is_demo')
          .order('updated_at', { ascending: false });

        if (!adminSession) {
          query = query.eq('is_demo', false);
        }

        const { data, error } = await query;
  
        if (error) throw error;

      // Attach student count per session
      const sessionsWithCounts = await Promise.all(
        (data || []).map(async (s) => {
          const { count } = await supabase
            .from('gm_students')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id);
          return { ...s, student_count: count || 0 };
        })
      );

      return NextResponse.json({ sessions: sessionsWithCounts });
    }

    if (!name) {
      return NextResponse.json({ error: 'Nama sesi wajib diisi' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`get:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const { data: session, error: sessError } = await supabase
      .from('gm_sessions')
      .select('*, gm_students(*)')
      .eq('session_name', name.trim())
      .single();

    if (sessError || !session) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });

    // Block non-admins from direct-linking to demo sessions
    if (session.is_demo && !adminSession) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    let isReadOnly = false;
    
    // Check access:
    // 1. If Admin Session exists -> Full Access
    // 2. If password provided -> Validate. If correct, Full Access (Teacher).
    // 3. If Student Session exists -> Read-only.
    // 4. Fallback -> Access Denied.
    if (adminSession) {
      isReadOnly = false;
    } else if (password) {
      const isMatch = await verifyPassword(password.trim(), session.password_hash);
      if (isMatch) {
        isReadOnly = false;
      } else {
        return NextResponse.json({ error: 'Password salah' }, { status: 403 });
      }
    } else {
      isReadOnly = true;
    }

    const { data: students } = await supabase
      .from('gm_students')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    const gradedStudents: GradedStudent[] = (students || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      answers: isReadOnly ? {} : s.mcq_answers,
      essayScores: isReadOnly ? [] : s.essay_scores,
      correct: s.correct,
      wrong: s.wrong,
      mcqScore: Number(s.mcq_score),
      essayScore: Number(s.essay_score),
      finalScore: Number(s.final_score),
      percentage: Number(s.final_score),
      csi: s.csi,
      lps: s.lps,
      remedialStatus: s.remedial_status,
      remedialLocation: isReadOnly ? undefined : s.remedial_location,
      remedialPhoto: isReadOnly ? undefined : s.remedial_photo,
      remedialAnswers: isReadOnly ? undefined : s.remedial_answers,
      remedialNote: isReadOnly ? undefined : s.remedial_note,
      originalScore: s.original_score ? Number(s.original_score) : undefined,
      remedialScore: s.remedial_score ? Number(s.remedial_score) : undefined,
      finalScoreLocked: s.final_score_locked ? Number(s.final_score_locked) : undefined,
      isCheated: isReadOnly ? undefined : s.is_cheated,
      teacherReviewed: isReadOnly ? undefined : s.teacher_reviewed,
      cheatingFlags: isReadOnly ? undefined : s.cheating_flags,
      remedialAttempts: s.remedial_attempts,
      essayScoreAuto: s.essay_score_auto ? Number(s.essay_score_auto) : undefined,
      essayScoreManual: s.essay_score_manual ? Number(s.essay_score_manual) : undefined,
      essayScoreFinal: s.essay_score_final ? Number(s.essay_score_final) : undefined,
      essayAutoDetails: isReadOnly ? undefined : s.essay_auto_details,
    }));

    // Calculate difficulties on server before hiding answerKey
    const questionDifficulties = generateQuestionDifficulties(gradedStudents, session.answer_key);

    // Calculate dynamic visibility of the remedial button based on "future session" logic.
    // If the session was created AFTER the old hardcoded deadline, it qualifies as the "next exam session"
    // Alternatively, if the exact current time hasn't passed the deadline yet, show the button.
    const REMEDIAL_DEADLINE_DATE = new Date('2026-03-30T07:00:00+07:00').getTime();
    const sessionDate = new Date(session.created_at).getTime();
    const now = Date.now();
    const showRemedialButton = (sessionDate > REMEDIAL_DEADLINE_DATE) || (now <= REMEDIAL_DEADLINE_DATE);

    return NextResponse.json({
      sessionId: session.id,
      sessionName: session.session_name,
      answerKey: isReadOnly ? [] : session.answer_key,
      teacher: session.teacher,
      subject: session.subject,
      className: session.class_name,
      schoolLevel: session.school_level,
      studentList: session.student_list,
      scoringConfig: session.scoring_config,
      examType: session.exam_type || 'UTS',
      academicYear: session.academic_year || '2025/2026',
      semester: session.semester || 'Ganjil',
      kkm: session.kkm || 70,
      remedialEssayCount: session.remedial_essay_count || 5,
      remedialTimer: session.remedial_timer || 15,
      isPublic: session.is_public,
      isDemo: session.is_demo,
      isReadOnly,
      showRemedialButton,
      questionDifficulties, // Pre-calculated for students
      gradedStudents,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat sesi';
    console.error('Session load error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`del:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const body = await req.json();
    const { sessionId, sessionName, password } = body;

    let existing = null;
    if (sessionId) {
      const { data } = await supabase.from('gm_sessions').select('id, session_name, password_hash').eq('id', sessionId).single();
      existing = data;
    } else if (sessionName?.trim()) {
      const { data } = await supabase.from('gm_sessions').select('id, session_name, password_hash').eq('session_name', sessionName.trim()).single();
      existing = data;
    }

    if (!existing) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    // Verify Access: Global Admin OR Session Password
    if (!adminSession) {
      if (!password) {
        return NextResponse.json({ error: 'Password wajib diisi untuk menghapus sesi' }, { status: 400 });
      }
      const valid = await verifyPassword(password.trim(), existing.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Password salah' }, { status: 403 });
      }
    }

    // CASCADE delete handles students & answers
    const { error: deleteError } = await supabase
      .from('gm_sessions')
      .delete()
      .eq('id', existing.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Sesi berhasil dihapus' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus sesi';
    console.error('Session delete error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
