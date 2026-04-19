import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';
import { createStudentSession } from '@/lib/grademaster/studentAuth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    // Gunakan batasan laju untuk mengamankan endpoint dari brute-force linkage attempt
    if (!checkRateLimit(`google_link:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan.' }, { status: 429 });
    }

    const { google_name } = await req.json();

    if (!google_name) {
      return NextResponse.json({ error: 'Nama Google tidak ditemukan dalam request' }, { status: 400 });
    }

    // Melakukan pencarian spesifik case-insensitive terhadap nama lengkap siswa
    // Menggunakan ilike '%name%' untuk menangani perbedaan spasi awal/akhir atau pemotongan nama
    const { data: accounts, error } = await supabase
      .from('gm_student_accounts')
      .select('id, student_name, class_name, academic_year, username, profile_photo_url')
      .ilike('student_name', `%${google_name.trim()}%`);

    if (error || !accounts || accounts.length === 0) {
      return NextResponse.json({ 
        error: `Data kelas untuk nama "${google_name}" tidak ditemukan di database` 
      }, { status: 404 });
    }

    // Mengambil kecocokan pertama apabila ada multiple match (Meski seharusnya unik)
    const account = accounts[0];

    // Otomatis menanamkan auth-session agar kedepannya sistem menganggap anak ini telah validasi DB
    await createStudentSession(account.id);

    return NextResponse.json({
      message: 'Berhasil mengaitkan profil Siswa',
      student: {
        id: account.id,
        name: account.student_name,
        class_name: account.class_name,
        academic_year: account.academic_year,
        username: account.username,
        photo_url: account.profile_photo_url,
      },
    });
  } catch (err) {
    console.error('Google Student Link error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem pengikatan profil' }, { status: 500 });
  }
}
