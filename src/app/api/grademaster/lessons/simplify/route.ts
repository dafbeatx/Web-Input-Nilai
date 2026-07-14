export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const rawIp = req.headers.get('x-forwarded-for') || 'unknown';
    const ip = rawIp.split(',')[0].trim();

    // Rate limit: Max 20 requests per minute per IP for simplification
    if (!checkRateLimit(`lesson-simplify:${ip}`)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan AI. Silakan tunggu 1 menit.' },
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
    if (!body || !body.content || !body.subject) {
      return NextResponse.json(
        { error: 'Parameter konten (content) dan mata pelajaran (subject) wajib diisi.' },
        { status: 400 }
      );
    }

    const { content, subject } = body;

    const systemPrompt = `Anda adalah Guru Gaul AI & Pakar Edukasi Kreatif untuk tingkat sekolah (SMP/SMA) di Indonesia.
Tugas Anda adalah mengubah materi pelajaran yang membosankan, padat, dan kaku berikut menjadi bahasa yang SANGAT MUDAH DIPAHAMI, santai, interaktif, dan seru bagi siswa!

ATURAN UTAMA PENULISAN:
1. Gunakan gaya bahasa semi-formal, santai, dan penuh semangat (gunakan sapaan hangat seperti "Halo guys!", "Gampangnya gini:", "Nah, tahu nggak?").
2. Gunakan banyak emoji yang relevan secara proporsional untuk menarik perhatian siswa.
3. Gunakan analogi/perumpamaan kreatif sehari-hari (seperti media sosial, game, anime, makanan, atau tren remaja saat ini) agar materi mudah dibayangkan.
4. Struktur materi harus dipecah menjadi beberapa bagian/slide pendek agar tidak melelahkan untuk dibaca.
5. Setiap slide harus berfokus pada SATU konsep penting saja.

Format output WAJIB berupa objek JSON MURNI (tanpa tag markdown \`\`\`json atau pengantar/penutup lainnya) dengan struktur:
{
  "slides": [
    {
      "title": "Judul Konsep Singkat & Menarik",
      "content": "Penjelasan konsep dengan bahasa santai, berpoin-poin (bullet points), mudah dipahami, singkat, dan tidak bertele-tele.",
      "analogy": "Analogi kreatif sehari-hari untuk konsep ini (opsional, jika relevan)"
    }
  ]
}

Pastikan isi materi tetap akurat secara ilmiah tetapi dikemas dengan cara yang sangat menarik bagi siswa.`;

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
          {
            role: 'user',
            content: `Mata Pelajaran: ${subject}\n\nMateri Pelajaran:\n${content}`
          }
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Groq API returned HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const resultText = data?.choices?.[0]?.message?.content;
    if (!resultText) {
      throw new Error('Respons Groq kosong.');
    }

    let parsedResponse: any = null;
    try {
      let cleanedContent = resultText.trim();
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/i, '').replace(/```$/, '').trim();
      }
      parsedResponse = JSON.parse(cleanedContent);
    } catch (e: any) {
      console.error('[Lesson Simplifier JSON Parsing Error]:', e);
      throw new Error(`Format respons AI tidak valid JSON: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      slides: parsedResponse.slides || []
    });

  } catch (err: any) {
    console.error('[AI Lesson Simplifier Error]:', err.message);
    return NextResponse.json(
      { error: 'Gagal menyederhanakan materi pelajaran.', detail: err.message },
      { status: 500 }
    );
  }
}
