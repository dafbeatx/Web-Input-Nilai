require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { gradeEssayWithGroq } = require('../src/lib/grademaster/services/groq-scoring.service');

// Set environment variable since we're running in raw node
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const questions = [
  "Apa yang dimaksud dengan jaringan komputer?",
  "Sebutkan tiga jenis sistem operasi komputer yang Anda ketahui."
];

const answerKeys = [
  "Jaringan komputer adalah sistem yang terdiri dari dua atau lebih komputer yang saling terhubung untuk berbagi data dan sumber daya.",
  "Windows, macOS, dan Linux."
];

const studentAnswers = [
  "sebuah kumpulan PC yang terkoneksi satu sama lain agar bisa mengirim file dan sharing data",
  "windows, linux, dan apple mac"
];

async function run() {
  console.log("=========================================");
  console.log("TEST 1: AI-Powered Essay Grading (Groq)");
  console.log("=========================================");
  console.log("Questions:", questions);
  console.log("Keys:", answerKeys);
  console.log("Student Answers:", studentAnswers);

  const start = Date.now();
  const res1 = await gradeEssayWithGroq(studentAnswers, answerKeys, questions);
  const elapsed = Date.now() - start;

  console.log("\nResults from Groq:", JSON.stringify(res1, null, 2));
  console.log(`Time taken: ${elapsed}ms`);

  console.log("\n=========================================");
  console.log("TEST 2: Local Similarity Engine (Fallback)");
  console.log("=========================================");
  const originalKey = process.env.GROQ_API_KEY;
  
  // Temporarily wipe out key to trigger fallback
  process.env.GROQ_API_KEY = '';
  
  const res2 = await gradeEssayWithGroq(studentAnswers, answerKeys, questions);
  console.log("Results from Local Fallback:", JSON.stringify(res2, null, 2));
  
  // Restore key
  process.env.GROQ_API_KEY = originalKey;
  
  console.log("\nTest Completed!");
}

run();
