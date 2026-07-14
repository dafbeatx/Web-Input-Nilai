/**
 * AI Proctoring Analyzer Service
 * 
 * Menganalisis snapshot kamera siswa menggunakan Groq Vision API (Llama 4 Scout)
 * untuk mendeteksi keberadaan orang lain, gestur mencurigakan, dan objek terlarang.
 */

export interface ProctoringAnalysis {
  threat_level: 'safe' | 'warning' | 'critical';
  persons_detected: number;
  findings: string[];
  suspicious_objects: string[];
  confidence: number;
}

const FALLBACK_SAFE: ProctoringAnalysis = {
  threat_level: 'safe',
  persons_detected: 1,
  findings: [],
  suspicious_objects: [],
  confidence: 0,
};

const SYSTEM_PROMPT = `Anda adalah Sistem Pengawas Ujian berbasis AI (AI Exam Proctoring System) untuk institusi pendidikan Indonesia.

TUGAS:
Analisis gambar dari kamera webcam siswa yang sedang mengerjakan ujian remedial secara online. Tentukan apakah ada pelanggaran atau aktivitas mencurigakan.

HAL YANG HARUS DIDETEKSI:
1. JUMLAH ORANG — Hitung berapa orang yang terlihat di frame. Ujian harus dikerjakan sendiri (1 orang).
2. OBJEK TERLARANG — Deteksi: ponsel/HP, buku catatan, kertas contekan, earpiece/earbuds, layar monitor/tablet tambahan.
3. GESTUR MENCURIGAKAN — Menoleh berulang ke samping, membaca sesuatu di luar layar, berbisik, menutupi mulut, gerakan mata tidak wajar ke arah tertentu secara berulang.
4. ANOMALI LINGKUNGAN — Orang lain di belakang/samping yang membisikkan jawaban, cermin yang memantulkan layar lain, catatan ditempel di dinding.

KLASIFIKASI THREAT LEVEL:
- "safe": Hanya 1 orang terlihat, tidak ada objek terlarang, posisi normal menghadap kamera/layar.
- "warning": Ada indikasi ringan (gestur menoleh, posisi agak menyamping, objek ambigu di sekitar).
- "critical": Jelas terdeteksi orang tambahan, HP/buku contekan terlihat, atau seseorang membisikkan jawaban.

OUTPUT FORMAT (JSON MURNI, tanpa markdown/teks tambahan):
{
  "threat_level": "safe" | "warning" | "critical",
  "persons_detected": <jumlah_orang_integer>,
  "findings": ["deskripsi temuan 1", "deskripsi temuan 2"],
  "suspicious_objects": ["phone", "book", "earpiece", "notes", "extra_screen"],
  "confidence": <0.0_sampai_1.0>
}

ATURAN:
- Jika gambar terlalu gelap/blur untuk dianalisis, kembalikan threat_level "safe" dengan confidence 0.1.
- Jika hanya terlihat 1 orang dan tidak ada yang mencurigakan, kembalikan threat_level "safe".
- Berikan findings dalam Bahasa Indonesia yang ringkas.
- JANGAN berikan teks di luar JSON.`;

/**
 * Menganalisis snapshot kamera siswa menggunakan Groq Vision API.
 * 
 * @param imageBase64 - Base64-encoded JPEG dari webcam siswa (termasuk prefix data:image/...)
 * @returns ProctoringAnalysis - Hasil analisis terstruktur
 */
export async function analyzeSnapshot(imageBase64: string): Promise<ProctoringAnalysis> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn('[AI Proctoring] GROQ_API_KEY not configured. Skipping analysis.');
    return FALLBACK_SAFE;
  }

  if (!imageBase64 || imageBase64.length < 100) {
    console.warn('[AI Proctoring] Invalid or empty image data. Skipping analysis.');
    return FALLBACK_SAFE;
  }

  try {
    // Ensure proper base64 URL format for Groq Vision
    let imageUrl = imageBase64;
    if (!imageUrl.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${imageUrl}`;
    }

    // 8-second timeout to prevent blocking
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
              {
                type: 'text',
                text: 'Analisis gambar proctoring ujian ini. Berikan output JSON.',
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Groq Vision API HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Groq Vision response content is empty');
    }

    const parsed = JSON.parse(content) as ProctoringAnalysis;

    // Validate and sanitize
    const validThreatLevels = ['safe', 'warning', 'critical'];
    if (!validThreatLevels.includes(parsed.threat_level)) {
      parsed.threat_level = 'safe';
    }

    const result: ProctoringAnalysis = {
      threat_level: parsed.threat_level,
      persons_detected: typeof parsed.persons_detected === 'number' ? parsed.persons_detected : 1,
      findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 5) : [],
      suspicious_objects: Array.isArray(parsed.suspicious_objects) ? parsed.suspicious_objects.slice(0, 10) : [],
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    };

    console.log(`[AI Proctoring] Analysis complete: ${result.threat_level} (confidence: ${result.confidence}, persons: ${result.persons_detected})`);
    return result;
  } catch (err: any) {
    const errorMsg = err?.name === 'AbortError' ? 'Timeout (8s)' : err.message;
    console.error(`[AI Proctoring Error] ${errorMsg}`);
    return FALLBACK_SAFE;
  }
}
