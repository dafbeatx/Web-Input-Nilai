// Test script for Groq AI Copilot
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GROQ_API_KEY;

const systemPrompt = `Anda adalah GradeMaster Navigator, asisten cerdas virtual untuk GradeMaster OS (Platform Analisis Nilai, Remedial & Kedisiplinan Terpadu).
Tugas utama Anda adalah MEMBANTU USER (Guru / Admin) mendapatkan apa yang mereka inginkan lewat navigasi cepat di platform GradeMaster OS.
Anda adalah seorang Copilot/Navigator asertif, ramah, dan solutif. Anda BUKAN tempat curhat umum atau teman mengobrol kasual. Tugas Anda fokus membantu memecahkan kebutuhan akademik mereka di platform ini.

SISTEM KATEGORI LAYOUT & HALAMAN GRADEMASTER OS:
Berikut adalah pemetaan layer (halaman) di sistem kami yang valid:
- 'home': Beranda / Daftar Kelas. Halaman utama tempat guru memilih kelas dan melihat daftar sesi ujian.
- 'setup': Konfigurasi Sesi Ujian Baru. Membuat sesi ujian baru, mengatur KKM, durasi remedial, dan password remedial.
- 'dashboard': Hasil Analisis Nilai Kelas. Menampilkan daftar nilai kelas terpilh, persentase kelulusan, visualisasi grafik Recharts, CSI/LPS index, dan AI Teacher Insights.
- 'grading': Input Nilai Baru / Lembar Koreksi PG & Esai Siswa.
- 'behavior': Point Perilaku & Kedisiplinan.
- 'remedial_dashboard': Dashboard Remedial Guru.
- 'attendance': Rekap Kehadiran / Presensi Siswa.

ATURAN RESPONS:
1. Pahami peran user saat ini ('teacher') dan currentLayer aktif mereka ('home').
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

const userMsg = "Bagaimana cara membuat sesi ujian baru untuk remedial? Saya ingin memasukkan KKM juga.";

async function run() {
  if (!apiKey) {
    console.error("GROQ_API_KEY is missing from .env.local!");
    return;
  }

  console.log("==================================================");
  console.log("TESTING GROQ NAVIGATOR COPILOT (CHATBOT)");
  console.log("==================================================");
  console.log("Sending query: '" + userMsg + "'");

  const start = Date.now();
  try {
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
          { role: 'user', content: `Pesan User: "${userMsg}"` }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const elapsed = Date.now() - start;

    console.log("\nResponse: Success in " + elapsed + "ms");
    console.log("\nParsed JSON Response:\n");
    
    // Test cleaning logic
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/i, '').replace(/```$/, '').trim();
    }
    
    const parsed = JSON.parse(cleanedContent);
    console.log(JSON.stringify(parsed, null, 2));

  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

run();
