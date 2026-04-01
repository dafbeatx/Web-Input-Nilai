import { NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/grademaster/studentAuth';

export async function GET() {
  try {
    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json({ authenticated: false, role: null });
    }

    return NextResponse.json({
      authenticated: true,
      role: 'student',
      student: session.student,
    });
  } catch (err) {
    console.error('Student check error:', err);
    return NextResponse.json({ authenticated: false, role: null });
  }
}
