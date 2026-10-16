import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, hashPassword } from '@/lib/grademaster/security';

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

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'classes';

    if (action === 'classes') {
      // Ambil daftar kelas yang tersedia dari gm_behaviors
      const { data, error } = await supabaseAdmin
        .from('gm_behaviors')
        .select('class_name')
        .not('class_name', 'is', null);

      if (error) {
        console.error('[Generate Account API] Gagal mengambil kelas:', error);
        return NextResponse.json({ error: 'Gagal memuat daftar kelas' }, { status: 500 });
      }

      const rawClasses = (data || []).map((row: { class_name: string }) => row.class_name?.trim()).filter(Boolean);
      const uniqueClasses = Array.from(new Set(rawClasses)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      return NextResponse.json({ classes: uniqueClasses });
    }

    if (action === 'students') {
      const className = searchParams.get('class');
      if (!className) {
        return NextResponse.json({ error: 'Parameter class wajib diisi' }, { status: 400 });
      }

      // Ambil seluruh siswa terdaftar di kelas tersebut dari gm_behaviors
      const { data: behaviorStudents, error: behaviorError } = await supabaseAdmin
        .from('gm_behaviors')
        .select('id, student_name, class_name, academic_year')
        .ilike('class_name', className.trim())
        .order('student_name', { ascending: true });

      if (behaviorError) {
        console.error('[Generate Account API] Gagal mengambil siswa:', behaviorError);
        return NextResponse.json({ error: 'Gagal memuat daftar siswa' }, { status: 500 });
      }

      // Ambil akun yang sudah ada untuk kelas ini dari gm_student_accounts
      const { data: existingAccounts, error: accountError } = await supabaseAdmin
        .from('gm_student_accounts')
        .select('student_name, username')
        .ilike('class_name', className.trim());

      if (accountError) {
        console.error('[Generate Account API] Gagal memeriksa akun siswa:', accountError);
      }

      const existingMap = new Map<string, string>();
      for (const acc of existingAccounts || []) {
        if (acc.student_name) {
          existingMap.set(acc.student_name.trim().toLowerCase(), acc.username);
        }
      }

      // Format response dengan informasi apakah siswa sudah punya akun atau belum
      const studentList = (behaviorStudents || []).map((s: { id: string; student_name: string; class_name: string; academic_year?: string }) => {
        const normName = s.student_name.trim().toLowerCase();
        const hasAccount = existingMap.has(normName);
        return {
          id: s.id,
          student_name: s.student_name.trim(),
          class_name: s.class_name,
          academic_year: s.academic_year || '2025/2026',
          has_account: hasAccount,
          username: hasAccount ? existingMap.get(normName) : undefined
        };
      });

      return NextResponse.json({ students: studentList });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (err) {
    console.error('[Generate Account API GET] Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`generate_account:${ip}`)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const { student_name, class_name, academic_year } = body;

    if (!student_name || !student_name.trim()) {
      return NextResponse.json({ error: 'Nama siswa wajib dipilih' }, { status: 400 });
    }

    if (!class_name || !class_name.trim()) {
      return NextResponse.json({ error: 'Kelas siswa wajib dipilih' }, { status: 400 });
    }

    const trimmedName = student_name.trim();
    const trimmedClass = class_name.trim();

    // 1. Verifikasi apakah siswa memang terdaftar di gm_behaviors
    const { data: behaviorMatch, error: checkBehaviorErr } = await supabaseAdmin
      .from('gm_behaviors')
      .select('id, student_name, class_name, academic_year')
      .ilike('student_name', trimmedName)
      .ilike('class_name', trimmedClass)
      .limit(1)
      .maybeSingle();

    if (checkBehaviorErr || !behaviorMatch) {
      return NextResponse.json(
        { error: `Data siswa "${trimmedName}" tidak ditemukan di Kelas ${trimmedClass}. Pastikan nama sesuai data sekolah.` },
        { status: 404 }
      );
    }

    // 2. Periksa apakah akun siswa sudah pernah dibuat sebelumnya
    const { data: existingAccount, error: checkAccountErr } = await supabaseAdmin
      .from('gm_student_accounts')
      .select('id, student_name, class_name, username')
      .ilike('student_name', trimmedName)
      .ilike('class_name', trimmedClass)
      .limit(1)
      .maybeSingle();

    if (checkAccountErr) {
      console.error('[Generate Account POST] Database error:', checkAccountErr);
      return NextResponse.json({ error: 'Terjadi kesalahan sistem saat memeriksa akun' }, { status: 500 });
    }

    if (existingAccount) {
      return NextResponse.json(
        {
          error: `Siswa "${trimmedName}" sudah memiliki akun dengan username: ${existingAccount.username}. Silakan masuk menggunakan akun tersebut atau hubungi guru jika lupa kata sandi.`,
          has_account: true,
          username: existingAccount.username
        },
        { status: 409 }
      );
    }

    // 3. Generate username unik
    const baseUsername = generateUsername(trimmedName, trimmedClass);
    let finalUsername = baseUsername;
    let counter = 1;

    // Periksa tabrakan username
    const { data: existingUsers } = await supabaseAdmin
      .from('gm_student_accounts')
      .select('username')
      .ilike('username', `${baseUsername}%`);

    const takenUsernames = new Set(((existingUsers as { username: string }[]) || []).map((u) => u.username.toLowerCase()));

    while (takenUsernames.has(finalUsername.toLowerCase())) {
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }

    // 4. Generate kata sandi acak dan hash
    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);
    const resolvedYear = behaviorMatch.academic_year || academic_year || '2025/2026';

    // 5. Simpan ke database gm_student_accounts
    const insertPayload = {
      student_name: behaviorMatch.student_name,
      class_name: behaviorMatch.class_name,
      academic_year: resolvedYear,
      username: finalUsername,
      password_hash: hashedPassword,
      password_plain: plainPassword,
    };

    const { data: newAccount, error: insertErr } = await supabaseAdmin
      .from('gm_student_accounts')
      .insert(insertPayload)
      .select('id, student_name, class_name, academic_year, username, password_plain')
      .single();

    if (insertErr || !newAccount) {
      console.error('[Generate Account POST] Insert error:', insertErr);
      return NextResponse.json({ error: `Gagal membuat akun siswa: ${insertErr?.message || 'Unknown error'}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Akun dan kata sandi siswa berhasil dibuat.',
      account: {
        id: newAccount.id,
        student_name: newAccount.student_name,
        class_name: newAccount.class_name,
        academic_year: newAccount.academic_year,
        username: newAccount.username,
        password: plainPassword
      }
    }, { status: 201 });
  } catch (err) {
    console.error('[Generate Account POST] Exception:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
