import { ScoringConfig, StudentResult, DEFAULT_SCORING_CONFIG } from './types';

export function calculateStudentResult(
  answerKey: string[],
  studentAnswers: Record<number, string>,
  essayScores: number[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): StudentResult {
  const totalQuestions = answerKey.length;

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  for (let i = 0; i < totalQuestions; i++) {
    const qNum = i + 1;
    const studentAns = studentAnswers[qNum];
    const correctAns = answerKey[i];

    if (!studentAns) {
      unanswered++;
    } else if (studentAns === correctAns) {
      correct++;
    } else {
      wrong++;
    }
  }

  // PG Score (0-100)
  const pgScore = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

  // Essay Score (0-100 normalized)
  const totalEssayRaw = essayScores.reduce((a, b) => a + b, 0);
  const essayScore = config.essayMaxScore > 0
    ? (totalEssayRaw / config.essayMaxScore) * 100
    : 0;

  // Final Score = weighted combination
  const finalScore = Math.round(
    (pgScore * config.pgWeight) + (essayScore * config.essayWeight)
  );

  const percentage = finalScore;

  // CSI — Cognitive Skill Index
  // Based on accuracy and answer completeness
  const completeness = totalQuestions > 0 ? ((correct + wrong) / totalQuestions) * 100 : 0;
  const accuracy = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
  const csi = Math.round((accuracy * 0.7) + (completeness * 0.3));

  // LPS — Learning Performance Score
  // Composite of PG performance and Essay performance
  const lps = Math.round((pgScore * 0.6) + (essayScore * 0.4));

  return {
    correct,
    wrong,
    unanswered,
    score: pgScore,
    essayScore,
    finalScore,
    percentage,
    csi,
    lps,
  };
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Sangat Baik';
  if (score >= 80) return 'Baik';
  if (score >= 70) return 'Cukup';
  if (score >= 60) return 'Kurang';
  return 'Sangat Kurang';
}

export function getCsiLabel(csi: number): string {
  if (csi >= 85) return 'Mahir';
  if (csi >= 70) return 'Cakap';
  if (csi >= 55) return 'Berkembang';
  return 'Perlu Bimbingan';
}

export function getLpsLabel(lps: number): string {
  if (lps >= 85) return 'Di Atas Rata-rata';
  if (lps >= 70) return 'Rata-rata';
  if (lps >= 55) return 'Di Bawah Rata-rata';
  return 'Perlu Perhatian';
}
