import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, localDate } = body; // localDate is YYYY-MM-DD from client

    if (!accountId || !localDate) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Retrieve student account
    const { data: account, error: getError } = await supabaseAdmin
      .from('gm_student_accounts')
      .select('study_streak, last_active_date')
      .eq('id', accountId)
      .maybeSingle();

    if (getError) {
      console.error('Error fetching student account:', getError);
      // Handle the case where the study_streak column does not exist yet (migration pending)
      if (getError.message.includes('study_streak') || getError.message.includes('last_active_date')) {
        return NextResponse.json({ 
          success: false, 
          error: 'database_migration_pending', 
          message: 'Kolom streak belum dibuat di database. Harap jalankan migrasi SQL.', 
          streak: 0, 
          updated: false 
        });
      }
      return NextResponse.json({ error: getError.message }, { status: 500 });
    }

    if (!account) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    const lastActiveDateStr = account.last_active_date;
    let newStreak = account.study_streak || 0;
    let updated = false;

    if (!lastActiveDateStr) {
      // First time learning
      newStreak = 1;
      updated = true;
    } else {
      const lastActive = new Date(lastActiveDateStr);
      const current = new Date(localDate);

      // Reset time to midnight to calculate pure date difference in days
      lastActive.setHours(0, 0, 0, 0);
      current.setHours(0, 0, 0, 0);

      const diffTime = current.getTime() - lastActive.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Yesterday was active -> increment streak
        newStreak += 1;
        updated = true;
      } else if (diffDays > 1) {
        // Break in streak -> reset to 1
        newStreak = 1;
        updated = true;
      } else if (diffDays === 0) {
        // Already active today -> do nothing
        updated = false;
      } else {
        // Client time is in the past compared to last_active_date? Keep current streak
        updated = false;
      }
    }

    if (updated) {
      const { error: updateError } = await supabaseAdmin
        .from('gm_student_accounts')
        .update({
          study_streak: newStreak,
          last_active_date: localDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('Error updating streak:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      streak: newStreak, 
      updated 
    });

  } catch (err: any) {
    console.error('Streak API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
