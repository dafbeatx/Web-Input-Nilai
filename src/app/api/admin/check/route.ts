import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/grademaster/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Check Google OAuth Supabase Session
    if (user) {
      const email = user.email;
      const isSuperAdmin = email === 'dafbeatx@gmail.com';
      
      const identityData = user.user_metadata || {};
      const username = identityData.full_name || email;

      if (isSuperAdmin) {
        return NextResponse.json({
          authenticated: true,
          role: 'admin',
          username: username,
          email: email,
          avatar_url: identityData.avatar_url
        });
      } else {
        // Logged in as regular User/Student, but NOT admin
        return NextResponse.json({
          authenticated: false,
          role: 'student_google',
          username: username,
          email: email,
          avatar_url: identityData.avatar_url
        });
      }
    }

    // 2. Fallback to Legacy Admin Session
    const legacySession = await getAdminSession();

    if (!legacySession) {
      return NextResponse.json({ authenticated: false, role: null });
    }

    return NextResponse.json({ 
      authenticated: true, 
      role: 'admin',
      username: (legacySession.admin_users as any).username 
    });
  } catch (err) {
    console.error('Admin check error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
