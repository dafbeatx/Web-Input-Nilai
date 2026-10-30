"use client";

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { 
  Clock, RotateCcw, X, Save, User, CheckSquare, FileText, Sliders, Sparkles, AlertCircle, HelpCircle,
  Shield, ShieldCheck, Activity, Terminal, ChevronDown, ChevronUp, Cpu, Eye, Monitor, Copy,
  AlertTriangle, Ban, Undo2, ArrowLeft, Search
} from 'lucide-react';
import { GradedStudent, ScoringConfig, SessionMeta, RemedialMcqQuestion, isImageUrl } from '@/lib/grademaster/types';
import { parseRemedialMcq, formatRemedialMcq } from '@/lib/grademaster/parser';
import { useGradeMaster } from '@/context/GradeMasterContext';

interface ForensicEvent {
  time: string;
  action: string;
  risk_points: number;
  description: string;
}

interface ThreatVectorDetail {
  name: string;
  score: number;
  status: 'AMAN' | 'WASPADA' | 'KRITIS';
  summary: string;
}

interface TelemetryMetrics {
  total_events: number;
  tab_switches: number;
  reloads: number;
  copy_pastes: number;
  vision_violations: number;
  duration_minutes: number;
  allocated_minutes: number;
  speed_ratio: number;
}

interface RawTelemetryEvent {
  time: string;
  event: string;
  severity: string;
  details?: string;
}

interface AIForensicRecord {
  risk_level?: string;
  risk_score?: number;
  ai_verdict?: string;
  threat_vector_summary?: string;
  forensic_timeline?: ForensicEvent[];
  is_ai_analysis?: boolean;
  engine_model?: string;
  mitigation_actions?: string[];
  threat_vectors?: ThreatVectorDetail[];
  telemetry_metrics?: TelemetryMetrics;
  raw_events?: RawTelemetryEvent[];
}

interface RemedialDashboardLayerProps {
  gradedStudents: GradedStudent[];
  kkm: number;
  scoringConfig: ScoringConfig;
  examType?: string;
  academicYear?: string;
  studentClass?: string;
  subject?: string;
  schoolLevel?: string;
  semester?: string;
  onBack: () => void;
  onUpdateRemedial?: (
    questions: string[],
    keys: string[],
    timer: number,
    deadline?: string,
    mcqs?: RemedialMcqQuestion[],
    mcqQuota?: number,
    pgWeight?: number,
    essayWeight?: number
  ) => void;
  remedialQuestionsInput?: string;
  onRemedialInputChange?: (v: string) => void;
  remedialAnswerKeysInput?: string;
  onAnswerKeysInputChange?: (v: string) => void;
  remedialTimer?: number;
  isSaving?: boolean;
  sessions?: SessionMeta[];
  activeSessionId?: string;
  onSessionSelect?: (session: SessionMeta) => void;
  onRefresh?: () => void;
  onDeleteSession?: (id: string, name: string) => Promise<void>;
  onClearActiveSession?: () => void;
}

