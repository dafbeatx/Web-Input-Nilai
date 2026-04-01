import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/grademaster/admin';

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ authenticated: false, role: null });
    }

    return NextResponse.json({ 
      authenticated: true, 
      role: 'admin',
      username: (session.admin_users as any).username 
    });
  } catch (err) {
    console.error('Admin check error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
