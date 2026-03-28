import stringSimilarity from 'string-similarity';

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskLevel = 'CLEAN' | 'WARNING' | 'SUSPICIOUS' | 'AUTO_FLAGGED';

export interface RiskFlag {
  event: string;
  severity: RiskSeverity;
  points: number;
  timestamp: number;
}

export interface RiskAssessment {
  totalScore: number;
  level: RiskLevel;
  flags: RiskFlag[];
  shouldAutoFlag: boolean;
  shouldNotifyTeacher: boolean;
}

// Severity → Points mapping
const SEVERITY_POINTS: Record<RiskSeverity, number> = {
  LOW: 5,
  MEDIUM: 15,
  HIGH: 30,
  CRITICAL: 50,
};

// Event → Severity mapping
const EVENT_SEVERITY: Record<string, RiskSeverity> = {
  'WINDOW_BLUR': 'LOW',
  'BACK_PRESS': 'LOW',
  'COPY_ATTEMPT': 'MEDIUM',
  'PASTE_ATTEMPT': 'MEDIUM',
  'TAB_SWITCH': 'MEDIUM',
  'PRINT_ATTEMPT': 'MEDIUM',
  'NO_FACE': 'HIGH',
  'MULTI_FACE': 'HIGH',
  'FAST_COMPLETION': 'CRITICAL',
  'IDENTICAL_ESSAY': 'CRITICAL',
  'HIGH_ESSAY_SIMILARITY': 'HIGH',
  'REPEATED_TAB_SWITCH': 'HIGH',
  'REPEATED_BACK_PRESS': 'HIGH',
};

function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return 'AUTO_FLAGGED';
  if (score >= 60) return 'SUSPICIOUS';
  if (score >= 30) return 'WARNING';
  return 'CLEAN';
}

export function createRiskFlag(event: string, customPoints?: number): RiskFlag {
  const severity = EVENT_SEVERITY[event] || 'LOW';
  return {
    event,
    severity,
    points: customPoints ?? SEVERITY_POINTS[severity],
    timestamp: Date.now(),
  };
}

export function assessClientRisk(clientFlags: string[]): RiskAssessment {
  const flags: RiskFlag[] = [];

  for (const flagStr of clientFlags) {
    // Map legacy client flag strings to structured risk flags
    let event = 'UNKNOWN';
    if (flagStr.includes('Wajah tidak terdeteksi')) event = 'NO_FACE';
    else if (flagStr.includes('lebih dari satu')) event = 'MULTI_FACE';
    else if (flagStr.includes('Meninggalkan halaman')) event = 'TAB_SWITCH';
    else if (flagStr.includes('tombol kembali')) event = 'BACK_PRESS';
    else if (flagStr.includes('menyalin') || flagStr.includes('copy')) event = 'COPY_ATTEMPT';

    flags.push(createRiskFlag(event));
  }

  const totalScore = flags.reduce((sum, f) => sum + f.points, 0);
  const level = getRiskLevel(totalScore);

  return {
    totalScore,
    level,
    flags,
    shouldAutoFlag: level === 'AUTO_FLAGGED',
    shouldNotifyTeacher: level === 'WARNING' || level === 'SUSPICIOUS' || level === 'AUTO_FLAGGED',
  };
}

export function assessServerRisk(
  studentAnswers: string[],
  allStudentsAnswers: { id: string; name: string; remedialAnswers: string[] }[],
  studentId: string,
  submissionTimeMs: number,
  remedialTimerMinutes: number
): RiskAssessment {
  const flags: RiskFlag[] = [];

  // 1. Fast completion check
  const timerMs = remedialTimerMinutes * 60 * 1000;
  if (submissionTimeMs < timerMs / 3) {
    flags.push(createRiskFlag('FAST_COMPLETION'));
  }

  // 2. Cross-student essay similarity
  for (const other of allStudentsAnswers) {
    if (other.id === studentId) continue;
    if (!other.remedialAnswers || other.remedialAnswers.length === 0) continue;

    for (let i = 0; i < studentAnswers.length; i++) {
      const myAns = (studentAnswers[i] || '').trim().toLowerCase();
      const theirAns = (other.remedialAnswers[i] || '').trim().toLowerCase();

      if (!myAns || !theirAns) continue;

      const sim = stringSimilarity.compareTwoStrings(myAns, theirAns);

      if (sim > 0.95) {
        flags.push(createRiskFlag('IDENTICAL_ESSAY', 50));
      } else if (sim > 0.85) {
        flags.push(createRiskFlag('HIGH_ESSAY_SIMILARITY', 30));
      }
    }
  }

  const totalScore = flags.reduce((sum, f) => sum + f.points, 0);
  const level = getRiskLevel(totalScore);

  return {
    totalScore,
    level,
    flags,
    shouldAutoFlag: level === 'AUTO_FLAGGED',
    shouldNotifyTeacher: level !== 'CLEAN',
  };
}

export function mergeRiskAssessments(client: RiskAssessment, server: RiskAssessment): RiskAssessment {
  const allFlags = [...client.flags, ...server.flags];
  const totalScore = client.totalScore + server.totalScore;
  const level = getRiskLevel(totalScore);

  return {
    totalScore,
    level,
    flags: allFlags,
    shouldAutoFlag: level === 'AUTO_FLAGGED',
    shouldNotifyTeacher: level !== 'CLEAN',
  };
}
