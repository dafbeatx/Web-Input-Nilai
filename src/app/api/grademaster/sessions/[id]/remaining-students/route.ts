import { NextRequest, NextResponse } from 'next/server';
import { getRemainingStudents } from '@/lib/grademaster/services/remedial.service';
import { supabase } from '@/lib/supabase/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Also fetch session created_at to calculate deadline
    const { data: session, error: sessErr } = await supabase
      .from('gm_sessions')
      .select('created_at, subject')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
       return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const students = await getRemainingStudents(sessionId);

    return NextResponse.json({ 
      students, 
      sessionCreatedAt: session.created_at,
      subject: session.subject 
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
