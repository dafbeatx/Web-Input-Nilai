import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/telegram/bot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, className, subject, event, score, kkm, photo, message, deviceInfo, examMode, academicYear, examType } = body;
    const fallback = (val: any) => val || '---';

    let text = '';
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const modeStr = examMode ? `\n🛡️ Mode Ujian: <b>${examMode}</b>` : '';
    const contextStr = academicYear || examType ? `\n📅 <b>${fallback(academicYear)} | ${fallback(examType)}</b>` : '';
    const deviceStr = deviceInfo ? `\n📱 Perangkat: <code>${deviceInfo}</code>${modeStr}` : ` ${modeStr}`;

    switch (event) {
      case 'START':
        text = `🎬 <b>REMEDIAL DIMULAI</b>${contextStr}\n\n` +
               `👤 Siswa: <b>${fallback(studentName)}</b>\n` +
               `🏫 Kelas: ${fallback(className)}\n` +
               `📚 Mapel: ${fallback(subject)}\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}\n\n` +
               `<i>(Foto di atas adalah verifikasi wajah saat mulai)</i>`;
        break;
      case 'FINISH':
        text = `✅ <b>REMEDIAL SELESAI</b>${contextStr}\n\n` +
               `👤 Siswa: <b>${fallback(studentName)}</b>\n` +
               `🏫 Kelas: ${fallback(className)}\n` +
               `📊 Skor: <b>${fallback(score)}</b> (KKM: ${fallback(kkm)})\n` +
               `⏰ Selesai: ${timestamp}${deviceStr}`;
        break;
      case 'CHEATED':
        text = `🚨 <b>KECURANGAN TERDETEKSI!</b>${contextStr}\n\n` +
               `👤 Siswa: <b>${fallback(studentName)}</b>\n` +
               `🏫 Kelas: ${fallback(className)}\n` +
               `⚠️ Alasan: <b>${message || 'Pelanggaran Proctoring'}</b>\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}\n\n` +
               `🚫 <i>Siswa otomatis didiskualifikasi dari remedial ini.</i>`;
        break;
      case 'ERROR':
        text = `❌ <b>ERROR SISWA</b>${contextStr}\n\n` +
               `👤 Siswa: <b>${fallback(studentName)}</b>\n` +
               `🏫 Kelas: ${fallback(className)}\n` +
               `⚠️ Error: <b>${message || 'Unknown Error'}</b>\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}`;
        break;
      case 'ABANDONED':
        text = `⚠️ <b>SESI DITINGGALKAN</b>${contextStr}\n\n` +
               `👤 Siswa: <b>${fallback(studentName)}</b>\n` +
               `🏫 Kelas: ${fallback(className)}\n` +
               `ℹ️ Status: Siswa keluar/menutup halaman ujian sebelum selesai.\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}`;
        break;
      case 'ACTIVITY':
        text = `⚠️ <b>ACTIVITY LOG</b>${contextStr}\n\n` +
               `👤 Siswa: <b>${fallback(studentName)}</b>\n` +
               `🏫 Kelas: ${fallback(className)}\n` +
               `📚 Mapel: ${fallback(subject)}\n` +
               `📝 Aktivitas: <b>${message}</b>\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}`;
        break;
      case 'PROCTORING':
        text = `📸 <b>LIVE PROCTORING</b>${contextStr}\n\n` +
               `👤 Siswa: <b>${fallback(studentName)}</b>\n` +
               `🏫 Kelas: ${fallback(className)}\n` +
               `📚 Mapel: ${fallback(subject)}\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}\n\n` +
               `<i>(Sistem otomatis mengambil foto setiap 30 detik)</i>`;
        break;
      case 'SECOND_CHANCE':
        text = `⚠️ <b>KESEMPATAN KEDUA DIGUNAKAN</b>${contextStr}\n\n` +
               `👤 Siswa: <b>${fallback(studentName)}</b>\n` +
               `🏫 Kelas: ${fallback(className)}\n` +
               `📚 Mapel: ${fallback(subject)}\n` +
               `🔴 Pelanggaran: <b>${message || 'Pelanggaran proctoring'}</b>\n` +
               `⏰ Waktu: ${timestamp}${deviceStr}\n\n` +
               `<i>Siswa diberi 1x kesempatan terakhir. Pelanggaran berikutnya = diskualifikasi permanen.</i>`;
        break;
      default:
        text = message || 'Pesan otomatis dari GradeMaster';
    }

    let photoFile: File | Blob | undefined;
    if (photo && photo.startsWith('data:image')) {
      const base64Data = photo.split(',')[1];
      // Use Buffer for Node.js compatibility if available, else fallback
      const buffer = Buffer.from(base64Data, 'base64');
      try {
        photoFile = new File([buffer], 'student_photo.jpg', { type: 'image/jpeg' });
      } catch (e) {
        photoFile = new Blob([buffer], { type: 'image/jpeg' });
      }
    }

    const result = await sendAdminNotification(text, photoFile);

    // If Telegram rejects the photo (e.g. rate limit, bad file format, parse error)
    if (result && result.ok === false) {
      console.error('Telegram API rejected the message:', result);
      await sendAdminNotification(`⚠️ <b>Gagal kirim dari server:</b>\n\nEvent: ${event}\nError: <code>${result.description}</code>\nCode: ${result.error_code}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Notify API error:', err);
    return NextResponse.json({ error: 'Gagal mengirim notifikasi' }, { status: 500 });
  }
}
