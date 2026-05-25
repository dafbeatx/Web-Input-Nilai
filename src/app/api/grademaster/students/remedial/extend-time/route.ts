import { NextRequest, NextResponse } from 'next/server';
import { extendRemedialTime } from '@/lib/grademaster/services/remedial.service';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`remedial-extend:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.studentId || typeof body.minutes !== 'number' || body.minutes <= 0) {
      return NextResponse.json({ error: 'Parameter studentId dan minutes (angka > 0) wajib diisi' }, { status: 400 });
    }

    const { studentId, minutes } = body;
    const result = await extendRemedialTime(studentId, minutes);

    return NextResponse.json({ success: true, newExtendedTime: result.newExtended });
  } catch (err: any) {
    console.error('[Extend Time API Error]', err);
    return NextResponse.json({ error: err.message || 'Gagal menambahkan waktu' }, { status: 500 });
  }
}
