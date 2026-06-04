import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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

    const { attemptId, studentId, useAi = false } = body;

    let latestAttemptId = attemptId;
    let studentData: any = null;

    // 1. Resolve student and attempt information
    if (!latestAttemptId && studentId) {
      // Find the latest attempt for this student in the system
      const { data: attempt, error: attemptErr } = await supabaseAdmin
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
    const logsInput: SessionLogAction[] = (rawLogs || []).map((l: any) => ({
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

    // 5. Invoke Groq AI Cyber-Forensics Engine if requested
    const apiKey = process.env.GROQ_API_KEY;
    if (useAi && apiKey) {
      try {
        const startTimestamp = attemptData.started_at ? new Date(attemptData.started_at).getTime() : Date.now();
        
        // Prepare simplified event logs for LLM
        const simplifiedLogs = (rawLogs || []).map((l: any) => {
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
        const simplifiedSnaps = (rawSnaps || []).map((s: any) => {
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

        const elapsedDurationMs = attemptData.completed_at && attemptData.started_at 
          ? new Date(attemptData.completed_at).getTime() - new Date(attemptData.started_at).getTime()
          : 0;

        const summaryMetadata = {
          student_name: studentData.name,
          subject,
          kkm,
          status: attemptData.status,
          allocated_time_mins: Math.round(allocatedTimeMs / 60000),
          real_elapsed_time_mins: elapsedDurationMs > 0 ? (elapsedDurationMs / 60000).toFixed(2) : 'Belum Selesai',
          location: attemptData.location || 'UNAVAILABLE',
          note: attemptData.note || 'N/A'
        };

        const systemPrompt = `Anda adalah Pakar Forensik Keamanan Siber Sistem Ujian & AI Proctoring Specialist Senior.
Tugas Anda adalah melakukan audit mendalam terhadap data telemetri aktivitas siswa selama sesi remedial untuk mengidentifikasi jika ada anomali atau kecurangan terencana.

PANDUAN EVALUASI & VERDIK:
1. Hitung skor probabilitas kecurangan (risk_score) secara objektif (angka 0-100%).
2. Klasifikasikan risk_level: 'RENDAH' (risk_score < 30), 'SEDANG' (risk_score 30-70), atau 'TINGGI' (risk_score > 70).
3. Berikan 'ai_verdict' yang lugas (misal: "MURNI / BERSIH", "TERINDIKASI KECURANGAN RINGAN", "TERKOMPROMI / KECURANGAN BERENCANA").
4. Tuliskan analisis teknis 'threat_vector_summary' dalam Bahasa Indonesia yang formal, analitis, padat, dan lugas yang menerangkan pola perilaku siswa (termasuk deteksi tab-switching, reload, joki, evasive kamera, dll).
5. Buat kronologi log anomali terpenting dalam 'forensic_timeline' (urut berdasarkan waktu terjadi relative MM:SS). Tentukan risk_points per kejadian yang sesuai (0-100).
6. Berikan daftar saran operasional mitigasi praktis untuk guru dalam 'mitigation_actions' (minimal 2 saran).

PANDUAN OUTPUT:
Tanggapan Anda wajib berupa objek JSON murni (strict JSON) tanpa markup markdown atau penjelasan luar, dengan format persis seperti ini:
{
  "risk_score": <angka 0-100>,
  "risk_level": "RENDAH" | "SEDANG" | "TINGGI",
  "ai_verdict": "<Kesimpulan status kecurangan>",
  "threat_vector_summary": "<Analisis modus operandi lengkap & mendalam>",
  "forensic_timeline": [
    {
      "time": "MM:SS",
      "action": "<Nama aksi/pelanggaran>",
      "risk_points": <angka kontribusi risiko>,
      "description": "<Detail pelanggaran kronologis>"
    }
  ],
  "mitigation_actions": [
    "<Rekomendasi tindakan 1>",
    "<Rekomendasi tindakan 2>"
  ]
}

JANGAN menulis penjelasan tambahan di luar JSON. Respon Anda harus langsung dimulai dengan '{' dan diakhiri dengan '}'.`;

        const userPrompt = `Berikut adalah data telemetri & bukti remedial siswa:\n\n` + 
          `Informasi Sesi:\n${JSON.stringify(summaryMetadata, null, 2)}\n\n` +
          `Log Aktivitas Sistem:\n${JSON.stringify(simplifiedLogs, null, 2)}\n\n` +
          `Bukti Foto AI Proctoring:\n${JSON.stringify(simplifiedSnaps, null, 2)}\n\n` +
          `Baseline Heuristik Model:\n${JSON.stringify(heuristicResults, null, 2)}`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          throw new Error(`Groq API returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const parsedResult = JSON.parse(content);
          return NextResponse.json({
            is_ai_analysis: true,
            risk_score: parsedResult.risk_score || 0,
            risk_level: parsedResult.risk_level || 'RENDAH',
            ai_verdict: parsedResult.ai_verdict || 'TIDAK TERDEFINISI',
            threat_vector_summary: parsedResult.threat_vector_summary || 'Tidak terdeteksi anomali.',
            forensic_timeline: parsedResult.forensic_timeline || [],
            mitigation_actions: parsedResult.mitigation_actions || [],
            _debug: {
              total_logs: rawLogs?.length || 0,
              total_snapshots: rawSnaps?.length || 0
            }
          });
        }
      } catch (err: any) {
        console.error('[AI Forensic Engine Failed - Falling back]:', err.message);
      }
    }

    // 6. Local Heuristic Fallback
    const mapRiskToScore: Record<string, number> = { TINGGI: 85, SEDANG: 50, RENDAH: 5 };
    const score = mapRiskToScore[topHeuristic.risk_level] || 5;

    // Create a mock chronological timeline from logs
    const startTimestamp = attemptData.started_at ? new Date(attemptData.started_at).getTime() : Date.now();
    const mockTimeline = (rawLogs || []).slice(0, 5).map((l: any) => {
      const relativeTimeMs = new Date(l.created_at).getTime() - startTimestamp;
      const mins = Math.floor(relativeTimeMs / 60000);
      const secs = Math.floor((relativeTimeMs % 60000) / 1000);
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      
      return {
        time: timeStr,
        action: l.event_type,
        risk_points: l.risk_points || 0,
        description: `Deteksi aktivitas ${l.event_type} dengan tingkat risiko ${l.severity}.`
      };
    });

    return NextResponse.json({
      is_ai_analysis: false,
      risk_score: score,
      risk_level: topHeuristic.risk_level,
      ai_verdict: topHeuristic.risk_level === 'TINGGI' ? 'TERINDIKASI KECURANGAN' : 'MURNI / BERSIH',
      threat_vector_summary: topHeuristic.suspected_exploit,
      forensic_timeline: mockTimeline,
      mitigation_actions: [topHeuristic.recommended_fix],
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
