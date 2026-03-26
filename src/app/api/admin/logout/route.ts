import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/grademaster/admin';

export async function POST() {
  try {
    await clearAdminSession();
    return NextResponse.json({ message: 'Logout berhasil' });
  } catch (err) {
    console.error('Admin logout error:', err);
    return NextResponse.json({ error: 'Gagal logout' }, { status: 500 });
  }
}
