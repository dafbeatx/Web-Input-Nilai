import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DEFAULT_SYNC_KEY = 'gm_sync_smart_absensi_2026';

interface ScoreItem {
  studentName: string;
  score: number | string;
  originalScore?: number | string;
  notes?: string;
}

interface SyncPayload {
  secretKey?: string;
  className: string;
  subject: string;
  academicYear?: string;
  examType?: string;
  teacherName?: string;
  kkm?: number;
  scores: ScoreItem[];
}

export async function POST(req: NextRequest) {
  try {
    const rawSyncKey = process.env.SMART_ABSENSI_SYNC_KEY || DEFAULT_SYNC_KEY;

    // 1. Validasi Secret Key (bisa lewat header x-sync-key, Authorization: Bearer ..., atau body)
    const headerKey = req.headers.get('x-sync-key') || req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');
    const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    let body: SyncPayload;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Format JSON request tidak valid' }, { status: 400 });
    }

    const providedKey = headerKey || bearerKey || body.secretKey;
    if (!providedKey || providedKey !== rawSyncKey) {
      return NextResponse.json({ 
        error: 'Akses ditolak: Kunci autentikasi sinkronisasi (x-sync-key) tidak valid.' 
      }, { status: 401 });
    }

    const {
      className,
      subject,
      academicYear = '2026/2027',
      examType = 'HARIAN',
      teacherName = 'Guru Pengampu',
      kkm = 75,
      scores = [],
    } = body;

    if (!className?.trim() || !subject?.trim()) {
      return NextResponse.json({ 
        error: 'Parameter className dan subject wajib diisi' 
      }, { status: 400 });
    }

    if (!Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json({ 
        error: 'Daftar nilai (scores) tidak boleh kosong' 
      }, { status: 400 });
    }

    const cleanClass = className.trim();
    const cleanSubject = subject.trim();
    const cleanYear = academicYear.trim();
    const cleanExamType = examType.trim();
    const cleanTeacher = teacherName.trim();
    const numericKkm = Number(kkm) || 75;

    const supabase = getSupabaseAdmin();

    // 2. Cari Sesi yang sudah ada di gm_sessions
    let sessionId: string | null = null;
    const sessionName = `${cleanExamType} - ${cleanSubject} - ${cleanClass} (${cleanYear})`;

    const { data: existingSession, error: checkSessionErr } = await supabase
      .from('gm_sessions')
      .select('id, student_list')
      .eq('class_name', cleanClass)
      .eq('subject', cleanSubject)
      .eq('academic_year', cleanYear)
      .eq('exam_type', cleanExamType)
      .maybeSingle();

    if (checkSessionErr) {
      console.error('[SyncFromSmartAbsensi] Error checking session:', checkSessionErr);
      throw new Error(`Gagal memeriksa sesi: ${checkSessionErr.message}`);
    }

    const incomingStudentNames = scores
      .map((s) => s.studentName?.trim())
      .filter((n): n is string => Boolean(n));

    if (existingSession) {
      sessionId = existingSession.id;
      // Perbarui student_list bila ada siswa baru
      const currentList: string[] = Array.isArray(existingSession.student_list)
        ? (existingSession.student_list as string[])
        : [];
      const mergedList = Array.from(new Set([...currentList, ...incomingStudentNames]));

      await supabase
        .from('gm_sessions')
        .update({
          teacher: cleanTeacher,
          student_list: mergedList,
          is_public: true,
          kkm: numericKkm,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    } else {
      // Buat Sesi Baru
      const { data: newSession, error: insertSessionErr } = await supabase
        .from('gm_sessions')
        .insert({
          session_name: sessionName,
          teacher: cleanTeacher,
          subject: cleanSubject,
          class_name: cleanClass,
          academic_year: cleanYear,
          exam_type: cleanExamType,
          kkm: numericKkm,
          is_public: true,
          student_list: incomingStudentNames,
          password_hash: 'system_synced',
          scoring_config: { pgWeight: 1, essayWeight: 0, essayMaxScore: 0, essayCount: 0 },
        })
        .select('id')
        .single();

      if (insertSessionErr) {
        // Jika session_name unik bentrok, coba tambahkan timestamp
        if (insertSessionErr.code === '23505') {
          const fallbackName = `${sessionName} (Sync ${Date.now()})`;
          const { data: retrySession, error: retryErr } = await supabase
            .from('gm_sessions')
            .insert({
              session_name: fallbackName,
              teacher: cleanTeacher,
              subject: cleanSubject,
              class_name: cleanClass,
              academic_year: cleanYear,
              exam_type: cleanExamType,
              kkm: numericKkm,
              is_public: true,
              student_list: incomingStudentNames,
              password_hash: 'system_synced',
              scoring_config: { pgWeight: 1, essayWeight: 0, essayMaxScore: 0, essayCount: 0 },
            })
            .select('id')
            .single();

          if (retryErr) throw retryErr;
          sessionId = retrySession.id;
        } else {
          throw insertSessionErr;
        }
      } else {
        sessionId = newSession.id;
      }
    }

    if (!sessionId) {
      throw new Error('Gagal mendapatkan Session ID');
    }

    // 3. Upsert Nilai ke gm_students
    let processedCount = 0;
    const errors: string[] = [];

    for (const item of scores) {
      if (!item.studentName?.trim()) continue;
      const studentName = item.studentName.trim();
      const finalScore = Number(item.score) || 0;
      const originalScore = item.originalScore !== undefined ? Number(item.originalScore) : finalScore;
      const remedialStatus = finalScore >= numericKkm ? 'PASSED' : 'NONE';

      try {
        // Cek apakah siswa sudah ada di sesi ini
        const { data: existingStudent } = await supabase
          .from('gm_students')
          .select('id')
          .eq('session_id', sessionId)
          .eq('name', studentName)
          .maybeSingle();

        if (existingStudent) {
          const { error: updErr } = await supabase
            .from('gm_students')
            .update({
              final_score: finalScore,
              original_score: originalScore,
              mcq_score: finalScore,
              essay_score: 0,
              remedial_status: remedialStatus,
              is_deleted: false,
            })
            .eq('id', existingStudent.id);

          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('gm_students')
            .insert({
              session_id: sessionId,
              name: studentName,
              final_score: finalScore,
              original_score: originalScore,
              mcq_score: finalScore,
              essay_score: 0,
              remedial_status: remedialStatus,
              is_deleted: false,
            });

          if (insErr) throw insErr;
        }
        processedCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Gagal memproses siswa ${studentName}: ${msg}`);
      }
    }

    // 4. Pastikan Akun Siswa di gm_student_accounts Sinkron TA 2026/2027
    // Jika siswa belum punya akun, kita update tahun ajaran akun yang ada
    await supabase
      .from('gm_student_accounts')
      .update({ academic_year: cleanYear })
      .eq('class_name', cleanClass)
      .in('student_name', incomingStudentNames);

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi berhasil: ${processedCount} nilai siswa diproses untuk kelas ${cleanClass} (${cleanYear}).`,
      sessionId,
      sessionName,
      processedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    console.error('[SyncFromSmartAbsensi] Unhandled Exception:', err);
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
