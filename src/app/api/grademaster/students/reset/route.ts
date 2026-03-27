import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak. Akses khusus Admin diperlukan.' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`reset:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.sessionId) {
      return NextResponse.json({ error: 'ID Sesi wajib diberikan' }, { status: 400 });
    }

    const { sessionId } = body;

    // Verify session is demo mode
    const { data: session } = await supabase
      .from('gm_sessions')
      .select('is_demo')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    if (!session.is_demo) {
      return NextResponse.json({ error: 'Operasi ditolak. Fitur ini hanya untuk sesi Mode Demo.' }, { status: 403 });
    }

    // Delete all students in the session (cascade will delete answers too)
    const { error: delError } = await supabase
      .from('gm_students')
      .delete()
      .eq('session_id', sessionId);

    if (delError) {
      throw delError;
    }

    // Reset behaviors for this class (if dummy students triggered it) - Optional but good practice
    // For now we just safely wipe the students in this session.

    return NextResponse.json({ message: 'Semua data siswa demo berhasil di-reset' });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mereset data demo';
    console.error('Reset Demo Error:', message);
    return NextResponse.json({ error: `Terjadi kesalahan internal server: ${message}` }, { status: 500 });
  }
}
