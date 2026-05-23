import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

    const body = await req.json();
    const { name, className, subject, score, academicYear } = body;

    if (!name || !className || !subject || score === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const year = academicYear || '2025/2026';
    const supabase = await createClient();

    // 1. Cari atau buat Sesi "Input Manual" untuk mapel dan kelas ini
    let sessionId = null;
    const { data: existingSession } = await supabase.from('gm_sessions')
      .select('id')
      .eq('class_name', className)
      .eq('subject', subject)
      .eq('academic_year', year)
      .like('session_name', '%Input Manual%')
      .single();

    if (existingSession) {
      sessionId = existingSession.id;
    } else {
      // Buat sesi baru
      const { data: newSession, error: sessionErr } = await supabase.from('gm_sessions').insert({
        session_name: `Input Manual - ${subject}`,
        class_name: className,
        subject: subject,
        teacher: adminSession.admin_users?.username || 'Admin',
        academic_year: year,
        exam_type: 'MANUAL',
        kkm: 75,
        student_list: [name],
        answer_key: [],
        scoring_config: { pgWeight: 1, essayWeight: 0, essayMaxScore: 0, essayCount: 0 },
        is_public: true
      }).select('id').single();

      if (sessionErr) throw sessionErr;
      sessionId = newSession.id;
    }

    // 2. Upsert nilai ke gm_students
    const { data: existingStudent } = await supabase.from('gm_students')
      .select('id')
      .eq('session_id', sessionId)
      .eq('name', name)
      .eq('is_deleted', false)
      .single();

    if (existingStudent) {
      const { error: updErr } = await supabase.from('gm_students')
        .update({
          final_score: score,
          mcq_score: score,
          final_score_locked: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingStudent.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase.from('gm_students').insert({
        session_id: sessionId,
        name: name,
        final_score: score,
        mcq_score: score,
        final_score_locked: true
      });
      if (insErr) throw insErr;
    }

    return NextResponse.json({ success: true, message: `Nilai manual ${subject} untuk ${name} berhasil disimpan.` });
  } catch (err: any) {
    console.error('Manual score error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
