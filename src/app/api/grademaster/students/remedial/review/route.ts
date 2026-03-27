import { NextRequest, NextResponse } from 'next/server';
import { reviewRemedial, finalizeRemedial } from '@/lib/grademaster/services/remedial.service';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`remedial-review:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const { action, studentId, remedialScore, sessionKkm } = await req.json();

    if (!studentId || !sessionKkm || !action) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    let finalScore = 0;

    if (action === 'review') {
      if (remedialScore === undefined) return NextResponse.json({ error: 'Nilai remedial tidak boleh kosong' }, { status: 400 });
      await reviewRemedial(studentId, remedialScore, sessionKkm);
      return NextResponse.json({ message: 'Koreksi berhasil disimpan', reviewed: true });
    } else if (action === 'finalize') {
      finalScore = await finalizeRemedial(studentId, sessionKkm);
      return NextResponse.json({ message: 'Nilai direkap', finalScore });
    } else {
      return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memproses penilaian';
    console.error('Remedial review error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
