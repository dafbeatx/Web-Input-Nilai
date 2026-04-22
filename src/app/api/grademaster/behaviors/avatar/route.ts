import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { checkRateLimit } from '@/lib/grademaster/security';
import { compressAndConvertToWebP } from '@/lib/grademaster/image-utils';

export async function POST(req: NextRequest) {
  try {
    // 1. Otorisasi - Hanya admin yang boleh unggah
    const supabase = await createClient();
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Only admin can upload avatars' }, { status: 403 });
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

    // Ekstraksi Buffer File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Konversi Extrem via Sharp (Resizing + WebP + Compression 80%)
    const processedImageBuffer = await compressAndConvertToWebP(buffer);

    // 4. Upload ke Supabase Storage (Bucket: avatars)
    const filePath = `student_${studentId}_${Date.now()}.webp`;
    const { data: uploadData, error: uploadError } = await supabase.storage
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
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicAvatarUrl = publicUrlData.publicUrl;

    // 5. Update Tabel gm_behaviors
    const { error: dbError } = await supabase
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
