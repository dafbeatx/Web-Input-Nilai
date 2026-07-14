import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');
    const academicYear = searchParams.get('year');
    const subject = searchParams.get('subject');
    const date = searchParams.get('date');

    if (!className || !academicYear || !subject) {
      return NextResponse.json({ error: 'Data kelas, tahun ajaran, dan mata pelajaran wajib diisi' }, { status: 400 });
    }

    let query = supabase
      .from('gm_attendance')
      .select('*')
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .eq('subject', subject);

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query.order('student_name', { ascending: true });

    if (error) {
      console.error('[GET Attendance] DB Error:', error);
      throw error;
    }
    return NextResponse.json({ attendance: data || [] });
  } catch (err: any) {
    console.error('Fetch attendance failure:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat data absensi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang dapat mengubah absensi' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`attendance_post:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { records } = body; 

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Data absensi wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gm_attendance')
      .upsert(records, { onConflict: 'student_name, class_name, subject, date' })
      .select();

    if (error) {
      console.error('[POST Attendance] Upsert Error:', error);
      throw error;
    }
    return NextResponse.json({ message: 'Absensi berhasil disimpan', data });
  } catch (err: any) {
    console.error('Save attendance failure:', err);
    return NextResponse.json({ error: err.message || 'Gagal menyimpan absensi' }, { status: 500 });
  }
}
