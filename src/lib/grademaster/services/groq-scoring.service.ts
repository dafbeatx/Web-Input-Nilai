import { calculateHybridEssayScore } from './essay-scoring.service';

export interface GroqEssayDetail {
  similarity: number;
  score: number;
}

export interface GroqEssayResult {
  score: number;
  details: GroqEssayDetail[];
}

/**
 * Grades student essay answers using Groq API with Llama-3.3-70b.
 * Falls back to the local hybrid string-similarity algorithm if Groq fails.
 */
export async function gradeEssayWithGroq(
  studentAnswers: string[],
  answerKeys: string[],
  questions: string[]
): Promise<GroqEssayResult> {
  const apiKey = process.env.GROQ_API_KEY;

  // Fallback immediately if API Key is not configured
  if (!apiKey) {
    console.warn('[Groq AI Grading] API Key is not configured. Falling back to local similarity engine.');
    return localFallback(studentAnswers, answerKeys);
  }

  // Ensure arrays match in length
  if (!answerKeys || answerKeys.length === 0) {
    return { score: 0, details: [] };
  }

  try {
    // Construct instructions and data payload
    const evalData = questions.map((q, idx) => ({
      index: idx,
      question: q || `Pertanyaan ${idx + 1}`,
      key: answerKeys[idx] || '',
      studentAnswer: studentAnswers[idx] || ''
    }));

    const systemPrompt = `Anda adalah Asisten Guru Kecerdasan Buatan (AI Teacher Assistant) profesional untuk kurikulum pendidikan di Indonesia.
Tugas Anda adalah menilai jawaban essay siswa berdasarkan pertanyaan dan kunci jawaban guru.

PANDUAN PENILAIAN:
1. Berikan nilai objektif namun fleksibel dari skala 0 sampai 100 untuk setiap soal.
2. Pahami konsep jawaban secara semantik (makna/konteks). Jika jawaban siswa memiliki arti atau maksud yang sama dengan kunci jawaban meskipun tata bahasanya berbeda atau menggunakan sinonim, berikan nilai tinggi (80-100).
3. Jika jawaban siswa tidak lengkap atau kurang mendalam namun mengarah ke konsep yang benar, berikan nilai sebagian (40-70).
4. Jika jawaban kosong, berupa teks sampah/asal, atau sepenuhnya salah, berikan nilai 0.
5. Hitung tingkat kemiripan semantik (similarity) antara jawaban siswa dengan kunci jawaban dalam rentang desimal 0.0 sampai 1.0.

PANDUAN OUTPUT:
Anda harus merespons dalam format JSON murni dengan struktur berikut:
{
  "score": <rata-rata_nilai_bulat_0_100>,
  "details": [
    {
      "similarity": <desimal_kemiripan_0_0_sampai_1_0>,
      "score": <nilai_soal_ini_0_100>
    }
  ]
}

JANGAN berikan teks pengantar, penutup, markdown, atau penjelasan tambahan di luar JSON.`;

    const userPrompt = `Nilai lembar jawaban berikut:\n\n${JSON.stringify(evalData, null, 2)}`;

    // Call Groq Chat Completions API with 6-second timeout to prevent blocking student submission
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      throw new Error('Groq API response content is empty');
    }

    const parsedResult = JSON.parse(content) as GroqEssayResult;

    // Validate structure of parsed output
    if (typeof parsedResult.score !== 'number' || !Array.isArray(parsedResult.details)) {
      throw new Error('Parsed result structure is invalid');
    }

    console.log(`[Groq AI Grading] Successfully evaluated ${parsedResult.details.length} questions. Avg Score: ${parsedResult.score}`);
    return {
      score: Math.round(parsedResult.score),
      details: parsedResult.details.map((d, idx) => ({
        similarity: typeof d.similarity === 'number' ? d.similarity : 0,
        score: typeof d.score === 'number' ? Math.round(d.score) : 0
      }))
    };

  } catch (err: any) {
    const errorMsg = err?.name === 'AbortError' ? 'Timeout (6 detik terlampaui)' : err.message;
    console.error(`[Groq AI Grading Error] ${errorMsg}. Falling back to local similarity engine.`);
    return localFallback(studentAnswers, answerKeys);
  }
}

function localFallback(studentAnswers: string[], answerKeys: string[]): GroqEssayResult {
  const localResult = calculateHybridEssayScore(studentAnswers, answerKeys);
  return {
    score: localResult.score,
    details: localResult.details.map(d => ({
      similarity: d.diceScore / 100,
      score: d.weightedScore
    }))
  };
}
