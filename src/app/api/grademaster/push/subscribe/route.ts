import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`push_sub:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });
    }

    const body = await req.json();
    const { studentAccountId, subscription } = body;

    if (!studentAccountId || !subscription) {
      return NextResponse.json({ error: 'studentAccountId dan subscription wajib diisi.' }, { status: 400 });
    }

    // Upsert subscription (insert if new, update if exists based on UNIQUE(student_account_id))
    const { error } = await supabaseAdmin
      .from('gm_push_subscriptions')
      .upsert(
        {
          student_account_id: studentAccountId,
          subscription: subscription,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'student_account_id' }
      );

    if (error) {
      console.error('[Push Subscribe API] Supabase upsert error:', error);
      return NextResponse.json({ error: 'Gagal menyimpan subscription ke database.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription berhasil didaftarkan.' });
  } catch (err: any) {
    console.error('[Push Subscribe API] Crash:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentAccountId } = body;

    if (!studentAccountId) {
      return NextResponse.json({ error: 'studentAccountId wajib diisi.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('gm_push_subscriptions')
      .delete()
      .eq('student_account_id', studentAccountId);

    if (error) {
      console.error('[Push Subscribe API] Supabase delete error:', error);
      return NextResponse.json({ error: 'Gagal menghapus subscription dari database.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription berhasil dihapus.' });
  } catch (err: any) {
    console.error('[Push Subscribe API] Crash:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}
