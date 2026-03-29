const STORAGE_KEY = 'gm_remedial_session';

export interface RemedialSession {
  sessionId: string;
  studentName: string;
  studentId?: string;
  attemptId?: string;
  attemptToken?: string;
  step: string;
  startedAt: number;
  answers: string[];
  note: string;
  location?: string;
  subject?: string;
  className?: string;
  refreshCount: number;
  shuffledIndices?: number[];
  remedialQuestions?: string[];
  remedialTimer?: number;
  examMode?: 'STRICT' | 'LIMITED';
  cameraStatus?: 'ACTIVE' | 'FAILED';
  extendedTime?: number;
  lastUpdated?: number;
  kkm?: number;
  academicYear?: string;
  examType?: string;
}

export function saveRemedialSession(data: RemedialSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadRemedialSession(): RemedialSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RemedialSession;
  } catch {
    return null;
  }
}

export function clearRemedialSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
