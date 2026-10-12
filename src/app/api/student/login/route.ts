import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, verifyPassword } from '@/lib/grademaster/security';
import { createStudentSession } from '@/lib/grademaster/studentAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`student_login:${ip}`)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat.' },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const { username, password } = body;

    if (!username || !username.trim()) {
      return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 });
    }

    if (!password || !password.trim()) {
      return NextResponse.json({ error: 'Kata sandi wajib diisi' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // 1. Cari akun siswa berdasarkan username yang dibuat oleh admin
    const { data: account, error: accErr } = await supabaseAdmin
      .from('gm_student_accounts')
      .select('id, student_name, class_name, academic_year, username, password_hash, password_plain, profile_photo_url, google_email, study_streak, last_active_date')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (accErr) {
      console.error('[Student Login API] Database error fetching account:', accErr);
      return NextResponse.json({ error: 'Terjadi gangguan saat memverifikasi akun' }, { status: 500 });
    }

    if (!account) {
      return NextResponse.json({ error: 'Username atau kata sandi tidak sesuai' }, { status: 401 });
    }

    // 2. Verifikasi kata sandi
    let isPasswordValid = false;
    if (account.password_hash) {
      isPasswordValid = await verifyPassword(password, account.password_hash);
    }
    // Fallback jika password_plain tersimpan
    if (!isPasswordValid && account.password_plain) {
      isPasswordValid = account.password_plain === password;
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Username atau kata sandi tidak sesuai' }, { status: 401 });
    }

    // 3. Ambil data perilaku / avatar dari gm_behaviors
    const { data: behaviorRecord } = await supabaseAdmin
      .from('gm_behaviors')
      .select('id, total_points, avatar_url')
      .eq('student_name', account.student_name)
      .eq('class_name', account.class_name)
      .maybeSingle();

    // 4. Buat sesi siswa dan atur cookie HTTP-only gm_student_token
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await createStudentSession(account.id, userAgent, ipAddress);

    // 5. Catat riwayat log masuk siswa
    await supabaseAdmin
      .from('gm_student_login_logs')
      .insert({
        account_id: account.id,
        ip_address: ipAddress,
        user_agent: userAgent
      });

    return NextResponse.json({
      success: true,
      student: {
        id: account.id,
        student_id: behaviorRecord?.id || null,
        total_points: behaviorRecord?.total_points || 0,
        name: account.student_name,
        class_name: account.class_name,
        academic_year: account.academic_year,
        username: account.username,
        photo_url: account.profile_photo_url || null,
        avatar_url: behaviorRecord?.avatar_url || null,
        email: account.google_email || null,
        isGoogleLinked: true,
        study_streak: account.study_streak || 0,
        last_active_date: account.last_active_date || null
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Student Login API] Unhandled exception:', message);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem saat memproses login.' }, { status: 500 });
  }
}
