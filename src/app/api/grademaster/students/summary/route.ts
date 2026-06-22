import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase/admin';
import { getStudentSession } from '@/lib/grademaster/studentAuth';
import { getAdminSession } from '@/lib/grademaster/admin';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentName = searchParams.get('name');
    const academicYear = searchParams.get('year') || '2025/2026';
    const className = searchParams.get('class');

    if (!studentName) {
      return NextResponse.json({ error: 'Nama siswa wajib diisi' }, { status: 400 });
    }

    const adminSession = await getAdminSession();
    const studentSession = await getStudentSession();
    
    let targetStudentName = studentName;

    if (studentSession) {
      // 1. Siswa login: paksa agar hanya mengambil data dirinya sendiri
      targetStudentName = studentSession.student.name;
    } else if (!adminSession) {
      // 2. Orang tua / Guest: periksa cookie gm_parent_student
      const cookieStore = await cookies();
      const parentStudent = cookieStore.get('gm_parent_student')?.value;
      if (parentStudent) {
        targetStudentName = parentStudent;
      } else {
        // Jika tidak ada session admin, siswa, maupun parent cookie, tolak akses demi keamanan data
        return NextResponse.json({ error: 'Akses ditolak: Sesi tidak valid' }, { status: 403 });
      }
    }

    // 1. Fetch Attendance Stats with className filter if provided
    let attQuery = supabaseAdmin
      .from('gm_attendance')
      .select('status')
      .eq('student_name', targetStudentName)
      .eq('academic_year', academicYear);

    if (className) {
      attQuery = attQuery.eq('class_name', className);
    }

    const { data: attData, error: attError } = await attQuery;

    if (attError) throw attError;

    const totalAttendance = attData?.length || 0;
    const presentCount = attData?.filter((a: any) => a.status === 'Hadir').length || 0;
    const attendancePercent = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;

    // 2. Fetch Academic History
    // We join gm_students with gm_sessions and filter by class & year
    let gradeQuery = supabaseAdmin
      .from('gm_students')
      .select(`
        id,
        final_score,
        remedial_score,
        remedial_status,
        cheating_flags,
        session_id,
        gm_sessions!inner (
          session_name,
          subject,
          kkm,
          academic_year,
          class_name,
          updated_at,
          created_at,
          scoring_config
        )
      `)
      .eq('name', targetStudentName)
      .eq('is_deleted', false);

    gradeQuery = gradeQuery.eq('gm_sessions.academic_year', academicYear);
    if (className) {
      gradeQuery = gradeQuery.eq('gm_sessions.class_name', className);
    }

    const { data: gradeData, error: gradeError } = await gradeQuery.order('created_at', { ascending: false });

    if (gradeError) throw gradeError;

    // Fetch siblings for all session IDs in parallel to compute isHeldBack
    const sessionIds = Array.from(new Set((gradeData || []).map((g: any) => g.session_id))).filter(Boolean);
    const siblingMap: Record<string, any[]> = {};
    
    if (sessionIds.length > 0) {
      const { data: allSiblings } = await supabaseAdmin
        .from('gm_students')
        .select('id, name, final_score, original_score, remedial_status, session_id')
        .in('session_id', sessionIds)
        .eq('is_deleted', false);
        
      (allSiblings || []).forEach((s: any) => {
        if (!siblingMap[s.session_id]) {
          siblingMap[s.session_id] = [];
        }
        siblingMap[s.session_id].push(s);
      });
    }

    const academicHistory = await Promise.all((gradeData || []).map(async (g: any) => {
      const sessionData = Array.isArray(g.gm_sessions) ? g.gm_sessions[0] : g.gm_sessions;
      const kkm = Number(sessionData?.kkm || 70);
      let finalScore = Number(g.final_score);
      let cheatingFlags = g.cheating_flags || [];
      
      let config = sessionData?.scoring_config;
      if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch(e) {}
      }
      
      const deadline = config?.remedialDeadline;
      
      // Auto-release check: If score is held back, but deadline has passed, release it on-the-fly!
      const isHeldBackCheck = Array.isArray(cheatingFlags) && cheatingFlags.some((f: string) => f.includes('Nilai remedial ditahan'));
      if (isHeldBackCheck && deadline && new Date() > new Date(deadline)) {
        const releasedScore = g.remedial_score !== null && g.remedial_score !== undefined ? Number(g.remedial_score) : finalScore;
        const cleanedFlags = cheatingFlags.filter((f: string) => !f.includes('Nilai remedial ditahan'));
        
        console.log(`[Summary Auto-Release] Deadline passed for student=${targetStudentName}, session=${g.session_id}. Releasing score=${releasedScore}`);
        
        const { error: updateErr } = await supabaseAdmin
          .from('gm_students')
          .update({
            final_score: releasedScore,
            final_score_locked: releasedScore,
            cheating_flags: cleanedFlags
          })
          .eq('id', g.id);
           
        if (!updateErr) {
          finalScore = releasedScore;
          cheatingFlags = cleanedFlags;
        }
      }
      
      const isPassing = finalScore >= kkm;
      const showRemedialButton = true;
      const hasQuestions = Array.isArray(config?.remedialQuestions) && config.remedialQuestions.length > 0;
      const hasRemedialAvailable = !isPassing && showRemedialButton && hasQuestions && (!deadline || new Date() <= new Date(deadline));

      // Calculate sibling held back states
      const sessionSiblings = siblingMap[g.session_id] || [];
      const currentStudentInSession = sessionSiblings.find((s: any) => s.name.toLowerCase() === targetStudentName.toLowerCase());

      const isCandidate = (s: any) => {
        const orig = s.original_score !== null && s.original_score !== undefined ? Number(s.original_score) : 0;
        const fin = s.final_score !== null && s.final_score !== undefined ? Number(s.final_score) : 0;
        const baseScore = (orig > 0) ? orig : fin;
        return baseScore < kkm;
      };

      const pendingRemedialSiblings = sessionSiblings.filter((s: any) => {
        if (currentStudentInSession && s.id === currentStudentInSession.id) return false;
        if (!isCandidate(s)) return false;
        const finishedStates = ['COMPLETED', 'CHEATED', 'TIMEOUT', 'FAILED_EFFORT', 'TIME_UP', 'SUBMITTED'];
        return !finishedStates.includes(s.remedial_status || 'NONE');
      });

      const ownCheated = g.remedial_status === 'CHEATED' || (Array.isArray(cheatingFlags) && cheatingFlags.some((f: string) => f.toLowerCase().includes('curang') || f.toLowerCase().includes('sanksi') || f.toLowerCase().includes('didiskualifikasi')));
      const isHeldBack = pendingRemedialSiblings.length > 0 && !ownCheated && (g.remedial_status === 'SUBMITTED' || g.remedial_status === 'TIME_UP' || g.remedial_status === 'COMPLETED');

      // Remedial UI State Mapping (10 States)
      let remedialUiState = 'NEEDS_REMEDIAL';
      let remedialMessage = '';

      if (ownCheated) {
        remedialUiState = 'CHEATED';
        remedialMessage = 'Terdeteksi indikasi kecurangan selama remedial.';
      } else if (finalScore >= kkm) {
        remedialUiState = 'PASSING';
        remedialMessage = 'Lulus KKM';
      } else if (isHeldBack) {
        remedialUiState = 'REMEDIAL_SUBMITTED_HELD_BACK';
        remedialMessage = 'Jawaban remedial sudah dikumpulkan. Nilai final masih ditahan sementara sampai teman sekelas selesai atau sampai batas waktu.';
      } else if (g.remedial_status === 'FAILED_EFFORT') {
        remedialUiState = 'FAILED_EFFORT';
        let failedReason = "Sebagian besar jawaban terdeteksi asal-asalan, terlalu pendek, atau tidak memenuhi kriteria kelayakan esai.";
        const flags = cheatingFlags || [];
        const hasFast = flags.some((f: string) => f.includes('cepat') || f.includes('FAST_COMPLETION'));
        const hasLowEffort = flags.some((f: string) => f.includes('pendek') || f.includes('asal-asalan') || f.includes('LOW_EFFORT'));
        if (hasFast && hasLowEffort) {
          failedReason = "Durasi pengerjaan terlalu cepat (di bawah 5 menit) dan sebagian besar jawaban tidak valid/asal-asalan.";
        } else if (hasFast) {
          failedReason = "Durasi pengerjaan terlalu cepat (di bawah 5 menit). Minimal pengerjaan adalah 5 menit.";
        }
        remedialMessage = failedReason;
      } else if (g.remedial_status === 'TIME_UP') {
        remedialUiState = 'TIME_UP';
        remedialMessage = 'Ujian remedial ditutup karena batas waktu habis tanpa ada jawaban esai yang cukup valid/memadai.';
      } else if (['STARTED', 'INITIATED', 'ACTIVE'].includes(g.remedial_status)) {
        remedialUiState = 'REMEDIAL_ACTIVE';
        remedialMessage = 'Ujian remedial sedang berlangsung. Harap selesaikan dengan jujur.';
      } else if (g.remedial_status === 'SUBMITTED' || g.remedial_status === 'COMPLETED') {
        if (finalScore < kkm) {
          remedialUiState = 'REMEDIAL_SUBMITTED_BELOW_KKM';
          remedialMessage = 'Remedial selesai, namun nilai akhir masih di bawah KKM.';
        } else {
          remedialUiState = 'PASSING';
          remedialMessage = 'Lulus KKM';
        }
      } else if (deadline && new Date() > new Date(deadline)) {
        remedialUiState = 'DEADLINE_PASSED';
        remedialMessage = 'Batas waktu remedial telah terlewati.';
      } else {
        if (hasRemedialAvailable) {
          remedialUiState = 'REMEDIAL_AVAILABLE';
          remedialMessage = 'Remedial tersedia untuk dikerjakan.';
        } else {
          remedialUiState = 'NEEDS_REMEDIAL';
          remedialMessage = 'Nilai di bawah KKM. Silakan hubungi guru untuk membuka akses remedial.';
        }
      }

      const canStartRemedial = hasRemedialAvailable && !['SUBMITTED', 'COMPLETED', 'TIME_UP', 'FAILED_EFFORT', 'CHEATED', 'ACTIVE', 'INITIATED', 'STARTED'].includes(g.remedial_status);
      const remedialScore = g.remedial_score !== null && g.remedial_score !== undefined ? Number(g.remedial_score) : null;
      const displayedScore = isHeldBack ? (remedialScore !== null ? remedialScore : finalScore) : finalScore;

      return {
        sessionId: g.session_id,
        sessionName: sessionData?.session_name || 'Ujian Tanpa Nama',
        subject: sessionData?.subject || 'Umum',
        score: finalScore,
        finalScore: finalScore,
        remedialScore,
        displayedScore,
        kkm: kkm,
        date: sessionData?.updated_at,
        isPassing,
        hasRemedialAvailable,
        canStartRemedial,
        isHeldBack,
        holdbackReason: isHeldBack ? 'Nilai remedial ditahan sementara menunggu teman sekelas selesai' : null,
        remedialStatus: g.remedial_status,
        remedialDeadline: deadline,
        remedialUiState,
        remedialMessage,
        cheatingFlags
      };
    })) || [];

    // 3. Fetch latest total points to keep UI synced independently of local storage
    const { data: behaviorData } = await supabaseAdmin
      .from('gm_behaviors')
      .select('total_points')
      .eq('student_name', targetStudentName)
      .eq('academic_year', academicYear)
      .eq('class_name', className || '')
      .maybeSingle();

    const totalPoints = behaviorData?.total_points ?? 0;

    // 4. Mock Documents (In real app, this might pull from a storage table)
    const documents = [
      { id: 'report-1', name: 'Laporan Progres Kelakuan', type: 'PDF', size: '1.2 MB', ready: true },
      ...(totalPoints === 0 ? [{ id: 'cert-1', name: 'Sertifikat Kedisiplinan', type: 'JPG', size: '2.4 MB', ready: academicHistory.length > 0 }] : []),
      { id: 'history-1', name: 'Rekap Nilai Tahunan', type: 'XLSX', size: '0.5 MB', ready: totalAttendance > 0 }
    ];

    return NextResponse.json({
      attendance: {
        percentage: attendancePercent,
        total: totalAttendance,
        present: presentCount
      },
      academicHistory,
      documents,
      total_points: totalPoints
    });
  } catch (err: any) {
    console.error('Student summary error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat ringkasan siswa' }, { status: 500 });
  }
}
