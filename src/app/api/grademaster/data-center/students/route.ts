import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAdminSession } from '@/lib/grademaster/admin';
import { hashPassword } from '@/lib/grademaster/security';

function generateUsername(name: string, className: string): string {
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');

  const classSuffix = className
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return `${cleanName}.${classSuffix}`;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

interface StudentData {
  id: string;
  name: string;
  className: string;
  academicYear: string;
  scores: Array<{ subject: string; type: string; score: number; id: string }>;
  behaviorPoints: number;
  avatarUrl?: string | null;
  behaviorLogs?: Array<{ reason: string; points: number; date: string }>;
  isLinked: boolean;
}

export async function GET() {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const supabase = await createClient();

    // Fetch all student accounts (master list)
    const { data: accounts, error: accError } = await supabase
      .from('gm_student_accounts')
      .select('*')
      .order('class_name')
      .order('student_name');

    if (accError) throw accError;

    // Fetch all exam scores joined with session metadata
    const { data: scores, error: scoresError } = await supabase
      .from('gm_students')
      .select('id, name, final_score, is_deleted, gm_sessions(subject, exam_type, class_name, academic_year)')
      .eq('is_deleted', false);

    if (scoresError) throw scoresError;

    // Fetch behavior points directly from gm_behaviors
    const { data: behaviors, error: behaviorError } = await supabase
      .from('gm_behaviors')
      .select('id, student_name, class_name, total_points, academic_year, avatar_url');

    if (behaviorError) throw behaviorError;

    // Fetch behavior logs history
    const { data: behaviorLogs, error: logsError } = await supabase
      .from('gm_behavior_logs')
      .select('student_id, points_delta, reason, violation_date, created_at');

    if (logsError) throw logsError;

    // Group logs by student_id
    const logsMap = new Map<string, Array<{ reason: string; points: number; date: string }>>();
    for (const log of (behaviorLogs || [])) {
      if (!logsMap.has(log.student_id)) {
        logsMap.set(log.student_id, []);
      }
      logsMap.get(log.student_id)!.push({
        reason: log.reason,
        points: log.points_delta,
        date: log.violation_date || log.created_at
      });
    }

    // Aggregate
    const studentsMap = new Map<string, StudentData>();

    // Initialize with accounts
    for (const acc of (accounts || [])) {
      const key = `${acc.student_name.trim().toLowerCase()}_${acc.class_name}`;
      studentsMap.set(key, {
        id: acc.id,
        name: acc.student_name,
        className: acc.class_name,
        academicYear: acc.academic_year,
        scores: [],
        behaviorPoints: 0,
        avatarUrl: acc.profile_photo_url || null,
        behaviorLogs: [],
        isLinked: true
      });
    }

    // Process behavior records so we can map class_name, points, photo, and logs for students without accounts
    for (const b of (behaviors || [])) {
      const bClass = b.class_name;
      if (!bClass) continue;
      const key = `${b.student_name.trim().toLowerCase()}_${bClass}`;
      const studentLogs = logsMap.get(b.id) || [];
      
      if (!studentsMap.has(key)) {
        // Create virtual record for student that only has behavior data
        studentsMap.set(key, {
          id: `behavior_${b.student_name}_${bClass}`,
          name: b.student_name,
          className: bClass,
          academicYear: b.academic_year || '2025/2026',
          scores: [],
          behaviorPoints: b.total_points || 0,
          avatarUrl: b.avatar_url || null,
          behaviorLogs: studentLogs,
          isLinked: false
        });
      } else {
        // Update behavior points and photo for existing account
        const student = studentsMap.get(key)!;
        student.behaviorPoints = b.total_points || 0;
        if (b.avatar_url) {
          student.avatarUrl = b.avatar_url;
        }
        student.behaviorLogs = studentLogs;
      }
    }

    // Add scores
    for (const score of (scores || [])) {
      const session = score.gm_sessions as unknown as { subject: string; exam_type: string; class_name?: string; academic_year?: string } | null;
      if (!session) continue;

      const scoreNameLower = score.name.trim().toLowerCase();
      const sessionClassLower = (session.class_name || '').trim().toLowerCase();
      
      // 1. Try exact match by name + class
      let foundAcc: StudentData | null = null;
      if (sessionClassLower) {
        const exactKey = `${scoreNameLower}_${sessionClassLower}`;
        foundAcc = studentsMap.get(exactKey) || null;
      }

      // 2. If not found, match by name across classes
      if (!foundAcc) {
        for (const [k, v] of studentsMap.entries()) {
          const lastUnderscore = k.lastIndexOf('_');
          if (lastUnderscore !== -1) {
            const mapName = k.substring(0, lastUnderscore);
            if (mapName === scoreNameLower) {
              foundAcc = v;
              break;
            }
          }
        }
      }

      if (foundAcc) {
        foundAcc.scores.push({
          subject: session.subject,
          type: session.exam_type,
          score: score.final_score,
          id: score.id
        });
      } else {
        // Fallback with real class and year if available
        const fallbackClass = session.class_name || 'Tanpa Kelas';
        const fallbackYear = session.academic_year || '2026/2027';
        const vKey = `${scoreNameLower}_${fallbackClass.toLowerCase()}`;
        if (!studentsMap.has(vKey)) {
          studentsMap.set(vKey, {
            id: `score_${score.name}_${fallbackClass}`,
            name: score.name,
            className: fallbackClass,
            academicYear: fallbackYear,
            scores: [],
            behaviorPoints: 0,
            isLinked: true
          });
        }
        studentsMap.get(vKey)!.scores.push({
          subject: session.subject,
          type: session.exam_type,
          score: score.final_score,
          id: score.id
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      students: Array.from(studentsMap.values())
    });

  } catch (err: unknown) {
    console.error('Data Center Students error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

    const body = await req.json();
    const { oldName, newName, oldClassName, newClassName, academicYear } = body;

    if (!oldName || !newName || !oldClassName || !newClassName) {
      return NextResponse.json({ error: 'Data perubahan tidak lengkap' }, { status: 400 });
    }

    const year = academicYear || '2026/2027';

    // 1. Update gm_student_accounts
    await supabaseAdmin
      .from('gm_student_accounts')
      .update({
        student_name: newName.trim(),
        class_name: newClassName.trim(),
        academic_year: year,
        updated_at: new Date().toISOString()
      })
      .ilike('student_name', oldName.trim())
      .eq('class_name', oldClassName.trim());

    // 2. Update gm_behaviors
    await supabaseAdmin
      .from('gm_behaviors')
      .update({
        student_name: newName.trim(),
        class_name: newClassName.trim(),
        academic_year: year,
        updated_at: new Date().toISOString()
      })
      .ilike('student_name', oldName.trim())
      .eq('class_name', oldClassName.trim());

    // 3. Update scores name in gm_students if name changed
    if (oldName.trim().toLowerCase() !== newName.trim().toLowerCase()) {
      await supabaseAdmin
        .from('gm_students')
        .update({
          name: newName.trim(),
          updated_at: new Date().toISOString()
        })
        .ilike('name', oldName.trim());
    }

    // 4. Update in Smart Absensi (students table)
    await supabaseAdmin
      .from('students')
      .update({
        full_name: newName.trim(),
        class_name: newClassName.trim(),
        academic_year: year,
        updated_at: new Date().toISOString()
      })
      .ilike('full_name', oldName.trim())
      .eq('class_name', oldClassName.trim());

    return NextResponse.json({
      success: true,
      message: `Data siswa ${oldName} berhasil diperbarui menjadi ${newName} (${newClassName}) secara tersinkronisasi.`
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

    const body = await req.json();
    const { name, className, action } = body; // action = 'soft_delete' or 'hard_delete'

    if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });

    const trimmedName = name.trim();
    const trimmedClass = className?.trim();

    if (action === 'hard_delete') {
      // 1. Delete from gm_student_accounts
      let accQ = supabaseAdmin
        .from('gm_student_accounts')
        .delete()
        .ilike('student_name', trimmedName);
      if (trimmedClass) accQ = accQ.eq('class_name', trimmedClass);
      await accQ;

      // 2. Delete from gm_behaviors (cascades to gm_behavior_logs)
      let behQ = supabaseAdmin
        .from('gm_behaviors')
        .delete()
        .ilike('student_name', trimmedName);
      if (trimmedClass) behQ = behQ.eq('class_name', trimmedClass);
      await behQ;

      // 3. Delete from gm_students (cascades to answers & remedial attempts)
      if (trimmedClass) {
        const { data: classSessions } = await supabaseAdmin
          .from('gm_sessions')
          .select('id, student_list')
          .eq('class_name', trimmedClass);

        if (classSessions && classSessions.length > 0) {
          const sessionIds = classSessions.map(s => s.id);
          await supabaseAdmin
            .from('gm_students')
            .delete()
            .ilike('name', trimmedName)
            .in('session_id', sessionIds);

          // Remove student name from session student_list
          for (const s of classSessions) {
            if (Array.isArray(s.student_list)) {
              const currentList = s.student_list as string[];
              const updatedList = currentList.filter(n => n.trim().toLowerCase() !== trimmedName.toLowerCase());
              if (updatedList.length !== currentList.length) {
                await supabaseAdmin
                  .from('gm_sessions')
                  .update({ student_list: updatedList })
                  .eq('id', s.id);
              }
            }
          }
        } else {
          await supabaseAdmin
            .from('gm_students')
            .delete()
            .ilike('name', trimmedName);
        }
      } else {
        await supabaseAdmin
          .from('gm_students')
          .delete()
          .ilike('name', trimmedName);
      }

      // 4. Delete from gm_attendance
      let attQ = supabaseAdmin
        .from('gm_attendance')
        .delete()
        .ilike('student_name', trimmedName);
      if (trimmedClass) attQ = attQ.eq('class_name', trimmedClass);
      await attQ;

      // 5. Delete from Smart Absensi (students table)
      let smartQ = supabaseAdmin
        .from('students')
        .delete()
        .ilike('full_name', trimmedName);
      if (trimmedClass) smartQ = smartQ.eq('class_name', trimmedClass);
      await smartQ;

      return NextResponse.json({
        success: true,
        message: `Siswa ${trimmedName}${trimmedClass ? ` (${trimmedClass})` : ''} berhasil dihapus permanen dari GradeMaster dan Smart Absensi.`
      });
    } else {
      // Soft Delete: Keep account and behavior intact, only hide exam scores
      if (trimmedClass) {
        const { data: classSessions } = await supabaseAdmin
          .from('gm_sessions')
          .select('id')
          .eq('class_name', trimmedClass);

        if (classSessions && classSessions.length > 0) {
          const sessionIds = classSessions.map(s => s.id);
          await supabaseAdmin
            .from('gm_students')
            .update({ is_deleted: true })
            .ilike('name', trimmedName)
            .in('session_id', sessionIds);
        } else {
          await supabaseAdmin
            .from('gm_students')
            .update({ is_deleted: true })
            .ilike('name', trimmedName);
        }
      } else {
        await supabaseAdmin
          .from('gm_students')
          .update({ is_deleted: true })
          .ilike('name', trimmedName);
      }

      return NextResponse.json({
        success: true,
        message: `Nilai siswa ${trimmedName} berhasil disembunyikan dari dashboard rapor.`
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

    const body = await req.json();
    const { name, names, className, academicYear } = body;

    // Support both single (name) and bulk (names) input
    const nameList: string[] = names
      ? (names as string[]).map((n: string) => n.trim()).filter((n: string) => n.length > 0)
      : name ? [name.trim()] : [];

    if (nameList.length === 0 || !className) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const supabase = await createClient();
    const year = academicYear || '2025/2026';
    let added = 0;
    let skipped = 0;
    const skippedNames: string[] = [];

    // Fetch all existing usernames to avoid collisions
    const { data: allAccounts } = await supabase
      .from('gm_student_accounts')
      .select('username');
    const usedUsernames = new Set(((allAccounts as { username: string }[]) || []).map((a) => a.username));

    for (const studentName of nameList) {
      // Check existing with academic_year
      const { data: existing } = await supabase.from('gm_student_accounts')
        .select('id')
        .eq('student_name', studentName)
        .eq('class_name', className)
        .eq('academic_year', year)
        .maybeSingle();

      if (existing) {
        skipped++;
        skippedNames.push(studentName);
        continue;
      }

      // Find previous behavior data (if any) to carry over points/logs/avatar
      const { data: prevBehavior } = await supabase
        .from('gm_behaviors')
        .select('total_points, behavior_logs, avatar_url')
        .eq('student_name', studentName)
        .order('academic_year', { ascending: false })
        .limit(1)
        .maybeSingle();

      const totalPoints = prevBehavior?.total_points ?? 0;
      const behaviorLogs = prevBehavior?.behavior_logs ?? [];
      const avatarUrl = prevBehavior?.avatar_url ?? null;

      // Handle username collision
      const baseUsername = generateUsername(studentName, className);
      let username = baseUsername;
      let counter = 1;
      while (usedUsernames.has(username)) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
      usedUsernames.add(username);

      const plainPassword = generatePassword();
      const hashedPassword = await hashPassword(plainPassword);

      // Create the student account record
      const { error: insertError } = await supabase.from('gm_student_accounts').insert({
        student_name: studentName,
        class_name: className,
        academic_year: year,
        username,
        password_plain: plainPassword,
        password_hash: hashedPassword
      });

      if (insertError) {
        console.error('[POST Data Center Students] Insert account error:', insertError);
        throw insertError;
      }

      // Upsert the behavior record in gm_behaviors to link behavior data
      const { error: upsertError } = await supabase
        .from('gm_behaviors')
        .upsert({
          student_name: studentName,
          class_name: className,
          academic_year: year,
          total_points: totalPoints,
          behavior_logs: behaviorLogs,
          avatar_url: avatarUrl
        }, { onConflict: 'student_name,class_name,academic_year' });

      if (upsertError) {
        console.error('[POST Data Center Students] Upsert behavior error:', upsertError);
        throw upsertError;
      }

      // Upsert into Smart Absensi (students table)
      try {
        const cleanCls = className.toLowerCase().replace(/[^a-z0-9]/g, '');
        const smartId = `std_${cleanCls}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        const { data: existingSmart } = await supabaseAdmin
          .from('students')
          .select('id')
          .ilike('full_name', studentName)
          .eq('class_name', className)
          .maybeSingle();

        if (!existingSmart) {
          await supabaseAdmin.from('students').insert({
            id: smartId,
            full_name: studentName,
            class_name: className,
            academic_year: year,
            card_status: 'ACTIVE',
            attendance_rate: 100
          });
        }
      } catch (smartInsertErr) {
        console.warn('[POST Data Center Students] Gagal sinkron ke Smart Absensi:', smartInsertErr);
      }

      added++;
    }

    let message = `${added} siswa berhasil ditambahkan ke Kelas ${className}.`;
    if (skipped > 0) {
      message += ` ${skipped} dilewati (sudah ada: ${skippedNames.join(', ')}).`;
    }

    return NextResponse.json({ success: true, message, added, skipped });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
