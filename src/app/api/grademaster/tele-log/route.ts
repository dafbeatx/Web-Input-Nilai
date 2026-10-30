import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/telegram/bot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name, role, error, stack, location } = body;

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';
    
    // Simple User-Agent parsing
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' : ua.includes('Edge') ? 'Edge' : 'Other';
    const os = ua.includes('Windows') ? 'Windows' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : ua.includes('Mac') ? 'macOS' : 'Linux';
    const deviceType = isMobile ? '📱 Smartphone/Mobile' : '💻 Komputer/Desktop';

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    let message = '';
    
    if (type === 'LOGIN') {
      message += `🔐 <b>LOGIN BARU MENDETEKSI</b>\n\n`;
      message += `👤 <b>Nama:</b> ${name || 'Unknown'}\n`;
      message += `🎓 <b>Role:</b> ${role || 'Unknown'}\n`;
    } else if (type === 'ERROR') {
      message += `🚨 <b>ERROR/BUG FRONTEND DETEKSI</b>\n\n`;
      message += `❌ <b>Error:</b> ${error || 'Unknown Error'}\n`;
      if (stack) {
        message += `<code>${stack.substring(0, 800)}</code>\n\n`;
      }
    } else if (type === 'CERT_SCAN' || type === 'CERTIFICATE_SCAN') {
      const studentName = body.studentName || name || 'Siswa Peserta';
      const className = body.className || 'SMP';
      const academicYear = body.academicYear || '2026/2027';
      const certType = body.certType || 'LDKS';
      const isRevoked = body.isExcluded || body.status === 'REVOKED';

      message += `📜 <b>SCAN BARCODE SERTIFIKAT TERDETEKSI</b>\n\n`;
      message += `🎓 <b>Penerima:</b> <b>${studentName}</b>\n`;
      message += `🏫 <b>Kelas:</b> ${className}\n`;
      message += `📅 <b>Tahun Ajaran:</b> ${academicYear}\n`;
      message += `📄 <b>Dokumen:</b> Sertifikat ${certType}\n`;
      message += `🛡️ <b>Status Verifikasi:</b> ${isRevoked ? '❌ <b>DITARIK / TIDAK AKTIF</b>' : '✅ <b>ASLI & TERDAFTAR RESMI</b>'}\n`;
      if (body.url) {
        message += `🔗 <b>Tautan Dokumen:</b> <a href="${body.url}">Buka Halaman Verifikasi</a>\n`;
      }
    } else {
      message += `ℹ️ <b>SISTEM LOG</b>\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━\n`;
    message += `🌐 <b>IP:</b> <code>${ip}</code>\n`;
    message += `🖥️ <b>Device:</b> ${deviceType} (${os})\n`;
    message += `🌍 <b>Browser:</b> ${browser}\n`;
    message += `⏰ <b>Waktu:</b> ${timestamp}\n`;

    if (location && location.lat && location.lng) {
      message += `📍 <b>Lokasi:</b> <a href="https://www.google.com/maps?q=${location.lat},${location.lng}">Lihat di Maps</a>\n`;
    }

    await sendAdminNotification(message);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Tele-log error:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
