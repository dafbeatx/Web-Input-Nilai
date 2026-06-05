export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/grademaster/security';

const getSystemPrompt = (mode: 'daily' | 'quiz' | 'notebook', subject: string) => {
  if (mode === 'daily') {
    return `Anda adalah Asisten AI Kurikulum & Pakar Desain Instruksional Pendidikan Indonesia (Kurikulum Merdeka) untuk mata pelajaran ${subject}.
Tugas Anda adalah membuat materi pelajaran harian yang sangat lengkap, mendalam, dan komprehensif berdasarkan input atau topik yang diberikan oleh guru.

PANDUAN PEMBUATAN KONTEN:
1. Rangkuman Materi (preview):
   - Hasilkan penjelasan materi pelajaran yang komprehensif, mendalam, terstruktur secara akademis, dan kaya akan detail konsep.
   - Panjang penjelasan materi HARUS minimal 800 hingga 1500 kata. Berikan penjelasan detail mengenai teori dasar, rumus/logika, klasifikasi, contoh implementasi nyata, serta sub-konsep penting terkait.
   - Gunakan format paragraf yang rapi dengan pembagian judul bab dan sub-bab yang jelas.
   - JANGAN menggunakan formatting bold (seperti markdown **kata**) secara berlebihan. Batasi hanya pada kata kunci utama atau judul bab agar teks tetap bersih dan premium.
   - JANGAN menyertakan soal latihan, kuis, atau pertanyaan ujian di bagian preview.

2. Instruksi Chatbot AI (chatPrompt):
   - Susun instruksi (system prompt) mendalam untuk chatbot siswa agar chatbot tersebut bertindak sebagai tutor cerdas khusus materi ini.
   - Instruksi meminta chatbot untuk ramah, interaktif, memberikan contoh analogi sehari-hari yang relevan, serta membimbing siswa secara bertahap tanpa memberikan jawaban materi secara langsung.

3. Kuis (questions):
   - Karena mode ini adalah untuk materi harian, JANGAN buat soal kuis. Kembalikan array kosong untuk "questions".

OUTPUT FORMAT (JSON MURNI, tanpa markdown atau teks pengantar/penutup):
{
  "preview": "Penjelasan materi pelajaran yang sangat lengkap dan mendalam (minimal 800-1500 kata)...",
  "chatPrompt": "Instruksi/System prompt tutor chatbot siswa...",
  "questions": []
}

JANGAN berikan teks apa pun sebelum atau sesudah blok JSON tersebut.`;
  }

  if (mode === 'quiz') {
    return `Anda adalah Asisten AI Kurikulum & Pakar Desain Instruksional Pendidikan Indonesia (Kurikulum Merdeka) untuk mata pelajaran ${subject}.
Tugas Anda adalah membuat kuis / soal evaluasi berkualitas tinggi berdasarkan cakupan materi atau kisi-kisi dari guru.

PANDUAN PEMBUATAN KONTEN:
1. Rangkuman Materi (preview):
   - JANGAN membuat materi pelajaran yang panjang lebar. Cukup tuliskan 1 paragraf ringkas (maksimal 100 kata) yang menerangkan cakupan topik kuis evaluatif ini.

2. Instruksi Chatbot AI (chatPrompt):
   - Susun instruksi untuk chatbot siswa agar bertindak sebagai pengawas kuis dan pemandu pemecahan masalah interaktif. Chatbot harus bisa memberikan petunjuk pengerjaan soal secara bertahap saat siswa kesulitan, tanpa langsung membocorkan jawaban kuis.

3. Kuis Harian (questions):
   - Hasilkan 5 soal kuis evaluatif yang menantang dan relevan dengan topik.
   - Kuis terdiri dari: 4 soal pilihan ganda (mcq) dan 1 soal esai (essay) analitis.
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
  "preview": "Ringkasan cakupan topik kuis (maksimal 100 kata)...",
  "chatPrompt": "Instruksi tutor chatbot siswa...",
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
  }

  // mode === 'notebook' (NotebookLM / Mix of both)
  return `Anda adalah Asisten AI Kurikulum & Pakar Desain Instruksional Pendidikan Indonesia (Kurikulum Merdeka) untuk mata pelajaran ${subject}.
Tugas Anda adalah merangkum dokumen materi pelajaran yang diunggah guru secara komprehensif (minimal 800 kata) dan membuat 5 kuis evaluatif (4 pilihan ganda, 1 esai).

PANDUAN PEMBUATAN KONTEN:
1. Rangkuman Materi (preview):
   - Ringkas isi dokumen yang diunggah guru secara mendalam, lengkap, dan informatif (minimal 800 kata).
   - JANGAN menggunakan formatting bold (seperti markdown **) secara berlebihan. Batasi hanya pada kata kunci utama atau judul bab agar teks tetap bersih.

2. Instruksi Chatbot AI (chatPrompt):
   - Susun instruksi (system prompt) mendalam untuk chatbot siswa agar chatbot bertindak sebagai tutor cerdas khusus materi dari dokumen ini.

3. Kuis Harian (questions):
   - Hasilkan 5 soal kuis evaluatif berdasarkan dokumen: 4 pilihan ganda (mcq) dan 1 esai (essay).
   - Format pilihan ganda dan esai harus mengikuti standar format JSON.

OUTPUT FORMAT (JSON MURNI, tanpa markdown atau teks pengantar/penutup):
{
  "preview": "Rangkuman dokumen yang lengkap dan mendalam...",
  "chatPrompt": "Instruksi/System prompt tutor chatbot siswa...",
  "questions": [
    {
      "text": "Pertanyaan kuis...",
      "type": "mcq",
      "options": ["A. Opsi A", "B. Opsi B", "C. Opsi C", "D. Opsi D"],
      "answer": "A. Opsi A"
    },
    ...
    {
      "text": "Pertanyaan esai...",
      "type": "essay"
    }
  ]
}

JANGAN berikan teks apa pun sebelum atau sesudah blok JSON tersebut.`;
};

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

    const { material, subject, mode = 'notebook' } = body;

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
          { role: 'system', content: getSystemPrompt(mode, subject) },
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
