import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/telegram/bot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, className, subject, event, score, kkm, photo, message, deviceInfo, examMode } = body;

    let text = '';
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const modeStr = examMode ? `\n🛡️ Mode Ujian: <b>${examMode}</b>` : '';
    const deviceStr = deviceInfo ? `\n📱 Perangkat: <code>${deviceInfo}</code>${modeStr}` : ` ${modeStr}`;

    switch (event) {
      case 'START':
        text = `🎬 <b>REMEDIAL DIMULAI</b>\n\n` +
               `👤 Siswa: <b>${studentName}</b>\n` +
               `🏫 Kelas: ${className}\n` +
               `📚 Mapel: ${subject}\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}\n\n` +
               `<i>(Foto di atas adalah verifikasi wajah saat mulai)</i>`;
        break;
      case 'FINISH':
        text = `✅ <b>REMEDIAL SELESAI</b>\n\n` +
               `👤 Siswa: <b>${studentName}</b>\n` +
               `🏫 Kelas: ${className}\n` +
               `📊 Skor: <b>${score}</b> (KKM: ${kkm})\n` +
               `⏰ Selesai: ${timestamp}${deviceStr}`;
        break;
      case 'CHEATED':
        text = `🚨 <b>KECURANGAN TERDETEKSI!</b>\n\n` +
               `👤 Siswa: <b>${studentName}</b>\n` +
               `🏫 Kelas: ${className}\n` +
               `⚠️ Alasan: <b>${message || 'Pelanggaran Proctoring'}</b>\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}\n\n` +
               `🚫 <i>Siswa otomatis didiskualifikasi dari remedial ini.</i>`;
        break;
      case 'ERROR':
        text = `❌ <b>ERROR SISWA</b>\n\n` +
               `👤 Siswa: <b>${studentName}</b>\n` +
               `🏫 Kelas: ${className}\n` +
               `⚠️ Error: <b>${message || 'Unknown Error'}</b>\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}`;
        break;
      case 'ABANDONED':
        text = `⚠️ <b>SESI DITINGGALKAN</b>\n\n` +
               `👤 Siswa: <b>${studentName}</b>\n` +
               `🏫 Kelas: ${className}\n` +
               `ℹ️ Status: Siswa keluar/menutup halaman ujian sebelum selesai.\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}`;
        break;
      case 'ACTIVITY':
        text = `⚠️ <b>ACTIVITY LOG</b>\n\n` +
               `👤 Siswa: <b>${studentName}</b>\n` +
               `🏫 Kelas: ${className}\n` +
               `📚 Mapel: ${subject}\n` +
               `📝 Aktivitas: <b>${message}</b>\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}`;
        break;
      default:
        text = message || 'Pesan otomatis dari GradeMaster';
    }

    let photoBlob: Blob | undefined;
    if (photo && photo.startsWith('data:image')) {
      const base64Data = photo.split(',')[1];
      // Use Buffer for Node.js compatibility if available, else fallback
      const buffer = Buffer.from(base64Data, 'base64');
      photoBlob = new Blob([buffer], { type: 'image/jpeg' });
    }

    await sendAdminNotification(text, photoBlob);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Notify API error:', err);
    return NextResponse.json({ error: 'Gagal mengirim notifikasi' }, { status: 500 });
  }
}
