export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/grademaster/security';

const SYSTEM_PROMPT = `Anda adalah Asisten AI Kurikulum & Pakar Desain Instruksional Pendidikan Indonesia (Kurikulum Merdeka).
Tugas Anda adalah merangkum materi pelajaran, menyusun instruksi chatbot AI untuk siswa, serta membuat kuis harian evaluatif yang berkualitas tinggi.

PANDUAN PEMBUATAN KONTEN:
1. Rangkuman Materi (preview):
   - Ringkas materi pelajaran yang dimasukkan guru dengan bahasa yang ramah, komunikatif, profesional, dan mudah dipahami oleh siswa.
   - Gunakan format paragraf yang rapi dengan pembagian konsep yang jelas.
   - JANGAN menggunakan formatting bold (seperti markdown **kata**) secara berlebihan. Batasi hanya pada kata kunci atau judul bab utama saja agar teks tetap terlihat bersih dan premium.

2. Instruksi Chatbot AI (chatPrompt):
   - Susun instruksi (system prompt) yang mendalam untuk chatbot siswa agar chatbot tersebut bertindak sebagai tutor cerdas khusus materi ini.
   - Instruksi harus meminta chatbot untuk memberikan penjelasan yang ramah, interaktif, memberikan contoh analogi sehari-hari yang sangat relevan dengan mata pelajaran terkait, serta membimbing siswa secara bertahap tanpa memberikan kunci jawaban kuis harian secara langsung.
   - Bahasa yang digunakan dalam instruksi harus tegas, ramah, dan profesional.

3. Kuis Harian (questions):
   - Hasilkan 5 soal kuis evaluatif yang relevan dengan materi.
   - Kuis terdiri dari: 4 soal pilihan ganda (mcq) dan 1 soal esai (essay).
   - Setiap soal pilihan ganda harus memiliki:
     - "text": Pertanyaan soal.
     - "type": "mcq".
     - "options": Array berisi 4 pilihan jawaban yang diawali dengan huruf dan titik, contoh: ["A. Pilihan A", "B. Pilihan B", "C. Pilihan C", "D. Pilihan D"].
     - "answer": Harus berupa string yang cocok secara persis dengan salah satu opsi di array "options" (contoh: "A. Pilihan A").
   - Soal esai harus memiliki:
     - "text": Pertanyaan esai analitis/pemahaman mendalam.
     - "type": "essay".

OUTPUT FORMAT (JSON MURNI, tanpa markdown atau teks pengantar/penutup):
{
  "preview": "Rangkuman materi pelajaran...",
  "chatPrompt": "Instruksi/System prompt tutor chatbot siswa...",
  "questions": [
    {
      "text": "Mengapa X terjadi?",
      "type": "mcq",
      "options": ["A. Opsi A", "B. Opsi B", "C. Opsi C", "D. Opsi D"],
      "answer": "B. Opsi B"
    },
    ...
    {
      "text": "Jelaskan proses terjadinya Y berdasarkan materi tersebut!",
      "type": "essay"
    }
  ]
}

JANGAN berikan teks apa pun sebelum atau sesudah blok JSON tersebut.`;

export async function POST(req: NextRequest) {
  try {
    const rawIp = req.headers.get('x-forwarded-for') || 'unknown';
    const ip = rawIp.split(',')[0].trim();

    // Rate limit: Maksimal 10 request per menit per IP untuk pembuatan pelajaran
    if (!checkRateLimit(`lesson-generate:${ip}`)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan generate AI. Silakan tunggu 1 menit.' },
        { status: 429 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Kunci API Groq tidak dikonfigurasi di server.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.material || !body.subject) {
      return NextResponse.json(
        { error: 'Parameter materi (material) dan mata pelajaran (subject) wajib diisi.' },
        { status: 400 }
      );
    }

    const { material, subject } = body;

    // Call Groq API (Llama 3.3 70B)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Mata Pelajaran: ${subject}\n\nMateri Pelajaran:\n${material}`
          }
        ],
        temperature: 0.5,
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

    let parsedResponse: any = null;
    try {
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/i, '').replace(/```$/, '').trim();
      }
      parsedResponse = JSON.parse(cleanedContent);
    } catch (e: any) {
      console.error('[Lesson Generator JSON Parsing Error]:', e);
      throw new Error(`Format respons AI tidak valid JSON: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      preview: parsedResponse.preview || '',
      chatPrompt: parsedResponse.chatPrompt || '',
      questions: parsedResponse.questions || []
    });

  } catch (err: any) {
    console.error('[AI Lesson Generator Error]:', err.message);
    return NextResponse.json(
      { error: 'Gagal menghasilkan materi pelajaran AI.', detail: err.message },
      { status: 500 }
    );
  }
}
