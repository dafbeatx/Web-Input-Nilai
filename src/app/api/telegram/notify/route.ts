import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/telegram/bot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, className, subject, event, score, kkm, photo, message } = body;

    let text = '';
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    switch (event) {
      case 'START':
        text = `🎬 <b>REMEDIAL DIMULAI</b>\n\n` +
               `👤 Siswa: <b>${studentName}</b>\n` +
               `🏫 Kelas: ${className}\n` +
               `📚 Mapel: ${subject}\n` +
               `⏰ Waktu: ${timestamp}\n\n` +
               `<i>(Foto di atas adalah verifikasi wajah saat mulai)</i>`;
        break;
      case 'FINISH':
        text = `✅ <b>REMEDIAL SELESAI</b>\n\n` +
               `👤 Siswa: <b>${studentName}</b>\n` +
               `🏫 Kelas: ${className}\n` +
               `📊 Skor: <b>${score}</b> (KKM: ${kkm})\n` +
               `⏰ Selesai: ${timestamp}`;
        break;
      case 'CHEATED':
        text = `🚨 <b>KECURANGAN TERDETEKSI!</b>\n\n` +
               `👤 Siswa: <b>${studentName}</b>\n` +
               `🏫 Kelas: ${className}\n` +
               `⚠️ Alasan: <b>${message || 'Pelanggaran Proctoring'}</b>\n` +
               `⏰ Waktu: ${timestamp}\n\n` +
               `🚫 <i>Siswa otomatis didiskualifikasi dari remedial ini.</i>`;
        break;
      default:
        text = message || 'Pesan otomatis dari GradeMaster';
    }

    let photoBlob: Blob | undefined;
    if (photo && photo.startsWith('data:image')) {
      // Convert base64 to Blob
      const base64Data = photo.split(',')[1];
      const binaryData = atob(base64Data);
      const array = [];
      for (let i = 0; i < binaryData.length; i++) {
        array.push(binaryData.charCodeAt(i));
      }
      photoBlob = new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
    }

    await sendAdminNotification(text, photoBlob);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Notify API error:', err);
    return NextResponse.json({ error: 'Gagal mengirim notifikasi' }, { status: 500 });
  }
}
