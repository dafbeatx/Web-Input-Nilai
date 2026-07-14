import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/grademaster/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    await clearAdminSession();
    
    // Clear Supabase session on the server side to remove auth cookies
    const supabase = await createClient();
    await supabase.auth.signOut();
    
    return NextResponse.json({ message: 'Logout berhasil' });
  } catch (err) {
    console.error('Admin logout error:', err);
    return NextResponse.json({ error: 'Gagal logout' }, { status: 500 });
  }
}
