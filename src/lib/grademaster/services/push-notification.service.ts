import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Initialize web-push details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@grademaster.os';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error('[Push Service] Error configuring web-push VAPID:', err);
  }
} else {
  console.warn('[Push Service] VAPID Keys are not fully configured in env.');
}

/**
 * Notifikasi ke seluruh teman sekelas yang remedial di sesi yang sama
 * bahwa ada siswa lain yang baru saja memulai remedial.
 */
export async function notifyClassmatesRemedialStarted(sessionId: string, startingStudentName: string) {
  try {
    console.log(`[Push Service] Initiating classmate notifications for starting student: ${startingStudentName}`);
    
    // 1. Ambil detail sesi
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('gm_sessions')
      .select('id, subject, class_name, academic_year, kkm')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      console.error('[Push Service] Session not found for classmate notification:', sessErr);
      return;
    }

    const kkm = Number(session.kkm || 70);

    // 2. Cari teman sekelas yang butuh remedial (nilai < KKM) dan belum selesai
    const { data: classmates, error: classErr } = await supabaseAdmin
      .from('gm_students')
      .select('id, name, final_score, remedial_status')
      .eq('session_id', sessionId)
      .eq('is_deleted', false)
      .eq('is_blocked', false)
      .neq('name', startingStudentName.trim());

    if (classErr || !classmates || classmates.length === 0) {
      console.log('[Push Service] No classmates eligible for notification.');
      return;
    }

    const failingClassmates = classmates.filter(s => {
      const score = Number(s.final_score || 0);
      const isPending = s.remedial_status !== 'COMPLETED' && s.remedial_status !== 'RESOLVED';
      return score < kkm && isPending;
    });

    if (failingClassmates.length === 0) {
      console.log('[Push Service] Classmates exist, but none are pending remedial.');
      return;
    }

    console.log(`[Push Service] Found ${failingClassmates.length} classmates pending remedial.`);

    // 3. Ambil semua push subscriptions
    const { data: subs, error: subErr } = await supabaseAdmin
      .from('gm_push_subscriptions')
      .select(`
        subscription,
        gm_student_accounts (
          student_name,
          class_name,
          academic_year
        )
      `);

    if (subErr || !subs || subs.length === 0) {
      console.log('[Push Service] No active push subscriptions found in system.');
      return;
    }

    // 4. Map & filter subscriptions milik teman kelas
    const targetSubs = subs.filter((sub: any) => {
      const sa = sub.gm_student_accounts;
      if (!sa) return false;
      const isClassMatch = sa.class_name.toLowerCase().trim() === session.class_name.toLowerCase().trim();
      const isYearMatch = sa.academic_year === session.academic_year;
      const isNameMatch = failingClassmates.some(c => c.name.toLowerCase().trim() === sa.student_name.toLowerCase().trim());
      return isClassMatch && isYearMatch && isNameMatch;
    });

    console.log(`[Push Service] Sending start remedial notifications to ${targetSubs.length} device subscriptions...`);

    const payload = JSON.stringify({
      title: '🔄 Teman Seperjuangan Mulai Remedial!',
      body: `Halo, teman sekelas Anda (${startingStudentName}) telah memulai pengerjaan remedial pelajaran ${session.subject}. Ayo segera kerjakan remedial Anda agar nilai kelas tidak tertahan!`,
      url: '/#remedial'
    });

    // 5. Send push notification parallelly
    await Promise.all(
      targetSubs.map(async (sub: any) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
        } catch (err) {
          console.error(`[Push Service] Failed to send push to classmate:`, err);
        }
      })
    );
    
    console.log('[Push Service] Classmate notifications sent successfully.');
  } catch (err) {
    console.error('[Push Service] Crash in notifyClassmatesRemedialStarted:', err);
  }
}

/**
 * Logika periodik (Hourly Cron): 
 * Mencari siswa yang remedialnya sudah tersedia >= 1 jam tapi belum login (remedial_status = 'NONE'),
 * lalu mengirim notifikasi pengingat secara personal.
 */
