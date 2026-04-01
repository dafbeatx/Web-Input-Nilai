export interface ScoringConfig {
  pgWeight: number;
  essayWeight: number;
  essayMaxScore: number;
  essayCount: number;
  remedialQuestions?: string[];
  remedialAnswerKeys?: string[];
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
  remedialStatus?: 'NONE' | 'INITIATED' | 'ACTIVE' | 'FAILED' | 'COMPLETED' | 'CHEATED' | 'TIMEOUT' | 'REMEDIAL' | 'SUBMITTED' | 'TIME_UP' | 'FAILED_EFFORT' | 'IN_PROGRESS';
  remedialLocation?: string;
  remedialPhoto?: string;
  remedialAnswers?: string[];
  remedialEssayScores?: number[];
  remedialNote?: string;
  originalScore?: number;
  remedialScore?: number;
  finalScoreLocked?: number;
  isCheated?: boolean;
  teacherReviewed?: boolean;
  cheatingFlags?: string[];
  remedialAttempts?: number;
  essayScoreAuto?: number;
  essayScoreManual?: number;
  essayScoreFinal?: number;
  essayAutoDetails?: { similarity: number; score: number }[];
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
  semester: string;
  isPublic: boolean;
  isDemo?: boolean;
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
  semester?: string;
  kkm: number;
  remedial_essay_count: number;
  remedial_timer?: number;
  updated_at: string;
  student_count?: number;
  is_public: boolean;
  is_demo?: boolean;
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
  ranking: { rank: number; name: string; finalScore: number; csi: number; remedialStatus?: string }[];
  insights: ClassInsight[];
  correctVsWrong: { correct: number; wrong: number };
}

export interface StudentAccount {
  id: string;
  name: string;
  class_name: string;
  academic_year: string;
  username: string;
  password_hash?: string;
  password_plain?: string | null;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamsLog {
  id: string;
  session_id: string;
  student_id: string;
  event_type: string;
  severity: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type ModalType = 'save' | 'load' | 'delete' | 'about' | 'error' | 'adminSettings' | null;
export type ToastType = { message: string; type: 'success' | 'error' } | null;
export type Layer = 'home' | 'setup' | 'dashboard' | 'grading' | 'login' | 'remedial' | 'behavior' | 'remedial_dashboard' | 'attendance' | 'student_accounts' | 'student_login';
