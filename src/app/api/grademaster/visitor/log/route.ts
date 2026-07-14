import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/telegram/bot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitorId, isReturning, studentName, sessionId, subject, className } = body;

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';
    
    // Simple User-Agent parsing for Admin readability
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' : 'Other';
    const os = ua.includes('Windows') ? 'Windows' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : ua.includes('Mac') ? 'macOS' : 'Linux';
    const deviceType = isMobile ? '📱 Mobile' : '💻 Desktop';

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    let message = `👁️ <b>PENGUNJUNG REMEDIAL</b>\n\n`;
    message += `👤 <b>Siswa:</b> ${studentName || '<i>Anonim (Belum Login)</i>'}\n`;
    message += `🏫 <b>Kelas:</b> ${className || '-'}\n`;
    message += `📚 <b>Mapel:</b> ${subject || '-'}\n`;
    message += `📍 <b>Status:</b> ${isReturning ? '🔄 PENGUNJUNG LAMA (BALIK LAGI)' : '✨ PENGUNJUNG BARU'}\n\n`;
    message += `🌐 <b>IP:</b> <code>${ip}</code>\n`;
    message += `🖥️ <b>Device:</b> ${deviceType} (${os})\n`;
    message += `🌐 <b>Browser:</b> ${browser}\n`;
    message += `⏰ <b>Waktu:</b> ${timestamp}\n\n`;

    if (isReturning) {
      message += `⚠️ <b>PERINGATAN:</b> Pengunjung ini menggunakan perangkat/sesi yang sama dengan kunjungan sebelumnya.`;
    } else {
      message += `ℹ️ <i>Visitor ID: ${visitorId.slice(0, 8)}...</i>`;
    }

    await sendAdminNotification(message);

    return NextResponse.json({ 
      success: true, 
      ip, 
      device: `${deviceType} (${os})`,
      browser 
    });
  } catch (error) {
    console.error('Visitor Log Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
