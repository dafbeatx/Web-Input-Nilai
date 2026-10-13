import { NextRequest, NextResponse } from 'next/server';
import { setStudentExamMode } from '@/lib/grademaster/services/remedial.service';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`remedial-mode:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.studentId || (body.examMode !== 'STRICT' && body.examMode !== 'LIMITED')) {
      return NextResponse.json(
        { error: 'Parameter studentId dan examMode ("STRICT" atau "LIMITED") wajib diisi' },
        { status: 400 }
      );
    }

    const { studentId, examMode } = body;
    const result = await setStudentExamMode(studentId, examMode);

    return NextResponse.json({ 
      success: true, 
      studentId: result.studentId,
      studentName: result.studentName,
      examMode: result.examMode,
      message: `Berhasil mengubah mode ujian siswa ke ${examMode === 'LIMITED' ? 'Mode Terbatas' : 'Mode Ketat (Kamera)'}.`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Set Exam Mode API Error]', message);
    return NextResponse.json({ error: message || 'Gagal mengubah mode ujian' }, { status: 500 });
  }
}
