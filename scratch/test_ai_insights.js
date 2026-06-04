const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const apiKey = process.env.GROQ_API_KEY;

const classStats = {
  sessionName: "ASAJ INFORMATIKA KELAS 9B",
  subject: "Informatika",
  class: "9B",
  kkm: 70,
  totalStudents: 5,
  avgScore: 68,
  highestScore: 92,
  lowestScore: 45,
  passRate: 60,
  standardDeviation: 12.4
};

const difficulties = [
  { questionNumber: 1, wrongAnswerPercent: 20, label: "Mudah" },
  { questionNumber: 2, wrongAnswerPercent: 80, label: "Sangat Sulit" },
  { questionNumber: 3, wrongAnswerPercent: 50, label: "Sulit" }
];

const studentList = [
  { name: "Juliana Pratama", score: 92, csi: 85, lps: 82, passed: true },
  { name: "Andini Putri", score: 78, csi: 75, lps: 74, passed: true },
  { name: "Dafa Maulana", score: 72, csi: 70, lps: 68, passed: true },
  { name: "M. Galang Pratama", score: 53, csi: 55, lps: 52, passed: false },
  { name: "Junaedi Efendi", score: 45, csi: 48, lps: 46, passed: false }
];

const systemPrompt = `Anda adalah Analis Pendidikan & Pakar Pedagogi Kurikulum Merdeka di Indonesia.
Tugas Anda adalah menganalisis data performa kelas hasil ujian untuk memberikan evaluasi akademis yang mendalam bagi Guru.

PANDUAN EVALUASI:
1. Analisis statistik utama kelas (rata-rata nilai, ketuntasan KKM, deviasi standar).
2. Temukan materi/soal yang paling bermasalah (persentase salah tertinggi) dan soal yang paling dikuasai.
3. Berikan kesimpulan ringkas, identifikasi kekuatan siswa, area kelemahan yang membutuhkan bimbingan khusus, dan buat rekomendasi aksi pengajaran yang konkret bagi Guru.
4. Gunakan Bahasa Indonesia yang baku, profesional, analitis, namun mudah dipahami guru.

PANDUAN OUTPUT:
Tanggapan Anda harus berupa objek JSON murni (strict JSON) dengan format persis seperti ini:
{
  "summary": "<Kesimpulan ringkas analitis performa kelas 2-3 kalimat>",
  "strengths": [
    "<Kekuatan belajar siswa 1>",
    "<Kekuatan belajar siswa 2>"
  ],
  "weaknesses": [
    "<Kelemahan atau area bermasalah kelas 1>",
    "<Kelemahan atau area bermasalah kelas 2>"
  ],
  "recommendations": [
    "<Saran tindakan konkret guru 1>",
    "<Saran tindakan konkret guru 2>",
    "<Saran tindakan konkret guru 3>"
  ]
}

JANGAN menulis penjelasan tambahan di luar JSON. Respon Anda harus langsung dimulai dengan '{' dan diakhiri dengan '}'.`;

const userPrompt = `Berikut adalah data kelas:\n\n` + 
  `Statistik Kelas:\n${JSON.stringify(classStats, null, 2)}\n\n` +
  `Tingkat Kesulitan Soal (Berdasarkan Kegagalan):\n${JSON.stringify(difficulties, null, 2)}\n\n` +
  `Daftar Nilai Siswa:\n${JSON.stringify(studentList, null, 2)}`;

async function run() {
  if (!apiKey) {
    console.error("GROQ_API_KEY is missing from .env.local!");
    return;
  }

  console.log("=========================================");
  console.log("TESTING AI TEACHER INSIGHTS GENERATION");
  console.log("=========================================");
  console.log("Sending mock class data to Groq Llama-3.3-70b-versatile...");

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
        temperature: 0.2,
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
    console.log("\nAI Insights Output JSON:\n");
    console.log(JSON.stringify(JSON.parse(content), null, 2));

  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

run();
