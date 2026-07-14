import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/telegram/bot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name, role, error, stack, location } = body;

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';
    
    // Simple User-Agent parsing
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' : 'Other';
    const os = ua.includes('Windows') ? 'Windows' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : ua.includes('Mac') ? 'macOS' : 'Linux';
    const deviceType = isMobile ? '📱 Mobile' : '💻 Desktop';

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
  } catch (err: any) {
    console.error('Tele-log error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
