import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { getStudentSession } from '@/lib/grademaster/studentAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/grademaster/security';
import { compressAndConvertToWebP } from '@/lib/grademaster/image-utils';

export async function POST(req: NextRequest) {
  try {
    // 1. Otorisasi - Admin atau Siswa yang bersangkutan
    const adminSession = await getAdminSession();
    const studentSessionData = !adminSession ? await getStudentSession() : null;
    const isStudentSession = !!studentSessionData;

    if (!adminSession && !isStudentSession) {
      return NextResponse.json({ error: 'Unauthorized: Only admin or authenticated students can upload/set avatars' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`avatar_upload:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak unggahan/perubahan (Rate Limited)' }, { status: 429 });
    }

    // 2. Parse request based on content-type
    const contentType = req.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    let studentId: string | null = null;
    let file: File | null = null;
    let avatarEmoji: string | null = null;

    if (isJson) {
      const body = await req.json();
      studentId = body.studentId;
      avatarEmoji = body.avatarEmoji;
    } else {
      const formData = await req.formData();
      file = formData.get('file') as File | null;
      studentId = formData.get('studentId') as string | null;
    }

    if (!studentId) {
      return NextResponse.json({ error: 'ID siswa tidak ditemukan' }, { status: 400 });
    }

    // Validasi otorisasi jika ini sesi siswa
    if (isStudentSession && studentSessionData) {
      const studentBehaviorId = studentSessionData.student.behavior_id;
      const studentAccountId = studentSessionData.student.id;
      const isOwner =
        (studentBehaviorId && studentId === studentBehaviorId) ||
        (studentAccountId && studentId === studentAccountId);

      if (!isOwner) {
        return NextResponse.json({ error: 'Unauthorized: Anda hanya dapat memperbarui foto profil Anda sendiri' }, { status: 403 });
      }
    }

    // A. JALUR GAMIFIKASI EMOTICON (JSON Payload)
    if (avatarEmoji) {
      const validEmojis = ['🌱', '📚', '⚡', '🏆', '👑'];
      if (!validEmojis.includes(avatarEmoji)) {
        return NextResponse.json({ error: 'Avatar emoji tidak valid' }, { status: 400 });
      }

      // Periksa akumulasi Poin Kebaikan siswa dari logs (points_delta < 0)
      const { data: logs, error: logsErr } = await supabaseAdmin
        .from('gm_behavior_logs')
        .select('points_delta')
        .eq('student_id', studentId);

      if (logsErr) {
        console.error('[Avatar] Error fetching logs:', logsErr);
        return NextResponse.json({ error: 'Gagal memverifikasi poin perilaku' }, { status: 500 });
      }

      const points = (logs || [])
        .filter((log: { points_delta: number }) => log.points_delta < 0)
        .reduce((sum: number, log: { points_delta: number }) => sum + Math.abs(log.points_delta), 0);

      let requiredPoints = 0;
      if (avatarEmoji === '🌱') requiredPoints = 0;
      else if (avatarEmoji === '📚') requiredPoints = 50;
      else if (avatarEmoji === '⚡') requiredPoints = 100;
      else if (avatarEmoji === '🏆') requiredPoints = 150;
      else if (avatarEmoji === '👑') requiredPoints = 250;

      if (points < requiredPoints) {
        return NextResponse.json({ 
          error: `Poin tidak mencukupi! Anda butuh ${requiredPoints} Poin Kebaikan untuk membuka avatar ini (Poin Kebaikan Anda: ${points})` 
        }, { status: 403 });
      }

      // Update kolom avatar_url
      const { error: dbError } = await supabaseAdmin
        .from('gm_behaviors')
        .update({ avatar_url: avatarEmoji })
        .eq('id', studentId);

      if (dbError) {
        console.error('[Avatar] DB update failed for emoji:', dbError);
        return NextResponse.json({ error: 'Gagal memperbarui avatar' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Avatar berhasil diperbarui!', 
        avatar_url: avatarEmoji 
      });
    }

    // B. JALUR UPLOAD FOTO KUSTOM (FormData Payload)
    if (!file) {
      return NextResponse.json({ error: 'Data foto tidak ditemukan' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Konversi via Sharp
    const processedImageBuffer = await compressAndConvertToWebP(buffer);

    // Upload ke Storage
    const filePath = `student_${studentId}_${Date.now()}.webp`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, processedImageBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000, immutable',
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

    // Resolve record behavior target
    let behaviorIdToUpdate = studentId;
    const { data: directBeh } = await supabaseAdmin
      .from('gm_behaviors')
      .select('id, student_name, class_name')
      .eq('id', studentId)
      .maybeSingle();

    if (!directBeh && isStudentSession && studentSessionData?.student) {
      behaviorIdToUpdate = studentSessionData.student.behavior_id || studentId;
    }

    // Update Tabel gm_behaviors
    const { error: dbError } = await supabaseAdmin
      .from('gm_behaviors')
      .update({ avatar_url: publicAvatarUrl })
      .eq('id', behaviorIdToUpdate);

    if (dbError) {
      console.error('[Avatar] DB update failed:', dbError);
      return NextResponse.json({ error: 'Gagal menautkan foto ke profil siswa' }, { status: 500 });
    }

    // Sinkronkan juga ke gm_student_accounts agar seragam di portal siswa dan admin
    try {
      if (isStudentSession && studentSessionData?.student?.id) {
        await supabaseAdmin
          .from('gm_student_accounts')
          .update({ profile_photo_url: publicAvatarUrl, updated_at: new Date().toISOString() })
          .eq('id', studentSessionData.student.id);
      } else {
        const targetName = directBeh?.student_name || studentSessionData?.student?.name;
        const targetClass = directBeh?.class_name || studentSessionData?.student?.class_name;
        if (targetName && targetClass) {
          await supabaseAdmin
            .from('gm_student_accounts')
            .update({ profile_photo_url: publicAvatarUrl, updated_at: new Date().toISOString() })
            .ilike('student_name', targetName.trim())
            .eq('class_name', targetClass);
        }
      }
    } catch (syncErr) {
      console.warn('[Avatar] Failed to sync photo to gm_student_accounts:', syncErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Foto profil berhasil diunggah dan dikompresi ke WebP!', 
      avatar_url: publicAvatarUrl,
      originalSize: file.size,
      compressedSize: processedImageBuffer.length,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Avatar] Process Error:', err);
    return NextResponse.json({ error: message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