export default function RemedialDashboardLayer({
  gradedStudents,
  kkm,
  scoringConfig,
  academicYear = "2025/2026",
  studentClass,
  subject = "Matematika",
  semester = "Ganjil",
  onBack,
  onUpdateRemedial,
  remedialQuestionsInput = "",
  onRemedialInputChange,
  remedialAnswerKeysInput = "",
  onAnswerKeysInputChange,
  remedialTimer = 15,
  isSaving = false,
  sessions = [],
  activeSessionId,
  onSessionSelect,
  onRefresh,
  onDeleteSession,
  onClearActiveSession
}: RemedialDashboardLayerProps) {
  const { isAdmin, studentClass: contextClass, studentData } = useGradeMaster();
  const displayClass = studentClass || contextClass || (studentData && studentData.class_name) || "N/A";
  
  // Group sessions by class name
  const groupedSessions = useMemo(() => {
    const groups: Record<string, SessionMeta[]> = {};
    (sessions || []).forEach(s => {
      const cls = s.class_name || 'Umum';
      if (!groups[cls]) {
        groups[cls] = [];
      }
      groups[cls].push(s);
    });
    // Sort classes alphabetically (numerical sorting e.g. 7A, 8A, 9A)
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {} as Record<string, SessionMeta[]>);
  }, [sessions]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING' | 'DONE' | 'ISSUE'>('ALL');
  const [activeDetailTab, setActiveDetailTab] = useState<Record<string, 'answers' | 'security'>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editorTab, setEditorTab] = useState<'mcq' | 'essay' | 'settings'>('mcq');
  const [localTimer, setLocalTimer] = useState<number>(remedialTimer);
  const [localDeadline, setLocalDeadline] = useState<string>(scoringConfig.remedialDeadline || "");
  const [localMcqInput, setLocalMcqInput] = useState<string>(() => formatRemedialMcq(scoringConfig.remedialMcqQuestions || []));
  const [localMcqQuota, setLocalMcqQuota] = useState<number>(scoringConfig.remedialMcqQuota || 10);
  const [localPgWeight, setLocalPgWeight] = useState<number>(
    scoringConfig.remedialPgWeight !== undefined ? Math.round(scoringConfig.remedialPgWeight * 100) : 70
  );
  const [localEssayWeight, setLocalEssayWeight] = useState<number>(
    scoringConfig.remedialEssayWeight !== undefined ? Math.round(scoringConfig.remedialEssayWeight * 100) : 30
  );
  const [reviewScore, setReviewScore] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [extendingTimeStudentId, setExtendingTimeStudentId] = useState<string | null>(null);
  const [reviewingStudentId, setReviewingStudentId] = useState<string | null>(null);
  const [finalizingStudentId, setFinalizingStudentId] = useState<string | null>(null);
  const [resettingStudentId, setResettingStudentId] = useState<string | null>(null);
  const [togglingModeStudentId, setTogglingModeStudentId] = useState<string | null>(null);
  const [studentModes, setStudentModes] = useState<Record<string, 'STRICT' | 'LIMITED'>>({});
  const [loadingSecurityAnalysis, setLoadingSecurityAnalysis] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openEditorOnLoad, setOpenEditorOnLoad] = useState(false);

  // Deadline & Auto-Zero states
  const [isZeroDeadlineModalOpen, setIsZeroDeadlineModalOpen] = useState(false);
  const [zeroModalClass, setZeroModalClass] = useState('');
  const [zeroModalAcademicYear, setZeroModalAcademicYear] = useState('');
  const [selectedStudentForZero, setSelectedStudentForZero] = useState<{ id: string; name: string } | null>(null);
  const [isZeroingSubmitting, setIsZeroingSubmitting] = useState(false);
  const [restoringStudentId, setRestoringStudentId] = useState<string | null>(null);
  const [isRestoringAllSubmitting, setIsRestoringAllSubmitting] = useState(false);

  // Auto-open editor once the selected session is loaded
  React.useEffect(() => {
    if (activeSessionId && openEditorOnLoad) {
      queueMicrotask(() => {
        setIsEditing(true);
        setOpenEditorOnLoad(false);
      });
    }
  }, [activeSessionId, openEditorOnLoad]);

  // Sync local config values when active session or props are updated
  React.useEffect(() => {
    queueMicrotask(() => {
      setLocalTimer(remedialTimer);
    });
  }, [remedialTimer]);

  React.useEffect(() => {
    queueMicrotask(() => {
      setLocalDeadline(scoringConfig.remedialDeadline || "");
      setLocalMcqInput(formatRemedialMcq(scoringConfig.remedialMcqQuestions || []));
      setLocalMcqQuota(scoringConfig.remedialMcqQuota || 10);
      setLocalPgWeight(scoringConfig.remedialPgWeight !== undefined ? Math.round(scoringConfig.remedialPgWeight * 100) : 70);
      setLocalEssayWeight(scoringConfig.remedialEssayWeight !== undefined ? Math.round(scoringConfig.remedialEssayWeight * 100) : 30);
    });
  }, [scoringConfig]);

  const [aiForensicResult, setAiForensicResult] = useState<Record<string, AIForensicRecord>>({});
  const [forensicConsoleLogs, setForensicConsoleLogs] = useState<string[]>([]);
  const [expandedRawLogs, setExpandedRawLogs] = useState<Record<string, boolean>>({});

  const runAiForensic = async (studentId: string) => {
    setLoadingSecurityAnalysis(studentId);
    setForensicConsoleLogs([
      "[SYSTEM] Menginisialisasi session telemetry tunnel...",
      "[INGESTION] Menarik log aktivitas gm_attempt_logs & data sesi...",
    ]);
    
    const t1 = setTimeout(() => {
      setForensicConsoleLogs(prev => [...prev, "[TELEMETRY] Memetakan koordinat vektor tab-switching, blur, dan aktivitas input..."]);
    }, 400);

    const t2 = setTimeout(() => {
      setForensicConsoleLogs(prev => [...prev, "[PROCTORING] Menganalisis snapshot biometrik wajah & integritas visual kamera..."]);
    }, 850);

    const t3 = setTimeout(() => {
      setForensicConsoleLogs(prev => [...prev, "[AI BRAIN] Mengaktifkan Qwen-27B Cyber-Forensics Brain untuk audit multi-vektor..."]);
    }, 1300);

    try {
      const res = await fetch('/api/grademaster/security-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          useAi: true
        })
      });
      
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (!res.ok) throw new Error('Gagal memindai');
      const data = await res.json();
      
      const totalEvts = data.telemetry_metrics?.total_events ?? data._debug?.total_logs ?? 0;
      setForensicConsoleLogs(prev => [
        ...prev,
        `[AUDIT SELESAI] Terverifikasi ${totalEvts} event telemetri (${data.engine_model || 'AI Brain'}).`,
        `[RESULT] Risk Score: ${data.risk_score}% • Verdict: ${data.ai_verdict}`
      ]);

      setTimeout(() => {
        setAiForensicResult(prev => ({
          ...prev,
          [studentId]: data
        }));
        setLoadingSecurityAnalysis(null);
      }, 400);
    } catch {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setForensicConsoleLogs(prev => [...prev, "[ERROR] Kegagalan audit forensik keamanan."]);
      setLoadingSecurityAnalysis(null);
      alert('Gagal menjalankan AI Cyber-Forensics. Silakan coba lagi.');
    }
  };

  const generateAndCopyPendingList = () => {
    const pendingList = gradedStudents.filter(s => 
      (s.finalScoreLocked || s.finalScore) < kkm && 
      (s.remedialStatus === 'NONE' || !s.remedialStatus || s.remedialStatus === 'FAILED' || s.remedialStatus === 'FAILED_EFFORT' || s.remedialStatus === 'CHEATED' || s.remedialStatus === 'TIME_UP')
    ).sort((a, b) => a.name.localeCompare(b.name));

    if (pendingList.length === 0) {
      alert('Tidak ada siswa yang tertunggak remedial pada sesi ini.');
      return;
    }

    const text = `*DAFTAR TUNGGAKAN REMEDIAL*\n` +
      `Mata Pelajaran: ${subject}\n` +
      `Kelas: ${displayClass}\n` +
      `KKM: ${kkm}\n\n` +
      `Berikut adalah daftar siswa yang belum menyelesaikan atau belum lulus remedial:\n\n` +
      pendingList.map((s, i) => `${i + 1}. ${s.name} (Nilai: ${s.originalScore || s.finalScore})`).join('\n') +
      `\n\nHarap segera mengakses tautan remedial dan menyelesaikannya. Jika dibiarkan, nilai asli akan terkunci permanen secara otomatis.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      alert('Gagal menyalin teks. Browser Anda mungkin tidak mendukung fitur Clipboard.');
    });
  };

  // Keep track of the latest onRefresh to avoid infinite loops when parent re-renders
  const onRefreshRef = React.useRef(onRefresh);
  React.useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Auto-refresh mechanism
  React.useEffect(() => {
    if (!activeSessionId) return;
    
    // Initial fetch
    if (onRefreshRef.current) {
      onRefreshRef.current();
    }
    
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (onRefreshRef.current) {
        onRefreshRef.current();
      }
    }, 25000); // 25 seconds
    
    return () => clearInterval(interval);
  }, [activeSessionId]);

  // Stats Logic
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(s => 
      s.session_name.toLowerCase().includes(q) ||
      (s.subject && s.subject.toLowerCase().includes(q)) ||
      (s.class_name && s.class_name.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  const handleEditSession = (session: SessionMeta) => {
    setOpenEditorOnLoad(true);
    onSessionSelect?.(session);
  };

  const allRemedialStudents = useMemo(() => {
    return gradedStudents.filter(s => 
      s.remedialStatus && s.remedialStatus !== 'NONE' && !deletedIds.includes(s.id)
    ).filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [gradedStudents, deletedIds, searchQuery]);

  const remedialStudents = useMemo(() => {
    if (statusFilter === 'WAITING') {
      return allRemedialStudents.filter(s => s.remedialStatus === 'REMEDIAL' && !s.teacherReviewed);
    }
    if (statusFilter === 'DONE') {
      return allRemedialStudents.filter(s => s.remedialStatus === 'COMPLETED' || s.remedialStatus === 'SUBMITTED' || s.teacherReviewed);
    }
    if (statusFilter === 'ISSUE') {
      return allRemedialStudents.filter(s => s.remedialStatus === 'CHEATED' || s.remedialStatus === 'TIME_UP' || s.remedialStatus === 'TIMEOUT' || s.remedialStatus === 'FAILED_EFFORT');
    }
    return allRemedialStudents;
  }, [allRemedialStudents, statusFilter]);

  const stats = useMemo(() => ({
    total: allRemedialStudents.length,
    waitingReview: allRemedialStudents.filter(s => s.remedialStatus === 'REMEDIAL' && !s.teacherReviewed).length,
    done: allRemedialStudents.filter(s => s.remedialStatus === 'COMPLETED' || s.remedialStatus === 'SUBMITTED' || s.teacherReviewed).length,
    issue: allRemedialStudents.filter(s => s.remedialStatus === 'CHEATED' || s.remedialStatus === 'TIME_UP' || s.remedialStatus === 'TIMEOUT' || s.remedialStatus === 'FAILED_EFFORT').length
  }), [allRemedialStudents]);

  const isDeadlineExpired = useMemo(() => {
    return Boolean(scoringConfig.remedialDeadline && new Date() > new Date(scoringConfig.remedialDeadline));
  }, [scoringConfig.remedialDeadline]);

  const zeroedStudents = useMemo(() => {
    return gradedStudents.filter(s => 
      !deletedIds.includes(s.id) && 
      s.remedialStatus === 'TIME_UP' && 
      (s.finalScore === 0 || s.finalScoreLocked === 0)
    );
  }, [gradedStudents, deletedIds]);

  // Cek apakah siswa SUDAH pernah menyelesaikan remedial, sedang menunggu teman lain,
  // atau nilainya telah diedit oleh guru. Siswa seperti ini TIDAK BOLEH dijadikan nilai 0.
  const isStudentExemptFromZero = useCallback((s: GradedStudent) => {
    // 1. Status pengerjaan sudah selesai atau diserahkan
    if (s.remedialStatus === 'COMPLETED' || s.remedialStatus === 'SUBMITTED') {
      return true;
    }

    // 2. Nilai remedial ditahan sementara menunggu teman sekelas selesai (siswa ini SUDAH selesai remedial!)
    if (s.cheatingFlags && s.cheatingFlags.some(f => typeof f === 'string' && (f.includes('Nilai remedial ditahan') || f.includes('menunggu')))) {
      return true;
    }

    // 3. Nilai telah diperiksa atau diedit secara manual oleh guru
    if (s.teacherReviewed === true && s.remedialStatus !== 'TIME_UP') {
      return true;
    }
    if (s.essayScoreManual !== undefined && s.essayScoreManual !== null) {
      return true;
    }

    // 4. Memiliki skor remedial yang valid (> 0)
    if (s.remedialScore !== undefined && s.remedialScore !== null && s.remedialScore > 0) {
      return true;
    }

    // 5. Memiliki bukti jawaban remedial yang dikerjakan (essay / PG)
    const hasEssayAnswers = Array.isArray(s.remedialAnswers) && s.remedialAnswers.some(a => a && a.trim().length > 0);
    const hasMcqAnswers = Array.isArray(s.remedialMcqAnswers) && s.remedialMcqAnswers.length > 0;
    if (hasEssayAnswers || hasMcqAnswers) {
      return true;
    }

    // 6. Nilai akhir sudah mencapai atau melampaui KKM (misal 75)
    const currentScore = (s.finalScoreLocked !== undefined && s.finalScoreLocked !== null) ? s.finalScoreLocked : s.finalScore;
    if (currentScore >= kkm) {
      return true;
    }

    return false;
  }, [kkm]);

  const pendingDeadlineStudents = useMemo(() => {
    return gradedStudents.filter(s => {
      if (deletedIds.includes(s.id)) return false;
      // Jangan masukkan siswa yang sudah bernilai 0 dengan status TIME_UP
      if (s.remedialStatus === 'TIME_UP' && (s.finalScore === 0 || s.finalScoreLocked === 0)) return false;
      // Jangan masukkan siswa yang sudah selesai, sedang menunggu teman, atau nilainya diedit guru
      if (isStudentExemptFromZero(s)) return false;

      // Siswa kandidat remedial yang nilai awalnya di bawah KKM dan belum pernah selesai mengerjakan
      const baseScore = (s.originalScore !== undefined && s.originalScore !== null && s.originalScore > 0) ? s.originalScore : s.finalScore;
      return baseScore < kkm;
    });
  }, [gradedStudents, deletedIds, kkm, isStudentExemptFromZero]);

  function parseEssayQuestions(input: string): string[] {
    return input.split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  }

  const parsedMcqs = useMemo(() => {
    return parseRemedialMcq(localMcqInput);
  }, [localMcqInput]);

  const parsedEssays = useMemo(() => {
    return parseEssayQuestions(remedialQuestionsInput);
  }, [remedialQuestionsInput]);

  const parsedKeys = useMemo(() => {
    return parseEssayQuestions(remedialAnswerKeysInput);
  }, [remedialAnswerKeysInput]);

  const handleInsertMcqTemplate = () => {
    const template = `1. Berapakah hasil dari 15 + 25?
A. 30
B. 35
C. 40
D. 45
Kunci: C

2. Manakah di bawah ini yang merupakan bilangan prima?
A. 4
B. 6
C. 7
D. 9
Kunci: C

3. Apa ibu kota negara Indonesia?
A. Surabaya
B. Jakarta
C. Bandung
D. Medan
Kunci: B`;

    if (!localMcqInput.trim()) {
      setLocalMcqInput(template);
    } else {
      setLocalMcqInput(prev => prev.trim() + "\n\n" + template);
    }
  };

  // Actions
  const handleSaveQuestions = () => {
    let finalPgWeight: number | undefined = undefined;
    let finalEssayWeight: number | undefined = undefined;

    if (parsedMcqs.length > 0 && parsedEssays.length > 0) {
      const totalW = (localPgWeight + localEssayWeight) || 100;
      finalPgWeight = Number((localPgWeight / totalW).toFixed(2));
      finalEssayWeight = Number((1 - finalPgWeight).toFixed(2));
    } else if (parsedMcqs.length > 0) {
      finalPgWeight = 1;
      finalEssayWeight = 0;
    } else if (parsedEssays.length > 0) {
      finalPgWeight = 0;
      finalEssayWeight = 1;
    }

    onUpdateRemedial?.(
      parsedEssays,
      parsedKeys,
      localTimer,
      localDeadline,
      parsedMcqs,
      localMcqQuota,
      finalPgWeight,
      finalEssayWeight
    );
    setIsEditing(false);
  };

  const handleAutoFormatList = (input: string) => {
    const lines = input.split('\n');
    let counter = 1;
    return lines.map(line => {
      // If it's an empty line, preserve the line break but don't number it
      if (!line.trim()) return line;
      // Remove existing number prefixes to avoid "1. 1. Soal"
      const cleanLine = line.replace(/^\d+[\.\)]\s*/, '');
      return `${counter++}. ${cleanLine}`;
    }).join('\n');
  };

  const handleResetRemedial = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Yakin ingin mereset data remedial siswa "${name}"?\nNilai siswa akan dikembalikan ke nilai utama.`)) return;
    
    setResettingStudentId(id);
    try {
      const res = await fetch(`/api/grademaster/students/remedial?studentId=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Gagal mereset');
      setDeletedIds(prev => [...prev, id]);
    } catch {
      alert('Gagal mereset data remedial. Silakan coba lagi.');
    } finally {
      setResettingStudentId(null);
    }
  };

  const handleOpenZeroDeadlineModal = (student?: { id: string; name: string }) => {
    setSelectedStudentForZero(student || null);
    setZeroModalClass(displayClass !== 'N/A' ? displayClass : '');
    setZeroModalAcademicYear(academicYear || '2025/2026');
    setIsZeroDeadlineModalOpen(true);
  };

  const handleExecuteZeroDeadline = async () => {
    if (!activeSessionId) return;
    if (!zeroModalClass.trim()) {
      alert('Mohon masukkan kelas untuk verifikasi.');
      return;
    }
    if (!zeroModalAcademicYear.trim()) {
      alert('Mohon masukkan tahun ajaran untuk verifikasi.');
      return;
    }

    setIsZeroingSubmitting(true);
    try {
      const res = await fetch('/api/grademaster/students/remedial/deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          action: 'ZERO_EXPIRED',
          studentClass: zeroModalClass.trim(),
          academicYear: zeroModalAcademicYear.trim(),
          studentId: selectedStudentForZero?.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menerapkan nilai 0.');
      }

      alert(data.message || `Berhasil menetapkan nilai 0 untuk ${data.affectedCount || 0} siswa.`);
      setIsZeroDeadlineModalOpen(false);
      setSelectedStudentForZero(null);
      if (onRefreshRef.current) onRefreshRef.current();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setIsZeroingSubmitting(false);
    }
  };

  const handleRestoreOriginalScore = async (e: React.MouseEvent, studentId: string, studentName: string, originalScore?: number) => {
    e.stopPropagation();
    const scoreText = (originalScore !== undefined && originalScore !== null) ? ` (Nilai Asli: ${originalScore})` : '';
    if (!window.confirm(`Pulihkan nilai siswa "${studentName}" ke nilai asli${scoreText}?\nKunci nilai akan dibuka dan status remedial direset.`)) return;

    setRestoringStudentId(studentId);
    try {
      const res = await fetch('/api/grademaster/students/remedial/deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          action: 'RESTORE_ORIGINAL',
          studentId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memulihkan nilai asli');
      }

      alert(data.message || `Berhasil memulihkan nilai asli siswa "${studentName}".`);
      if (onRefreshRef.current) onRefreshRef.current();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setRestoringStudentId(null);
    }
  };

  const handleRestoreAllOriginalScores = async () => {
    if (!activeSessionId) return;
    if (!window.confirm('Pulihkan semua siswa yang saat ini bernilai 0 di sesi ini ke nilai asli masing-masing?')) return;

    setIsRestoringAllSubmitting(true);
    try {
      const res = await fetch('/api/grademaster/students/remedial/deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          action: 'RESTORE_ORIGINAL'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memulihkan nilai');
      }

      alert(data.message || `Berhasil memulihkan ${data.restoredCount || 0} siswa ke nilai asli.`);
      if (onRefreshRef.current) onRefreshRef.current();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setIsRestoringAllSubmitting(false);
    }
  };

  const handleToggleExamMode = async (e: React.MouseEvent, id: string, name: string, currentMode?: string) => {
    e.stopPropagation();
    const activeMode = studentModes[id] || currentMode || 'STRICT';
    const targetMode = activeMode === 'LIMITED' ? 'STRICT' : 'LIMITED';
    const confirmMsg = targetMode === 'LIMITED'
      ? `Aktifkan Mode Terbatas untuk siswa "${name}"?\nSiswa diizinkan mengerjakan remedial tanpa deteksi kamera.`
      : `Kembalikan ke Mode Kamera (Ketat) untuk siswa "${name}"?\nSiswa wajib mengaktifkan kamera saat remedial.`;

    if (!window.confirm(confirmMsg)) return;

    setTogglingModeStudentId(id);
    try {
      const res = await fetch('/api/grademaster/students/remedial/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, examMode: targetMode })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengubah mode ujian');
      }
      setStudentModes(prev => ({ ...prev, [id]: targetMode }));
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(errMsg || 'Gagal mengubah mode ujian.');
    } finally {
      setTogglingModeStudentId(null);
    }
  };

  const handleExtendTimePrompt = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const minutesStr = window.prompt(`Masukkan jumlah waktu tambahan (menit) untuk "${name}":`, "10");
    if (minutesStr === null) return;
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(minutes) || minutes <= 0) {
      alert('Jumlah menit tidak valid');
      return;
    }
    
    setExtendingTimeStudentId(id);
    try {
      const res = await fetch('/api/grademaster/students/remedial/extend-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, minutes })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menambahkan waktu');
      }
      alert(`Berhasil menambahkan ${minutes} menit untuk "${name}".`);
      if (onRefresh) onRefresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(errMsg || 'Gagal menambahkan waktu. Silakan coba lagi.');
    } finally {
      setExtendingTimeStudentId(null);
    }
  };

  const submitReview = async (studentId: string, action: 'review' | 'finalize') => {
    if (action === 'review') {
      setReviewingStudentId(studentId);
    } else {
      setFinalizingStudentId(studentId);
    }
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/grademaster/students/remedial/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action,
          remedialScore: Number(reviewScore),
          sessionKkm: kkm
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan evaluasi');
      alert(`Berhasil: ${data.message}`);
      window.location.reload(); 
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(errMsg);
    } finally {
      setIsSubmitting(false);
      setReviewingStudentId(null);
      setFinalizingStudentId(null);
    }
  };

  const getStatusBadge = (status: string, teacherReviewed?: boolean) => {
    const config: Record<string, { label: string, color: string, border: string, icon: string }> = {
      'INITIATED': { label: 'Menunggu', color: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800/40', icon: 'hourglass_empty' },
      'SUBMITTED': { label: 'Selesai', color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/40', icon: 'check_circle' },
      'COMPLETED': { label: 'Selesai', color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/40', icon: 'check_circle' },
      'ACTIVE': { label: 'Mengerjakan', color: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40 animate-pulse', border: 'border-amber-200 dark:border-amber-800/40', icon: 'clock_loader_40' },
      'IN_PROGRESS': { label: 'Proses', color: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800/40', icon: 'clock_loader_40' },
      'CHEATED': { label: 'Curang', color: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800/40', icon: 'security_update_warning' },
      'FAILED_EFFORT': { label: 'Tidak Valid', color: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800/40', icon: 'report' },
      'TIME_UP': { label: 'Timeout', color: 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', icon: 'timer_off' },
      'REMEDIAL': { 
        label: teacherReviewed ? 'Dikoreksi' : 'Antrean Review', 
        color: teacherReviewed ? 'text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/40' : 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40',
        border: teacherReviewed ? 'border-teal-200 dark:border-teal-800/40' : 'border-amber-200 dark:border-amber-800/40',
        icon: teacherReviewed ? 'done_all' : 'pending_actions'
      }
    };

    const s = config[status] || { label: status, color: 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', icon: 'info' };
    
    return (
      <div className={`px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 text-xs font-semibold ${s.color} ${s.border}`}>
        <span className="material-symbols-outlined text-[13px]">{s.icon}</span>
        <span className="leading-none">{s.label}</span>
      </div>
    );
  };

  return (
    <div className="font-body text-on-surface selection:bg-primary/20 min-h-dvh flex flex-col bg-surface relative overflow-x-hidden">
      
      {/* Editorial TopBar */}
      <header className="sticky top-0 w-full z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/20 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={activeSessionId ? () => onClearActiveSession?.() : onBack}
            className="p-2 hover:bg-surface-container-high rounded-xl text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 text-xs font-bold"
            title={activeSessionId ? "Kembali ke Daftar Sesi" : "Kembali ke Menu Utama"}
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">{activeSessionId ? "Daftar Sesi" : "Menu Utama"}</span>
          </button>
          <div className="h-4 w-[1px] bg-outline-variant/30 hidden sm:block" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nawasena</span>
              <span className="text-slate-600 dark:text-slate-400">•</span>
              <h1 className="text-sm font-extrabold text-on-surface uppercase tracking-wide">Pusat Data Remedial</h1>
            </div>
            {activeSessionId && (
              <p className="text-[11px] font-medium text-on-surface-variant truncate">
                {subject} — {displayClass} ({semester} {academicYear})
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSessionId && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Sliders size={14} />
              <span className="hidden sm:inline">Konfigurasi Soal</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-10 flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
        
        {/* Active Session Overview Banner */}
        {activeSessionId ? (
          <section className="bg-surface-container border border-outline-variant/20 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-extrabold tracking-wide uppercase">
                    Kelas {displayClass}
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium">
                    Semester {semester} • Th. {academicYear}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-on-surface tracking-tight">
                  {subject}
                </h2>
                <div className="flex items-center gap-4 text-xs font-medium text-on-surface-variant mt-2 flex-wrap">
                  <span>Standar KKM: <strong className="text-primary font-bold">{kkm}</strong></span>
                  <span>•</span>
                  <span>Durasi Ujian: <strong className="text-primary font-bold">{remedialTimer} Menit</strong></span>
                  <span>•</span>
                  <span>Bank Soal: <strong className="text-primary font-bold">{(scoringConfig.remedialQuestions?.length || 0) + (scoringConfig.remedialMcqQuestions?.length || 0)} Soal</strong></span>
                </div>
              </div>

              {/* Quick Session Dropdown */}
              <div className="flex items-center gap-2 self-start lg:self-center w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <select
                    className="w-full bg-surface-container-high border border-outline-variant/30 text-on-surface font-semibold text-xs py-2.5 pl-3.5 pr-8 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
                    onChange={(e) => {
                      const selected = sessions.find(s => s.id === e.target.value);
                      if (selected && onSessionSelect) {
                        setSearchQuery('');
                        onSessionSelect(selected);
                      }
                    }}
                    value={activeSessionId || ""}
                    disabled={!isAdmin}
                  >
                    <option value="" disabled>-- Ganti Sesi Ujian --</option>
                    {Object.entries(groupedSessions).map(([className, classSessions]) => (
                      <optgroup key={className} label={`KELAS ${className.toUpperCase()}`}>
                        {classSessions.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.subject} ({s.class_name}) — {s.exam_type || 'Ujian'}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 4 Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-outline-variant/15">
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 flex flex-col">
                <span className="text-[11px] font-semibold text-on-surface-variant">Total Peserta</span>
                <span className="text-2xl font-black text-on-surface mt-0.5">{stats.total}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 flex flex-col">
                <span className="text-[11px] font-semibold text-amber-500">Antrean Koreksi</span>
                <span className="text-2xl font-black text-amber-500 mt-0.5">{stats.waitingReview}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 flex flex-col">
                <span className="text-[11px] font-semibold text-emerald-500">Lulus / Tuntas</span>
                <span className="text-2xl font-black text-emerald-500 mt-0.5">{stats.done}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 flex flex-col">
                <span className="text-[11px] font-semibold text-rose-500">Isu / Pelanggaran</span>
                <span className="text-2xl font-black text-rose-500 mt-0.5">{stats.issue}</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Manajemen Remedial</span>
                <h2 className="text-2xl font-black text-on-surface tracking-tight mt-1">
                  Pusat Data Remedial Siswa
                </h2>
                <p className="text-xs text-on-surface-variant mt-1.5 max-w-xl leading-relaxed">
                  Pilih salah satu sesi ujian di bawah untuk memantau pengerjaan remedial, memeriksa jawaban essay, meninjau sensor kecurangan AI, atau mengatur bank soal.
                </p>
              </div>

              {/* Stats overview for sessions */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/15 text-center min-w-[90px]">
                  <span className="text-2xl font-black text-on-surface block">{sessions.length}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Sesi</span>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/15 text-center min-w-[90px]">
                  <span className="text-2xl font-black text-emerald-500 block">
                    {sessions.filter(s => (s.scoring_config?.remedialQuestions?.length || 0) + (s.scoring_config?.remedialMcqQuestions?.length || 0) > 0).length}
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Siap Pakai</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Batas Waktu Remedial & Zero-Score Management (Hanya saat sesi aktif) */}
        {activeSessionId && (
          <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isDeadlineExpired
              ? 'bg-rose-500/10 border-rose-500/25'
              : scoringConfig.remedialDeadline
              ? 'bg-amber-500/10 border-amber-500/25'
              : 'bg-surface-container border-outline-variant/20'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isDeadlineExpired
                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-500 dark:text-rose-400'
                  : scoringConfig.remedialDeadline
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-500 dark:text-amber-400'
                  : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant'
              }`}>
                <Clock size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-on-surface">
                    Batas Waktu Pengerjaan &amp; Kebijakan Nilai
                  </h4>
                  {scoringConfig.remedialDeadline && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isDeadlineExpired ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400' : 'bg-amber-500/20 text-amber-500 dark:text-amber-400'
                    }`}>
                      {isDeadlineExpired ? 'Tenggat Terlewati' : 'Tenggat Berjalan'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {scoringConfig.remedialDeadline ? (
                    <>
                      Tenggat: <strong>{new Date(scoringConfig.remedialDeadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</strong> •{' '}
                      <span className="text-rose-500 dark:text-rose-400 font-semibold">{pendingDeadlineStudents.length} siswa belum tuntas</span>
                      {zeroedStudents.length > 0 && (
                        <span className="text-amber-500 dark:text-amber-400 font-semibold"> • {zeroedStudents.length} siswa terkunci nilai 0</span>
                      )}
                    </>
                  ) : (
                    'Tenggat waktu belum diatur. Anda dapat mengaturnya pada menu Konfigurasi Soal.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <button
                type="button"
                onClick={() => handleOpenZeroDeadlineModal()}
                disabled={!isAdmin || pendingDeadlineStudents.length === 0}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Terapkan nilai 0 untuk siswa yang belum tuntas melewati batas waktu"
              >
                <Ban size={14} />
                <span>Jadikan Nilai 0 ({pendingDeadlineStudents.length})</span>
              </button>

              {zeroedStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleRestoreAllOriginalScores}
                  disabled={!isAdmin || isRestoringAllSubmitting}
                  className="px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-30"
                >
                  <Undo2 size={14} className={isRestoringAllSubmitting ? 'animate-spin' : ''} />
                  <span>{isRestoringAllSubmitting ? 'Memulihkan...' : `Pulihkan Nilai Asli (${zeroedStudents.length})`}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input 
              type="text"
              placeholder={activeSessionId ? "Cari nama siswa..." : "Cari sesi remedial (mata pelajaran, kelas, dll)..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" 
            />
          </div>

          {activeSessionId && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  statusFilter === 'ALL'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                Semua ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('WAITING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  statusFilter === 'WAITING'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                Antrean Review ({stats.waitingReview})
              </button>
              <button
                onClick={() => setStatusFilter('DONE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  statusFilter === 'DONE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                Tuntas ({stats.done})
              </button>
              <button
                onClick={() => setStatusFilter('ISSUE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  statusFilter === 'ISSUE'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                Pelanggaran ({stats.issue})
              </button>
            </div>
          )}
        </div>

        {/* Content Section: Session Cards or Student List */}
        {!activeSessionId ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {filteredSessions.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">inventory_2</span>
                </div>
                <h3 className="font-bold text-base text-on-surface mb-1">Tidak Ada Sesi yang Cocok</h3>
                <p className="text-on-surface-variant text-xs max-w-sm">
                  Tidak ditemukan sesi ujian yang sesuai dengan kata kunci pencarian Anda.
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const mcqCount = session.scoring_config?.remedialMcqQuestions?.length || 0;
                const essayCount = session.scoring_config?.remedialQuestions?.length || 0;
                const totalQuestions = mcqCount + essayCount;
                const isConfigured = totalQuestions > 0;
                
                return (
                  <div 
                    key={session.id}
                    className="bg-surface-container border border-outline-variant/20 hover:border-primary/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:bg-surface-container-high group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant text-[11px] font-bold">
                          Kelas {session.class_name || 'Umum'}
                        </span>
                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isConfigured 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {isConfigured ? 'Terkonfigurasi' : 'Belum Ada Soal'}
                        </div>
                      </div>

                      {/* Subject and Session Name */}
                      <h4 className="font-extrabold text-base text-on-surface group-hover:text-primary transition-colors">
                        {session.subject}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-0.5 truncate font-medium">
                        {session.session_name} • Sem. {session.semester || 'Ganjil'} ({session.academic_year || '2025/2026'})
                      </p>

                      {/* Details row */}
                      <div className="flex items-center gap-3 text-xs text-on-surface-variant/80 mt-3 pt-3 border-t border-outline-variant/15 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">assignment</span>
                          <strong>{totalQuestions} Soal</strong> ({mcqCount} PG, {essayCount} Essay)
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <strong>{session.remedial_timer || 15} Menit</strong>
                        </span>
                      </div>

                      {session.scoring_config?.remedialDeadline && (
                        <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-medium">
                          <Clock size={12} />
                          <span>Tenggat: {new Date(session.scoring_config.remedialDeadline).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
                      <button
                        onClick={() => onSessionSelect?.(session)}
                        className="flex-1 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Eye size={14} />
                        <span>Buka Siswa</span>
                      </button>
                      
                      <button
                        onClick={() => handleEditSession(session)}
                        className="py-2 px-3 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                        title="Edit Bank Soal Sesi Ini"
                      >
                        <Sliders size={14} />
                        <span>Soal</span>
                      </button>
                      
                      <button
                        onClick={() => onDeleteSession?.(session.id, session.session_name)}
                        className="py-2 px-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                        title="Hapus Sesi Ujian"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Student List Section (When Session Active) */
          <div className="flex flex-col gap-3">
            {remedialStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-3xl">person_search</span>
                </div>
                <h3 className="font-bold text-base text-on-surface mb-1">Tidak Ada Data Siswa</h3>
                <p className="text-xs text-on-surface-variant max-w-xs">
                  Tidak ada siswa yang sesuai dengan filter atau kata kunci pencarian pada sesi ini.
                </p>
              </div>
            ) : (
              remedialStudents.map((student, idx) => {
                const isSelected = selectedStudentId === student.id;
                const isZeroed = student.remedialStatus === 'TIME_UP' && (student.finalScoreLocked === 0 || student.finalScore === 0);
                const currentScore = student.finalScoreLocked !== undefined && student.finalScoreLocked !== null ? student.finalScoreLocked : student.finalScore;
                const isPassed = currentScore >= kkm;
                const currentMode = studentModes[student.id] || student.examMode || 'STRICT';
                const detailTab = activeDetailTab[student.id] || 'answers';

                return (
                  <div 
                    key={student.id}
                    className={`bg-surface-container rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                      isSelected 
                        ? 'border-primary/50 ring-1 ring-primary/20 bg-surface-container-high' 
                        : 'border-outline-variant/25 hover:border-outline-variant/50'
                    }`}
                  >
                    {/* Main Student Header Row (Spacious & Clean) */}
                    <div 
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedStudentId(null);
                        } else {
                          setSelectedStudentId(student.id);
                          setReviewScore(student.essayScoreManual?.toString() || student.remedialScore?.toString() || '');
                        }
                      }}
                    >
                      {/* Left: Identity */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-xs font-bold text-on-surface-variant/50 w-5 text-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="relative shrink-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden border ${
                            student.isCheated ? 'border-rose-500/50 ring-2 ring-rose-500/20' : 'border-outline-variant/30'
                          } bg-surface-container-low`}>
                            {student.remedialPhoto && isImageUrl(student.remedialPhoto) ? (
                              <Image src={student.remedialPhoto} alt={student.name} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                            ) : (
                              <User size={22} className="text-on-surface-variant/50" />
                            )}
                          </div>
                          {student.isCheated && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black shadow-md">
                              !
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm sm:text-base text-on-surface truncate">
                              {student.name}
                            </h4>
                            {getStatusBadge(student.remedialStatus || '', student.teacherReviewed)}
                            {student.cheatingFlags && student.cheatingFlags.some(f => typeof f === 'string' && (f.includes('Nilai remedial ditahan') || f.includes('menunggu'))) && (
                              <span className="px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">hourglass_top</span>
                                <span>Menunggu Teman</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1 flex-wrap">
                            {student.originalScore !== undefined && student.originalScore !== null && (
                              <span>Nilai Awal: <strong className="font-semibold text-on-surface">{student.originalScore}</strong></span>
                            )}
                            {student.remedialScore !== undefined && student.remedialScore !== null && (
                              <>
                                <span>•</span>
                                <span>Skor Remedial: <strong className="font-semibold text-on-surface">{student.remedialScore}</strong></span>
                              </>
                            )}
                            {student.remedialLocation && (
                              <>
                                <span>•</span>
                                <span className="text-on-surface-variant/70">{student.remedialLocation}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Score & Expand Toggle */}
                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/15">
                        {/* Score Box */}
                        <div className="flex items-center gap-2">
                          {isZeroed ? (
                            <div className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col items-end">
                              <span className="text-[10px] font-bold text-rose-500 leading-none">Nilai: 0</span>
                              <span className="text-[9px] text-on-surface-variant mt-0.5 leading-none">Batas Waktu</span>
                            </div>
                          ) : (
                            <div className={`px-4 py-1.5 rounded-xl border flex flex-col items-end ${
                              isPassed
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400'
                            }`}>
                              <span className="text-[10px] font-medium leading-none">Nilai Akhir</span>
                              <span className="text-lg font-black leading-tight mt-0.5">{currentScore}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <span className="hidden sm:inline">{isSelected ? 'Tutup Detail' : 'Koreksi & Aksi'}</span>
                          <div className={`p-1.5 rounded-lg bg-surface-container-high transition-transform duration-200 ${isSelected ? 'rotate-180' : ''}`}>
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Toolbar (Separated neatly inside the card) */}
                    <div 
                      className="px-4 py-2.5 bg-surface-container-low/70 border-t border-outline-variant/15 flex items-center justify-between gap-2 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Mode Kamera / Terbatas Toggle */}
                        <button 
                          onClick={(e) => handleToggleExamMode(e, student.id, student.name, student.examMode)}
                          disabled={!isAdmin || togglingModeStudentId === student.id}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 ${
                            currentMode === 'LIMITED'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                          }`}
                          title={currentMode === 'LIMITED' ? 'Mode Terbatas Aktif: Klik untuk jadikan Wajib Kamera' : 'Wajib Kamera Aktif: Klik untuk izinkan Mode Terbatas'}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {currentMode === 'LIMITED' ? 'no_photography' : 'videocam'}
                          </span>
                          <span>
                            {togglingModeStudentId === student.id ? 'Menyimpan...' : currentMode === 'LIMITED' ? 'Mode Terbatas' : 'Wajib Kamera'}
                          </span>
                        </button>

                        {/* Tambah Waktu */}
                        {(student.remedialStatus === 'TIMEOUT' || student.remedialStatus === 'TIME_UP' || student.remedialStatus === 'ACTIVE') && (
                          <button 
                            onClick={(e) => handleExtendTimePrompt(e, student.id, student.name)}
                            disabled={!isAdmin || extendingTimeStudentId === student.id}
                            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-primary text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                            title="Tambahkan waktu pengerjaan siswa"
                          >
                            <Clock size={13} className={extendingTimeStudentId === student.id ? 'animate-spin' : ''} />
                            <span>{extendingTimeStudentId === student.id ? 'Menambah...' : '+ Waktu'}</span>
                          </button>
                        )}

                        {/* Set 0 (jika belum selesai dan tenggat) */}
                        {!isStudentExemptFromZero(student) && !isZeroed && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenZeroDeadlineModal({ id: student.id, name: student.name }); }}
                            disabled={!isAdmin}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                            title="Terapkan sanksi nilai 0"
                          >
                            <Ban size={13} />
                            <span>Set Nilai 0</span>
                          </button>
                        )}

                        {/* Pulihkan Nilai Asli (jika sudah nilai 0) */}
                        {isZeroed && (
                          <button
                            onClick={(e) => handleRestoreOriginalScore(e, student.id, student.name, student.originalScore)}
                            disabled={!isAdmin || restoringStudentId === student.id}
                            className="px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                            title="Kembalikan ke nilai asli awal"
                          >
                            <Undo2 size={13} className={restoringStudentId === student.id ? 'animate-spin' : ''} />
                            <span>{restoringStudentId === student.id ? 'Memulihkan...' : 'Reset ke Nilai Asli'}</span>
                          </button>
                        )}
                      </div>

                      {/* Reset Remedial Button */}
                      <button 
                        onClick={(e) => handleResetRemedial(e, student.id, student.name)}
                        disabled={!isAdmin || resettingStudentId === student.id}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                        title="Reset seluruh progres remedial siswa ini"
                      >
                        <RotateCcw size={13} className={resettingStudentId === student.id ? 'animate-spin' : ''} />
                        <span>{resettingStudentId === student.id ? 'Mereset...' : 'Set Ulang'}</span>
                      </button>
                    </div>

                    {/* Expanded Drawer (Jawaban, Evaluasi Guru, Audit Sensor AI) */}
                    {isSelected && (
                      <div className="p-4 sm:p-6 border-t border-outline-variant/15 bg-surface-container-low/40 space-y-6 animate-in slide-in-from-top-1 duration-200">
                        {/* Tab Switcher inside Expanded Card */}
                        <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-3">
                          <button
                            type="button"
                            onClick={() => setActiveDetailTab(prev => ({ ...prev, [student.id]: 'answers' }))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                              detailTab === 'answers'
                                ? 'bg-primary text-on-primary shadow-sm'
                                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            <FileText size={14} />
                            <span>Koreksi Jawaban &amp; Nilai</span>
                            {student.remedialAnswers && student.remedialAnswers.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px]">
                                {student.remedialAnswers.length}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveDetailTab(prev => ({ ...prev, [student.id]: 'security' }))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                              detailTab === 'security'
                                ? 'bg-primary text-on-primary shadow-sm'
                                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            <Shield size={14} />
                            <span>Audit Sensor &amp; Keamanan AI</span>
                            {student.isCheated && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            )}
                          </button>
                        </div>

                        {/* TAB 1: KOREKSI JAWABAN & EVALUASI GURU */}
                        {detailTab === 'answers' && (
                          <div className="space-y-6">
                            {/* Cheating Alert Banner if present */}
                            {student.isCheated && student.cheatingFlags && student.cheatingFlags.length > 0 && (
                              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-left">
                                <span className="material-symbols-outlined text-rose-500 text-xl shrink-0 mt-0.5">security_update_warning</span>
                                <div>
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Indikasi Pelanggaran Ujian</h5>
                                  <ul className="mt-1 space-y-1">
                                    {student.cheatingFlags.map((flag, fIdx) => (
                                      <li key={fIdx} className="text-xs text-rose-600/80 dark:text-rose-400/80 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50" />
                                        <span>{flag}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {/* Evaluasi Guru Card */}
                            {(student.remedialStatus === 'REMEDIAL' || student.remedialStatus === 'COMPLETED' || student.remedialAnswers?.length) && (
                              <div className="bg-surface-container border border-outline-variant/25 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
                                    <h5 className="text-xs font-extrabold uppercase tracking-wide text-on-surface">
                                      Penilaian &amp; Evaluasi Guru
                                    </h5>
                                  </div>
                                  {student.teacherReviewed && (
                                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                      Telah Diperiksa
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                  <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-on-surface-variant block">
                                      Nilai Remedial Guru (Skala 0 - 100)
                                    </label>
                                    <input 
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
                                      placeholder="Masukkan nilai akhir (0-100)..."
                                      value={reviewScore || (student.remedialScore || '')}
                                      onChange={(e) => setReviewScore(e.target.value)}
                                      disabled={!isAdmin || student.remedialStatus === 'COMPLETED' || isSubmitting}
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => submitReview(student.id, 'review')}
                                      disabled={!isAdmin || isSubmitting || !reviewScore || reviewingStudentId === student.id}
                                      className="flex-1 py-2.5 px-4 bg-surface-container-highest hover:bg-outline-variant/30 text-on-surface text-xs font-bold rounded-xl border border-outline-variant/30 transition-all disabled:opacity-40"
                                    >
                                      {reviewingStudentId === student.id ? "Menyimpan..." : "Simpan Nilai"}
                                    </button>

                                    {student.teacherReviewed && (
                                      <button 
                                        onClick={() => submitReview(student.id, 'finalize')}
                                        disabled={!isAdmin || isSubmitting || finalizingStudentId === student.id}
                                        className="flex-1 py-2.5 px-4 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40"
                                      >
                                        {finalizingStudentId === student.id ? "Finalisasi..." : "Finalisasi"}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {student.teacherReviewed && student.remedialStatus !== 'COMPLETED' && (
                                  <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold italic">
                                    Catatan: Nilai telah tersimpan. Klik tombol <strong>Finalisasi</strong> untuk memasukkan siswa ini ke batas KKM ({kkm}).
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Daftar Jawaban Essay Siswa */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                                  <span>Jawaban Soal Essay Siswa</span>
                                  {student.remedialAnswers && (
                                    <span className="text-on-surface-variant/60 font-normal">({student.remedialAnswers.length} Soal)</span>
                                  )}
                                </h5>
                                {student.essayScoreAuto !== undefined && (
                                  <span className="text-xs font-bold text-primary">
                                    Auto-Score Similarity: {student.essayScoreAuto}
                                  </span>
                                )}
                              </div>

                              {(!student.remedialAnswers || student.remedialAnswers.length === 0) ? (
                                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/15 text-center text-xs text-on-surface-variant">
                                  Belum ada jawaban essay yang diserahkan oleh siswa ini.
                                </div>
                              ) : (
                                student.remedialAnswers.map((ans, aIdx) => {
                                  const detail = student.essayAutoDetails?.[aIdx];
                                  return (
                                    <div key={aIdx} className="bg-surface-container rounded-xl p-4 border border-outline-variant/20 space-y-2.5 text-left">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-xs font-bold text-on-surface-variant">
                                          Soal #{aIdx + 1}
                                        </span>
                                        {detail && (
                                          <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                            detail.similarity > 0.7 
                                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                          }`}>
                                            Tingkat Kemiripan: {Math.round(detail.similarity * 100)}%
                                          </div>
                                        )}
                                      </div>

                                      <p className="text-xs font-semibold text-on-surface leading-relaxed">
                                        {scoringConfig.remedialQuestions?.[aIdx] || `Pertanyaan ${aIdx + 1}`}
                                      </p>

                                      <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/15 text-xs text-on-surface leading-relaxed font-mono">
                                        <span className="text-[10px] font-bold text-on-surface-variant/60 block mb-1 font-body uppercase tracking-wider">Jawaban Siswa:</span>
                                        {ans || <em className="text-on-surface-variant/40">Jawaban kosong</em>}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {/* TAB 2: AUDIT SENSOR & KEAMANAN AI (CYBER-FORENSICS) */}
                        {detailTab === 'security' && (
                          <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-5 shadow-sm space-y-5 text-left">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                  <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black uppercase tracking-wider text-on-surface">
                                    AI Cyber-Forensics Telemetry Brain
                                  </h5>
                                  <p className="text-[11px] text-on-surface-variant">
                                    Audit multi-vektor sensor sesi ujian &amp; telemetri browser
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => runAiForensic(student.id)}
                                  disabled={loadingSecurityAnalysis !== null}
                                  className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                                >
                                  <Terminal size={13} />
                                  <span>{loadingSecurityAnalysis === student.id ? 'Memindai...' : 'Jalankan Audit AI'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Loading State */}
                            {loadingSecurityAnalysis === student.id && (
                              <div className="bg-[#07090e] border border-cyan-900/50 rounded-xl p-4 font-mono text-xs text-cyan-400 space-y-2">
                                <div className="flex items-center gap-2 font-bold pb-2 border-b border-cyan-900/50">
                                  <Activity size={14} className="animate-spin" />
                                  <span>Memproses Log Sensor Telemetri Siswa...</span>
                                </div>
                                <div className="space-y-1 text-[11px] text-slate-300 max-h-36 overflow-y-auto custom-scrollbar">
                                  {forensicConsoleLogs.map((log, lIdx) => (
                                    <div key={lIdx} className="leading-relaxed">&gt;&gt; {log}</div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Initial Pre-scan Cards */}
                            {!aiForensicResult[student.id] && loadingSecurityAnalysis !== student.id && (
                              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/15 space-y-3">
                                <p className="text-xs text-on-surface-variant leading-relaxed">
                                  Tekan <strong>Jalankan Audit AI</strong> untuk menganalisis rekaman sensor perpindahan tab, stabilitas kamera, kecepatan pengerjaan, dan riwayat clipboard siswa ini.
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-on-surface-variant">
                                  <div className="p-2.5 rounded-lg bg-surface-container flex items-center gap-2 border border-outline-variant/10">
                                    <Monitor size={14} className="text-primary" />
                                    <span>Pindah Tab / Blur</span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-surface-container flex items-center gap-2 border border-outline-variant/10">
                                    <Eye size={14} className="text-cyan-500" />
                                    <span>Vision Proctoring</span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-surface-container flex items-center gap-2 border border-outline-variant/10">
                                    <Clock size={14} className="text-amber-500" />
                                    <span>Kecepatan Jawab</span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-surface-container flex items-center gap-2 border border-outline-variant/10">
                                    <Copy size={14} className="text-purple-500" />
                                    <span>Guard Clipboard</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Completed Forensic Report */}
                            {aiForensicResult[student.id] && (
                              <div className="space-y-4 animate-in fade-in duration-300">
                                {/* Risk & Verdict Strip */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-on-surface">
                                      {aiForensicResult[student.id].risk_score}%
                                    </span>
                                    <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider mt-1">
                                      Skor Risiko Anomali
                                    </span>
                                  </div>

                                  <div className="sm:col-span-2 bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 flex flex-col justify-between">
                                    <div>
                                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                                        Hasil Analisis AI
                                      </span>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                          aiForensicResult[student.id].risk_level === 'TINGGI'
                                            ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400'
                                            : aiForensicResult[student.id].risk_level === 'SEDANG'
                                            ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400'
                                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                          {aiForensicResult[student.id].ai_verdict}
                                        </span>
                                        <span className="text-xs text-on-surface-variant">
                                          Tingkat Risiko: <strong>{aiForensicResult[student.id].risk_level}</strong>
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-on-surface-variant/60 font-mono mt-2">
                                      Engine: {aiForensicResult[student.id].engine_model || 'Groq AI'}
                                    </span>
                                  </div>
                                </div>

                                {/* Telemetry Metrics Grid */}
                                {aiForensicResult[student.id].telemetry_metrics && (
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                    <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                                      <span className="text-[10px] text-on-surface-variant font-medium block">Durasi Sesi</span>
                                      <span className="font-bold text-on-surface mt-0.5 block">
                                        {aiForensicResult[student.id].telemetry_metrics?.duration_minutes}m / {aiForensicResult[student.id].telemetry_metrics?.allocated_minutes}m
                                      </span>
                                    </div>
                                    <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                                      <span className="text-[10px] text-on-surface-variant font-medium block">Pindah Tab / Blur</span>
                                      <span className={`font-bold mt-0.5 block ${
                                        (aiForensicResult[student.id].telemetry_metrics?.tab_switches ?? 0) > 0 ? 'text-amber-500' : 'text-on-surface'
                                      }`}>
                                        {aiForensicResult[student.id].telemetry_metrics?.tab_switches}x
                                      </span>
                                    </div>
                                    <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                                      <span className="text-[10px] text-on-surface-variant font-medium block">Page Reload</span>
                                      <span className="font-bold text-on-surface mt-0.5 block">
                                        {aiForensicResult[student.id].telemetry_metrics?.reloads}x
                                      </span>
                                    </div>
                                    <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                                      <span className="text-[10px] text-on-surface-variant font-medium block">Copy / Paste</span>
                                      <span className="font-bold text-on-surface mt-0.5 block">
                                        {aiForensicResult[student.id].telemetry_metrics?.copy_pastes}x
                                      </span>
                                    </div>
                                    <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                                      <span className="text-[10px] text-on-surface-variant font-medium block">Kamera Anomali</span>
                                      <span className="font-bold text-on-surface mt-0.5 block">
                                        {aiForensicResult[student.id].telemetry_metrics?.vision_violations ?? 0}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Threat summary */}
                                {aiForensicResult[student.id]?.threat_vector_summary && (
                                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/15 text-xs">
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                                      Sintesis Forensik:
                                    </span>
                                    <p className="text-on-surface leading-relaxed">
                                      {aiForensicResult[student.id]?.threat_vector_summary}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Sticky Bottom Actions (Saat Sesi Aktif) */}
      {activeSessionId && (
        <div className="fixed bottom-0 w-full z-40 px-4 sm:px-6 pb-5 pt-3 bg-gradient-to-t from-surface via-surface/90 to-transparent pointer-events-none">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 pointer-events-auto items-center justify-between">
            <div className="flex gap-2.5 w-full sm:w-auto flex-1">
              <button 
                onClick={() => setIsEditing(true)}
                disabled={!activeSessionId}
                className="flex-1 sm:flex-initial px-5 py-3 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <Sliders size={15} />
                <span>Atur Soal Remedial</span>
              </button>
              <button 
                onClick={generateAndCopyPendingList}
                disabled={!activeSessionId || isEditing}
                className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md ${
                  copied 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-surface-container border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                <Copy size={15} />
                <span>{copied ? 'Tersalin!' : 'Tagih Siswa (Salin)'}</span>
              </button>
            </div>

            <button 
              onClick={onBack}
              className="w-full sm:w-auto px-4 py-3 text-on-surface-variant hover:text-on-surface transition-colors text-xs font-bold flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high rounded-xl border border-outline-variant/20"
            >
              <ArrowLeft size={14} />
              <span>Menu Utama</span>
            </button>
          </div>
        </div>
      )}

      {/* Premium Slide-Up Sheet for Editor */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
           
           {/* Sheet Content */}
           <div className="absolute bottom-0 w-full max-w-xl left-1/2 -translate-x-1/2 bg-surface-container-highest rounded-t-3xl p-6 premium-shadow animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] overflow-y-auto flex flex-col gap-6 custom-scrollbar">
              
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-outline/20 rounded-full mx-auto mb-2 shrink-0" />

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-headline font-black text-xl text-primary uppercase tracking-tight">Atur Soal Remedial</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">Konfigurasi Pilihan Ganda &amp; Essay</p>
                </div>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="w-10 h-10 rounded-full bg-surface-variant hover:bg-surface-variant/80 transition-colors flex items-center justify-center text-on-surface-variant"
                  aria-label="Tutup editor"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Segmented Tab Navigation */}
              <div className="flex bg-surface-container-lowest p-1.5 rounded-2xl gap-1 border border-outline/10">
                <button
                  type="button"
                  onClick={() => setEditorTab('mcq')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    editorTab === 'mcq'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant/70 hover:text-primary hover:bg-surface-variant/40'
                  }`}
                >
                  <CheckSquare size={14} />
                  <span>Pilihan Ganda</span>
                  {parsedMcqs.length > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      editorTab === 'mcq' ? 'bg-on-primary/20 text-on-primary' : 'bg-tertiary/20 text-tertiary'
                    }`}>
                      {parsedMcqs.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setEditorTab('essay')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    editorTab === 'essay'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant/70 hover:text-primary hover:bg-surface-variant/40'
                  }`}
                >
                  <FileText size={14} />
                  <span>Essay</span>
                  {parsedEssays.length > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      editorTab === 'essay' ? 'bg-on-primary/20 text-on-primary' : 'bg-tertiary/20 text-tertiary'
                    }`}>
                      {parsedEssays.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setEditorTab('settings')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    editorTab === 'settings'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant/70 hover:text-primary hover:bg-surface-variant/40'
                  }`}
                  title="Pengaturan Waktu & Bobot"
                >
                  <Sliders size={14} />
                  <span className="hidden sm:inline">Waktu &amp; Bobot</span>
                </button>
              </div>

              {/* Editor Tab Contents */}
              <div className="flex flex-col gap-4">
                {/* TAB 1: PILIHAN GANDA */}
                {editorTab === 'mcq' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-label text-[10px] text-tertiary-dim uppercase font-black tracking-widest pl-1">
                          Bank Soal Pilihan Ganda
                        </span>
                        {parsedMcqs.length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/15 text-tertiary border border-tertiary/20">
                            {parsedMcqs.length} Soal Terdeteksi
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-variant/40 text-on-surface-variant/60">
                            Belum Ada Soal
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleInsertMcqTemplate}
                          className="text-[10px] font-black uppercase tracking-wider text-tertiary hover:text-tertiary-dim transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-tertiary/10 hover:bg-tertiary/20"
                        >
                          <Sparkles size={12} />
                          Sisipkan Contoh
                        </button>
                        {localMcqInput.trim() && (
                          <button
                            type="button"
                            onClick={() => setLocalMcqInput('')}
                            className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 hover:text-error transition-colors px-2 py-1"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Format Guideline Card */}
                    <div className="p-3.5 bg-surface-container-lowest/70 border border-outline/10 rounded-2xl flex flex-col gap-1.5 text-[11px] text-on-surface-variant/80">
                      <div className="font-bold text-primary flex items-center gap-1.5 text-xs">
                        <HelpCircle size={13} className="text-tertiary" />
                        Panduan Format Soal Pilihan Ganda:
                      </div>
                      <div className="font-mono text-[10.5px] bg-surface-container-lowest px-3 py-2 rounded-xl border border-outline/10 text-on-surface-variant/90 leading-relaxed whitespace-pre-line">
{`1. Berapakah hasil dari 15 + 25?
A. 30
B. 35
C. 40
D. 45
Kunci: C`}
                      </div>
                      <p className="text-[10px] text-on-surface-variant/60">
                        * Gunakan nomor <strong>1. Soal</strong>, opsi <strong>A.</strong> sampai <strong>E.</strong>, dan baris <strong>Kunci: [A/B/C/D/E]</strong>.
                      </p>
                    </div>

                    {/* Textarea for MCQ */}
                    <div className="flex flex-col gap-1.5">
                      <textarea
                        className="w-full bg-surface-container-lowest border-none rounded-3xl p-5 text-sm font-mono text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-tertiary/40 transition-all outline-none resize-none min-h-[220px] disabled:opacity-50 custom-scrollbar leading-relaxed"
                        placeholder={`Tulis atau tempel soal PG di sini...\n\n1. Apa ibukota Indonesia?\nA. Surabaya\nB. Jakarta\nC. Bandung\nD. Medan\nKunci: B`}
                        value={localMcqInput}
                        onChange={(e) => setLocalMcqInput(e.target.value)}
                        disabled={!isAdmin}
                      />
                    </div>

                    {/* Parsed Preview */}
                    {parsedMcqs.length > 0 && (
                      <div className="flex flex-col gap-2 p-3.5 bg-surface-container-lowest/80 rounded-2xl border border-outline/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                            Pratinjau Soal Terdeteksi ({parsedMcqs.length})
                          </span>
                          <span className="text-[10px] text-tertiary font-bold">Kunci Jawaban Terverifikasi</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                          {parsedMcqs.map((q, qIdx) => (
                            <div key={q.id || qIdx} className="p-2.5 bg-surface-container-highest/60 rounded-xl text-xs flex flex-col gap-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-primary line-clamp-1">{qIdx + 1}. {q.question}</span>
                                <span className="px-2 py-0.5 rounded bg-tertiary text-on-tertiary font-black text-[10px] shrink-0">
                                  Kunci: {q.correctAnswer}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-on-surface-variant/70 line-clamp-1">
                                {q.options.map((opt, oi) => `${['A','B','C','D','E'][oi]}. ${opt}`).join('  |  ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ESSAY */}
                {editorTab === 'essay' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    {/* Questions */}
                    <div className="flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="font-label text-[10px] text-tertiary-dim uppercase font-black tracking-widest pl-1">
                            Pertanyaan Essay (Format: 1. Soal)
                          </label>
                          {parsedEssays.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/15 text-tertiary">
                              {parsedEssays.length} Soal
                            </span>
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={() => onRemedialInputChange?.(handleAutoFormatList(remedialQuestionsInput))}
                          className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-tertiary transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">format_list_numbered</span>
                          Auto Format
                        </button>
                      </div>
                      <textarea 
                        className="w-full bg-surface-container-lowest border-none rounded-3xl p-5 text-sm font-medium text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-tertiary/40 transition-all outline-none resize-none min-h-[160px] disabled:opacity-50 custom-scrollbar"
                        placeholder="Tekan enter untuk soal baru. Nomor akan dibuat otomatis..."
                        value={remedialQuestionsInput}
                        onChange={(e) => onRemedialInputChange?.(e.target.value)}
                        onBlur={(e) => onRemedialInputChange?.(handleAutoFormatList(e.target.value))}
                        disabled={!isAdmin}
                      />
                    </div>
                    
                    {/* Answer Keys */}
                    <div className="flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="font-label text-[10px] text-tertiary uppercase font-black tracking-widest pl-1">
                            Kunci Jawaban (Similarity Matcher)
                          </label>
                          {parsedKeys.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/15 text-tertiary">
                              {parsedKeys.length} Kunci
                            </span>
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={() => onAnswerKeysInputChange?.(handleAutoFormatList(remedialAnswerKeysInput))}
                          className="text-[9px] font-black uppercase tracking-widest text-tertiary hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">format_list_numbered</span>
                          Auto Format
                        </button>
                      </div>
                      <textarea 
                        className="w-full bg-surface-container-lowest border-none rounded-3xl p-5 text-sm font-medium text-tertiary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-tertiary/40 transition-all outline-none resize-none min-h-[160px] disabled:opacity-50 custom-scrollbar"
                        placeholder="Tekan enter untuk jawaban baru..."
                        value={remedialAnswerKeysInput}
                        onChange={(e) => onAnswerKeysInputChange?.(e.target.value)}
                        onBlur={(e) => onAnswerKeysInputChange?.(handleAutoFormatList(e.target.value))}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: WAKTU & BOBOT */}
                {editorTab === 'settings' && (
                  <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                    {/* Timer Config */}
                    <div className="flex flex-col gap-2 relative">
                      <label className="font-label text-[10px] text-tertiary-dim uppercase font-black tracking-widest pl-1">
                        <Clock size={12} className="inline mr-1" /> Durasi Ujian Remedial (Menit)
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        max="180" 
                        value={localTimer} 
                        onChange={(e) => setLocalTimer(Number(e.target.value))} 
                        disabled={!isAdmin}
                        className="w-full bg-surface-container-lowest border-none rounded-2xl p-4 text-sm font-medium text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-tertiary/40 transition-all outline-none disabled:opacity-50"
                      />
                    </div>

                    {/* Deadline Config */}
                    <div className="flex flex-col gap-2 relative">
                      <label className="font-label text-[10px] text-error uppercase font-black tracking-widest pl-1">
                        Tenggat Waktu / Auto-Lock (Opsional)
                      </label>
                      <input 
                        type="datetime-local" 
                        value={localDeadline} 
                        onChange={(e) => setLocalDeadline(e.target.value)} 
                        disabled={!isAdmin}
                        className="w-full bg-surface-container-lowest border-none rounded-2xl p-4 text-sm font-medium text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-error/40 transition-all outline-none disabled:opacity-50"
                      />
                      <p className="text-[10px] text-on-surface-variant/50 px-2 font-medium">
                        Jika diisi, sesi siswa akan otomatis terkunci jika melewati waktu ini.
                      </p>
                    </div>

                    {/* MCQ Quota Per Student */}
                    <div className="flex flex-col gap-2 relative">
                      <label className="font-label text-[10px] text-primary uppercase font-black tracking-widest pl-1">
                        Kuota Soal PG per Siswa (Diacak)
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        max={Math.max(1, parsedMcqs.length || 100)} 
                        value={localMcqQuota} 
                        onChange={(e) => setLocalMcqQuota(Math.max(1, Number(e.target.value)))} 
                        disabled={!isAdmin}
                        className="w-full bg-surface-container-lowest border-none rounded-2xl p-4 text-sm font-medium text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-primary/40 transition-all outline-none disabled:opacity-50"
                      />
                      <p className="text-[10px] text-on-surface-variant/50 px-2 font-medium">
                        Tiap siswa akan mendapatkan {Math.min(localMcqQuota, Math.max(1, parsedMcqs.length || localMcqQuota))} soal pilihan ganda acak dari {parsedMcqs.length} soal di bank soal.
                      </p>
                    </div>

                    {/* Bobot Nilai jika kedua jenis soal aktif */}
                    <div className="flex flex-col gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline/10">
                      <div className="flex items-center justify-between">
                        <label className="font-label text-[10px] text-primary uppercase font-black tracking-widest">
                          Pembagian Bobot Nilai
                        </label>
                        <span className="text-[10px] font-bold text-tertiary">
                          Total: {localPgWeight + localEssayWeight}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-bold text-on-surface-variant/80">Bobot PG (%)</span>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={localPgWeight}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, Number(e.target.value)));
                              setLocalPgWeight(val);
                              setLocalEssayWeight(100 - val);
                            }}
                            disabled={!isAdmin}
                            className="w-full bg-surface-container-highest border-none rounded-xl p-3 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-primary/40"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-bold text-on-surface-variant/80">Bobot Essay (%)</span>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={localEssayWeight}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, Number(e.target.value)));
                              setLocalEssayWeight(val);
                              setLocalPgWeight(100 - val);
                            }}
                            disabled={!isAdmin}
                            className="w-full bg-surface-container-highest border-none rounded-xl p-3 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-primary/40"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-on-surface-variant/50">
                        * Jika hanya mengisi salah satu jenis soal (hanya PG atau hanya Essay), jenis soal tersebut otomatis mendapat bobot 100%.
                      </p>
                    </div>
                  </div>
                )}

                {/* Validation Alert */}
                {parsedMcqs.length === 0 && parsedEssays.length === 0 && (
                  <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3">
                    <AlertCircle size={18} className="text-error shrink-0" />
                    <p className="text-[10px] font-bold text-error uppercase tracking-wider">
                      Minimal 1 soal (Pilihan Ganda atau Essay) wajib diisi agar sesi remedial aktif.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Save */}
              <div className="pt-4 sticky bottom-0 bg-surface-container-highest pb-2">
                <button 
                  onClick={handleSaveQuestions}
                  disabled={!isAdmin || isSaving || (parsedMcqs.length === 0 && parsedEssays.length === 0)}
                  className="w-full h-14 bg-tertiary text-on-tertiary rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSaving ? <Clock size={18} className="animate-spin" /> : <Save size={18} />}
                  Simpan Konfigurasi
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Konfirmasi Sanksi Nilai 0 (Batas Waktu Remedial) */}
      {isZeroDeadlineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-headline text-sm font-bold text-on-surface uppercase tracking-tight">
                    Sanksi Nilai 0 (Batas Waktu)
                  </h4>
                  <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                    Verifikasi Kelas &amp; Tahun Ajaran
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZeroDeadlineModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Description Warning Card */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={16} />
                </div>
                <div className="space-y-1">
                  <h5 className="font-headline font-bold text-xs text-on-surface uppercase tracking-tight">
                    Perhatian: Tindakan Penguncian Nilai 0
                  </h5>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Hanya siswa yang <strong className="text-rose-500 dark:text-rose-400 font-bold">belum pernah menyelesaikan remedial</strong> yang akan ditetapkan nilainya menjadi 0 dengan status <em>TIME_UP</em>.
                  </p>
                </div>
              </div>

              {/* Informational bullet points */}
              <div className="pt-2.5 border-t border-outline-variant/15 space-y-2 text-[10.5px]">
                <div className="flex items-start gap-2 text-on-surface-variant">
                  <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    Siswa yang sudah remedial (termasuk yang menunggu teman sekelas untuk penetapan nilai 75) dan nilai yang diedit guru <strong>otomatis aman &amp; tidak diubah</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2 text-on-surface-variant">
                  <RotateCcw size={14} className="text-teal-500 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    Nilai asli sebelum remedial tetap disimpan aman dan dapat dikembalikan kapan saja oleh admin dengan tombol <strong>&ldquo;Reset ke Nilai Asli&rdquo;</strong>.
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Inputs */}
            <div className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider flex items-center gap-1">
                  <span>Konfirmasi Kelas Target</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={zeroModalClass}
                  onChange={(e) => setZeroModalClass(e.target.value)}
                  placeholder="Contoh: 7A, 8B, IX-C"
                  className="w-full bg-surface-container-lowest border border-outline-variant/25 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all"
                />
                <span className="text-[9.5px] text-on-surface-variant/60">
                  Harus sesuai dengan kelas sesi aktif ({displayClass}).
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider flex items-center gap-1">
                  <span>Konfirmasi Tahun Ajaran</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={zeroModalAcademicYear}
                  onChange={(e) => setZeroModalAcademicYear(e.target.value)}
                  placeholder="Contoh: 2025/2026 atau 2026/2027"
                  className="w-full bg-surface-container-lowest border border-outline-variant/25 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all"
                />
                <span className="text-[9.5px] text-on-surface-variant/60">
                  Harus sesuai dengan tahun ajaran sesi ({academicYear || '2025/2026'}).
                </span>
              </div>

              {/* Target info */}
              <div className="p-3 bg-surface-container rounded-xl border border-outline-variant/15 text-[10.5px]">
                <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider block mb-1 text-[9px]">
                  Cakupan Tindakan:
                </span>
                {selectedStudentForZero ? (
                  <p className="font-semibold text-on-surface">
                    1 Siswa Terpilih: <strong className="text-rose-500 dark:text-rose-400 font-bold">{selectedStudentForZero.name}</strong>
                  </p>
                ) : (
                  <p className="font-semibold text-on-surface">
                    Semua Siswa Belum Mengerjakan: <strong className="text-rose-500 dark:text-rose-400 font-bold">{pendingDeadlineStudents.length} siswa</strong> di sesi ini.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/15">
              <button
                type="button"
                onClick={() => setIsZeroDeadlineModalOpen(false)}
                disabled={isZeroingSubmitting}
                className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteZeroDeadline}
                disabled={isZeroingSubmitting || !zeroModalClass.trim() || !zeroModalAcademicYear.trim()}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-rose-950/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                {isZeroingSubmitting ? (
                  <>
                    <Clock size={13} className="animate-spin" />
                    <span>Menerapkan...</span>
                  </>
                ) : (
                  <>
                    <Ban size={13} />
                    <span>Terapkan Nilai 0</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom OLED Safe Area Padding */}
      <div className="h-safe bg-surface-container shrink-0" />
      


      {/* Dynamic Styling for Custom Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        
        .shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          transform: translate3d(0, 0, 0);
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>

    </div>
  );
}