export async function runHourlyRemedialReminder() {
  try {
    console.log('[Push Service] Running hourly remedial login reminder check...');
    const now = new Date();

    // 1. Ambil seluruh sesi ujian
    const { data: sessions, error: sessErr } = await supabaseAdmin
      .from('gm_sessions')
      .select('id, subject, class_name, academic_year, kkm, scoring_config, updated_at');

    if (sessErr || !sessions || sessions.length === 0) {
      console.log('[Push Service] No sessions found.');
      return { success: true, sentCount: 0, message: 'Tidak ada sesi ditemukan.' };
    }

    // 2. Filter sesi yang remedialnya sudah diatur guru dan sudah rilis >= 1 jam
    const eligibleSessions = sessions.filter((session: any) => {
      let config = session.scoring_config;
      if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch(e) { config = {}; }
      }
      const questions = config?.remedialQuestions || [];
      if (questions.length === 0) return false;

      // Cek apakah sudah rilis >= 1 jam
      const updatedAt = new Date(session.updated_at || now);
      const diffMs = now.getTime() - updatedAt.getTime();
      const oneHourMs = 60 * 60 * 1000;
      if (diffMs < oneHourMs) return false;

      // Cek apakah sudah melewati batas deadline
      const deadline = config?.remedialDeadline;
      if (deadline && now > new Date(deadline)) return false;

      return true;
    });

    if (eligibleSessions.length === 0) {
      console.log('[Push Service] No sessions have remedial active and released for >= 1 hour.');
      return { success: true, sentCount: 0, message: 'Tidak ada sesi remedial aktif yang telah berumur >= 1 jam.' };
    }

    console.log(`[Push Service] Found ${eligibleSessions.length} eligible sessions. Checking students...`);

    // 3. Ambil seluruh push subscriptions untuk memetakan nama siswa
    const { data: subs, error: subErr } = await supabaseAdmin
      .from('gm_push_subscriptions')
      .select(`
        subscription,
        gm_student_accounts (
          student_name,
          class_name,
          academic_year
        )
      `);

    if (subErr || !subs || subs.length === 0) {
      console.log('[Push Service] No active device subscriptions in database.');
      return { success: true, sentCount: 0, message: 'Tidak ada devais yang terdaftar push notification.' };
    }

    let totalNotificationsSent = 0;

    // 4. Proses setiap sesi yang memenuhi syarat
    for (const session of eligibleSessions) {
      const kkm = Number(session.kkm || 70);

      // Cari siswa yang remedial_status = 'NONE' dan remedial_reminder_sent = false
      const { data: students, error: studErr } = await supabaseAdmin
        .from('gm_students')
        .select('id, name, final_score, remedial_status')
        .eq('session_id', session.id)
        .eq('remedial_status', 'NONE')
        .eq('is_deleted', false)
        .eq('is_blocked', false);

      // Mencoba menoleransi jika kolom 'remedial_reminder_sent' belum ada di DB (kita tangani di try-catch database)
      let studentsFiltered = students || [];
      
      try {
        const { data: testQuery, error: testErr } = await supabaseAdmin
          .from('gm_students')
          .select('id, name, final_score, remedial_status, remedial_reminder_sent')
          .eq('session_id', session.id)
          .eq('remedial_status', 'NONE')
          .eq('remedial_reminder_sent', false)
          .eq('is_deleted', false)
          .eq('is_blocked', false);
        
        if (!testErr && testQuery) {
          studentsFiltered = testQuery;
        }
      } catch (dbErr) {
        console.warn('[Push Service] Column remedial_reminder_sent might be missing from gm_students. Relying on basic filter.');
      }

      if (studentsFiltered.length === 0) continue;

      // Filter siswa dengan nilai di bawah KKM
      const failingStudents = studentsFiltered.filter(s => Number(s.final_score || 0) < kkm);
      if (failingStudents.length === 0) continue;

      console.log(`[Push Service] Session: ${session.subject} has ${failingStudents.length} students pending remedial login.`);

      for (const student of failingStudents) {
        // Cocokkan ke subscription
        const match = subs.find((sub: any) => {
          const sa = sub.gm_student_accounts;
          if (!sa) return false;
          const isClassMatch = sa.class_name.toLowerCase().trim() === session.class_name.toLowerCase().trim();
          const isYearMatch = sa.academic_year === session.academic_year;
          const isNameMatch = sa.student_name.toLowerCase().trim() === student.name.toLowerCase().trim();
          return isClassMatch && isYearMatch && isNameMatch;
        });

        if (match) {
          const payload = JSON.stringify({
            title: '⚠️ Pengingat Ujian Remedial',
            body: `Halo ${student.name}, remedial pelajaran ${session.subject} sudah dibuka selama lebih dari 1 jam. Silakan segera login untuk mengerjakannya agar nilai bersama tidak tertahan!`,
            url: '/#remedial'
          });

          try {
            await webpush.sendNotification(match.subscription, payload);
            totalNotificationsSent++;

            // Tandai sudah diingatkan di DB (secara aman, jika kolomnya ada)
            await supabaseAdmin
              .from('gm_students')
              .update({ remedial_reminder_sent: true } as any)
              .eq('id', student.id);

          } catch (pushErr) {
            console.error(`[Push Service] Failed to send hourly notification to ${student.name}:`, pushErr);
          }
        }
      }
    }

    console.log(`[Push Service] Hourly check finished. Sent ${totalNotificationsSent} notifications.`);
    return { success: true, sentCount: totalNotificationsSent };

  } catch (err: any) {
    console.error('[Push Service] Crash in runHourlyRemedialReminder:', err);
    return { success: false, error: err.message };
  }
}
