import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Admin session required' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`reset_remedial_post:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { sessionId, kkm } = body;

    if (!sessionId || kkm === undefined) {
      return NextResponse.json({ error: 'Session ID dan KKM wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gm_students')
      .update({ final_score: 0 })
      .eq('session_id', sessionId)
      .lt('final_score', kkm);

    if (error) {
      console.error('[POST Reset Remedial] DB Error:', error);
      throw error;
    }
    
    return NextResponse.json({ message: 'Skor remedial berhasil direset ke 0', data });
  } catch (err: any) {
    console.error('Reset remedial failure:', err);
    return NextResponse.json({ error: err.message || 'Gagal mereset skor remedial' }, { status: 500 });
  }
}
