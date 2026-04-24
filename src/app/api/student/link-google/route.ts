import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/grademaster/security';
import { createStudentSession } from '@/lib/grademaster/studentAuth';

export async function POST(req: NextRequest) {
  try {
      const supabase = await createClient();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    // Gunakan batasan laju untuk mengamankan endpoint dari brute-force linkage attempt
    if (!checkRateLimit(`google_link:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan.' }, { status: 429 });
    }

    const { google_name, studentId, student_name, class_name, email } = await req.json();

    if (!google_name && !studentId) {
      return NextResponse.json({ error: 'Data identifikasi tidak lengkap' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email Google diperlukan untuk validasi keamanan' }, { status: 400 });
    }

    let account;

    if (student_name && class_name) {
      // 1. Look up student by exact name and class (since studentId is from gm_behaviors)
      const { data, error } = await supabase
        .from('gm_student_accounts')
        .select('id, student_name, class_name, academic_year, username, profile_photo_url, google_email')
        .eq('student_name', student_name)
        .eq('class_name', class_name)
        .single();
      
      if (!error && data) {
        account = data;
      } else {
        // 2. Auto-create the student account because it doesn't exist yet
        const cleanName = student_name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '.');
        const cleanClass = class_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const baseUsername = `${cleanName}.${cleanClass}`;
        
        // Random suffix to avoid username conflicts without complex logic
        const suffix = Math.floor(Math.random() * 1000).toString();
        const username = `${baseUsername}${suffix}`;
        
        const { data: newAccount, error: insertError } = await supabase
          .from('gm_student_accounts')
          .insert({
            student_name,
            class_name,
            academic_year: '2025/2026',
            username: username,
            password_hash: 'google_sso_auto', // No password login for this account unless reset by admin
            google_email: email
          })
          .select('id, student_name, class_name, academic_year, username, profile_photo_url, google_email')
          .single();
          
        if (insertError || !newAccount) {
          console.error('Failed to auto-create gm_student_accounts:', insertError);
          return NextResponse.json({ error: 'Gagal membuat profil siswa baru di sistem' }, { status: 500 });
        }
        
        account = newAccount;
      }
    } else if (studentId) {
      // Legacy flow: Explicit identification via student_id (if studentId was from gm_student_accounts)
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
      // Legacy Fallback: Fuzzy name matching
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
