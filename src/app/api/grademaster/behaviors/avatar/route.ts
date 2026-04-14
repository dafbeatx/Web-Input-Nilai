import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/grademaster/admin';
import { checkRateLimit } from '@/lib/grademaster/security';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    // 1. Otorisasi - Hanya admin yang boleh unggah
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
    const processedImageBuffer = await sharp(buffer)
      .resize(256, 256, { fit: 'cover', position: 'center' }) // Aman & asimetrikal
      .webp({ quality: 80 }) // Super hemat size, rata-rata hanya ~15KB
      .toBuffer();

    // 4. Upload ke Supabase Storage (Bucket: avatars)
    const filePath = `behavior_${studentId}_${Date.now()}.webp`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, processedImageBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Avatar] Storage upload failed:', uploadError);
      return NextResponse.json({ error: 'Gagal mengunggah ke penyimpanan (Bucket avatars mungkin belum dibuat di database)' }, { status: 500 });
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
