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

    let query = supabaseAdmin
      .from('gm_attendance')
      .select('subject, date, status')
      .eq('student_name', targetStudentName)
      .eq('academic_year', academicYear);

    if (className) {
      query = query.eq('class_name', className);
    }

    const { data: attendanceLogs, error: attError } = await query.order('date', { ascending: false });

    if (attError) throw attError;

    return NextResponse.json({ logs: attendanceLogs || [] });
  } catch (err: any) {
    console.error('Attendance logs error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat log absensi' }, { status: 500 });
  }
}
