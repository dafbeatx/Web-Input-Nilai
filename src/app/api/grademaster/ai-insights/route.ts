export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limit check: Max 5 AI insight requests per minute per IP
    if (!checkRateLimit(`ai-insights:${ip}`)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit sebelum mencoba lagi.' }, { status: 429 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Kunci API Groq tidak dikonfigurasi di server.' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Format data tidak valid.' }, { status: 400 });
    }

    const { sessionName, subject, studentClass, kkm, gradedStudents, analytics } = body;

    if (!gradedStudents || !analytics) {
      return NextResponse.json({ error: 'Data statistik kelas tidak lengkap.' }, { status: 400 });
    }

    // Prepare simplified analytics data for the LLM context to minimize tokens and cost
    const totalStudents = gradedStudents.length;
    const passCount = gradedStudents.filter((s: any) => s.finalScore >= kkm).length;
    const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

    const classStats = {
      sessionName: sessionName || 'Sesi Ujian',
      subject: subject || 'N/A',
      class: studentClass || 'N/A',
      kkm: kkm || 70,
      totalStudents,
      avgScore: analytics.avgScore || 0,
      highestScore: analytics.highestScore || 0,
      lowestScore: analytics.lowestScore || 0,
      passRate,
      standardDeviation: analytics.standardDeviation || 0
    };

    const difficulties = (analytics.questionDifficulties || []).map((d: any) => ({
      questionNumber: d.questionNumber,
      wrongAnswerPercent: d.difficultyPercent,
      label: d.label // e.g., 'Sangat Sulit', 'Sulit', 'Sedang', 'Mudah'
    }));

    const studentList = gradedStudents.map((s: any) => ({
      name: s.name,
      score: s.finalScore,
      csi: s.csi,
      lps: s.lps,
      passed: s.finalScore >= kkm
    })).sort((a: any, b: any) => b.score - a.score);

    const systemPrompt = `Anda adalah Analis Pendidikan & Pakar Pedagogi Kurikulum Merdeka di Indonesia.
Tugas Anda adalah menganalisis data performa kelas hasil ujian untuk memberikan evaluasi akademis yang mendalam bagi Guru.

PANDUAN EVALUASI:
1. Analisis statistik utama kelas (rata-rata nilai, ketuntasan KKM, deviasi standar).
2. Temukan materi/soal yang paling bermasalah (persentase salah tertinggi) dan soal yang paling dikuasai.
3. Berikan kesimpulan ringkas, identifikasi kekuatan siswa, area kelemahan yang membutuhkan bimbingan khusus, dan buat rekomendasi aksi pengajaran yang konkret bagi Guru (misal: bentuk kelompok belajar sebaya, ulangi pengajaran topik tertentu, atau lakukan fokus remedial tertentu).
4. Gunakan Bahasa Indonesia yang baku, profesional, analitis, namun mudah dipahami guru.

PANDUAN OUTPUT:
Tanggapan Anda harus berupa objek JSON murni (strict JSON) dengan format persis seperti ini:
{
  "summary": "<Kesimpulan ringkas analitis performa kelas 2-3 kalimat>",
  "strengths": [
    "<Kekuatan belajar siswa 1>",
    "<Kekuatan belajar siswa 2>"
  ],
  "weaknesses": [
    "<Kelemahan atau area bermasalah kelas 1>",
    "<Kelemahan atau area bermasalah kelas 2>"
  ],
  "recommendations": [
    "<Saran tindakan konkret guru 1>",
    "<Saran tindakan konkret guru 2>",
    "<Saran tindakan konkret guru 3>"
  ]
}

JANGAN menulis penjelasan tambahan di luar JSON. Respon Anda harus langsung dimulai dengan '{' dan diakhiri dengan '}'.`;

    const userPrompt = `Berikut adalah data kelas:\n\n` + 
      `Statistik Kelas:\n${JSON.stringify(classStats, null, 2)}\n\n` +
      `Tingkat Kesulitan Soal (Berdasarkan Kegagalan):\n${JSON.stringify(difficulties, null, 2)}\n\n` +
      `Daftar Nilai Siswa:\n${JSON.stringify(studentList, null, 2)}`;

    // Call Groq API
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
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Groq API returned HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Respons Groq kosong.');
    }

    const parsedInsights = JSON.parse(content);
    return NextResponse.json({ success: true, insights: parsedInsights });

  } catch (err: any) {
    console.error('[AI Insights Error]:', err.message);
    return NextResponse.json({ error: 'Gagal menganalisis data kelas.', detail: err.message }, { status: 500 });
  }
}
