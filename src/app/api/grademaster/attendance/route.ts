import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');
    const academicYear = searchParams.get('year') || '2026/2027';
    const subject = searchParams.get('subject');
    const date = searchParams.get('date');

    if (!className || !subject) {
      return NextResponse.json({ error: 'Data kelas dan mata pelajaran wajib diisi' }, { status: 400 });
    }

    // 1. Ambil data master siswa di kelas dan tahun ajaran ini
    const { data: behaviorStudents, error: stuError } = await supabase
      .from('gm_behaviors')
      .select('id, student_name, avatar_url')
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .order('student_name', { ascending: true });

    if (stuError) {
      console.error('[GET Attendance] Behavior students error:', stuError);
    }

    // 2. Ambil dari gm_student_accounts untuk sinkronisasi jika ada yang belum terdaftar di behaviors
    const { data: accountStudents } = await supabase
      .from('gm_student_accounts')
      .select('id, student_name, profile_photo_url')
      .eq('class_name', className)
      .eq('academic_year', academicYear);

    const studentMap = new Map<string, { id: string; student_name: string; avatar_url?: string }>();
    (behaviorStudents || []).forEach(s => {
      studentMap.set(s.student_name.toLowerCase().trim(), {
        id: s.id,
        student_name: s.student_name,
        avatar_url: s.avatar_url || undefined
      });
    });

    (accountStudents || []).forEach(s => {
      const key = s.student_name.toLowerCase().trim();
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          id: s.id,
          student_name: s.student_name,
          avatar_url: s.profile_photo_url || undefined
        });
      }
    });

    const students = Array.from(studentMap.values()).sort((a, b) =>
      a.student_name.localeCompare(b.student_name, 'id', { sensitivity: 'base' })
    );

    // 3. Ambil catatan kehadiran pada tanggal, mapel, kelas, dan tahun ajaran tersebut
    let query = supabase
      .from('gm_attendance')
      .select('*')
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .eq('subject', subject);

    if (date) {
      query = query.eq('date', date);
    }

    const { data: records, error } = await query.order('student_name', { ascending: true });

    if (error) {
      console.error('[GET Attendance] DB Error:', error);
      throw error;
    }

    return NextResponse.json({ 
      students, 
      records: records || [], 
      attendance: records || [] 
    });
  } catch (err: unknown) {
    console.error('Fetch attendance failure:', err);
    const msg = err instanceof Error ? err.message : 'Gagal memuat data absensi';
    return NextResponse.json({ error: msg }, { status: 500 });
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
  } catch (err: unknown) {
    console.error('Save attendance failure:', err);
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan absensi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
