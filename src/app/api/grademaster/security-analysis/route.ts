import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, validateInternalToken } from '@/lib/grademaster/security';
import { getAdminSession } from '@/lib/grademaster/admin';
import { analyzeExploits, ExploitAnalysisInput, SessionLogAction } from '@/lib/grademaster/services/exploit-analyzer.service';

export async function POST(req: NextRequest) {
  try {
    // Authenticate via internal token or admin session
    const isInternal = validateInternalToken(req);
    if (!isInternal) {
      const adminSession = await getAdminSession();
      if (!adminSession) {
        return NextResponse.json({ error: 'Akses ditolak: Hanya admin atau sistem internal yang diizinkan.' }, { status: 401 });
      }
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`exploit-auth:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 });
    }

    const { attemptId, studentId, useAi = false } = body;

    let latestAttemptId = attemptId;
    let studentData: { name: string } | null = null;

    // 1. Resolve student and attempt information
    if (!latestAttemptId && studentId) {
      // Find the latest attempt for this student in the system
      const { data: attempt } = await supabaseAdmin
        .from('gm_remedial_attempts')
        .select('id, student_id')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (attempt) {
        latestAttemptId = attempt.id;
      }
    }

    if (!latestAttemptId) {
      return NextResponse.json(
        { error: 'Gagal mendeteksi sesi remedial yang aktif untuk siswa ini.' },
        { status: 400 }
      );
    }

    // 2. Fetch full attempt context
    const { data: attemptData, error: attemptFetchErr } = await supabaseAdmin
      .from('gm_remedial_attempts')
      .select('status, started_at, completed_at, session_id, student_id, location, photo, note')
      .eq('id', latestAttemptId)
      .single();

    if (attemptFetchErr || !attemptData) {
      console.error('Fetch attempt error details:', attemptFetchErr, 'Attempt ID:', latestAttemptId);
      return NextResponse.json({ error: 'Data sesi remedial tidak ditemukan.' }, { status: 404 });
    }

    // Fetch Student Name
    const { data: studentRecord } = await supabaseAdmin
      .from('gm_students')
      .select('name')
      .eq('id', attemptData.student_id)
      .single();
    
    studentData = studentRecord || { name: 'Siswa GradeMaster' };

    // Fetch Session Meta
    let allocatedTimeMs = 15 * 60 * 1000;
    let kkm = 70;
    let subject = 'N/A';
    if (attemptData.session_id) {
      const { data: session } = await supabaseAdmin
        .from('gm_sessions')
        .select('remedial_timer, kkm, subject')
        .eq('id', attemptData.session_id)
        .single();
      if (session) {
        allocatedTimeMs = (session.remedial_timer || 15) * 60 * 1000;
        kkm = session.kkm || 70;
        subject = session.subject || 'N/A';
      }
    }

    // 3. Fetch Telemetry logs
    const { data: rawLogs, error: logErr } = await supabaseAdmin
      .from('gm_attempt_logs')
      .select('event_type, severity, risk_points, metadata, created_at')
      .eq('attempt_id', latestAttemptId)
      .order('created_at', { ascending: true });

    if (logErr) {
      console.error('Fetch log error:', logErr);
      return NextResponse.json({ error: 'Gagal mengambil log sistem.' }, { status: 500 });
    }

    // 4. Fetch Proctoring Snapshots
    const { data: rawSnaps } = await supabaseAdmin
      .from('gm_proctoring_snapshots')
      .select('violation_type, ai_analysis, created_at')
      .eq('attempt_id', latestAttemptId)
      .order('created_at', { ascending: true });

    // Format logs for heuristics
    const logsInput: SessionLogAction[] = (rawLogs || []).map((l: { event_type: string; created_at: string; metadata: Record<string, unknown> }) => ({
      action: l.event_type,
      timestamp: new Date(l.created_at).getTime(),
      metadata: l.metadata
    }));

    const heuristicInput: ExploitAnalysisInput = {
      userId: attemptData.student_id,
      sessionStatus: attemptData.status,
      allocatedTimeMs,
      startedAtMs: attemptData.started_at ? new Date(attemptData.started_at).getTime() : undefined,
      completedAtMs: attemptData.completed_at ? new Date(attemptData.completed_at).getTime() : undefined,
      logs: logsInput
    };

    // Calculate baseline heuristic findings
    const heuristicResults = analyzeExploits(heuristicInput);
    const topHeuristic = heuristicResults[0] || { risk_level: 'RENDAH', suspected_exploit: 'Aktivitas normal', recommended_fix: 'N/A' };

    // Calculate real telemetry metrics from rawLogs and rawSnaps
    const tabSwitches = (rawLogs || []).filter(l => l.event_type.includes('TAB_SWITCH') || l.event_type.includes('BLUR')).length;
    const reloads = (rawLogs || []).filter(l => l.event_type.includes('RELOAD') || l.event_type.includes('PAGE_LOAD')).length;
    const copyPastes = (rawLogs || []).filter(l => l.event_type.includes('COPY') || l.event_type.includes('PASTE')).length;
    const visionViolations = (rawSnaps || []).length;
    const elapsedDurationMs = attemptData.completed_at && attemptData.started_at 
      ? new Date(attemptData.completed_at).getTime() - new Date(attemptData.started_at).getTime()
      : (attemptData.started_at ? Date.now() - new Date(attemptData.started_at).getTime() : 0);
    const durationMinutes = Number((elapsedDurationMs / 60000).toFixed(1));
    const allocatedMinutes = Math.round(allocatedTimeMs / 60000);
    const speedRatio = allocatedMinutes > 0 ? Number((durationMinutes / allocatedMinutes).toFixed(2)) : 1;

    const telemetryMetrics = {
      total_events: rawLogs?.length || 0,
      tab_switches: tabSwitches,
      reloads,
      copy_pastes: copyPastes,
      vision_violations: visionViolations,
      duration_minutes: durationMinutes,
      allocated_minutes: allocatedMinutes,
      speed_ratio: speedRatio,
    };

    // Calculate baseline deterministic threat vectors
    let browserRisk = 0;
    if (tabSwitches >= 5) browserRisk = 85;
    else if (tabSwitches >= 3) browserRisk = 60;
    else if (tabSwitches >= 1) browserRisk = 30;
    if (reloads >= 3) browserRisk = Math.max(browserRisk, 65);
    const browserStatus: 'AMAN' | 'WASPADA' | 'KRITIS' = browserRisk < 30 ? 'AMAN' : browserRisk < 70 ? 'WASPADA' : 'KRITIS';
    const browserSummary = tabSwitches === 0 && reloads <= 1
      ? "Fokus jendela browser stabil, tidak ada indikasi navigasi keluar atau tab-switching."
      : `Terdeteksi ${tabSwitches} kali perpindahan tab/jendela dan ${reloads} kali refresh halaman.`;

    let proctoringRisk = 0;
    if (visionViolations >= 3) proctoringRisk = 85;
    else if (visionViolations >= 1) proctoringRisk = 50;
    const proctoringStatus: 'AMAN' | 'WASPADA' | 'KRITIS' = proctoringRisk < 30 ? 'AMAN' : proctoringRisk < 70 ? 'WASPADA' : 'KRITIS';
    const proctoringSummary = visionViolations === 0
      ? "Kamera aktif normal, wajah siswa terverifikasi konsisten di area pandang."
      : `Tercatat ${visionViolations} anomali kamera (wajah tidak terdeteksi atau pergerakan mencurigakan).`;

    let temporalRisk = 0;
    if (durationMinutes > 0 && speedRatio < 0.15 && attemptData.status === 'COMPLETED') temporalRisk = 85;
    else if (durationMinutes > 0 && speedRatio < 0.3) temporalRisk = 45;
    else if (durationMinutes > allocatedMinutes + 2) temporalRisk = 70;
    const temporalStatus: 'AMAN' | 'WASPADA' | 'KRITIS' = temporalRisk < 30 ? 'AMAN' : temporalRisk < 70 ? 'WASPADA' : 'KRITIS';
    const temporalSummary = durationMinutes > 0
      ? `Siswa menyelesaikan dalam ${durationMinutes} menit dari ${allocatedMinutes} menit alokasi (${Math.round(speedRatio * 100)}% alokasi waktu).`
      : "Durasi pengerjaan dalam rentang normal.";

    let clipboardRisk = 0;
    if (copyPastes >= 3) clipboardRisk = 90;
    else if (copyPastes >= 1) clipboardRisk = 55;
    const clipboardStatus: 'AMAN' | 'WASPADA' | 'KRITIS' = clipboardRisk < 30 ? 'AMAN' : clipboardRisk < 70 ? 'WASPADA' : 'KRITIS';
    const clipboardSummary = copyPastes === 0
      ? "Tidak ada aktivitas salin (copy) soal atau tempel (paste) jawaban dari sumber eksternal."
      : `Terdeteksi ${copyPastes} kali upaya manipulasi clipboard (copy/paste teks).`;

    const baselineThreatVectors = [
      { name: "Browser & Tab Integrity", score: browserRisk, status: browserStatus, summary: browserSummary },
      { name: "Visual Proctoring & Biometrics", score: proctoringRisk, status: proctoringStatus, summary: proctoringSummary },
      { name: "Temporal & Velocity Dynamics", score: temporalRisk, status: temporalStatus, summary: temporalSummary },
      { name: "Clipboard & Content Input", score: clipboardRisk, status: clipboardStatus, summary: clipboardSummary }
    ];

    const startTimestamp = attemptData.started_at ? new Date(attemptData.started_at).getTime() : Date.now();
    const rawEventsFormatted = (rawLogs || []).slice(0, 30).map((l: { event_type: string; created_at: string; severity?: string; risk_points?: number; metadata?: Record<string, unknown> }) => {
      const relativeTimeMs = new Date(l.created_at).getTime() - startTimestamp;
      const mins = Math.max(0, Math.floor(relativeTimeMs / 60000));
      const secs = Math.max(0, Math.floor((relativeTimeMs % 60000) / 1000));
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      let detailStr = '';
      if (l.metadata && typeof l.metadata === 'object') {
        detailStr = (l.metadata.description as string) || (l.metadata.note as string) || (l.metadata.action as string) || '';
      }
      return {
        time: timeStr,
        event: l.event_type,
        severity: l.severity || 'LOW',
        details: detailStr || `Aktivitas sensor ${l.event_type}`
      };
    });

    // 5. Invoke Groq AI Cyber-Forensics Engine if requested
    const apiKey = process.env.GROQ_API_KEY;
    if (useAi && apiKey) {
      try {
        // Prepare simplified event logs for LLM
        const simplifiedLogs = (rawLogs || []).map((l: { event_type: string; created_at: string; severity?: string; risk_points?: number; metadata?: Record<string, unknown> }) => {
          const relativeTimeMs = new Date(l.created_at).getTime() - startTimestamp;
          const mins = Math.floor(relativeTimeMs / 60000);
          const secs = Math.floor((relativeTimeMs % 60000) / 1000);
          const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          
          return {
            time: timeStr,
            event: l.event_type,
            severity: l.severity || 'LOW',
            risk_points: l.risk_points || 0,
            metadata: l.metadata || {}
          };
        });

        // Prepare proctoring violation visual snaps metadata
        const simplifiedSnaps = (rawSnaps || []).map((s: { violation_type: string; created_at: string; ai_analysis?: Record<string, unknown> }) => {
          const relativeTimeMs = new Date(s.created_at).getTime() - startTimestamp;
          const mins = Math.floor(relativeTimeMs / 60000);
          const secs = Math.floor((relativeTimeMs % 60000) / 1000);
          const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          
          return {
            time: timeStr,
            violation_type: s.violation_type,
            ai_vision_analysis: s.ai_analysis || {}
          };
        });

        const summaryMetadata = {
          student_name: studentData.name,
          subject,
          kkm,
          status: attemptData.status,
          allocated_time_mins: allocatedMinutes,
          real_elapsed_time_mins: durationMinutes > 0 ? durationMinutes : 'Belum Selesai',
          telemetry_metrics: telemetryMetrics,
          location: attemptData.location || 'UNAVAILABLE',
          note: attemptData.note || 'N/A'
        };

        const systemPrompt = `Anda adalah Pakar Forensik Keamanan Siber Sistem Ujian & AI Proctoring Specialist Senior pada Nawasena.
Tugas Anda adalah melakukan audit investigasi mendalam terhadap data telemetri aktivitas siswa selama sesi remedial untuk mengidentifikasi ada tidaknya kecurangan terencana.

PANDUAN EVALUASI & METODOLOGI FORENSIK:
1. Hitung skor probabilitas kecurangan (risk_score) secara objektif dan proporsional (angka 0-100%).
   - Jika log bersih, tidak ada tab switch, tidak ada copy-paste, dan durasi normal: berikan risk_score rendah (0-15%).
   - Jika ada tab-switch berulang (>=3x), copy-paste, atau durasi abnormal (<15% alokasi): naikkan risk_score (>50%).
2. Klasifikasikan risk_level:
   - 'RENDAH' (risk_score < 30)
   - 'SEDANG' (risk_score 30-70)
   - 'TINGGI' (risk_score > 70)
3. Berikan 'ai_verdict' yang tegas dan formal:
   - Contoh: "MURNI / INTEGRITAS TINGGI", "WASPADA / ANOMALI MINOR", "TERKOMPROMI / INDIKASI KECURANGAN TINGGI"
4. Tuliskan 'threat_vector_summary' dalam Bahasa Indonesia analitis forensik profesional:
   - Uraikan korelasi fakta telemetri (misal korelasi antara waktu pengerjaan, pergantian tab, dan hasil submit).
   - Jangan menulis teks klise; sebutkan fakta angka konkret dari telemetri.
5. Buat 4 Vektor Forensik dalam 'threat_vectors':
   - "Browser & Tab Integrity"
   - "Visual Proctoring & Biometrics"
   - "Temporal & Velocity Dynamics"
   - "Clipboard & Content Input"
   Setiap vektor memiliki score (0-100), status ("AMAN" | "WASPADA" | "KRITIS"), dan summary analisis singkat.
6. Buat 'forensic_timeline' kronologis berisi kejadian kunci (urut waktu MM:SS).
7. Berikan minimal 2-3 'mitigation_actions' praktis bagi guru.

FORMAT JSON OUTPUT WAJIB:
{
  "risk_score": <number 0-100>,
  "risk_level": "RENDAH" | "SEDANG" | "TINGGI",
  "ai_verdict": "<Kesimpulan status>",
  "threat_vector_summary": "<Penjelasan analitis mendalam>",
  "threat_vectors": [
    { "name": "Browser & Tab Integrity", "score": <number>, "status": "AMAN"|"WASPADA"|"KRITIS", "summary": "<teks>" },
    { "name": "Visual Proctoring & Biometrics", "score": <number>, "status": "AMAN"|"WASPADA"|"KRITIS", "summary": "<teks>" },
    { "name": "Temporal & Velocity Dynamics", "score": <number>, "status": "AMAN"|"WASPADA"|"KRITIS", "summary": "<teks>" },
    { "name": "Clipboard & Content Input", "score": <number>, "status": "AMAN"|"WASPADA"|"KRITIS", "summary": "<teks>" }
  ],
  "forensic_timeline": [
    { "time": "MM:SS", "action": "<nama_aksi>", "risk_points": <number>, "description": "<detail>" }
  ],
  "mitigation_actions": [
    "<Saran tindakan 1>",
    "<Saran tindakan 2>"
  ]
}

Respon wajib JSON murni tanpa markdown ataupun pembuka kata.`;

        const userPrompt = `Data Telemetri Siswa Remedial:\n${JSON.stringify(summaryMetadata, null, 2)}\n\n` + 
          `Log Event Telemetri:\n${JSON.stringify(simplifiedLogs.slice(0, 30), null, 2)}\n\n` +
          `Snapshot Kamera Proctoring:\n${JSON.stringify(simplifiedSnaps.slice(0, 15), null, 2)}\n\n` +
          `Temuan Heuristik Awal:\n${JSON.stringify(heuristicResults, null, 2)}`;

        const candidateModels = [
          'qwen/qwen3.8-27b',
          'openai/gpt-oss-120b',
          'openai/gpt-oss-20b'
        ];

        let data: { choices?: Array<{ message?: { content?: string } }> } | null = null;
        let successfulModel = 'Qwen-27B Cyber-Forensics AI';

        for (const model of candidateModels) {
          try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' }
              })
            });

            if (response.ok) {
              data = await response.json();
              if (model.includes('qwen')) successfulModel = 'Qwen-27B Cyber-Forensics AI';
              else if (model.includes('120b')) successfulModel = 'GPT-OSS-120B Forensics Engine';
              else successfulModel = 'Groq Neural Forensics AI';
              break;
            }
          } catch {}
        }

        if (data?.choices?.[0]?.message?.content) {
          const parsedResult = JSON.parse(data.choices[0].message.content);
          return NextResponse.json({
            is_ai_analysis: true,
            engine_model: successfulModel,
            risk_score: typeof parsedResult.risk_score === 'number' ? parsedResult.risk_score : 10,
            risk_level: parsedResult.risk_level || 'RENDAH',
            ai_verdict: parsedResult.ai_verdict || 'INTEGRITAS NORMAL',
            threat_vector_summary: parsedResult.threat_vector_summary || 'Pemeriksaan telemetri selesai. Tidak terdeteksi pola kecurangan kritis.',
            threat_vectors: Array.isArray(parsedResult.threat_vectors) && parsedResult.threat_vectors.length > 0 
              ? parsedResult.threat_vectors 
              : baselineThreatVectors,
            forensic_timeline: Array.isArray(parsedResult.forensic_timeline) && parsedResult.forensic_timeline.length > 0
              ? parsedResult.forensic_timeline
              : rawEventsFormatted.slice(0, 5),
            mitigation_actions: Array.isArray(parsedResult.mitigation_actions) && parsedResult.mitigation_actions.length > 0
              ? parsedResult.mitigation_actions
              : [topHeuristic.recommended_fix || 'Verifikasi nilai akhir dan tandai sebagai selesai.'],
            telemetry_metrics: telemetryMetrics,
            raw_events: rawEventsFormatted,
            _debug: {
              total_logs: rawLogs?.length || 0,
              total_snapshots: rawSnaps?.length || 0,
              model: successfulModel
            }
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[AI Forensic Engine Failed - Falling back to Heuristics]:', message);
      }
    }

    // 6. Comprehensive Deterministic Fallback Engine
    const mapRiskToScore: Record<string, number> = { TINGGI: 85, SEDANG: 50, RENDAH: 10 };
    const maxVectorRisk = Math.max(browserRisk, proctoringRisk, temporalRisk, clipboardRisk);
    const score = maxVectorRisk > 0 ? maxVectorRisk : (mapRiskToScore[topHeuristic.risk_level] || 10);
    const calculatedLevel: 'RENDAH' | 'SEDANG' | 'TINGGI' = score >= 70 ? 'TINGGI' : score >= 35 ? 'SEDANG' : 'RENDAH';

    return NextResponse.json({
      is_ai_analysis: false,
      engine_model: 'GradeMaster Cyber-Telemetry Heuristic Engine',
      risk_score: score,
      risk_level: calculatedLevel,
      ai_verdict: calculatedLevel === 'TINGGI' 
        ? 'TERKOMPROMI / INDIKASI KECURANGAN' 
        : calculatedLevel === 'SEDANG' 
          ? 'WASPADA / ANOMALI MINOR' 
          : 'MURNI / INTEGRITAS TINGGI',
      threat_vector_summary: topHeuristic.suspected_exploit && topHeuristic.suspected_exploit !== 'Aktivitas normal'
        ? topHeuristic.suspected_exploit
        : `Hasil audit telemetri menunjukkan aktivitas siswa berada pada tingkat risiko ${calculatedLevel.toLowerCase()} dengan ${telemetryMetrics.tab_switches} perpindahan tab dan durasi pengerjaan ${durationMinutes} menit.`,
      threat_vectors: baselineThreatVectors,
      forensic_timeline: rawEventsFormatted.slice(0, 6).map(e => ({
        time: e.time,
        action: e.event,
        risk_points: e.severity === 'CRITICAL' ? 80 : e.severity === 'HIGH' ? 60 : e.severity === 'MEDIUM' ? 30 : 5,
        description: e.details
      })),
      mitigation_actions: [
        topHeuristic.recommended_fix || 'Pantau rekaman telemetry secara berkala.',
        'Finalisasi nilai jika tidak ditemukan anomali visual pada lembar jawaban.'
      ],
      telemetry_metrics: telemetryMetrics,
      raw_events: rawEventsFormatted,
      _debug: {
        total_logs: rawLogs?.length || 0,
        fallback: true
      }
    });

  } catch (err) {
    console.error('Exploit analyzer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
