import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ authenticated: false, role: null });
    }

    const email = user.email;
    const identityData = user.user_metadata || {};
    const username = identityData.full_name || email;

    // Fetch role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, display_name, subject')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'user';

    if (role === 'admin') {
      return NextResponse.json({
        authenticated: true,
        role: 'admin',
        username: username,
        displayName: profile?.display_name,
        subject: profile?.subject,
        email: email,
        avatar_url: identityData.avatar_url
      });
    }

    // Role is 'user' or something else, check student binding
    const { data: boundAccount, error: boundError } = await supabase
      .from('gm_student_accounts')
      .select('id, student_name, class_name, academic_year, username, profile_photo_url')
      .eq('google_email', email)
      .single();

    if (boundAccount && !boundError) {
      // Yes! This email is permanently linked to a student.
      // Let's create the internal application session cookie for them.
      const { createStudentSession } = await import('@/lib/grademaster/studentAuth');
      await createStudentSession(boundAccount.id);

      return NextResponse.json({
        authenticated: true,
        role: 'student',
        student: {
          id: boundAccount.id,
          name: boundAccount.student_name,
          class_name: boundAccount.class_name,
          academic_year: boundAccount.academic_year,
          username: boundAccount.username,
          photo_url: boundAccount.profile_photo_url,
          isGoogleLinked: true
        }
      });
    }

    // Logged in as regular User/Student via Google, but NOT linked to any student account yet
    return NextResponse.json({
      authenticated: false,
      role: 'student_google',
      username: username,
      email: email,
      avatar_url: identityData.avatar_url
    });
  } catch (err) {
    console.error('Admin check error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
