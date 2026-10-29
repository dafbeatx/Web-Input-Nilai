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

const DEFAULT_ACADEMIC_YEAR = '2026/2027';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'classes';
    const targetYear = searchParams.get('year') || DEFAULT_ACADEMIC_YEAR;

    if (action === 'classes') {
      // Ambil daftar kelas yang tersedia untuk tahun ajaran aktif dari gm_behaviors
      let { data, error } = await supabaseAdmin
        .from('gm_behaviors')
        .select('class_name')
        .eq('academic_year', targetYear)
        .not('class_name', 'is', null);

      // Fallback jika belum ada data di tahun ajaran ini
      if (!data || data.length === 0) {
        const fallback = await supabaseAdmin
          .from('gm_behaviors')
          .select('class_name')
          .not('class_name', 'is', null);
        data = fallback.data;
        error = fallback.error;
      }

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

      // 1. Ambil siswa terdaftar di kelas untuk tahun ajaran aktif dari gm_behaviors
      let { data: behaviorStudents, error: behaviorError } = await supabaseAdmin
        .from('gm_behaviors')
        .select('id, student_name, class_name, academic_year')
        .ilike('class_name', className.trim())
        .eq('academic_year', targetYear)
        .order('student_name', { ascending: true });

      // Fallback: Jika tidak ada data spesifik tahun ini, cari tanpa filter tahun
      if (!behaviorStudents || behaviorStudents.length === 0) {
        const fallback = await supabaseAdmin
          .from('gm_behaviors')
          .select('id, student_name, class_name, academic_year')
          .ilike('class_name', className.trim())
          .order('student_name', { ascending: true });
        behaviorStudents = fallback.data;
        behaviorError = fallback.error;
      }

      if (behaviorError) {
        console.error('[Generate Account API] Gagal mengambil siswa:', behaviorError);
        return NextResponse.json({ error: 'Gagal memuat daftar siswa' }, { status: 500 });
      }

      // 2. Strict Deduplication: Setiap nama siswa HANYA BOLEH MUNCUL SATU KALI
      const uniqueStudentMap = new Map<string, { id: string; student_name: string; class_name: string; academic_year: string }>();
      for (const s of behaviorStudents || []) {
        if (!s.student_name) continue;
        const normKey = s.student_name.trim().toUpperCase();
        // Prioritaskan baris yang cocok dengan target tahun ajaran
        if (!uniqueStudentMap.has(normKey) || s.academic_year === targetYear) {
          uniqueStudentMap.set(normKey, {
            ...s,
            student_name: s.student_name.trim(),
            academic_year: s.academic_year || targetYear
          });
        }
      }

      const deduplicatedStudents = Array.from(uniqueStudentMap.values()).sort((a, b) =>
        a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' })
      );

      // 3. Ambil akun yang sudah ada untuk kelas dan tahun ajaran ini dari gm_student_accounts
      const cleanClass = className.replace(/^kelas\s+/i, '').trim();
      const classFilter = `class_name.eq.${cleanClass},class_name.ilike.${cleanClass},class_name.ilike.Kelas ${cleanClass}`;
      const { data: existingAccounts, error: accountError } = await supabaseAdmin
        .from('gm_student_accounts')
        .select('student_name, username')
        .or(classFilter)
        .eq('academic_year', targetYear);

      if (accountError) {
        console.error('[Generate Account API] Gagal memeriksa akun siswa:', accountError);
      }

      const existingMap = new Map<string, string>();
      for (const acc of existingAccounts || []) {
        if (acc.student_name) {
          existingMap.set(acc.student_name.trim().toLowerCase(), acc.username);
        }
      }

      // Format response
      const studentList = deduplicatedStudents.map((s) => {
        const normName = s.student_name.toLowerCase();
        const hasAccount = existingMap.has(normName);
        return {
          id: s.id,
          student_name: s.student_name,
          class_name: s.class_name,
          academic_year: s.academic_year || targetYear,
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

    const { student_name, class_name, academic_year, password } = body;

    if (!student_name || !student_name.trim()) {
      return NextResponse.json({ error: 'Nama siswa wajib dipilih' }, { status: 400 });
    }

    if (!class_name || !class_name.trim()) {
      return NextResponse.json({ error: 'Kelas siswa wajib dipilih' }, { status: 400 });
    }

    const trimmedName = student_name.trim();
    const trimmedClass = class_name.trim();

    // Validasi kata sandi pilihan siswa jika diisi
    let plainPassword = '';
    if (typeof password === 'string' && password.trim().length > 0) {
      if (password.trim().length < 4) {
        return NextResponse.json(
          { error: 'Kata sandi minimal 4 karakter' },
          { status: 400 }
        );
      }
      plainPassword = password.trim();
    } else {
      plainPassword = generatePassword();
    }

    const targetYear = academic_year || DEFAULT_ACADEMIC_YEAR;

    // 1. Verifikasi apakah siswa memang terdaftar di gm_behaviors untuk tahun ajaran aktif
    let { data: behaviorMatch, error: checkBehaviorErr } = await supabaseAdmin
      .from('gm_behaviors')
      .select('id, student_name, class_name, academic_year')
      .ilike('student_name', trimmedName)
      .ilike('class_name', trimmedClass)
      .eq('academic_year', targetYear)
      .limit(1)
      .maybeSingle();

    if (!behaviorMatch) {
      const fallback = await supabaseAdmin
        .from('gm_behaviors')
        .select('id, student_name, class_name, academic_year')
        .ilike('student_name', trimmedName)
        .ilike('class_name', trimmedClass)
        .limit(1)
        .maybeSingle();
      behaviorMatch = fallback.data;
      checkBehaviorErr = fallback.error;
    }

    if (checkBehaviorErr || !behaviorMatch) {
      return NextResponse.json(
        { error: `Data siswa "${trimmedName}" tidak ditemukan di Kelas ${trimmedClass}. Pastikan nama sesuai data sekolah.` },
        { status: 404 }
      );
    }

    // 2. Periksa apakah akun siswa sudah pernah dibuat sebelumnya untuk tahun ajaran ini
    const { data: existingAccount, error: checkAccountErr } = await supabaseAdmin
      .from('gm_student_accounts')
      .select('id, student_name, class_name, username')
      .ilike('student_name', trimmedName)
      .ilike('class_name', trimmedClass)
      .eq('academic_year', targetYear)
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

    // 4. Hash kata sandi
    const hashedPassword = await hashPassword(plainPassword);
    const resolvedYear = targetYear || behaviorMatch.academic_year || DEFAULT_ACADEMIC_YEAR;

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
