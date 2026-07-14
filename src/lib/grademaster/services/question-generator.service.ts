/**
 * AI Dynamic Question Generator Service
 * 
 * Menghasilkan soal & kunci jawaban remedial unik/analog untuk setiap siswa
 * menggunakan Groq API (Llama-3.3-70b-versatile).
 */

export interface GeneratedQuestionsResult {
  questions: string[];
  answerKeys: string[];
}

const SYSTEM_PROMPT = `Anda adalah Asisten Pembuat Soal Kecerdasan Buatan (AI Assessment Specialist) profesional untuk kurikulum pendidikan nasional di Indonesia.

TUGAS:
Buatlah variasi soal (studi kasus/pertanyaan analog) dan kunci jawaban baru berdasarkan daftar soal dan kunci jawaban asli yang diberikan oleh guru.

ATURAN GENERASI:
1. Soal baru harus memiliki bobot kognitif (C1-C6) dan tingkat kesulitan yang SAMA dengan soal asli.
2. Esensi materi pelajaran dan kompetensi dasar yang diuji harus tetap pertahankan secara akurat.
3. Ubah skenario, angka, parameter, nama tokoh, atau objek studi kasus sehingga soal menjadi unik untuk siswa ini (tidak bisa mencontek jawaban dari siswa lain).
4. Buat kunci jawaban yang detail, komprehensif, dan presisi untuk soal baru tersebut sebagai acuan AI auto-grading.
5. Jumlah soal hasil generasi harus SAMA persis dengan jumlah soal asli.

OUTPUT FORMAT (JSON MURNI, tanpa markdown/teks tambahan):
{
  "questions": [
    "Pertanyaan baru 1...",
    "Pertanyaan baru 2..."
  ],
  "answerKeys": [
    "Kunci jawaban/rubrik baru 1...",
    "Kunci jawaban/rubrik baru 2..."
  ]
}

JANGAN berikan kalimat pengantar, penutup, atau penjelasan tambahan apa pun di luar JSON tersebut.`;

/**
 * Menghasilkan soal & kunci jawaban baru secara dinamis menggunakan Groq API.
 * 
 * @param originalQuestions - Daftar soal asli
 * @param originalKeys - Kunci jawaban asli
 * @returns GeneratedQuestionsResult - Soal dan kunci jawaban baru hasil AI (atau fallback asli jika gagal)
 */
export async function generateDynamicQuestions(
  originalQuestions: string[],
  originalKeys: string[]
): Promise<GeneratedQuestionsResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const fallbackResult: GeneratedQuestionsResult = {
    questions: originalQuestions,
    answerKeys: originalKeys
  };

  if (!apiKey) {
    console.warn('[AI Question Gen] GROQ_API_KEY tidak dikonfigurasi. Menggunakan soal asli.');
    return fallbackResult;
  }

  if (!originalQuestions || originalQuestions.length === 0) {
    return { questions: [], answerKeys: [] };
  }

  try {
    const inputPayload = originalQuestions.map((q, idx) => ({
      index: idx,
      originalQuestion: q,
      originalKey: originalKeys[idx] || ''
    }));

    const userPrompt = `Buatkan variasi soal unik dan kunci jawaban baru dari data berikut:\n\n${JSON.stringify(inputPayload, null, 2)}`;

    // 8-second timeout for prompt completion
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7, // 0.7 allows for creative variation while retaining structure
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Groq API returned HTTP error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq API returned empty completions content');
    }

    const parsed = JSON.parse(content) as GeneratedQuestionsResult;

    // Validation
    if (!Array.isArray(parsed.questions) || !Array.isArray(parsed.answerKeys)) {
      throw new Error('JSON output structure is invalid');
    }

    if (parsed.questions.length !== originalQuestions.length) {
      throw new Error(`Mismatch in generated question count (Expected ${originalQuestions.length}, got ${parsed.questions.length})`);
    }

    console.log(`[AI Question Gen] Sukses men-generate ${parsed.questions.length} soal remedial unik.`);
    return {
      questions: parsed.questions,
      answerKeys: parsed.answerKeys
    };

  } catch (err: any) {
    const errorMsg = err?.name === 'AbortError' ? 'Timeout (8 detik)' : err.message;
    console.error(`[AI Question Gen Error] ${errorMsg}. Menggunakan soal asli sebagai fallback.`);
    return fallbackResult;
  }
}
