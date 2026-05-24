import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function GET(req: NextRequest) {
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

    // Fetch all exam scores
    const { data: scores, error: scoresError } = await supabase
      .from('gm_students')
      .select('id, name, final_score, is_deleted, gm_sessions(subject, exam_type)')
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
    const logsMap = new Map<string, any[]>();
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
    const studentsMap = new Map<string, any>();

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
        const student = studentsMap.get(key);
        student.behaviorPoints = b.total_points || 0;
        if (b.avatar_url) {
          student.avatarUrl = b.avatar_url;
        }
        student.behaviorLogs = studentLogs;
      }
    }

    // Add scores
    for (const score of (scores || [])) {
      const session = score.gm_sessions as any;
      if (!session) continue;

      const scoreNameLower = score.name.trim().toLowerCase();
      
      // Try to find matching student record in the map by exact name matching
      let foundAcc: any = null;
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

      if (foundAcc) {
         foundAcc.scores.push({
           subject: session.subject,
           type: session.exam_type,
           score: score.final_score,
           id: score.id
         });
      } else {
         // Create virtual record if not in gm_student_accounts and not in gm_behaviors
         const vKey = `virtual_${score.name}`;
         if (!studentsMap.has(vKey)) {
            studentsMap.set(vKey, {
              id: vKey,
              name: score.name,
              className: 'Unknown',
              academicYear: 'Unknown',
              scores: [],
              behaviorPoints: 0,
              isLinked: false
            });
         }
         studentsMap.get(vKey).scores.push({
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

  } catch (err: any) {
    console.error('Data Center Students error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

    const body = await req.json();
    const { name, className, action } = body; // action = 'soft_delete' or 'hard_delete'

    if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });

    const supabase = await createClient();

    if (action === 'hard_delete') {
      // Hard delete from gm_student_accounts
      await supabase.from('gm_student_accounts')
        .delete()
        .eq('student_name', name);

      // Hard delete from gm_students
      await supabase.from('gm_students')
        .delete()
        .eq('name', name);
    } else {
      // Soft delete: Delete from gm_student_accounts, but mark is_deleted=true in gm_students
      await supabase.from('gm_student_accounts')
        .delete()
        .eq('student_name', name);

      await supabase.from('gm_students')
        .update({ is_deleted: true })
        .eq('name', name);
    }

    return NextResponse.json({ success: true, message: `Siswa ${name} berhasil dihapus.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

    const body = await req.json();
    const { name, className, academicYear } = body;

    if (!name || !className) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });

    const supabase = await createClient();

    // Check existing
    const { data: existing } = await supabase.from('gm_student_accounts')
      .select('id').eq('student_name', name).eq('class_name', className).single();
      
    if (existing) {
      return NextResponse.json({ error: 'Siswa sudah ada di kelas ini' }, { status: 400 });
    }

    const { error } = await supabase.from('gm_student_accounts').insert({
      student_name: name,
      class_name: className,
      academic_year: academicYear || '2025/2026',
      username: name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000)
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Siswa ${name} berhasil ditambahkan.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
