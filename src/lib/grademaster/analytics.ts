import {
  GradedStudent,
  QuestionDifficulty,
  ClassInsight,
  AnalyticsResult,
} from './types';

export function generateAnalytics(
  students: GradedStudent[],
  answerKey: string[]
): AnalyticsResult {
  if (students.length === 0) {
    return emptyAnalytics();
  }

  const scores = students.map(s => s.finalScore);
  const sorted = [...scores].sort((a, b) => a - b);

  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const avgCsi = Math.round(students.reduce((a, s) => a + s.csi, 0) / students.length);
  const avgLps = Math.round(students.reduce((a, s) => a + s.lps, 0) / students.length);
  const median = sorted.length % 2 === 0
    ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : sorted[Math.floor(sorted.length / 2)];
  const highestScore = sorted[sorted.length - 1];
  const lowestScore = sorted[0];

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const standardDeviation = Math.round(Math.sqrt(variance) * 10) / 10;

  const distribution = generateDistribution(scores);
  const questionDifficulties = generateQuestionDifficulties(students, answerKey);
  const ranking = generateRanking(students);
  const insights = generateInsights(students, questionDifficulties, standardDeviation, avgScore);

  const totalCorrect = students.reduce((a, s) => a + s.correct, 0);
  const totalWrong = students.reduce((a, s) => a + s.wrong, 0);

  return {
    avgScore,
    avgCsi,
    avgLps,
    median,
    highestScore,
    lowestScore,
    standardDeviation,
    distribution,
    questionDifficulties,
    ranking,
    insights,
    correctVsWrong: { correct: totalCorrect, wrong: totalWrong },
  };
}

function generateDistribution(scores: number[]): { range: string; count: number }[] {
  const ranges = [
    { range: '0-20', min: 0, max: 20 },
    { range: '21-40', min: 21, max: 40 },
    { range: '41-60', min: 41, max: 60 },
    { range: '61-80', min: 61, max: 80 },
    { range: '81-100', min: 81, max: 100 },
  ];

  return ranges.map(r => ({
    range: r.range,
    count: scores.filter(s => s >= r.min && s <= r.max).length,
  }));
}

function generateQuestionDifficulties(
  students: GradedStudent[],
  answerKey: string[]
): QuestionDifficulty[] {
  return answerKey.map((correctAns, idx) => {
    const qNum = idx + 1;
    let totalAnswered = 0;
    let totalCorrect = 0;

    for (const student of students) {
      const ans = student.answers[qNum];
      if (ans) {
        totalAnswered++;
        if (ans === correctAns) totalCorrect++;
      }
    }

    const totalWrong = totalAnswered - totalCorrect;
    const difficultyPercent = totalAnswered > 0
      ? Math.round((totalWrong / totalAnswered) * 100)
      : 0;

    let label: QuestionDifficulty['label'] = 'Sedang';
    if (difficultyPercent >= 75) label = 'Sangat Sulit';
    else if (difficultyPercent >= 50) label = 'Sulit';
    else if (difficultyPercent <= 15) label = 'Mudah';

    return {
      questionNumber: qNum,
      correctAnswer: correctAns,
      totalAnswered,
      totalCorrect,
      totalWrong,
      difficultyPercent,
      label,
    };
  });
}

function generateRanking(students: GradedStudent[]): AnalyticsResult['ranking'] {
  return [...students]
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((s, idx) => ({
      rank: idx + 1,
      name: s.name,
      finalScore: s.finalScore,
      csi: s.csi,
    }));
}

function generateInsights(
  students: GradedStudent[],
  difficulties: QuestionDifficulty[],
  stdDev: number,
  avgScore: number
): ClassInsight[] {
  const insights: ClassInsight[] = [];

  // Easiest questions
  const easiest = difficulties.filter(d => d.label === 'Mudah');
  if (easiest.length > 0) {
    const nums = easiest.map(e => `#${e.questionNumber}`).join(', ');
    insights.push({
      type: 'warning',
      title: 'Soal Terlalu Mudah',
      description: `Soal ${nums} dijawab benar oleh hampir seluruh siswa. Pertimbangkan menaikkan tingkat kesulitan.`,
    });
  }

  // Hardest questions
  const hardest = difficulties.filter(d => d.label === 'Sangat Sulit');
  if (hardest.length > 0) {
    const nums = hardest.map(h => `#${h.questionNumber}`).join(', ');
    insights.push({
      type: 'warning',
      title: 'Soal Sangat Sulit',
      description: `Soal ${nums} salah dijawab oleh mayoritas siswa. Evaluasi ulang kualitas soal atau materi pengajaran.`,
    });
  }

  // Anomaly detection — scores too uniform
  if (students.length >= 3 && stdDev < 5) {
    insights.push({
      type: 'warning',
      title: 'Anomali: Nilai Terlalu Seragam',
      description: `Standar deviasi hanya ${stdDev}. Nilai siswa sangat mirip — kemungkinan soal terlalu mudah atau ada indikasi ketidakwajaran.`,
    });
  }

  // Class performance summary
  if (avgScore >= 80) {
    insights.push({
      type: 'success',
      title: 'Performa Kelas Baik',
      description: `Rata-rata kelas ${avgScore} menunjukkan pemahaman materi yang solid.`,
    });
  } else if (avgScore < 60) {
    insights.push({
      type: 'warning',
      title: 'Performa Kelas Rendah',
      description: `Rata-rata kelas hanya ${avgScore}. Pertimbangkan remedial atau penyesuaian metode pengajaran.`,
    });
  } else {
    insights.push({
      type: 'info',
      title: 'Performa Kelas Cukup',
      description: `Rata-rata kelas ${avgScore}. Ada ruang perbaikan untuk meningkatkan pemahaman siswa.`,
    });
  }

  return insights;
}

function emptyAnalytics(): AnalyticsResult {
  return {
    avgScore: 0,
    avgCsi: 0,
    avgLps: 0,
    median: 0,
    highestScore: 0,
    lowestScore: 0,
    standardDeviation: 0,
    distribution: [],
    questionDifficulties: [],
    ranking: [],
    insights: [],
    correctVsWrong: { correct: 0, wrong: 0 },
  };
}
