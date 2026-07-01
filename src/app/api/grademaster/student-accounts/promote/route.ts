import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { checkRateLimit } from '@/lib/grademaster/security';

export const dynamic = 'force-dynamic';

function generateUsername(name: string, className: string): string {
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');

  const classSuffix = className
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return `${cleanName}.${classSuffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Sesi admin tidak valid' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`student_accounts_promote:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const { fromClass, toClass, fromYear, toYear } = body;

    if (!fromClass || !toClass || !fromYear || !toYear) {
      return NextResponse.json({ error: 'Seluruh parameter (fromClass, toClass, fromYear, toYear) wajib diisi' }, { status: 400 });
    }

    // 1. Ambil daftar siswa lengkap dari gm_behaviors di kelas asal (Roster Utama)
    const { data: behaviorsToPromote, error: behaviorSelectError } = await supabase
      .from('gm_behaviors')
      .select('student_name')
      .eq('class_name', fromClass.trim())
      .eq('academic_year', fromYear.trim());

    if (behaviorSelectError) {
      console.error('[PROMOTE Student Accounts] Select gm_behaviors error:', behaviorSelectError);
      return NextResponse.json({ error: `Gagal mengambil data roster kelas asal: ${behaviorSelectError.message}` }, { status: 500 });
    }

    if (!behaviorsToPromote || behaviorsToPromote.length === 0) {
      return NextResponse.json({ error: `Tidak ada data siswa ditemukan di kelas ${fromClass} untuk tahun ajaran ${fromYear}` }, { status: 404 });
    }

    const studentNamesToPromote = behaviorsToPromote.map(s => s.student_name);

    // 2. Cari akun yang aktif untuk siswa-siswa tersebut di kelas asal
    const { data: studentsToPromote, error: selectError } = await supabase
      .from('gm_student_accounts')
      .select('id, student_name, username')
      .eq('class_name', fromClass.trim())
      .eq('academic_year', fromYear.trim())
      .in('student_name', studentNamesToPromote);

    if (selectError) {
      console.error('[PROMOTE Student Accounts] Select error:', selectError);
      return NextResponse.json({ error: `Gagal mengambil data akun siswa kelas asal: ${selectError.message}` }, { status: 500 });
    }

    if (studentsToPromote && studentsToPromote.length > 0) {
      const studentNamesWithAccounts = studentsToPromote.map(s => s.student_name);

      // Pre-check: Check if any student name being promoted already exists in destination class and year
      const { data: conflictingStudents, error: conflictError } = await supabase
        .from('gm_student_accounts')
        .select('student_name')
        .eq('class_name', toClass.trim())
        .eq('academic_year', toYear.trim())
        .in('student_name', studentNamesWithAccounts);

      if (conflictError) {
        console.error('[PROMOTE Student Accounts] Conflict check error:', conflictError);
        return NextResponse.json({ error: `Gagal melakukan pengecekan konflik kelas tujuan: ${conflictError.message}` }, { status: 500 });
      }

      if (conflictingStudents && conflictingStudents.length > 0) {
        const conflictList = conflictingStudents.map(s => s.student_name).join(', ');
        return NextResponse.json({ 
          error: `Deteksi Konflik: Siswa berikut sudah memiliki akun di kelas ${toClass} (${toYear}): ${conflictList}. Batalkan promosi atau hapus akun mereka terlebih dahulu.` 
        }, { status: 409 });
      }

      // Fetch all usernames in database to ensure unique username generation
      const { data: allUsernames, error: usernamesError } = await supabase
        .from('gm_student_accounts')
        .select('username');

      if (usernamesError) {
        console.error('[PROMOTE Student Accounts] Fetch usernames error:', usernamesError);
        return NextResponse.json({ error: `Gagal mengambil daftar username untuk validasi: ${usernamesError.message}` }, { status: 500 });
      }

      const usedUsernames = new Set((allUsernames || []).map((a: any) => a.username));
      
      // Free the current students' old usernames since they are changing suffix
      studentsToPromote.forEach(s => {
        usedUsernames.delete(s.username);
      });

      // Pembaruan per siswa (update class, year, and new username with destination class suffix)
      const updates = studentsToPromote.map(async (student) => {
        let baseUsername = generateUsername(student.student_name, toClass);
        let username = baseUsername;
        let counter = 1;
        while (usedUsernames.has(username)) {
          username = `${baseUsername}${counter}`;
          counter++;
        }
        usedUsernames.add(username);

        const { error } = await supabase
          .from('gm_student_accounts')
          .update({
            class_name: toClass.trim(),
            academic_year: toYear.trim(),
            username,
            updated_at: new Date().toISOString()
          })
          .eq('id', student.id);

        if (error) {
          throw new Error(`Gagal mempromosikan ${student.student_name}: ${error.message}`);
        }
      });

      try {
        await Promise.all(updates);
      } catch (updateErr: any) {
        console.error('[PROMOTE Student Accounts] Update error:', updateErr);
        return NextResponse.json({ error: updateErr.message || 'Gagal memperbarui akun siswa' }, { status: 500 });
      }
    }

    // 3. Masukkan baris baru di gm_behaviors untuk pencatatan perilaku di kelas & tahun ajaran baru (default points: 0)
    const behaviorRows = studentNamesToPromote.map(name => ({
      student_name: name,
      class_name: toClass.trim(),
      academic_year: toYear.trim(),
      total_points: 0,
      behavior_logs: []
    }));

    const { error: behaviorError } = await supabase
      .from('gm_behaviors')
      .upsert(behaviorRows, { onConflict: 'student_name,class_name,academic_year' });

    if (behaviorError) {
      console.error('[PROMOTE Student Accounts] Error inserting new behaviors:', behaviorError);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mempromosikan ${studentNamesToPromote.length} siswa dari kelas ${fromClass} (${fromYear}) ke kelas ${toClass} (${toYear})`
    });

  } catch (err: any) {
    console.error('[PROMOTE Student Accounts] Critical error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memproses kenaikan kelas' }, { status: 500 });
  }
}
