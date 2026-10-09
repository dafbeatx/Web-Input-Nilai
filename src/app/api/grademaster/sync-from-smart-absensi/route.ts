import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DEFAULT_SYNC_KEY = 'gm_sync_smart_absensi_2026';

function getCorsHeaders(req?: NextRequest) {
  const origin = req?.headers.get('origin') || '*';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-sync-key, x-api-key, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
  if (origin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function GET(req: NextRequest) {
  return jsonResponse({
    status: 'online',
    endpoint: '/api/grademaster/sync-from-smart-absensi',
    description: 'GradeMaster Sync Bridge API for Smart Absensi Guru',
    timestamp: new Date().toISOString(),
  }, 200, req);
}

function jsonResponse(data: unknown, status = 200, req?: NextRequest) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(req),
  });
}

interface ScoreItem {
  studentName: string;
  score: number | string;
  originalScore?: number | string;
  notes?: string;
}

interface BehaviorItem {
  studentName: string;
  pointsDelta?: number;
  type?: 'BAD' | 'GOOD';
  reason: string;
  teacherName?: string;
  date?: string;
}

interface SyncPayload {
  secretKey?: string;
  className: string;
  academicYear?: string;
  
  // Opsi A: Nilai Ujian / Akademik
  subject?: string;
  examType?: string;
  teacherName?: string;
  kkm?: number;
  scores?: ScoreItem[];

  // Opsi B: Poin Perilaku / Kedisiplinan Siswa
  behaviors?: BehaviorItem[];
}

