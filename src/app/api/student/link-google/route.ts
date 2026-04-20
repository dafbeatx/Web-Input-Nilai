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

    const { google_name, studentId, email } = await req.json();

    if (!google_name && !studentId) {
      return NextResponse.json({ error: 'Data identifikasi tidak lengkap' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email Google diperlukan untuk validasi keamanan' }, { status: 400 });
    }

    let account;

    if (studentId) {
      // Explicit identification via student_id (New flow)
      const { data, error } = await supabase
        .from('gm_student_accounts')
        .select('id, student_name, class_name, academic_year, username, profile_photo_url, google_email')
        .eq('id', studentId)
        .single();
      
      if (error || !data) {
        return NextResponse.json({ error: 'Akun siswa tidak ditemukan' }, { status: 404 });
      }
      account = data;
    } else {
      // Fallback: Fuzzy name matching (Old flow)
      const { data: accounts, error } = await supabase
        .from('gm_student_accounts')
        .select('id, student_name, class_name, academic_year, username, profile_photo_url, google_email')
        .ilike('student_name', `%${google_name.trim()}%`);

      if (error || !accounts || accounts.length === 0) {
        return NextResponse.json({ 
          error: `Data kelas untuk nama "${google_name}" tidak ditemukan di database` 
        }, { status: 404 });
      }
      account = accounts[0];
    }

    // Security Verification: Is the account already bound to another email?
    if (account.google_email && account.google_email !== email) {
      return NextResponse.json({ 
        error: `Akses ditolak! Profil "${account.student_name}" sudah terikat permanen dengan akun Google lain.` 
      }, { status: 403 });
    }

    // Bind the account to this email if it's not bound yet
    if (!account.google_email) {
      const { error: updateError } = await supabase
        .from('gm_student_accounts')
        .update({ google_email: email })
        .eq('id', account.id);

      if (updateError) {
        console.error('Failed to bind google_email:', updateError);
        // Continue anyway to not break the flow if column is missing, but log it.
      }
    }

    // Create session to validate the identity
    await createStudentSession(account.id);

    return NextResponse.json({
      message: 'Berhasil mengaitkan profil Siswa secara permanen',
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
