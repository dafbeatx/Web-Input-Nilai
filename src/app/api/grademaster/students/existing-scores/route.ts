import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { checkRateLimit } from '@/lib/grademaster/security';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang diizinkan mengakses data ini' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`existing_scores:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');
    const subject = searchParams.get('subject');
    const academicYear = searchParams.get('year');
    const semester = searchParams.get('semester');
    const examType = searchParams.get('examType');

    if (!className || !subject || !academicYear || !semester || !examType) {
      return NextResponse.json({ error: 'Parameter pencarian tidak lengkap' }, { status: 400 });
    }

    // Determine target regular exam types to check based on the susulan type
    let targetExamTypes: string[] = [];
    if (examType === 'Susulan UTS') {
      targetExamTypes = ['UTS', 'Susulan UTS'];
    } else if (examType === 'Susulan UAS') {
      targetExamTypes = ['UAS', 'PAS', 'PAT', 'Susulan UAS'];
    }

    if (targetExamTypes.length === 0) {
      return NextResponse.json({ existingStudents: [] });
    }

    // Query gm_students joining gm_sessions using !inner join in PostgREST
    const { data, error } = await supabase
      .from('gm_students')
      .select('name, gm_sessions!inner(class_name, subject, academic_year, semester, exam_type)')
      .eq('gm_sessions.class_name', className)
      .eq('gm_sessions.subject', subject)
      .eq('gm_sessions.academic_year', academicYear)
      .eq('gm_sessions.semester', semester)
      .in('gm_sessions.exam_type', targetExamTypes);

    if (error) {
      console.error('[GET Existing Scores] Database query error:', error);
      throw error;
    }

    // Extract unique student names
    const existingStudents = Array.from(new Set(data?.map(s => s.name) || []));
    return NextResponse.json({ existingStudents });
  } catch (err: any) {
    console.error('[GET Existing Scores] Unexpected failure:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat daftar nilai terdaftar' }, { status: 500 });
  }
}
