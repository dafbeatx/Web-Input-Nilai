import { NextResponse } from 'next/server';
import { clearStudentSession } from '@/lib/grademaster/studentAuth';

export async function POST() {
  try {
    await clearStudentSession();
    return NextResponse.json({ message: 'Logout berhasil' });
  } catch (err) {
    console.error('Student logout error:', err);
    return NextResponse.json({ error: 'Gagal logout' }, { status: 500 });
  }
}
