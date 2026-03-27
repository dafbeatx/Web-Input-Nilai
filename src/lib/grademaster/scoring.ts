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

import stringSimilarity from 'string-similarity';

export interface EssayScoreResult {
  score: number;
  details: { similarity: number; score: number }[];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarityToScore(similarity: number): number {
  if (similarity >= 0.85) return 100;
  if (similarity >= 0.70) return 80;
  if (similarity >= 0.50) return 60;
  return 30;
}

export function calculateEssayScore(
  studentAnswers: string[],
  answerKeys: string[]
): EssayScoreResult {
  if (!answerKeys || answerKeys.length === 0) {
    return { score: 0, details: [] };
  }

  const details: { similarity: number; score: number }[] = [];

  for (let i = 0; i < answerKeys.length; i++) {
    const studentAns = studentAnswers[i] || '';
    const key = answerKeys[i] || '';

    if (!studentAns.trim()) {
      details.push({ similarity: 0, score: 0 });
      continue;
    }

    const normalizedStudent = normalizeText(studentAns);
    const normalizedKey = normalizeText(key);

    if (!normalizedKey) {
      details.push({ similarity: 0, score: 0 });
      continue;
    }

    const similarity = stringSimilarity.compareTwoStrings(normalizedStudent, normalizedKey);
    const score = similarityToScore(similarity);
    details.push({ similarity: Math.round(similarity * 100) / 100, score });
  }

  const totalScore = details.length > 0
    ? Math.round(details.reduce((sum, d) => sum + d.score, 0) / details.length)
    : 0;

  return { score: totalScore, details };
}

