export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession, createStudentSession } from '@/lib/grademaster/studentAuth';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    // 1. Check for standard student cookie session
    const session = await getStudentSession();

    if (session) {
      return NextResponse.json({
        authenticated: true,
        role: 'student',
        student: session.student,
      });
    }

    // 2. Fallback: check if there is an active Supabase user session (Google Login)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user && user.email) {
      const email = user.email.toLowerCase();

      // Look up student account bound to this Google email
      const { data: boundAccount, error: boundError } = await supabase
        .from('gm_student_accounts')
        .select('id, student_name, class_name, academic_year, username, profile_photo_url, google_email, study_streak, last_active_date')
        .eq('google_email', email)
        .single();

      if (boundAccount && !boundError) {
        // Find corresponding behavior record
        const { data: behaviorRecord } = await supabase
          .from('gm_behaviors')
          .select('id, total_points, avatar_url')
          .eq('student_name', boundAccount.student_name)
          .eq('class_name', boundAccount.class_name)
          .single();

        // Record the login log & establish the application-specific session cookie
        const userAgent = req.headers.get('user-agent') || 'unknown';
        const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
        await createStudentSession(boundAccount.id, userAgent, ipAddress);

        await supabaseAdmin
          .from('gm_student_login_logs')
          .insert({
            account_id: boundAccount.id,
            ip_address: ipAddress,
            user_agent: userAgent
          });

        return NextResponse.json({
          authenticated: true,
          role: 'student',
          student: {
            id: boundAccount.id,
            student_id: behaviorRecord?.id, // Link to behavior logs
            total_points: behaviorRecord?.total_points || 0,
            name: boundAccount.student_name,
            class_name: boundAccount.class_name,
            academic_year: boundAccount.academic_year,
            username: boundAccount.username,
            photo_url: boundAccount.profile_photo_url,
            avatar_url: behaviorRecord?.avatar_url || null,
            email: boundAccount.google_email || null,
            isGoogleLinked: true,
            study_streak: boundAccount.study_streak || 0,
            last_active_date: boundAccount.last_active_date || null
          },
        });
      }
    }

    return NextResponse.json({ authenticated: false, role: null });
  } catch (err) {
    console.error('Student check error:', err);
    return NextResponse.json({ authenticated: false, role: null });
  }
}
