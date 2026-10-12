import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface OralExamSessionSummary {
  session_id: string;
  title: string;
  template_type: 'BTQ_HAFALAN' | 'BAHASA_INGGRIS_ARAB';
  class_name: string;
  academic_year: string;
  semester: string;
  examiner_name: string;
  room_number: string;
  exam_date: string;
  student_count: number;
  completed_count: number;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const academicYear = searchParams.get('academic_year');
    const className = searchParams.get('class_name');

    let query = supabaseAdmin
      .from('gm_oral_exams')
      .select('id, session_id, template_type, title, academic_year, semester, examiner_name, room_number, class_name, exam_date, btq_score, hafalan_score, english_score, arabic_score, created_at')
      .order('created_at', { ascending: false });

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    if (className) {
      query = query.eq('class_name', className);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        return NextResponse.json({ success: true, sessions: [] });
      }
      throw error;
    }

    // Group rows by session_id
    const sessionMap = new Map<string, OralExamSessionSummary>();

    for (const row of data || []) {
      const existing = sessionMap.get(row.session_id);
      const isCompleted = row.template_type === 'BTQ_HAFALAN'
        ? (row.btq_score !== null || row.hafalan_score !== null)
        : (row.english_score !== null || row.arabic_score !== null);

      if (!existing) {
        sessionMap.set(row.session_id, {
          session_id: row.session_id,
          title: row.title || 'Ujian Lisan',
          template_type: row.template_type,
          class_name: row.class_name,
          academic_year: row.academic_year,
          semester: row.semester,
          examiner_name: row.examiner_name,
          room_number: row.room_number || 'Ruang 01',
          exam_date: row.exam_date,
          student_count: 1,
          completed_count: isCompleted ? 1 : 0,
          created_at: row.created_at
        });
      } else {
        existing.student_count += 1;
        if (isCompleted) existing.completed_count += 1;
      }
    }

    const sessions = Array.from(sessionMap.values());

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil daftar sesi ujian lisan';
    console.error('[OralExamSessions GET error]:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
