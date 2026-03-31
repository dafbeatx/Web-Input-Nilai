import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function GET(req: NextRequest) {
  try {
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

    if (error) throw error;
    return NextResponse.json({ attendance: data || [] });
  } catch (err: any) {
    console.error('Fetch attendance error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`attendance_post:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { records } = body; // Array of { student_name, class_name, subject, academic_year, status, date }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Data absensi wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gm_attendance')
      .upsert(records, { onConflict: 'student_name, class_name, subject, date' })
      .select();

    if (error) throw error;
    return NextResponse.json({ message: 'Absensi berhasil disimpan', data });
  } catch (err: any) {
    console.error('Save attendance error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
