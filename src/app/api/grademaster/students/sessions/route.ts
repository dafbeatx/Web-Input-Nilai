import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/grademaster/studentAuth';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

// Helper to get token from request cookies
async function getRequestToken() {
  const cookieStore = await cookies();
  return cookieStore.get('gm_student_token')?.value || '';
}

export async function GET(req: NextRequest) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: 'Akses ditolak: Sesi tidak valid' }, { status: 403 });
    }

    const currentToken = await getRequestToken();

    const { data: sessions, error } = await supabase
      .from('gm_student_sessions')
      .select('id, ip_address, user_agent, created_at, expires_at, token')
      .eq('account_id', session.student.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedSessions = (sessions || []).map((s) => ({
      id: s.id,
      ip_address: s.ip_address || 'unknown',
      user_agent: s.user_agent || 'unknown',
      created_at: s.created_at,
      expires_at: s.expires_at,
      is_current: s.token === currentToken
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (err: any) {
    console.error('Failed to fetch active student sessions:', err);
    return NextResponse.json({ error: err.message || 'Gagal memuat sesi aktif' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: 'Akses ditolak: Sesi tidak valid' }, { status: 403 });
    }

    const currentToken = await getRequestToken();
    const { searchParams } = new URL(req.url);
    const deleteType = searchParams.get('type'); // 'all_other' or 'specific'
    const sessionId = searchParams.get('id');

    if (deleteType === 'all_other') {
      // Delete all sessions for this account except the current token
      const { error } = await supabase
        .from('gm_student_sessions')
        .delete()
        .eq('account_id', session.student.id)
        .neq('token', currentToken);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Berhasil mengakhiri semua sesi perangkat lain.' });
    } else if (sessionId) {
      // Delete specific session
      // Check if it is the current session
      const { data: targetSession, error: checkError } = await supabase
        .from('gm_student_sessions')
        .select('token')
        .eq('id', sessionId)
        .eq('account_id', session.student.id)
        .single();

      if (checkError || !targetSession) {
        return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
      }

      const { error } = await supabase
        .from('gm_student_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('account_id', session.student.id);

      if (error) throw error;

      // If the terminated session is the current session, instruct the client to log out
      const isCurrent = targetSession.token === currentToken;

      return NextResponse.json({ 
        success: true, 
        is_current: isCurrent,
        message: isCurrent ? 'Sesi ini telah diakhiri.' : 'Berhasil mengakhiri sesi perangkat yang dipilih.' 
      });
    }

    return NextResponse.json({ error: 'Parameter pemutusan sesi tidak valid' }, { status: 400 });
  } catch (err: any) {
    console.error('Failed to delete student session:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengakhiri sesi perangkat' }, { status: 500 });
  }
}
