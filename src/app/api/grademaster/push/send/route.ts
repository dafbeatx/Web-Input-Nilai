import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import webpush from 'web-push';

// Initialize web-push with VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@grademaster.os';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('[Push Send API] VAPID Keys are not fully configured in env.');
}

// Reusable function to trigger mass remedial reminders
async function runRemedialReminder() {
  // 1. Get all push subscriptions joined with student accounts
  const { data: subs, error: subError } = await supabaseAdmin
    .from('gm_push_subscriptions')
    .select(`
      subscription,
      student_account_id,
      gm_student_accounts (
        id,
        student_name,
        class_name,
        academic_year
      )
    `);

  if (subError || !subs || subs.length === 0) {
    return NextResponse.json({ message: 'Tidak ada siswa yang berlangganan push notification.' }, { status: 200 });
  }

  // Map subscriptions by key: name_class_year
  const subMap = new Map();
  subs.forEach((sub: any) => {
    const sa = sub.gm_student_accounts;
    if (sa) {
      const key = `${sa.student_name.toLowerCase().trim()}_${sa.class_name.toLowerCase().trim()}_${sa.academic_year}`;
      subMap.set(key, sub.subscription);
    }
  });

  // 2. Query all active students who are below KKM
  const { data: students, error: studentError } = await supabaseAdmin
    .from('gm_students')
    .select(`
      id,
      name,
      final_score,
      remedial_status,
      gm_sessions (
        id,
        subject,
        class_name,
        academic_year,
        kkm
      )
    `)
    .eq('is_deleted', false)
    .eq('is_blocked', false);

  if (studentError || !students) {
    console.error('[Push Send API] Error fetching students:', studentError);
    return NextResponse.json({ error: 'Gagal mengambil data siswa.' }, { status: 500 });
  }

  // Filter students who need remedial (final_score < KKM) and are not marked COMPLETED or RESOLVED
  const pendingRemedials = students.filter((s: any) => {
    const session = s.gm_sessions;
    if (!session) return false;
    
    const kkm = Number(session.kkm || 70);
    const finalScore = Number(s.final_score || 0);
    const needsRemedial = finalScore < kkm;
    
    const isNotDone = s.remedial_status !== 'COMPLETED' && s.remedial_status !== 'RESOLVED';
    
    return needsRemedial && isNotDone;
  });

  let sentCount = 0;
  let failCount = 0;

  // 3. Send notifications to matched subscriptions
  const notificationPromises = pendingRemedials.map(async (student: any) => {
    const session = student.gm_sessions;
    const key = `${student.name.toLowerCase().trim()}_${session.class_name.toLowerCase().trim()}_${session.academic_year}`;
    const sub = subMap.get(key);

    if (sub) {
      const payload = JSON.stringify({
        title: '🚨 Pengingat Remedial Harian',
        body: `Halo ${student.name}, Anda belum mencapai KKM (${session.kkm}) untuk pelajaran ${session.subject}. Harap segera selesaikan remedial Anda!`,
        url: `/#remedial`
      });

      try {
        await webpush.sendNotification(sub, payload);
        sentCount++;
      } catch (pushErr) {
        console.error(`[Push Send API] Failed to send push to ${student.name}:`, pushErr);
        failCount++;
      }
    }
  });

  await Promise.all(notificationPromises);

  return NextResponse.json({
    success: true,
    message: `Pengingat remedial terkirim. Berhasil: ${sentCount}, Gagal: ${failCount}.`,
    totalEligible: pendingRemedials.length,
    totalSubscribed: subs.length
  });
}

// GET handler: triggers automatic mass reminder (suitable for scheduled Vercel Cron jobs)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'hourly-reminder') {
      console.log('[Push Send API] GET request detected. Running hourly remedial reminder check...');
      const { runHourlyRemedialReminder } = await import('@/lib/grademaster/services/push-notification.service');
      const result = await runHourlyRemedialReminder();
      return NextResponse.json(result);
    }

    console.log('[Push Send API] GET request detected. Running daily remedial reminder cron...');
    return await runRemedialReminder();
  } catch (err: any) {
    console.error('[Push Send API] GET Error:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}

// POST handler: triggers targeted single push or mass push depending on payload
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, studentAccountId, title, message, url } = body;

    // Case 1: Send single direct notification (useful for testing or direct alerts)
    if (studentAccountId) {
      const { data: subData, error: subError } = await supabaseAdmin
        .from('gm_push_subscriptions')
        .select('subscription')
        .eq('student_account_id', studentAccountId)
        .single();

      if (subError || !subData) {
        return NextResponse.json({ error: 'Push subscription tidak ditemukan untuk akun siswa ini.' }, { status: 404 });
      }

      const payload = JSON.stringify({
        title: title || 'Notifikasi GradeMaster OS',
        body: message || 'Ada pemberitahuan baru dari sekolah.',
        url: url || '/'
      });

      await webpush.sendNotification(subData.subscription, payload);
      return NextResponse.json({ success: true, message: 'Notifikasi berhasil terkirim ke siswa.' });
    }

    // Case 2: Mass Daily Remedial Reminder
    if (action === 'remedial-reminder') {
      return await runRemedialReminder();
    }

    // Case 3: Hourly Remedial Reminder Check
    if (action === 'hourly-reminder') {
      const { runHourlyRemedialReminder } = await import('@/lib/grademaster/services/push-notification.service');
      const result = await runHourlyRemedialReminder();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Aksi tidak valid atau parameter tidak lengkap.' }, { status: 400 });
  } catch (err: any) {
    console.error('[Push Send API] POST Error:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}
