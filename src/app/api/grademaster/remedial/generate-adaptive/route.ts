export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limit check: Max 5 adaptive question generation requests per minute per IP
    if (!checkRateLimit(`remedial-generate:${ip}`)) {
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

    const { subject, examType, academicYear, questionCount = 5, originalQuestionsText = "" } = body;

    if (!subject || !examType || !academicYear) {
      return NextResponse.json({ error: 'Parameter subject, examType, dan academicYear wajib diisi.' }, { status: 400 });
    }

    // 1. Fetch all matching sessions
    const { data: sessions, error: sessError } = await supabaseAdmin
      .from('gm_sessions')
      .select('id, session_name, class_name, school_level, answer_key')
      .eq('subject', subject)
      .eq('exam_type', examType)
      .eq('academic_year', academicYear);

    if (sessError) {
      throw sessError;
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: `Tidak ditemukan sesi ujian utama untuk mata pelajaran ${subject} (${examType}) pada tahun ${academicYear}.` }, { status: 404 });
    }

    const sessionIds = sessions.map(s => s.id);
    const schoolLevel = sessions[0]?.school_level || 'SMA';

    // 2. Fetch all student records for matching sessions to analyze answers
    const { data: students, error: stuError } = await supabaseAdmin
      .from('gm_students')
      .select('id, name, session_id, mcq_answers')
      .in('session_id', sessionIds);

    if (stuError) {
      throw stuError;
    }

    // 3. Aggregate wrong answers per question number
    const wrongCounts: Record<number, { wrong: number, total: number, correctAnswer: string }> = {};

    for (const session of sessions) {
      const answerKey = (session.answer_key as string[]) || [];
      const sessionStudents = (students || []).filter(s => s.session_id === session.id);
      
      for (const student of sessionStudents) {
        const answers = (student.mcq_answers as Record<string, string>) || {};
        
        answerKey.forEach((correctAns, idx) => {
          const qNum = idx + 1;
          const studentAns = answers[String(qNum)] || answers[qNum];
          
          if (!wrongCounts[qNum]) {
            wrongCounts[qNum] = { wrong: 0, total: 0, correctAnswer: correctAns };
          }
          
          if (studentAns) {
            wrongCounts[qNum].total++;
            if (studentAns.trim().toUpperCase() !== correctAns.trim().toUpperCase()) {
              wrongCounts[qNum].wrong++;
            }
          }
        });
      }
    }

    // Calculate failure percent per question
    const difficulties = Object.entries(wrongCounts).map(([qNumStr, data]) => {
      const qNum = parseInt(qNumStr);
      const difficultyPercent = data.total > 0 ? Math.round((data.wrong / data.total) * 100) : 0;
      return {
        questionNumber: qNum,
        correctAnswer: data.correctAnswer,
        difficultyPercent,
        totalAnswered: data.total,
        totalWrong: data.wrong
      };
    }).sort((a, b) => b.difficultyPercent - a.difficultyPercent); // Sort by hardest first

    // 4. Construct AI System & User Prompt
    const systemPrompt = `Anda adalah Asisten AI Guru & Pakar Pembuat Soal Evaluasi Pendidikan Kurikulum Merdeka di Indonesia.
Tugas Anda adalah membuat bank soal remedial adaptif bertipe Essay berdasarkan data hasil analisis kelemahan kelas.

PANDUAN PEMBUATAN SOAL:
1. Analisis nomor-nomor soal utama yang paling banyak dijawab salah oleh siswa.
2. Jika disediakan 'Teks Soal Ujian Asli', baca dan pahami topik/konsep dari nomor soal yang bersangkutan. Jika tidak ada, gunakan kreativitas pedagogis Anda untuk menghasilkan topik umum berdasarkan Mata Pelajaran, Jenis Ujian, dan Tingkat Sekolah.
3. Hasilkan sebanyak ${questionCount} soal remedial bertipe ESSAY beserta KUNCI JAWABAN masing-masing soal.
4. Soal remedial tidak boleh persis sama (plagiat) dengan soal asli, melainkan harus berupa variasi analitis, analogi kasus baru, atau pengubahan sudut pandang pertanyaan yang tetap mengukur kompetensi/topik yang sama (Cloned/Analogous Questions).
5. Bahasa: Gunakan Bahasa Indonesia yang baik, benar, jelas, dan sesuai tingkat pemahaman sekolah (misal: SMP/SMA).

PANDUAN OUTPUT:
Tanggapan harus berupa objek JSON murni (strict JSON) dengan struktur persis seperti berikut:
{
  "weakTopics": [
    "<Topik Kelemahan 1>",
    "<Topik Kelemahan 2>"
  ],
  "questions": [
    "1. <Pertanyaan Soal 1>",
    "2. <Pertanyaan Soal 2>"
  ],
  "answerKeys": [
    "1. <Kunci Jawaban Soal 1>",
    "2. <Kunci Jawaban Soal 2>"
  ]
}

JANGAN menulis penjelasan tambahan apa pun di luar JSON. Respon Anda harus langsung dimulai dengan '{' dan diakhiri dengan '}'.`;

    const userPrompt = `Mata Pelajaran: ${subject}
Jenis Ujian: ${examType}
Tahun Ajaran: ${academicYear}
Tingkat Sekolah (Jenjang): ${schoolLevel}

Analisis Soal Terlemah (Tingkat Kegagalan Tertinggi):
${JSON.stringify(difficulties.slice(0, 10), null, 2)}

Teks Soal Ujian Asli / Kisi-kisi (Opsional):
${originalQuestionsText || 'Tidak ada data soal asli. Silakan buat soal berdasarkan pemahaman topik dari mata pelajaran di atas.'}`;

    // 5. Call Groq API
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
        temperature: 0.3,
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

    const parsedResponse = JSON.parse(content);
    return NextResponse.json({ 
      success: true, 
      weakTopics: parsedResponse.weakTopics || [],
      questions: parsedResponse.questions || [],
      answerKeys: parsedResponse.answerKeys || [],
      difficulties: difficulties.slice(0, 5) // Send back top 5 difficult questions stats
    });

  } catch (err: any) {
    console.error('[AI Remedial Generator Error]:', err.message);
    return NextResponse.json({ error: 'Gagal menghasilkan soal remedial adaptif.', detail: err.message }, { status: 500 });
  }
}
