export interface ScoringConfig {
  pgWeight: number;
  essayWeight: number;
  essayMaxScore: number;
  essayCount: number;
  remedialQuestions?: string[];
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  pgWeight: 0.7,
  essayWeight: 0.3,
  essayMaxScore: 20,
  essayCount: 5,
};

export interface StudentResult {
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  essayScore: number;
  finalScore: number;
  percentage: number;
  csi: number;
  lps: number;
}

export interface GradedStudent {
  id: string;
  name: string;
  answers: Record<number, string>;
  essayScores: number[];
  correct: number;
  wrong: number;
  mcqScore: number;
  essayScore: number;
  finalScore: number;
  percentage: number;
  csi: number;
  lps: number;
  remedialStatus?: 'NONE' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CHEATED' | 'TIMEOUT';
  remedialLocation?: string;
}

export interface SessionData {
  id?: string;
  sessionName: string;
  teacher: string;
  subject: string;
  className: string;
  schoolLevel: string;
  answerKey: string[];
  studentList: string[];
  gradedStudents: GradedStudent[];
  scoringConfig: ScoringConfig;
  kkm: number;
  remedialEssayCount: number;
  remedialTimer: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionMeta {
  id: string;
  session_name: string;
  teacher: string;
  subject: string;
  class_name: string;
  school_level: string;
  exam_type?: string;
  academic_year?: string;
  kkm: number;
  remedial_essay_count: number;
  remedial_timer?: number;
  updated_at: string;
  student_count?: number;
}

export interface QuestionDifficulty {
  questionNumber: number;
  correctAnswer: string;
  totalAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  difficultyPercent: number;
  label: 'Mudah' | 'Sedang' | 'Sulit' | 'Sangat Sulit';
}

export interface ClassInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
}

export interface AnalyticsResult {
  avgScore: number;
  avgCsi: number;
  avgLps: number;
  median: number;
  highestScore: number;
  lowestScore: number;
  standardDeviation: number;
  distribution: { range: string; count: number }[];
  questionDifficulties: QuestionDifficulty[];
  ranking: { rank: number; name: string; finalScore: number; csi: number }[];
  insights: ClassInsight[];
  correctVsWrong: { correct: number; wrong: number };
}

export type ModalType = 'save' | 'load' | 'delete' | 'about' | 'error' | 'adminSettings' | null;
export type ToastType = { message: string; type: 'success' | 'error' } | null;
export type Layer = 'home' | 'setup' | 'dashboard' | 'grading' | 'login' | 'remedial' | 'behavior';
