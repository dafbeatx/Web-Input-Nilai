import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { getStudentSession } from '@/lib/grademaster/studentAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/grademaster/security';
import { compressAndConvertToWebP } from '@/lib/grademaster/image-utils';

export async function POST(req: NextRequest) {
  try {
    // 1. Otorisasi - Admin atau Siswa yang bersangkutan (jika belum memiliki avatar)
    const adminSession = await getAdminSession();
    const studentSessionData = !adminSession ? await getStudentSession() : null;
    const isStudentSession = !!studentSessionData;

    if (!adminSession && !isStudentSession) {
      return NextResponse.json({ error: 'Unauthorized: Only admin or authenticated students can upload avatars' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`avatar_upload:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak unggahan (Rate Limited)' }, { status: 429 });
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const studentId = formData.get('studentId') as string | null;

    if (!file || !studentId) {
      return NextResponse.json({ error: 'Data foto atau ID siswa tidak ditemukan' }, { status: 400 });
    }

    // Validasi tambahan jika ini siswa
    if (isStudentSession && studentSessionData) {
      const studentBehaviorId = studentSessionData.student.behavior_id;
      if (!studentBehaviorId || studentId !== studentBehaviorId) {
        return NextResponse.json({ error: 'Unauthorized: You can only upload your own profile photo' }, { status: 403 });
      }

      // Periksa apakah avatar_url sudah ada di gm_behaviors
      const { data: currentBehavior, error: behaviorErr } = await supabaseAdmin
        .from('gm_behaviors')
        .select('avatar_url')
        .eq('id', studentId)
        .maybeSingle();

      if (behaviorErr) {
        console.error('[Avatar] Error checking existing avatar:', behaviorErr);
        return NextResponse.json({ error: 'Gagal memverifikasi data profil' }, { status: 500 });
      }

      if (currentBehavior && currentBehavior.avatar_url && currentBehavior.avatar_url.trim() !== '') {
        return NextResponse.json({ error: 'Foto profil sudah ada dan tidak dapat diubah oleh siswa' }, { status: 400 });
      }
    }

    // Ekstraksi Buffer File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Konversi Extrem via Sharp (Resizing + WebP + Compression 80%)
    const processedImageBuffer = await compressAndConvertToWebP(buffer);

    // 4. Upload ke Supabase Storage (Bucket: avatars) via admin client
    const filePath = `student_${studentId}_${Date.now()}.webp`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, processedImageBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Avatar] Storage upload failed:', uploadError);
      const isMissingBucket = uploadError.message?.toLowerCase().includes('not found');
      return NextResponse.json({ 
        error: isMissingBucket 
          ? 'Bucket "avatars" tidak ditemukan. Silakan buat bucket "avatars" di Supabase Dashboard (Storage).' 
          : 'Gagal mengunggah foto ke penyimpanan.' 
      }, { status: 500 });
    }

    // Dapatkan Public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicAvatarUrl = publicUrlData.publicUrl;

    // 5. Update Tabel gm_behaviors via admin client
    const { error: dbError } = await supabaseAdmin
      .from('gm_behaviors')
      .update({ avatar_url: publicAvatarUrl })
      .eq('id', studentId);

    if (dbError) {
      console.error('[Avatar] DB update failed:', dbError);
      return NextResponse.json({ error: 'Gagal menautkan foto ke profil siswa' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Avatar berhasil diunggah dan dikompresi sempurna', 
      avatar_url: publicAvatarUrl 
    });

  } catch (err: any) {
    console.error('[Avatar] Process Error:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
