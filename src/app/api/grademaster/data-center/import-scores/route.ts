import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { hashPassword } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const { subject, examType, academicYear = '2025/2026', records } = body;

    if (!subject || !examType || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Data request tidak lengkap' }, { status: 400 });
    }

    const supabase = await createClient();
    const results = {
      insertedScores: 0,
      updatedScores: 0,
      createdAccounts: 0,
      errors: [] as string[]
    };

    // Helper functions for username & password generation
    const generateUsername = (name: string, className: string): string => {
      const cleanName = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '.');
      const classSuffix = className
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      return `${cleanName}.${classSuffix}`;
    };

    const generatePassword = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    // Group records by class name
    const recordsByClass: Record<string, typeof records> = {};
    for (const record of records) {
      if (record.action === 'skip') continue;
      const cls = record.className;
      if (!recordsByClass[cls]) {
        recordsByClass[cls] = [];
      }
      recordsByClass[cls].push(record);
    }

    // Process class by class
    for (const [className, classRecords] of Object.entries(recordsByClass)) {
      try {
        let sessionId = null;
        let sessionStudentList: string[] = [];

        // Check if there is an existing session
        const { data: existingSession } = await supabase
          .from('gm_sessions')
          .select('id, student_list')
          .eq('class_name', className)
          .eq('subject', subject)
          .eq('exam_type', examType)
          .eq('academic_year', academicYear)
          .maybeSingle();

        if (existingSession) {
          sessionId = existingSession.id;
          sessionStudentList = Array.isArray(existingSession.student_list)
            ? (existingSession.student_list as string[])
            : [];
        } else {
          // Create session
          const sessionName = `${examType} - ${subject} - ${className} (${academicYear})`;
          // We must ensure the sessionName is unique. If there's a collision, append a timestamp.
          const { data: nameCheck } = await supabase
            .from('gm_sessions')
            .select('id')
            .eq('session_name', sessionName)
            .maybeSingle();

          const finalSessionName = nameCheck
            ? `${sessionName} (Imported ${Date.now()})`
            : sessionName;

          const defaultPassword = generatePassword();
          const hashedSessionPassword = await hashPassword(defaultPassword);

          const { data: newSession, error: sessionErr } = await supabase
            .from('gm_sessions')
            .insert({
              session_name: finalSessionName,
              class_name: className,
              subject: subject,
              teacher: adminSession.admin_users?.username || 'Admin',
              academic_year: academicYear,
              exam_type: examType,
              kkm: 75,
              student_list: [],
              answer_key: [],
              scoring_config: { pgWeight: 1, essayWeight: 0, essayMaxScore: 0, essayCount: 0 },
              password_hash: hashedSessionPassword,
              is_public: true
            })
            .select('id')
            .single();

          if (sessionErr) throw sessionErr;
          sessionId = newSession.id;
        }

        const studentsToAddToSession = new Set<string>(sessionStudentList);

        for (const record of classRecords) {
          let studentNameForScore = record.matchedName || record.name;

          // If action is 'create_new', create student account first
          if (record.action === 'create_new') {
            const tempUsernameBase = generateUsername(record.name, className);
            let username = tempUsernameBase;
            
            // Check username availability
            let attempts = 0;
            while (attempts < 10) {
              const { data: userExists } = await supabase
                .from('gm_student_accounts')
                .select('id')
                .eq('username', username)
                .maybeSingle();
              if (!userExists) break;
              username = `${tempUsernameBase}${Math.floor(Math.random() * 1000)}`;
              attempts++;
            }

            const plainPassword = generatePassword();
            const hashedPassword = await hashPassword(plainPassword);

            // Insert into student accounts
            const { error: accError } = await supabase
              .from('gm_student_accounts')
              .insert({
                student_name: record.name,
                class_name: className,
                academic_year: academicYear,
                username,
                password_hash: hashedPassword
              });

            if (accError) {
              results.errors.push(`Gagal membuat akun untuk ${record.name}: ${accError.message}`);
              continue;
            }

            // Create behavior record
            const { error: behError } = await supabase
              .from('gm_behaviors')
              .insert({
                student_name: record.name,
                class_name: className,
                academic_year: academicYear,
                total_points: 100,
                behavior_logs: []
              });

            if (behError) {
              console.error(`Warning: Gagal membuat behavior log untuk ${record.name}:`, behError.message);
            }

            studentNameForScore = record.name;
            results.createdAccounts++;
          }

          // Add to student list
          studentsToAddToSession.add(studentNameForScore);

          // Upsert score into gm_students
          const { data: existingStudent } = await supabase
            .from('gm_students')
            .select('id')
            .eq('session_id', sessionId)
            .eq('name', studentNameForScore)
            .eq('is_deleted', false)
            .maybeSingle();

          if (existingStudent) {
            const { error: scoreErr } = await supabase
              .from('gm_students')
              .update({
                final_score: record.score,
                mcq_score: record.score,
                final_score_locked: record.score,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingStudent.id);

            if (scoreErr) {
              results.errors.push(`Gagal mengupdate nilai ${studentNameForScore}: ${scoreErr.message}`);
            } else {
              results.updatedScores++;
            }
          } else {
            const { error: scoreErr } = await supabase
              .from('gm_students')
              .insert({
                session_id: sessionId,
                name: studentNameForScore,
                final_score: record.score,
                mcq_score: record.score,
                final_score_locked: record.score
              });

            if (scoreErr) {
              results.errors.push(`Gagal menyimpan nilai ${studentNameForScore}: ${scoreErr.message}`);
            } else {
              results.insertedScores++;
            }
          }
        }

        // Update session's student list
        await supabase
          .from('gm_sessions')
          .update({
            student_list: Array.from(studentsToAddToSession),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

      } catch (err: any) {
        results.errors.push(`Gagal memproses kelas ${className}: ${err.message}`);
      }
    }

    // Insert audit log
    await supabase.from('gm_audit_logs').insert({
      admin_id: adminSession.user_id,
      admin_username: adminSession.admin_users?.username || 'Admin',
      action_type: 'IMPORT_SCORES',
      entity_type: 'GRADES',
      payload: {
        subject,
        examType,
        academicYear,
        insertedScores: results.insertedScores,
        updatedScores: results.updatedScores,
        createdAccounts: results.createdAccounts,
        errorCount: results.errors.length
      }
    });

    return NextResponse.json({
      success: true,
      message: `Proses import selesai. ${results.insertedScores} nilai baru ditambahkan, ${results.updatedScores} nilai diperbarui, ${results.createdAccounts} akun baru dibuat.`,
      results
    });
  } catch (err: any) {
    console.error('Batch import scores error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
