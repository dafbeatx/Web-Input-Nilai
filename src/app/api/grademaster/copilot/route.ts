export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/grademaster/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limit: Max 15 requests per minute per IP for Copilot to protect limits
    if (!checkRateLimit(`ai-copilot:${ip}`)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit sebelum mengirim pesan lagi.' },
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
    if (!body || !body.message) {
      return NextResponse.json(
        { error: 'Pesan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const { message, history = [], role = 'guest', currentLayer = 'home', studentClass = '', subject = '' } = body;

    // Build role label for system clarity
    const roleMap: Record<string, string> = {
      teacher: 'Guru / Admin',
      student: 'Siswa',
      parent: 'Orang Tua / Wali Siswa',
      guest: 'Tamu Umum'
    };

    const friendlyRoleName = roleMap[role] || 'Tamu';

    const systemPrompt = `Anda adalah GradeMaster Navigator, asisten cerdas virtual untuk GradeMaster OS (Platform Analisis Nilai, Remedial & Kedisiplinan Terpadu).
Tugas utama Anda adalah MEMBANTU USER (${friendlyRoleName}) mendapatkan apa yang mereka inginkan lewat navigasi cepat di platform GradeMaster OS.
Anda adalah seorang Copilot/Navigator asertif, ramah, dan solutif. Anda BUKAN tempat curhat umum atau teman mengobrol kasual. Tugas Anda fokus membantu memecahkan kebutuhan akademik mereka di platform ini.

SISTEM KATEGORI LAYOUT & HALAMAN GRADEMASTER OS:
Berikut adalah pemetaan layer (halaman) di sistem kami yang valid:
- 'home': Beranda / Daftar Kelas. Halaman utama tempat guru memilih kelas dan melihat daftar sesi ujian.
- 'setup': Konfigurasi Sesi Ujian Baru. Membuat sesi ujian baru, mengatur KKM, durasi remedial, dan password remedial.
- 'dashboard': Hasil Analisis Nilai Kelas. Menampilkan daftar nilai kelas terpilh, persentase kelulusan, visualisasi grafik Recharts, CSI/LPS index, dan AI Teacher Insights.
- 'grading': Input Nilai Baru / Lembar Koreksi PG & Esai Siswa.
- 'behavior': Manajemen Sikap & Kedisiplinan. Input poin perilaku positif/negatif siswa dan rekap skor sikap.
- 'remedial_dashboard': Dashboard Remedial Guru. Memantau telemetri ujian anti-cheat siswa, status pengerjaan, dan menjalankan AI cyber-forensic brain.
- 'attendance': Rekap Kehadiran / Presensi Siswa.
- 'student_accounts': Manajemen Akun Siswa (Data Center). Untuk menambahkan data siswa, membuat password akun siswa, atau export SPSS/Excel/XML.
- 'remedial_management': Manajemen Bank Soal Remedial. Mengelola kumpulan soal-soal remedial.
- 'lesson_management': Manajemen Mata Pelajaran.
- 'student_profile': Profil Akademis & Rapor Pribadi Siswa.
- 'student_login': Halaman masuk/login bagi Siswa dan Orang Tua.
- 'login': Halaman login Admin / Guru.

ATURAN RESPONS:
1. Pahami peran user saat ini ('${role}') dan currentLayer aktif mereka ('${currentLayer}').
2. Analisis kebutuhan user dari pesan mereka. Jika mereka ingin melakukan tindakan atau berpindah halaman, Anda WAJIB memberikan rekomendasi 1-2 aksi navigasi ('suggestedActions') yang tepat dari sistem kami.
3. Jawab dalam Bahasa Indonesia secara asertif, ramah, padat, dan profesional. Teks respon harus berupa Markdown bersih dan tidak bertele-tele (maksimal 3 kalimat).
4. Berikan pula 2-3 pertanyaan lanjutan singkat ('suggestedQuestions') agar mereka bisa langsung berinteraksi dengan mudah.
5. PENTING: Anda harus merespons dalam format STRICT JSON dengan skema berikut:
{
  "reply": "<Teks tanggapan Anda menggunakan Markdown bersih. Arahkan secara singkat.>",
  "suggestedActions": [
    {
      "label": "<Label tombol tindakan, contoh: 'Buka Input Nilai', 'Buka Presensi Kehadiran'>",
      "layer": "<Nama layer tujuan dari daftar pemetaan valid di atas, misal: 'setup', 'attendance', 'behavior', 'remedial_dashboard'>",
      "description": "<Deskripsi singkat fungsi tombol>"
    }
  ],
  "suggestedQuestions": [
    "<Saran pertanyaan lanjutan singkat 1>",
    "<Saran pertanyaan lanjutan singkat 2>"
  ]
}

JANGAN menulis penjelasan tambahan di luar JSON. Respon Anda harus langsung dimulai dengan '{' dan diakhiri dengan '}'.`;

    // Map history to OpenAI format
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((h: any) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      })),
      { 
        role: 'user', 
        content: `User Role: ${friendlyRoleName}\n` +
                 `Halaman Aktif: ${currentLayer}\n` +
                 `Kelas Terpilih: ${studentClass || 'Belum dipilih'}\n` +
                 `Mata Pelajaran: ${subject || 'Belum dipilih'}\n\n` +
                 `Pesan User: "${message}"`
      }
    ];

    // Call Groq API Llama-3.3-70b-versatile
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API HTTP ${response.status}: ${errText}`);
    }

    const resData = await response.json();
    const content = resData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Groq API response content is empty');
    }

    // Robust cleaning for potential markdown wrappers
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/i, '').replace(/```$/, '').trim();
    }

    const parsedResult = JSON.parse(cleanedContent);
    return NextResponse.json(parsedResult);

  } catch (error: any) {
    console.error('[Groq AI Copilot Error]', error);
    
    // Friendly fallback response on server error
    return NextResponse.json({
      reply: "Maaf, sistem navigasi cerdas sedang mengalami gangguan kapasitas saat ini. Ada yang bisa saya bantu secara manual? Anda dapat menggunakan sidebar untuk menuju halaman *Beranda*, *Kehadiran*, *Sikap*, atau *Remedial*.",
      suggestedActions: [
        { label: "Buka Beranda", layer: "home", description: "Kembali ke beranda utama" }
      ],
      suggestedQuestions: [
        "Bagaimana cara menginput nilai?",
        "Di mana letak rekap remedial?"
      ]
    });
  }
}
