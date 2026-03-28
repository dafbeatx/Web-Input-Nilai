import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';
import { activateRemedialAttempt, markRemedialFailed } from '@/lib/grademaster/services/remedial.service';

export async function POST(req: NextRequest) {
  let body: Record<string, any> | null = null;
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`remedial-activate:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const { action, attemptId, studentId, token } = body;
    // action: 'ACTIVATE' | 'FAIL'

    if (!action || !attemptId || !studentId) {
      return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    if (action === 'ACTIVATE') {
      if (!token) {
        return NextResponse.json({ error: 'Token diperlukan untuk aktivasi' }, { status: 400 });
      }
      await activateRemedialAttempt(attemptId, studentId, token);
      return NextResponse.json({ message: 'Sesi diaktifkan' });
    } 
    
    if (action === 'FAIL') {
      await markRemedialFailed(attemptId, studentId);
      return NextResponse.json({ message: 'Sesi dibatalkan (FAILED)' });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Remedial activation error:', message);
    
    if (message === 'RESET_REQUIRED') {
      return NextResponse.json({ error: 'RESET_REQUIRED', message: 'Sesi anda telah direset. Silakan mulai ulang.' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Gagal mengaktifkan remedial', detail: message }, { status: 500 });
  }
}
