import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/grademaster/admin';
import { compressAndConvertToWebP, generatePhotoFileName, IMAGE_CONFIG, validateImageSize } from '@/lib/grademaster/image-utils';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('photo') as File | null;
    const accountId = formData.get('accountId') as string | null;

    if (!file || !accountId) {
      return NextResponse.json({ error: 'File foto dan ID akun wajib diisi' }, { status: 400 });
    }

    if (!IMAGE_CONFIG.acceptedTypes.includes(file.type as any)) {
      return NextResponse.json({
        error: `Format file tidak didukung. Gunakan: ${IMAGE_CONFIG.acceptedTypes.join(', ')}`,
      }, { status: 400 });
    }

    if (!validateImageSize(file.size)) {
      return NextResponse.json({
        error: `Ukuran file melebihi batas ${IMAGE_CONFIG.maxFileSize / (1024 * 1024)}MB`,
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const webpBuffer = await compressAndConvertToWebP(inputBuffer);

    const fileName = generatePhotoFileName(accountId);
    const filePath = `profiles/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(IMAGE_CONFIG.bucket)
      .upload(filePath, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(IMAGE_CONFIG.bucket)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from('gm_students')
      .update({
        photo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    if (updateError) throw updateError;

    return NextResponse.json({
      message: 'Foto profil berhasil diupload',
      url: publicUrl,
      originalSize: file.size,
      compressedSize: webpBuffer.length,
    });
  } catch (err: any) {
    console.error('Photo upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
