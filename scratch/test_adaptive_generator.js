const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GROQ_API_KEY;

const subject = "Informatika";
const examType = "UTS";
const academicYear = "2025/2026";
const schoolLevel = "SMA";
const questionCount = 5;

// Mock question difficulty stats from the database
const difficulties = [
  { questionNumber: 2, correctAnswer: "B", difficultyPercent: 90, totalAnswered: 20, totalWrong: 18 },
  { questionNumber: 5, correctAnswer: "D", difficultyPercent: 80, totalAnswered: 20, totalWrong: 16 },
  { questionNumber: 3, correctAnswer: "A", difficultyPercent: 65, totalAnswered: 20, totalWrong: 13 }
];

// Mock original exam question snippet provided by the teacher
const originalQuestionsText = `
1. Apa kegunaan utama dari kabel UTP?
2. Manakah di bawah ini yang merupakan topologi jaringan bintang (star topology)?
A. Setiap komputer terhubung ke cincin tunggal
B. Setiap komputer terhubung ke hub/switch sentral
C. Kabel tunggal dengan terminator di kedua ujungnya
D. Koneksi point-to-point antar semua komputer
3. Jelaskan cara kerja DNS server dalam memetakan alamat domain.
4. Apa kepanjangan dari IP?
5. Jenis protokol apa yang digunakan untuk transfer file secara aman di jaringan?
A. HTTP
B. FTP
C. SMTP
D. SFTP
`;

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
${JSON.stringify(difficulties, null, 2)}

Teks Soal Ujian Asli / Kisi-kisi (Opsional):
${originalQuestionsText}`;

async function run() {
  if (!apiKey) {
    console.error("GROQ_API_KEY is missing from .env.local!");
    return;
  }

  console.log("=========================================");
  console.log("TESTING AI ADAPTIVE REMEDIAL GENERATION");
  console.log("=========================================");
  console.log("Calling Groq Llama-3.3-70b-versatile...");

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
          { role: 'user', content: userPrompt }
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

    console.log("\nResponse Status: OK");
    console.log(`Time taken: ${elapsed}ms`);
    console.log("\nAI Generated Remedial Output JSON:\n");
    console.log(JSON.stringify(JSON.parse(content), null, 2));

  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

run();
