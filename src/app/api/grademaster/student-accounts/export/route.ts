import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function GET(req: NextRequest) {
  try {
      const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get('year') || '2025/2026';
    const targetClass = searchParams.get('class');

    let query = supabase
      .from('gm_student_accounts')
      .select('student_name, class_name, username, password_plain')
      .eq('academic_year', academicYear)
      .order('class_name', { ascending: true })
      .order('student_name', { ascending: true });

    if (targetClass) {
      query = query.eq('class_name', targetClass);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data akun untuk diekspor' }, { status: 404 });
    }

    const XLSX = await import('xlsx');

    const workbook = XLSX.utils.book_new();

    const classesByName: Record<string, typeof data> = {};
    for (const row of data) {
      if (!classesByName[row.class_name]) {
        classesByName[row.class_name] = [];
      }
      classesByName[row.class_name].push(row);
    }

    for (const [cls, students] of Object.entries(classesByName)) {
      const sheetData = students.map((s: any, idx: number) => ({
        'No': idx + 1,
        'Nama Siswa': s.student_name,
        'Kelas': s.class_name,
        'Username': s.username,
        'Password': s.password_plain || '(sudah dihapus)',
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);

      worksheet['!cols'] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 12 },
        { wch: 25 },
        { wch: 15 },
      ];

      const safeSheetName = cls.replace(/[\\/*?[\]:]/g, '_').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const classLabel = targetClass || 'semua-kelas';
    const filename = `akun-siswa-${classLabel}-${academicYear.replace('/', '-')}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('Export student accounts error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
