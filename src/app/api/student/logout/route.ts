import { NextResponse } from 'next/server';
import { clearStudentSession } from '@/lib/grademaster/studentAuth';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    await clearStudentSession();
    
    // Clear Supabase session on the server side to remove auth cookies
    const supabase = await createClient();
    await supabase.auth.signOut();
    
    return NextResponse.json({ message: 'Logout berhasil' });
  } catch (err) {
    console.error('Student logout error:', err);
    return NextResponse.json({ error: 'Gagal logout' }, { status: 500 });
  }
}
