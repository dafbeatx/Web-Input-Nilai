import { NextRequest, NextResponse } from 'next/server';
import { clearStudentSession } from '@/lib/grademaster/studentAuth';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
    let bodyToken: string | undefined;
    try {
      const body = await req.json();
      bodyToken = body?.token;
    } catch {
      // Body might be empty
    }
    const explicitToken = headerToken || bodyToken;

    await clearStudentSession(explicitToken);
    
    // Clear Supabase session on the server side to remove auth cookies
    const supabase = await createClient();
    await supabase.auth.signOut();
    
    return NextResponse.json({ message: 'Logout berhasil' });
  } catch (err) {
    console.error('Student logout error:', err);
    return NextResponse.json({ error: 'Gagal logout' }, { status: 500 });
  }
}
