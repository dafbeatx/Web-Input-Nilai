import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Parameter name wajib diisi' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Get all student exam records matching this name
    const { data: students, error: studentErr } = await supabase
      .from('gm_students')
      .select('id, name')
      .eq('name', name);

    if (studentErr) throw studentErr;
    if (!students || students.length === 0) {
      return NextResponse.json({ violations: [] });
    }

    const studentIds = students.map(s => s.id);

    // 2. Get all remedial attempts for these students
    const { data: attempts, error: attemptErr } = await supabase
      .from('gm_remedial_attempts')
      .select('id, session_id, gm_sessions(subject, exam_type)')
      .in('student_id', studentIds);

    if (attemptErr) throw attemptErr;
    if (!attempts || attempts.length === 0) {
      return NextResponse.json({ violations: [] });
    }

    const attemptIds = attempts.map(a => a.id);
    const attemptsMap = new Map(attempts.map(a => [a.id, a]));

    // 3. Get proctoring snapshots
    const { data: snapshots, error: snapshotErr } = await supabase
      .from('gm_proctoring_snapshots')
      .select('id, attempt_id, violation_type, image_data, created_at')
      .in('attempt_id', attemptIds)
      .order('created_at', { ascending: false });

    if (snapshotErr) throw snapshotErr;

    const violations = (snapshots || []).map(snap => {
      const attempt = attemptsMap.get(snap.attempt_id) as any;
      return {
        id: snap.id,
        violationType: snap.violation_type,
        imageData: snap.image_data,
        createdAt: snap.created_at,
        subject: attempt?.gm_sessions?.subject || 'Informatika',
        examType: attempt?.gm_sessions?.exam_type || 'Remedial'
      };
    });

    return NextResponse.json({ violations });
  } catch (err: any) {
    console.error('Fetch student violations error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
