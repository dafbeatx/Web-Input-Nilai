import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { checkRateLimit } from '@/lib/grademaster/security';
import { logActivity } from '@/lib/grademaster/audit';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');
    const academicYear = searchParams.get('year');

    if (!className) {
      const year = academicYear || "2025/2026";
      const { data, error } = await supabase
        .from('gm_behaviors')
        .select('class_name')
        .eq('academic_year', year);

      if (error) {
        console.error('[GET Behaviors - Classes] DB Error:', error);
        throw error;
      }
      const classes = Array.from(new Set((data as { class_name: string }[])?.map(d => d.class_name) || []));
      return NextResponse.json({ classes });
    }

    if (!academicYear) {
      return NextResponse.json({ error: 'Tahun ajaran wajib diisi' }, { status: 400 });
    }

    let query = supabase
      .from('gm_behaviors')
      .select('*')
      .eq('academic_year', academicYear)
      .order('student_name', { ascending: true });

    if (className !== 'Semua Kelas') {
        query = query.eq('class_name', className);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET Behaviors - Students] DB Error:', error);
      throw error;
    }

    return NextResponse.json({ students: data || [] });
  } catch (err: any) {
    console.error('Fetch behaviors global error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat data perilaku' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Only admin can initialize student data' }, { status: 403 });
    }

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
      total_points: 0,
      behavior_logs: []
    }));

    const { data: finalInsert, error: upsertError } = await supabase
      .from('gm_behaviors')
      .upsert(insertPayload, { onConflict: 'student_name, class_name, academic_year', ignoreDuplicates: true })
      .select();

    if (upsertError) {
      console.error('[POST Behaviors] Upsert error:', upsertError);
      throw upsertError;
    }

    const { data: currentStudents, error: fetchErr } = await supabase
      .from('gm_behaviors')
      .select('*')
      .eq('class_name', className)
      .eq('academic_year', academicYear)
      .order('student_name', { ascending: true });

    if (fetchErr) throw fetchErr;

    // Log behavior data initialization
    logActivity({
      adminId: adminSession.user_id,
      adminUsername: adminSession.admin_users.username,
      actionType: 'INITIALIZE_BEHAVIORS',
      entityType: 'CLASS',
      entityId: className,
      payload: { studentCount: students.length, academicYear },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ students: currentStudents });
  } catch (err: any) {
    console.error('Create behaviors failure:', err);
    return NextResponse.json({ error: err.message || 'Gagal menginisialisasi siswa' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`behaviors_delete:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const cls = searchParams.get('class');
    const year = searchParams.get('year');

    if (cls && year) {
      const { error } = await supabase.from('gm_behaviors').delete().eq('class_name', cls).eq('academic_year', year);
      if (error) {
        console.error('[DELETE Behaviors - Class] Error:', error);
        throw error;
      }

      logActivity({
        adminId: adminSession.user_id,
        adminUsername: adminSession.admin_users.username,
        actionType: 'DELETE_CLASS',
        entityType: 'CLASS',
        entityId: cls,
        payload: { academicYear: year, target: 'BEHAVIORS' },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json({ message: `Kelas ${cls} berhasil dihapus` });
    }

    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });
    const { error } = await supabase.from('gm_behaviors').delete().eq('id', id);
    if (error) {
      console.error('[DELETE Behaviors - Single] Error:', error);
      throw error;
    }

    logActivity({
      adminId: adminSession.user_id,
      adminUsername: adminSession.admin_users.username,
      actionType: 'DELETE_STUDENT',
      entityType: 'BEHAVIOR',
      entityId: id,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ message: 'Siswa berhasil dihapus' });
  } catch (err: any) {
    console.error('Delete behaviors failure:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`behaviors_patch:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { studentId, oldClassName, newClassName, academicYear } = body;

    if (!newClassName || !academicYear) {
      return NextResponse.json({ error: 'Data kelas baru dan tahun ajaran wajib diisi' }, { status: 400 });
    }

    if (!studentId && !oldClassName) {
      return NextResponse.json({ error: 'Data studentId (untuk pindah kelas) atau oldClassName (untuk ganti nama kelas) wajib diisi' }, { status: 400 });
    }

    let query = supabase
      .from('gm_behaviors')
      .update({ class_name: newClassName });

    // FILTER SPECIFIC: Mencegah perpindahan massal secara tidak sengaja
    if (studentId) {
      query = query.eq('id', studentId);
    } else {
      // Fallback untuk bulk rename kelas murni, hanya dijalankan jika studentId tidak diberikan
      query = query.eq('class_name', oldClassName).eq('academic_year', academicYear);
    }

    const { error } = await query;

    if (error) {
      console.error('[PATCH Behaviors] Class update error:', error);
      throw error;
    }
    return NextResponse.json({ message: `Kelas berhasil diubah dari ${oldClassName} ke ${newClassName}` });
  } catch (err: any) {
    console.error('Patch behaviors failure:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
