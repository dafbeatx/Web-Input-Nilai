import { supabase } from '@/lib/supabase/client';

export interface SimilarityReport {
  studentAId: string;
  studentBId: string;
  studentAName: string;
  studentBName: string;
  pgSimilarity: number;
  essaySimilarity: number;
  finalScore: number;
  riskLevel: 'HIGH_RISK' | 'SUSPECT' | 'SAFE';
}

interface StudentData {
  id: string;
  name: string;
  mcq_answers: Record<string, string>;
  essay_scores: number[];
}

/**
 * Membandingkan jawaban PG dan nilai Essay antara dua siswa
 * Abaikan jawaban kosong pada PG saat membagi total soal valid.
 */
export function calculateSimilarity(studentA: StudentData, studentB: StudentData): SimilarityReport {
  // 1. Hitung PG Similarity
  const keysA = Object.keys(studentA.mcq_answers);
  const keysB = Object.keys(studentB.mcq_answers);
  
  // Ambil semua nomor soal yang diisi oleh setidaknya satu siswa
  const allQuestionNumbers = Array.from(new Set([...keysA, ...keysB]));
  
  let validPgMatches = 0;
  let validPgQuestions = 0;

  for (const qNum of allQuestionNumbers) {
    const ansA = studentA.mcq_answers[qNum];
    const ansB = studentB.mcq_answers[qNum];
    
    // Abaikan jika ada yang kosong (supaya tidak dihitung sebagai kesamaan 'kosong')
    if (ansA && ansB) {
      validPgQuestions++;
      if (ansA === ansB) {
        validPgMatches++;
      }
    }
  }

  // Filter 1: Abaikan jika total soal PG yang sama-sama diisi < 15
  let pgSimilarity = 0;
  if (validPgQuestions >= 15) {
    pgSimilarity = validPgMatches / validPgQuestions;
  }

  // 2. Hitung Essay Similarity
  // essay_scores berupa array of number [4, 2, 0, 3]
  let validEssayMatches = 0;
  let validEssayQuestions = 0;

  const maxLen = Math.max(studentA.essay_scores.length, studentB.essay_scores.length);
  for (let i = 0; i < maxLen; i++) {
    const scoreA = studentA.essay_scores[i];
    const scoreB = studentB.essay_scores[i];
    
    // Anggap nilai 0 adalah valid (mungkin memang salah mutlak)
    // Valid jika array punya nilai di indeks i
    if (scoreA !== undefined && scoreB !== undefined) {
      validEssayQuestions++;
      if (scoreA === scoreB) {
        validEssayMatches++;
      }
    }
  }

  // Filter 2: Abaikan jika soal essay < 2
  let essaySimilarity = 0;
  if (validEssayQuestions >= 2) {
    essaySimilarity = validEssayMatches / validEssayQuestions;
  }

  // 3. Hitung final score
  const finalScore = (pgSimilarity * 0.8) + (essaySimilarity * 0.2);

  // 4. Tentukan risk_level
  let riskLevel: 'HIGH_RISK' | 'SUSPECT' | 'SAFE' = 'SAFE';

  if (pgSimilarity >= 0.70 && finalScore >= 0.75) {
    riskLevel = 'HIGH_RISK';
  } else if (finalScore >= 0.50) {
    riskLevel = 'SUSPECT';
  }

  return {
    studentAId: studentA.id,
    studentBId: studentB.id,
    studentAName: studentA.name,
    studentBName: studentB.name,
    pgSimilarity,
    essaySimilarity,
    finalScore,
    riskLevel
  };
}

/**
 * Fungsi untuk menganalisis dan menyimpan kemiripan jawaban antar seluruh siswa dalam satu sesi
 */
export async function analyzeSessionSimilarity(sessionId: string): Promise<SimilarityReport[]> {
  // Fetch semua student di session
  const { data: students, error } = await supabase
    .from('gm_students')
    .select('id, name, mcq_answers, essay_scores')
    .eq('session_id', sessionId)
    .eq('is_deleted', false);

  if (error || !students) {
    console.error('Failed to fetch students for similarity analysis', error);
    return [];
  }

  const reports: SimilarityReport[] = [];

  // O(N^2) pairing
  const len = students.length;
  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      const studentA = students[i];
      const studentB = students[j];
      
      const similarity = calculateSimilarity(studentA, studentB);
      
      // Hanya proses yang mencurigakan (mengurangi beban DB)
      if (similarity.riskLevel !== 'SAFE') {
        reports.push(similarity);
      }
    }
  }

  if (reports.length > 0) {
    // Upsert ke database
    const rowsToInsert = reports.map(r => ({
      session_id: sessionId,
      student_a_id: r.studentAId,
      student_b_id: r.studentBId,
      student_a_name: r.studentAName,
      student_b_name: r.studentBName,
      pg_similarity: parseFloat(r.pgSimilarity.toFixed(4)),
      essay_similarity: parseFloat(r.essaySimilarity.toFixed(4)),
      final_score: parseFloat(r.finalScore.toFixed(4)),
      risk_level: r.riskLevel
    }));

    // Clean old records for this session to avoid stale data
    await supabase.from('gm_similarity_reports').delete().eq('session_id', sessionId);
    
    const { error: insertError } = await supabase
      .from('gm_similarity_reports')
      .insert(rowsToInsert);

    if (insertError) {
      console.error('Failed to save similarity reports', insertError);
    }
  } else {
    // If no reports found, clear any old data
    await supabase.from('gm_similarity_reports').delete().eq('session_id', sessionId);
  }

  // Sort by final score desc
  return reports.sort((a, b) => b.finalScore - a.finalScore);
}
