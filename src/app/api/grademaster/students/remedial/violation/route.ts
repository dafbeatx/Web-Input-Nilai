import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';

const MAX_VIOLATIONS = 3;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`violation:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak request' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.sessionId || !body.studentName) {
      return NextResponse.json({ error: 'Session ID dan studentName wajib diisi' }, { status: 400 });
    }

    const { sessionId, studentName } = body;

    // Fetch current state
    const { data: student, error: fetchError } = await supabase
      .from('gm_students')
      .select('id, violation_count, is_blocked, cheating_flags')
      .eq('session_id', sessionId)
      .eq('name', studentName)
      .single();

    if (fetchError || !student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    if (student.is_blocked) {
      return NextResponse.json({ 
        isBlocked: true, 
        count: student.violation_count 
      });
    }

    // Increment logic
    const newCount = (student.violation_count || 0) + 1;
    const isBlocked = newCount >= MAX_VIOLATIONS;

    // Build new flags array optionally
    let updatedFlags = student.cheating_flags || [];
    updatedFlags.push(`Meninggalkan halaman ujian ke-${newCount}`);

    // Update the record
    const { error: updateError } = await supabase
      .from('gm_students')
      .update({
        violation_count: newCount,
        is_blocked: isBlocked,
        cheating_flags: updatedFlags
      })
      .eq('id', student.id);

    if (updateError) {
      throw new Error(`Gagal update violation: ${updateError.message}`);
    }

    return NextResponse.json({
      isBlocked,
      count: newCount,
      limit: MAX_VIOLATIONS
    });

  } catch (err: any) {
    console.error('Violation tracking error:', err);
    return NextResponse.json({ error: 'Server gagal memproses data' }, { status: 500 });
  }
}
