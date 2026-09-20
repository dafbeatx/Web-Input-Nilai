import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getStudentSession } from '@/lib/grademaster/studentAuth';
import { getAdminSession } from '@/lib/grademaster/admin';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

// Helper to get token from request cookies
async function getRequestToken() {
  const cookieStore = await cookies();
  return cookieStore.get('gm_student_token')?.value || '';
}

// Helper to get database client with fallback
async function getClient() {
  try {
    return supabaseAdmin;
  } catch {
    return await createClient();
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    const studentSession = await getStudentSession();

    if (!adminSession && !studentSession) {
      return NextResponse.json({ error: 'Akses ditolak: Sesi tidak valid' }, { status: 403 });
    }

    let client = await getClient();
    const currentToken = studentSession ? await getRequestToken() : '';
    let targetAccountId = studentSession?.student?.id;

    if (adminSession) {
      const { searchParams } = new URL(req.url);
      const studentId = searchParams.get('studentId');
      const studentName = searchParams.get('name');
      const className = searchParams.get('class');

      if (studentId) {
        let accRes = await client
          .from('gm_student_accounts')
          .select('id')
          .eq('id', studentId)
          .maybeSingle();

        if (accRes.error && accRes.error.message?.includes('Invalid API key')) {
          client = await createClient();
          accRes = await client
            .from('gm_student_accounts')
            .select('id')
            .eq('id', studentId)
            .maybeSingle();
        }

        if (accRes.data?.id) {
          targetAccountId = accRes.data.id;
        }
      }

      if (!targetAccountId && studentName) {
        let query = client
          .from('gm_student_accounts')
          .select('id')
          .eq('student_name', studentName);
        if (className) query = query.eq('class_name', className);
        
        let accRes = await query.maybeSingle();
        if (accRes.error && accRes.error.message?.includes('Invalid API key')) {
          client = await createClient();
          let retryQuery = client
            .from('gm_student_accounts')
            .select('id')
            .eq('student_name', studentName);
          if (className) retryQuery = retryQuery.eq('class_name', className);
          accRes = await retryQuery.maybeSingle();
        }

        if (accRes.data?.id) {
          targetAccountId = accRes.data.id;
        }
      }

      if (!targetAccountId) {
        // No student account found or student has not logged in yet
        return NextResponse.json({ sessions: [] });
      }
    }

    let { data: sessions, error } = await client
      .from('gm_student_sessions')
      .select('id, ip_address, user_agent, created_at, expires_at, token')
      .eq('account_id', targetAccountId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error && error.message?.includes('Invalid API key')) {
      client = await createClient();
      const retryRes = await client
        .from('gm_student_sessions')
        .select('id, ip_address, user_agent, created_at, expires_at, token')
        .eq('account_id', targetAccountId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      sessions = retryRes.data;
      error = retryRes.error;
    }

    if (error) throw error;

    const formattedSessions = (sessions || []).map((s: { id: string; ip_address: string | null; user_agent: string | null; created_at: string; expires_at: string; token: string }) => ({
      id: s.id,
      ip_address: s.ip_address || 'unknown',
      user_agent: s.user_agent || 'unknown',
      created_at: s.created_at,
      expires_at: s.expires_at,
      is_current: currentToken ? s.token === currentToken : false
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat sesi aktif';
    console.error('Failed to fetch active student sessions:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    const studentSession = await getStudentSession();

    if (!adminSession && !studentSession) {
      return NextResponse.json({ error: 'Akses ditolak: Sesi tidak valid' }, { status: 403 });
    }

    const client = await getClient();
    const currentToken = studentSession ? await getRequestToken() : '';
    const { searchParams } = new URL(req.url);
    const deleteType = searchParams.get('type'); // 'all_other' or 'specific'
    const sessionId = searchParams.get('id');
    const studentIdParam = searchParams.get('studentId');
    const studentNameParam = searchParams.get('name');
    const classParam = searchParams.get('class');

    let targetAccountId = studentSession?.student?.id;

    if (adminSession) {
      if (studentIdParam) {
        const { data: acc } = await client
          .from('gm_student_accounts')
          .select('id')
          .eq('id', studentIdParam)
          .maybeSingle();
        if (acc?.id) targetAccountId = acc.id;
      }
      if (!targetAccountId && studentNameParam) {
        let q = client.from('gm_student_accounts').select('id').eq('student_name', studentNameParam);
        if (classParam) q = q.eq('class_name', classParam);
        const { data: acc } = await q.maybeSingle();
        if (acc?.id) targetAccountId = acc.id;
      }
      if (!targetAccountId) {
        return NextResponse.json({ error: 'Akun siswa tidak ditemukan' }, { status: 404 });
      }
    }

    if (deleteType === 'all_other') {
      let query = client
        .from('gm_student_sessions')
        .delete()
        .eq('account_id', targetAccountId);

      if (currentToken) {
        query = query.neq('token', currentToken);
      }

      const { error } = await query;
      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Berhasil mengakhiri semua sesi perangkat lain.' });
    } else if (sessionId) {
      const { data: targetSession, error: checkError } = await client
        .from('gm_student_sessions')
        .select('token')
        .eq('id', sessionId)
        .eq('account_id', targetAccountId)
        .single();

      if (checkError || !targetSession) {
        return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
      }

      const { error } = await client
        .from('gm_student_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('account_id', targetAccountId);

      if (error) throw error;

      const isCurrent = currentToken ? targetSession.token === currentToken : false;

      return NextResponse.json({ 
        success: true, 
        is_current: isCurrent,
        message: isCurrent ? 'Sesi ini telah diakhiri.' : 'Berhasil mengakhiri sesi perangkat yang dipilih.' 
      });
    }

    return NextResponse.json({ error: 'Parameter pemutusan sesi tidak valid' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengakhiri sesi perangkat';
    console.error('Failed to delete student session:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