export async function POST(req: NextRequest) {
  try {
    const rawSyncKey = process.env.SMART_ABSENSI_SYNC_KEY || DEFAULT_SYNC_KEY;

    // 1. Validasi Secret Key
    const headerKey = req.headers.get('x-sync-key') || req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');
    const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    let body: SyncPayload;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Format JSON request tidak valid' }, 400, req);
    }

    const providedKey = headerKey || bearerKey || body.secretKey;
    if (!providedKey || providedKey !== rawSyncKey) {
      return jsonResponse({ 
        error: 'Akses ditolak: Kunci autentikasi sinkronisasi (x-sync-key) tidak valid.' 
      }, 401, req);
    }

    const {
      className,
      subject,
      academicYear = '2026/2027',
      examType = 'HARIAN',
      teacherName = 'Guru Pengampu',
      kkm = 75,
      scores = [],
      behaviors = [],
    } = body;

    if (!className?.trim()) {
      return jsonResponse({ 
        error: 'Parameter className wajib diisi' 
      }, 400, req);
    }

    const hasScores = Array.isArray(scores) && scores.length > 0;
    const hasBehaviors = Array.isArray(behaviors) && behaviors.length > 0;

    if (!hasScores && !hasBehaviors) {
      return jsonResponse({ 
        error: 'Harus menyertakan setidaknya salah satu data: scores (nilai) atau behaviors (perilaku)' 
      }, 400, req);
    }

    const cleanClass = className.trim();
    const cleanYear = academicYear.trim();
    const cleanTeacher = teacherName.trim();
    const supabase = getSupabaseAdmin();

    const resultSummary: {
      scoresProcessed?: number;
      behaviorsProcessed?: number;
      sessionId?: string;
      sessionName?: string;
      errors?: string[];
    } = {};
    const errors: string[] = [];

    // ==========================================
    // 2. PROSES SINKRONISASI NILAI AKADEMIK
    // ==========================================
    if (hasScores) {
      if (!subject?.trim()) {
        return jsonResponse({ 
          error: 'Parameter subject wajib diisi jika mengirimkan data scores' 
        }, 400, req);
      }

      const cleanSubject = subject.trim();
      const cleanExamType = examType.trim();
      const numericKkm = Number(kkm) || 75;

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
        throw new Error(`Gagal memeriksa sesi ujian: ${checkSessionErr.message}`);
      }

      const incomingStudentNames = scores
        .map((s) => s.studentName?.trim())
        .filter((n): n is string => Boolean(n));

      if (existingSession) {
        sessionId = existingSession.id;
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

      let scoresCount = 0;
      for (const item of scores) {
        if (!item.studentName?.trim()) continue;
        const studentName = item.studentName.trim();
        const finalScore = Number(item.score) || 0;
        const originalScore = item.originalScore !== undefined ? Number(item.originalScore) : finalScore;
        const remedialStatus = finalScore >= numericKkm ? 'PASSED' : 'NONE';

        try {
          const { data: existingStudent } = await supabase
            .from('gm_students')
            .select('id')
            .eq('session_id', sessionId)
            .ilike('name', studentName)
            .maybeSingle();

          if (existingStudent) {
            await supabase
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
          } else {
            await supabase
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
          }
          scoresCount++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`[Nilai] Siswa ${studentName}: ${msg}`);
        }
      }

      // Pastikan akun siswa dan gm_behaviors tersinkron ke tahun ajaran & kelas ini
      for (const studentName of incomingStudentNames) {
        try {
          // 1. Sinkron / Pastikan gm_behaviors ada agar dapat dicari oleh Orang Tua & Siswa
          const { data: existingBeh } = await supabase
            .from('gm_behaviors')
            .select('id')
            .ilike('student_name', studentName)
            .eq('class_name', cleanClass)
            .eq('academic_year', cleanYear)
            .maybeSingle();

          if (!existingBeh) {
            await supabase.from('gm_behaviors').insert({
              student_name: studentName,
              class_name: cleanClass,
              academic_year: cleanYear,
              total_points: 0,
              behavior_logs: [],
            });
          }

          // 2. Sinkron / Pastikan gm_student_accounts terupdate
          const { data: existingAcc } = await supabase
            .from('gm_student_accounts')
            .select('id, class_name, academic_year')
            .ilike('student_name', studentName)
            .maybeSingle();

          if (existingAcc) {
            if (existingAcc.class_name !== cleanClass || existingAcc.academic_year !== cleanYear) {
              await supabase
                .from('gm_student_accounts')
                .update({ class_name: cleanClass, academic_year: cleanYear })
                .eq('id', existingAcc.id);
            }
          } else {
            const cleanName = studentName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '.');
            const cleanCls = cleanClass.toLowerCase().replace(/[^a-z0-9]/g, '');
            const username = `${cleanName}.${cleanCls}${Math.floor(Math.random() * 1000)}`;
            await supabase.from('gm_student_accounts').insert({
              student_name: studentName,
              class_name: cleanClass,
              academic_year: cleanYear,
              username,
              password_hash: 'google_sso_auto',
            });
          }
        } catch (syncAccountErr) {
          console.error(`[SyncAccounts] Gagal sinkron akun siswa ${studentName}:`, syncAccountErr);
        }
      }

      resultSummary.scoresProcessed = scoresCount;
      resultSummary.sessionId = sessionId || undefined;
      resultSummary.sessionName = sessionName;
    }

    // ==========================================
    // 3. PROSES SINKRONISASI PERILAKU / BEHAVIOR
    // ==========================================
    if (hasBehaviors) {
      let behaviorsCount = 0;
      const behaviorStudentNames = behaviors
        .map((b) => b.studentName?.trim())
        .filter((n): n is string => Boolean(n));

      for (const item of behaviors) {
        if (!item.studentName?.trim()) continue;
        const studentName = item.studentName.trim();
        const reason = item.reason?.trim() || 'Catatan sikap dari Smart Absensi';
        const teacher = item.teacherName?.trim() || cleanTeacher;
        
        let delta = 5;
        if (item.pointsDelta !== undefined && !isNaN(Number(item.pointsDelta))) {
          const rawDelta = Number(item.pointsDelta);
          if (item.type === 'GOOD') {
            delta = -Math.abs(rawDelta);
          } else if (item.type === 'BAD') {
            delta = Math.abs(rawDelta);
          } else {
            delta = rawDelta;
          }
        } else {
          delta = item.type === 'GOOD' ? -5 : 5;
        }

        try {
          let { data: behaviorRecord } = await supabase
            .from('gm_behaviors')
            .select('id, total_points')
            .eq('student_name', studentName)
            .eq('class_name', cleanClass)
            .eq('academic_year', cleanYear)
            .maybeSingle();

          if (!behaviorRecord) {
            const { data: newBehavior, error: insBehErr } = await supabase
              .from('gm_behaviors')
              .insert({
                student_name: studentName,
                class_name: cleanClass,
                academic_year: cleanYear,
                total_points: 0,
                behavior_logs: [],
              })
              .select('id, total_points')
              .single();

            if (insBehErr) throw insBehErr;
            behaviorRecord = newBehavior;
          }

          if (behaviorRecord) {
            const logCreatedAt = item.date ? new Date(item.date).toISOString() : new Date().toISOString();
            const { error: logErr } = await supabase
              .from('gm_behavior_logs')
              .insert({
                student_id: behaviorRecord.id,
                points_delta: delta,
                reason,
                teacher_id: teacher,
                created_at: logCreatedAt,
              });

            if (logErr) throw logErr;

            const { data: allLogs } = await supabase
              .from('gm_behavior_logs')
              .select('points_delta')
              .eq('student_id', behaviorRecord.id);

            const newTotalPoints = (allLogs || []).reduce((sum, l) => sum + (l.points_delta || 0), 0);

            await supabase
              .from('gm_behaviors')
              .update({
                total_points: newTotalPoints,
                updated_at: new Date().toISOString(),
              })
              .eq('id', behaviorRecord.id);

            behaviorsCount++;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`[Perilaku] Siswa ${studentName}: ${msg}`);
        }
      }

      if (behaviorStudentNames.length > 0) {
        await supabase
          .from('gm_student_accounts')
          .update({ academic_year: cleanYear })
          .eq('class_name', cleanClass)
          .in('student_name', behaviorStudentNames);
      }

      resultSummary.behaviorsProcessed = behaviorsCount;
    }

    return jsonResponse({
      success: true,
      message: `Sinkronisasi berhasil diproses untuk kelas ${cleanClass} (${cleanYear}).`,
      ...resultSummary,
      errors: errors.length > 0 ? errors : undefined,
    }, 200, req);
  } catch (err: unknown) {
    console.error('[SyncFromSmartAbsensi] Unhandled Exception:', err);
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server';
    return jsonResponse({ error: message }, 500, req);
  }
}
