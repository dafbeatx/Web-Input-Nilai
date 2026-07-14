import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/grademaster/security';
import { analyzeSnapshot, ProctoringAnalysis } from '@/lib/grademaster/services/proctoring-analyzer.service';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    // Rate limit: uses default 10 req/min per identifier
    if (!checkRateLimit(`ai-proctor:${ip}`)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { attemptId, imageData } = body;

    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId required' }, { status: 400 });
    }

    if (!imageData || typeof imageData !== 'string' || imageData.length < 100) {
      return NextResponse.json({ error: 'Valid imageData required' }, { status: 400 });
    }

    // Run AI analysis via Groq Vision
    const analysis: ProctoringAnalysis = await analyzeSnapshot(imageData);

    const supabase = await createClient();

    // Check existing AI analysis count for this attempt (cap at 30 per session)
    const { count } = await supabase
      .from('gm_proctoring_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('attempt_id', attemptId)
      .not('ai_analysis', 'is', null);

    if ((count || 0) >= 30) {
      // Still return the analysis but don't persist
      return NextResponse.json({ ok: true, analysis, persisted: false, reason: 'Max AI snapshots reached' });
    }

    // Save snapshot with AI analysis to database
    const { error: insertErr } = await supabase
      .from('gm_proctoring_snapshots')
      .insert({
        attempt_id: attemptId,
        violation_type: `AI_${analysis.threat_level.toUpperCase()}`,
        image_data: analysis.threat_level !== 'safe' ? imageData : null, // Only persist image for non-safe
        ai_analysis: analysis,
      });

    if (insertErr) {
      console.error('[AI Proctoring] DB insert error:', insertErr);
      // Still return analysis even if DB fails
      return NextResponse.json({ ok: true, analysis, persisted: false });
    }

    // Send Telegram alert for critical threats
    if (analysis.threat_level === 'critical') {
      try {
        // Get attempt details for the alert
        const { data: attempt } = await supabase
          .from('gm_remedial_attempts')
          .select('student_id, session_id')
          .eq('id', attemptId)
          .single();

        if (attempt) {
          const { data: student } = await supabase
            .from('gm_students')
            .select('name')
            .eq('id', attempt.student_id)
            .single();

          const { data: session } = await supabase
            .from('gm_sessions')
            .select('subject, class')
            .eq('id', attempt.session_id)
            .single();

          const studentName = student?.name || 'Unknown';
          const subject = session?.subject || 'Unknown';
          const className = session?.class || '';
          const findings = analysis.findings.join(', ');

          // Fire-and-forget Telegram notification
          const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
          const telegramChatId = process.env.TELEGRAM_CHAT_ID;

          if (telegramBotToken && telegramChatId) {
            const message = `🚨 *AI PROCTORING — KRITIS*\n\n` +
              `👤 *Siswa:* ${studentName}\n` +
              `📚 *Mapel:* ${subject} (${className})\n` +
              `🔍 *Temuan:* ${findings}\n` +
              `🎯 *Objek Mencurigakan:* ${analysis.suspicious_objects.join(', ') || '-'}\n` +
              `👥 *Orang Terdeteksi:* ${analysis.persons_detected}\n` +
              `📊 *Confidence:* ${(analysis.confidence * 100).toFixed(0)}%\n\n` +
              `⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;

            fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegramChatId,
                text: message,
                parse_mode: 'Markdown',
              }),
            }).catch(err => console.error('[AI Proctoring] Telegram alert failed:', err));
          }
        }
      } catch (alertErr) {
        console.error('[AI Proctoring] Alert dispatch error:', alertErr);
      }
    }

    return NextResponse.json({ ok: true, analysis, persisted: true });
  } catch (err: any) {
    console.error('[AI Proctoring] Route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
