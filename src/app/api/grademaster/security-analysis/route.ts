import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';
import { analyzeExploits, ExploitAnalysisInput, SessionLogAction } from '@/lib/grademaster/services/exploit-analyzer.service';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin yang diizinkan.' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`exploit-auth:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 });
    }

    const { attemptId, studentId } = body;

    // We can also accept raw logs directly for testing if provided, otherwise fetch them
    let logsInput: SessionLogAction[] = body.logs;

    if (!attemptId && !logsInput) {
      return NextResponse.json(
        { error: 'attemptId atau logs (raw) wajib disertakan' },
        { status: 400 }
      );
    }

    let status = body.status || 'COMPLETED';
    let allocatedTimeMs = body.allocatedTimeMs || (15 * 60 * 1000); // default 15 mins
    let startedAtMs = body.startedAtMs;
    let completedAtMs = body.completedAtMs;

    // Fetch data from DB if attemptId is provided
    if (attemptId && !logsInput) {
      const { data: attempt } = await supabase
        .from('gm_remedial_attempts')
        .select('status, started_at, completed_at, session_id')
        .eq('id', attemptId)
        .single();
      
      let sessionId = null;
      if (attempt) {
        status = attempt.status;
        startedAtMs = attempt.started_at ? new Date(attempt.started_at).getTime() : undefined;
        completedAtMs = attempt.completed_at ? new Date(attempt.completed_at).getTime() : undefined;
        sessionId = attempt.session_id;
      }

      if (sessionId) {
        const { data: session } = await supabase
          .from('gm_sessions')
          .select('remedial_timer')
          .eq('id', sessionId)
          .single();
        allocatedTimeMs = (session?.remedial_timer || 15) * 60 * 1000;
      }

      const { data: rawLogs, error: logErr } = await supabase
        .from('gm_attempt_logs')
        .select('event_type, created_at, metadata')
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: true });

      if (logErr) {
        console.error('Fetch log error:', logErr);
        return NextResponse.json({ error: 'Gagal mengambil log sistem.' }, { status: 500 });
      }

      logsInput = (rawLogs || []).map(l => ({
        action: l.event_type,
        timestamp: new Date(l.created_at).getTime(),
        metadata: l.metadata
      }));
    }

    const inputData: ExploitAnalysisInput = {
      userId: studentId || 'UNKNOWN',
      sessionStatus: status,
      allocatedTimeMs,
      startedAtMs,
      completedAtMs,
      logs: logsInput || [],
    };

    const results = analyzeExploits(inputData);

    // Filter outputs matching requested JSON format (take the most severe ones)
    // Map to exact required schema requested by user
    const topResult = results[0];

    return NextResponse.json({
      risk_level: topResult.risk_level,
      suspected_exploit: topResult.suspected_exploit,
      recommended_fix: topResult.recommended_fix,
      _debug: {
        total_logs_analyzed: inputData.logs.length,
        all_findings: results
      }
    });

  } catch (err) {
    console.error('Exploit analyzer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
