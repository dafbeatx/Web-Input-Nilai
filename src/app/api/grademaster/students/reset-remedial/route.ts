import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`reset_remedial_post:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const body = await req.json();
    const { sessionId, kkm } = body;

    if (!sessionId || kkm === undefined) {
      return NextResponse.json({ error: 'Session ID dan KKM wajib diisi' }, { status: 400 });
    }

    // Update all students in this session whose final_score < kkm
    const { data, error } = await supabase
      .from('gm_students')
      .update({ final_score: 0 })
      .eq('session_id', sessionId)
      .lt('final_score', kkm);

    if (error) throw error;
    
    return NextResponse.json({ message: 'Skor remedial berhasil direset ke 0', data });
  } catch (err: any) {
    console.error('Reset remedial error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
