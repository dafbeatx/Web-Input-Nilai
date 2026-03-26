import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');
    const academicYear = searchParams.get('year');

    if (!className) {
      const year = academicYear || "2025/2026";
      const { data, error } = await supabase
        .from('gm_behaviors')
        .select('class_name')
        .eq('academic_year', year);

      if (error) throw error;
      const classes = Array.from(new Set(data?.map(d => d.class_name) || []));
      return NextResponse.json({ classes });
    }

    if (!academicYear) {
      return NextResponse.json({ error: 'Tahun ajaran wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gm_behaviors')
      .select('*')
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .order('student_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ students: data || [] });
  } catch (err: any) {
    console.error('Fetch behaviors error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`behaviors_post:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { className, academicYear, students } = body;

    if (!className || !academicYear || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'Data kelas, tahun ajaran, dan daftar siswa wajib diisi' }, { status: 400 });
    }

    const insertPayload = students.map((name: string) => ({
      student_name: name.trim(),
      class_name: className,
      academic_year: academicYear,
      total_points: 100,
      behavior_logs: []
    }));

    // Insert ignoring conflicts (due to UNIQUE constraint) to not overwrite existing students
    const { error } = await supabase
      .from('gm_behaviors')
      .insert(insertPayload)
      .select();

    // Supabase will throw error if there's a conflict and we don't have ON CONFLICT DO NOTHING.
    // Instead of raw raw query, let's upsert where we just ignore conflicts, or we can use upsert.
    // Wait, upserting will reset points to 100 if we don't handle it. Let's do an onConflict do nothing.
    // Supabase js `.upsert([], { ignoreDuplicates: true })`
    const { data: finalInsert, error: upsertError } = await supabase
      .from('gm_behaviors')
      .upsert(insertPayload, { onConflict: 'student_name, class_name, academic_year', ignoreDuplicates: true })
      .select();

    if (upsertError) throw upsertError;

    // Fetch the updated list
    const { data: currentStudents, error: fetchErr } = await supabase
      .from('gm_behaviors')
      .select('*')
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .order('student_name', { ascending: true });

    if (fetchErr) throw fetchErr;

    return NextResponse.json({ students: currentStudents });
  } catch (err: any) {
    console.error('Create behaviors error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
