"use client";

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { 
  Clock, RotateCcw, X, Save, User, CheckSquare, FileText, Sliders, Sparkles, AlertCircle, HelpCircle,
  Shield, ShieldCheck, Activity, Terminal, ChevronDown, ChevronUp, Cpu, Eye, Monitor, Copy,
  AlertTriangle, Ban, Undo2
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

  const remedialStudents = useMemo(() => {
    return gradedStudents.filter(s => 
      s.remedialStatus && s.remedialStatus !== 'NONE' && !deletedIds.includes(s.id)
    ).filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [gradedStudents, deletedIds, searchQuery]);

  const stats = useMemo(() => ({
    total: remedialStudents.length,
    waitingReview: remedialStudents.filter(s => s.remedialStatus === 'REMEDIAL' && !s.teacherReviewed).length,
    issue: remedialStudents.filter(s => s.remedialStatus === 'CHEATED' || s.remedialStatus === 'TIME_UP' || s.remedialStatus === 'TIMEOUT').length
  }), [remedialStudents]);

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
    const config: Record<string, { label: string, color: string, icon: string }> = {
      'INITIATED': { label: 'MENUNGGU', color: 'text-blue-400 bg-blue-400/10', icon: 'hourglass_empty' },
      'SUBMITTED': { label: 'SELESAI', color: 'text-tertiary bg-tertiary/10', icon: 'check_circle' },
      'COMPLETED': { label: 'SELESAI', color: 'text-tertiary bg-tertiary/10', icon: 'check_circle' },
      'ACTIVE': { label: 'MENGERJAKAN', color: 'text-amber-400 bg-amber-400/10 animate-pulse', icon: 'clock_loader_40' },
      'IN_PROGRESS': { label: 'PROSES', color: 'text-amber-400 bg-amber-400/10', icon: 'clock_loader_40' },
      'CHEATED': { label: 'CURANG', color: 'text-error bg-error/10', icon: 'security_update_warning' },
      'FAILED_EFFORT': { label: 'TIDAK VALID', color: 'text-error bg-error/10', icon: 'report' },
      'TIME_UP': { label: 'TIMEOUT', color: 'text-on-surface-variant bg-surface-variant', icon: 'timer_off' },
      'REMEDIAL': { 
        label: teacherReviewed ? 'DIKOREKSI' : 'ANTREAN', 
        color: teacherReviewed ? 'text-tertiary bg-tertiary/10' : 'text-amber-400 bg-amber-400/10',
        icon: teacherReviewed ? 'done_all' : 'pending_actions'
      }
    };

    const s = config[status] || { label: status, color: 'text-on-surface-variant bg-surface-variant', icon: 'info' };
    
    return (
      <div className={`px-2 py-1 rounded-lg border border-outline-variant flex items-center gap-1.5 ${s.color}`}>
        <span className="material-symbols-outlined text-[12px] font-bold">{s.icon}</span>
        <span className="text-[9px] font-black uppercase tracking-widest leading-none">{s.label}</span>
      </div>
    );
  };

  return (
    <div className="font-body text-on-surface selection:bg-tertiary/30 min-h-dvh flex flex-col bg-surface relative overflow-x-hidden">
      
      {/* Editorial TopBar */}
      <header className="fixed top-0 w-full z-50 bg-surface-container/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-surface-variant rounded-lg transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline font-bold text-lg tracking-tight text-primary uppercase">Remedial Center</h1>
        </div>
        <div className="h-8 w-8 rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-bright flex items-center justify-center">
            <User size={18} className="text-on-surface-variant" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-20 pb-32 px-4 sm:px-6 lg:px-10 flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Editorial Header & Session Picker */}
        <section className="flex flex-col gap-4">
          {activeSessionId && (
            <button 
              onClick={() => onClearActiveSession?.()}
              className="self-start flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 rounded-xl text-on-surface-variant hover:text-primary transition-all text-xs font-bold font-outfit tracking-wide"
            >
              <span className="material-symbols-outlined text-sm font-black">arrow_back</span>
              Kembali ke Daftar Sesi
            </button>
          )}

          <div className="space-y-3">
            <span className="font-label text-[10px] uppercase tracking-[0.15em] text-tertiary-dim font-black">Data Management</span>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <h2 className="font-headline text-2xl font-black tracking-tight leading-tight uppercase">
                PUSAT DATA REMEDIAL
              </h2>
              
              {/* Dropdown Pemilihan Sesi */}
              <div className="relative min-w-[260px] w-full sm:w-auto z-20">
                <select 
                  className="w-full bg-surface-container border border-outline-variant/30 text-primary font-bold text-xs py-3.5 px-4 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer transition-all hover:bg-surface-container-high"
                  onChange={(e) => {
                    const selected = sessions.find(s => s.id === e.target.value);
                    if (selected && onSessionSelect) {
                       // Reset searchQuery and local states if needed
                       setSearchQuery('');
                       onSessionSelect(selected);
                    }
                  }}
                  value={activeSessionId || ""}
                  disabled={!isAdmin}
                >
                  <option value="" disabled className="text-on-surface-variant/40 bg-surface-container-high">-- Pilih Kelas & Sesi --</option>
                  {Object.entries(groupedSessions).map(([className, classSessions]) => (
                    <optgroup key={className} label={`KELAS ${className.toUpperCase()}`} className="font-extrabold text-[10px] tracking-wider text-slate-400 bg-slate-900 border-b border-white/5 py-1">
                      {classSessions.map(s => {
                        // Create clean display values: e.g. "Matematika — UTS • Sem. Ganjil (2025/2026)"
                        const cleanExam = s.exam_type || 'Ujian';
                        const cleanSem = s.semester || 'I';
                        const cleanYear = s.academic_year || '2025/2026';
                        return (
                          <option key={s.id} value={s.id} className="text-xs font-semibold text-slate-200 bg-slate-950 py-1.5 px-3">
                            {s.subject} — {cleanExam} • Sem. {cleanSem} ({cleanYear})
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>
          
          {/* Advanced Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
            {[
              { label: 'Kelas', value: displayClass },
              { label: 'Tahun', value: academicYear.replace('20', '') },
              { label: 'Semester', value: semester },
              { label: 'Subjek', value: subject },
            ].map(f => (
              <div key={f.label} className="bg-surface-container-low p-3 rounded-2xl flex flex-col gap-1 items-start border border-white/[0.03]">
                <span className="font-label text-[9px] text-on-surface-variant uppercase font-black tracking-widest leading-none">{f.label}</span>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-primary truncate pr-1">{f.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dynamic Stats Cards */}
        <section className="grid grid-cols-3 gap-3">
          {(!activeSessionId ? [
            { label: 'Total Sesi', value: sessions.length, color: 'text-primary' },
            { label: 'Telah Dikonfigurasi', value: sessions.filter(s => (s.scoring_config?.remedialQuestions?.length || 0) > 0).length, color: 'text-emerald-500' },
            { label: 'Belum Dikonfigurasi', value: sessions.filter(s => !(s.scoring_config?.remedialQuestions?.length || 0)).length, color: 'text-amber-500' },
          ] : [
            { label: 'Total', value: stats.total, color: 'text-primary' },
            { label: 'Antrean', value: stats.waitingReview, color: 'text-slate-400' },
            { label: 'Isu', value: stats.issue, color: 'text-error' },
          ]).map(st => (
            <div key={st.label} className="bg-surface-container p-4 rounded-3xl flex flex-col gap-1 items-center border border-white/[0.03] shadow-sm">
              <span className={`text-3xl font-headline font-black ${st.color}`}>{st.value}</span>
              <span className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60 font-black">{st.label}</span>
            </div>
          ))}
        </section>

        {/* Batas Waktu Remedial & Zero-Score Management */}
        {activeSessionId && (
          <section className="bg-surface-container-lowest border border-white/[0.05] rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                  isDeadlineExpired
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : scoringConfig.remedialDeadline
                    ? 'bg-amber-400/15 border-amber-400/30 text-amber-300'
                    : 'bg-surface-container border-white/[0.05] text-on-surface-variant/40'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                      Batas Waktu Remedial &amp; Kebijakan Nilai 0
                    </h4>
                    {scoringConfig.remedialDeadline && (
                      <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                        isDeadlineExpired
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                          : 'bg-amber-400/15 border-amber-400/30 text-amber-300'
                      }`}>
                        {isDeadlineExpired ? 'Tenggat Terlewati' : 'Tenggat Aktif'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-on-surface-variant/70 font-medium mt-1 leading-relaxed">
                    {scoringConfig.remedialDeadline ? (
                      <>
                        Tenggat: <strong className="text-primary">{new Date(scoringConfig.remedialDeadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</strong> •{' '}
                        <span className="text-rose-400 font-bold">{pendingDeadlineStudents.length} siswa belum mengerjakan</span>
                        {zeroedStudents.length > 0 && (
                          <span className="text-amber-400 font-bold"> • {zeroedStudents.length} siswa bernilai 0</span>
                        )}
                      </>
                    ) : (
                      'Batas waktu remedial belum ditentukan. Atur tenggat pada tab Pengaturan Soal.'
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenZeroDeadlineModal()}
                  disabled={!isAdmin || pendingDeadlineStudents.length === 0}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-sm"
                  title="Jadikan nilai 0 bagi siswa yang belum tuntas melewati batas waktu"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Jadikan Nilai 0 ({pendingDeadlineStudents.length})</span>
                </button>

                {zeroedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreAllOriginalScores}
                    disabled={!isAdmin || isRestoringAllSubmitting}
                    className="px-3.5 py-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
                    title="Pulihkan semua siswa bernilai 0 ke nilai asli masing-masing"
                  >
                    <Undo2 className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 ${isRestoringAllSubmitting ? 'animate-spin' : ''}`} />
                    <span>{isRestoringAllSubmitting ? 'Memulihkan...' : `Pulihkan Nilai Asli (${zeroedStudents.length})`}</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Editorial Search Bar */}
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-tertiary transition-colors">search</span>
          <input 
            type="text"
            placeholder={activeSessionId ? "Cari nama siswa..." : "Cari sesi remedial (mata pelajaran, kelas, dll)..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!isAdmin}
            className="w-full bg-surface-container-low border-none rounded-2xl py-4.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-tertiary/20 transition-all shadow-sm outline-none disabled:opacity-50" 
          />
        </div>

        {/* Main Content List Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {!activeSessionId ? (
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {filteredSessions.length === 0 ? (
                <div className="md:col-span-2 flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-outline-variant/30 rounded-3xl bg-surface-container-lowest animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-3xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl">inventory_2</span>
                  </div>
                  <h3 className="font-headline text-lg font-bold text-on-surface mb-2 uppercase tracking-tight">Data Sesi Kosong</h3>
                  <p className="text-on-surface-variant/70 text-[11px] font-bold max-w-[250px] leading-relaxed uppercase tracking-widest">
                    Belum ada sesi ujian yang cocok dengan filter atau pencarian Anda.
                  </p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const qCount = session.scoring_config?.remedialQuestions?.length || 0;
                  const isConfigured = qCount > 0;
                  
                  return (
                    <div 
                      key={session.id}
                      className="bg-surface-container border border-white/[0.03] hover:border-tertiary/10 rounded-[28px] p-6 flex flex-col justify-between gap-6 transition-all group hover:shadow-lg hover:bg-surface-container-high animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      {/* Top Row: Session Title and Status Badge */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 leading-none">
                              {session.academic_year || "2025/2026"} • Sem. {session.semester || "Ganjil"}
                            </span>
                            <h4 className="font-headline font-bold text-base text-primary uppercase tracking-tight mt-1 truncate group-hover:text-tertiary transition-colors">
                              {session.session_name}
                            </h4>
                          </div>
                          <div className={`shrink-0 px-2.5 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest leading-none ${
                            isConfigured 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            {isConfigured ? 'Telah Dikonfigurasi' : 'Belum Dikonfigurasi'}
                          </div>
                        </div>

                        {/* Middle Row: Meta Information (Subject, Class, Timer) */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="bg-surface-container-low p-3 rounded-2xl flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-tertiary-dim text-base">book</span>
                            <div className="min-w-0">
                              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 leading-none mb-1">Mata Pelajaran / Kelas</p>
                              <p className="text-[10px] font-bold text-on-surface-variant truncate">
                                {session.subject} ({session.class_name})
                              </p>
                            </div>
                          </div>
                          <div className="bg-surface-container-low p-3 rounded-2xl flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-tertiary-dim text-base">hourglass_empty</span>
                            <div className="min-w-0">
                              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 leading-none mb-1">Durasi / Jumlah Soal</p>
                              <p className="text-[10px] font-bold text-on-surface-variant">
                                {session.remedial_timer || 15} Menit • {qCount} Soal
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Deadline info */}
                        {session.scoring_config?.remedialDeadline && (
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-error/5 border border-error/10 text-error rounded-xl text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">alarm</span>
                            <span>Tenggat: {new Date(session.scoring_config.remedialDeadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Row: Actions */}
                      <div className="flex items-center gap-2.5 pt-2 border-t border-white/[0.03]">
                        <button
                          onClick={() => onSessionSelect?.(session)}
                          className="flex-1 h-11 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-primary rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                          Lihat Detail
                        </button>
                        
                        <button
                          onClick={() => handleEditSession(session)}
                          className="flex-1 h-11 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                          Edit Soal
                        </button>
                        
                        <button
                          onClick={() => onDeleteSession?.(session.id, session.session_name)}
                          className="h-11 px-4 bg-error/10 hover:bg-error/20 text-error border border-error/20 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center"
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
          ) : remedialStudents.length === 0 ? (
            <div className="lg:col-span-2 flex flex-col items-center justify-center py-16 text-center">
               <div className="relative mb-6">
                <div className="absolute inset-0 bg-tertiary/5 blur-[60px] rounded-full scale-150"></div>
                <div className="relative h-20 w-20 bg-surface-container-high rounded-full flex items-center justify-center border border-outline-variant/10">
                  <span className="material-symbols-outlined text-4xl text-tertiary/30 animate-pulse">radar</span>
                </div>
              </div>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-1 uppercase tracking-tight">Data Kosong</h3>
              <p className="text-on-surface-variant/50 text-[11px] font-bold max-w-[200px] leading-relaxed uppercase tracking-widest">
                Belum ada records untuk filter yang aktif.
              </p>
            </div>
          ) : (
            remedialStudents.map((student) => {
              const isSelected = selectedStudentId === student.id;
              return (
                <div 
                  key={student.id}
                  className={`bg-surface-container rounded-3xl border transition-all duration-300 overflow-hidden ${
                    isSelected ? 'ring-1 ring-tertiary/20 border-tertiary/10 bg-surface-container-high' : 'border-white/[0.03] active:bg-surface-container-low'
                  }`}
                >
                   {/* Card Basic Info */}
                   <div 
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => setSelectedStudentId(isSelected ? null : student.id)}
                   >
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border ${
                            student.remedialStatus === 'CHEATED' ? 'border-error/30' : 'border-outline-variant/20'
                          }`}>
                             {student.remedialPhoto && isImageUrl(student.remedialPhoto) ? (
                               <Image src={student.remedialPhoto} alt={student.name} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                             ) : (
                               <User size={20} className="text-on-surface-variant/40" />
                             )}
                          </div>
                          {student.isCheated && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-on-surface rounded-full flex items-center justify-center border-2 border-surface shadow-lg">
                               <span className="material-symbols-outlined text-[10px] font-black">gpp_maybe</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-headline font-bold text-sm text-primary uppercase tracking-tight truncate max-w-[150px]">{student.name}</h4>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                             {getStatusBadge(student.remedialStatus || '', student.teacherReviewed)}
                             {student.cheatingFlags && student.cheatingFlags.some(f => typeof f === 'string' && (f.includes('Nilai remedial ditahan') || f.includes('menunggu'))) && (
                               <span className="px-2 py-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1">
                                 <span className="material-symbols-outlined text-[10px]">hourglass_top</span>
                                 <span>Menunggu Teman</span>
                               </span>
                             )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                         <div className="text-right flex flex-col items-end">
                            {student.remedialStatus === 'TIME_UP' && (student.finalScoreLocked === 0 || student.finalScore === 0) ? (
                              <>
                                <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Nilai 0 (Batas Waktu)</span>
                                <span className="text-lg font-headline font-black text-rose-500 leading-none">0</span>
                                {student.originalScore !== undefined && student.originalScore !== null && (
                                  <span className="text-[8px] font-mono text-on-surface-variant/70 mt-0.5">Asli: {student.originalScore}</span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Final Score</span>
                                <span className="text-lg font-headline font-black text-primary leading-none">
                                  {student.finalScoreLocked || student.finalScore}
                                </span>
                              </>
                            )}
                         </div>

                         {/* Tombol Pulihkan ke Nilai Asli (jika berstatus nilai 0 / TIME_UP) */}
                         {student.remedialStatus === 'TIME_UP' && (student.finalScoreLocked === 0 || student.finalScore === 0) && (
                           <button
                             onClick={(e) => handleRestoreOriginalScore(e, student.id, student.name, student.originalScore)}
                             disabled={!isAdmin || restoringStudentId === student.id}
                             className="px-3 py-1.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-600 hover:text-white transition-all font-extrabold text-[9px] uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-30 active:scale-95 shadow-sm"
                             title={`Kembalikan ke nilai asli (${student.originalScore ?? 'awal'})`}
                           >
                             <Undo2 size={12} className={restoringStudentId === student.id ? "animate-spin" : ""} />
                             <span className="leading-none">
                               {restoringStudentId === student.id ? "Memulihkan..." : "Reset ke Nilai Asli"}
                             </span>
                           </button>
                         )}

                         {/* Tombol Jadikan Nilai 0 (hanya untuk siswa yang belum pernah selesai mengerjakan remedial dan tidak exempt) */}
                         {!isStudentExemptFromZero(student) && 
                          !(student.remedialStatus === 'TIME_UP' && (student.finalScoreLocked === 0 || student.finalScore === 0)) && (
                           <button
                             onClick={(e) => { e.stopPropagation(); handleOpenZeroDeadlineModal({ id: student.id, name: student.name }); }}
                             disabled={!isAdmin}
                             className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all font-extrabold text-[9px] uppercase tracking-widest flex items-center gap-1 disabled:opacity-30 active:scale-95"
                             title="Terapkan sanksi nilai 0 karena belum mengerjakan remedial setelah batas waktu"
                           >
                             <Ban size={12} />
                             <span className="leading-none">Set 0</span>
                           </button>
                         )}

                         {(student.remedialStatus === 'TIMEOUT' || student.remedialStatus === 'TIME_UP' || student.remedialStatus === 'ACTIVE') && (
                           <button 
                            onClick={(e) => handleExtendTimePrompt(e, student.id, student.name)}
                            disabled={!isAdmin || extendingTimeStudentId === student.id}
                            className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-1.5 text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-30 active:scale-95"
                            title="Tambah waktu remedial siswa"
                           >
                              {extendingTimeStudentId === student.id ? <Clock size={12} className="animate-spin" /> : <Clock size={12} />}
                              <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                                {extendingTimeStudentId === student.id ? "Menambah waktu..." : "Tambah Waktu"}
                              </span>
                           </button>
                         )}

                         <button 
                           onClick={(e) => handleToggleExamMode(e, student.id, student.name, student.examMode)}
                           disabled={!isAdmin || togglingModeStudentId === student.id}
                           className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all disabled:opacity-30 active:scale-95 ${
                             (studentModes[student.id] || student.examMode) === 'LIMITED'
                               ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                               : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant hover:text-white'
                           }`}
                           title={(studentModes[student.id] || student.examMode) === 'LIMITED' ? 'Mode Terbatas Aktif (Klik untuk kembalikan ke Mode Kamera)' : 'Mode Kamera Wajib (Klik untuk aktifkan Mode Terbatas)'}
                         >
                            <span className="material-symbols-outlined text-[13px]">
                              {(studentModes[student.id] || student.examMode) === 'LIMITED' ? 'no_photography' : 'videocam'}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                              {togglingModeStudentId === student.id 
                                ? "Menyimpan..." 
                                : (studentModes[student.id] || student.examMode) === 'LIMITED' 
                                ? "Mode Terbatas" 
                                : "Kamera Wajib"}
                            </span>
                         </button>

                         <button 
                          onClick={(e) => handleResetRemedial(e, student.id, student.name)}
                          disabled={!isAdmin || resettingStudentId === student.id}
                          className="px-3 py-1.5 rounded-xl bg-error/10 border border-error/20 flex items-center gap-1.5 text-error hover:bg-error hover:text-on-error transition-all disabled:opacity-30 active:scale-95"
                          title="Berikan kesempatan ulang kepada siswa ini"
                         >
                            {resettingStudentId === student.id ? <Clock size={12} className="animate-spin" /> : <RotateCcw size={12} strokeWidth={3} />}
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                              {resettingStudentId === student.id ? "Reset remedial..." : "Set Ulang"}
                            </span>
                         </button>
                      </div>
                   </div>

                   {/* Card Expanded Details */}
                   {isSelected && (
                     <div className="px-4 pb-6 pt-2 border-t border-white/[0.05] animate-in slide-in-from-top-2 duration-300">
                        
                        {/* Cheating Alerts */}
                        {student.isCheated && student.cheatingFlags && student.cheatingFlags.length > 0 && (
                          <div className="mb-6 p-4 bg-error/5 border border-error/10 rounded-2xl flex gap-3">
                             <span className="material-symbols-outlined text-error text-xl shrink-0">security_update_warning</span>
                             <div>
                               <h5 className="text-[10px] font-black uppercase tracking-widest text-error mb-1.5">Indikasi Pelanggaran</h5>
                               <ul className="space-y-1">
                                 {student.cheatingFlags.map((flag, idx) => (
                                   <li key={idx} className="text-[10px] font-bold text-error/70 flex items-center gap-1.5 lowercase">
                                      <div className="w-1 h-1 rounded-full bg-error/40" /> {flag}
                                   </li>
                                 ))}
                               </ul>
                             </div>
                          </div>
                        )}

                        {/* Location / Meta */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                           <div className="bg-surface-container-low p-3 rounded-2xl flex items-center gap-3">
                              <span className="material-symbols-outlined text-tertiary/60 text-lg">location_on</span>
                              <div className="min-w-0">
                                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 leading-none mb-1">Location</p>
                                <p className="text-[10px] font-bold text-on-surface-variant truncate">{student.remedialLocation || 'N/A'}</p>
                              </div>
                           </div>
                           <div className="bg-surface-container-low p-3 rounded-2xl flex items-center gap-3">
                              <span className="material-symbols-outlined text-tertiary/60 text-lg">description</span>
                              <div className="min-w-0">
                                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 leading-none mb-1">Soal Essay</p>
                                <p className="text-[10px] font-bold text-on-surface-variant">{scoringConfig.remedialQuestions?.length || 0} Records</p>
                              </div>
                           </div>
                        </div>

                        {/* AI Cyber-Forensics Telemetry Brain Widget */}
                        <div className="mb-6 bg-surface-container-lowest border border-white/[0.06] rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                          {/* Top ambient highlight */}
                          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-tertiary/30 to-transparent"></div>

                          {/* Widget Header */}
                          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-tertiary animate-pulse" />
                              </div>
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-[11px] font-black uppercase tracking-widest text-primary leading-none">
                                    AI Cyber-Forensics Telemetry Brain
                                  </h5>
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-mono font-bold bg-tertiary/15 text-tertiary border border-tertiary/30">
                                    <span className="w-1 h-1 rounded-full bg-tertiary animate-ping"></span>
                                    LIVE SENSORS
                                  </span>
                                </div>
                                <p className="text-[8px] font-bold text-on-surface-variant/50 uppercase tracking-widest mt-1">
                                  Audit Multi-Vektor Integritas Sesi & Sensor Telemetri
                                </p>
                              </div>
                            </div>
                            {aiForensicResult[student.id] && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-surface-container border border-white/[0.08] text-on-surface-variant flex items-center gap-1.5">
                                  <Cpu className="w-3 h-3 text-tertiary" />
                                  {aiForensicResult[student.id].engine_model || (aiForensicResult[student.id].is_ai_analysis ? 'Qwen-27B AI' : 'Heuristic')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Initial Pre-scan Card */}
                          {!aiForensicResult[student.id] && loadingSecurityAnalysis !== student.id && (
                            <div className="p-5 text-left bg-surface-container-low/50 rounded-2xl border border-white/[0.04] space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8px] font-bold text-on-surface-variant/70 uppercase tracking-wider">
                                <div className="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-white/[0.03] flex items-center gap-2">
                                  <Monitor className="w-3.5 h-3.5 text-tertiary shrink-0" />
                                  <span>Tab & Focus Blur</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-white/[0.03] flex items-center gap-2">
                                  <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span>Vision Proctoring</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-white/[0.03] flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Temporal Velocity</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-white/[0.03] flex items-center gap-2">
                                  <Copy className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                  <span>Clipboard Guard</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <p className="text-[9px] font-medium text-on-surface-variant/60 max-w-[340px] leading-relaxed">
                                  Sistem akan menganalisis rekaman sensor telemetri dari database dan memvalidasi kejanggalan menggunakan Groq Qwen-27B Cyber-Forensics Engine.
                                </p>
                                <button
                                  onClick={() => runAiForensic(student.id)}
                                  disabled={loadingSecurityAnalysis !== null}
                                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-tertiary to-emerald-400 text-neutral-950 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(155,255,206,0.15)] hover:shadow-[0_0_25px_rgba(155,255,206,0.25)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                  <Terminal className="w-3.5 h-3.5" />
                                  Jalankan Audit AI
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Loading Terminal Scanner */}
                          {loadingSecurityAnalysis === student.id && (
                            <div className="bg-[#07090e] border border-[#1b2333] rounded-2xl p-4 font-mono text-[9px] text-[#5eead4] shadow-2xl relative overflow-hidden">
                              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(0,255,200,0.03),rgba(0,255,100,0.01),rgba(0,150,255,0.03))] bg-[size:100%_4px,3px_100%] pointer-events-none opacity-60"></div>
                              <div className="flex justify-between items-center border-b border-[#1b2333] pb-2 mb-3 relative z-10">
                                <span className="uppercase tracking-widest font-bold text-[#5eead4] flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 animate-spin" />
                                  Telemetric Forensics Stream Active
                                </span>
                                <span className="text-[8px] text-white/40">GROQ_ENGINE: QWEN-27B</span>
                              </div>
                              <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar relative z-10 text-left">
                                {forensicConsoleLogs.map((log, index) => (
                                  <div key={index} className="flex gap-2 leading-relaxed">
                                    <span className="text-[#5eead4]/40 shrink-0 font-bold">&gt;&gt;</span>
                                    <span className="break-all text-white/90">{log}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Completed Forensic Report */}
                          {aiForensicResult[student.id] && (
                            <div className="space-y-4 animate-in fade-in duration-300 text-left">
                              {/* Row 1: Risk Probability & System Verdict */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Risk Score Gauge */}
                                <div className="bg-surface-container-low p-4 rounded-2xl flex flex-col items-center justify-center border border-white/[0.04] relative">
                                  <div className="relative w-18 h-18 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                      <path
                                        className="text-white/[0.06]"
                                        strokeWidth="3.2"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                      />
                                      <path
                                        className={`transition-all duration-1000 ${
                                          aiForensicResult[student.id].risk_level === 'TINGGI'
                                            ? 'text-rose-500'
                                            : aiForensicResult[student.id].risk_level === 'SEDANG'
                                            ? 'text-amber-400'
                                            : 'text-tertiary'
                                        }`}
                                        strokeDasharray={`${aiForensicResult[student.id].risk_score}, 100`}
                                        strokeWidth="3.4"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-base font-headline font-black text-primary leading-none">
                                        {aiForensicResult[student.id].risk_score}%
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/50 mt-2 leading-none">
                                    Skor Resiko Anomali
                                  </span>
                                </div>

                                {/* Verdict Details */}
                                <div className="sm:col-span-2 bg-surface-container-low p-4 rounded-2xl flex flex-col justify-between border border-white/[0.04]">
                                  <div>
                                    <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1.5 block leading-none">
                                      System Verdict & Status
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                                        aiForensicResult[student.id].risk_level === 'TINGGI'
                                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                          : aiForensicResult[student.id].risk_level === 'SEDANG'
                                          ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                                          : 'bg-tertiary/10 border-tertiary/30 text-tertiary'
                                      }`}>
                                        {aiForensicResult[student.id].ai_verdict}
                                      </div>
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                        aiForensicResult[student.id].risk_level === 'TINGGI'
                                          ? 'text-rose-400 bg-rose-500/15'
                                          : aiForensicResult[student.id].risk_level === 'SEDANG'
                                          ? 'text-amber-300 bg-amber-400/15'
                                          : 'text-tertiary bg-tertiary/15'
                                      }`}>
                                        Tingkat: {aiForensicResult[student.id].risk_level}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-[8px] font-medium text-on-surface-variant/60 flex items-center justify-between border-t border-white/[0.04] pt-2">
                                    <span>Engine: <strong className="text-primary">{aiForensicResult[student.id].engine_model || 'Groq AI'}</strong></span>
                                    <span>Database Sensor: <strong className="text-tertiary">gm_attempt_logs</strong></span>
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Real Telemetry Metrics Counters */}
                              {aiForensicResult[student.id].telemetry_metrics && (
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                  <div className="bg-surface-container-low p-2.5 rounded-xl border border-white/[0.03]">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/40 block leading-none mb-1">
                                      Durasi Sesi
                                    </span>
                                    <p className="text-[11px] font-black text-primary font-mono leading-none">
                                      {aiForensicResult[student.id].telemetry_metrics?.duration_minutes}m{' '}
                                      <span className="text-[8px] text-on-surface-variant/50 font-normal">
                                        / {aiForensicResult[student.id].telemetry_metrics?.allocated_minutes}m
                                      </span>
                                    </p>
                                    <span className="text-[7px] font-mono text-tertiary block mt-1">
                                      {aiForensicResult[student.id].telemetry_metrics?.speed_ratio}x alokasi
                                    </span>
                                  </div>

                                  <div className="bg-surface-container-low p-2.5 rounded-xl border border-white/[0.03]">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/40 block leading-none mb-1">
                                      Pindah Tab / Blur
                                    </span>
                                    <p className={`text-[11px] font-black font-mono leading-none ${
                                      (aiForensicResult[student.id].telemetry_metrics?.tab_switches ?? 0) > 0 ? 'text-amber-400' : 'text-primary'
                                    }`}>
                                      {aiForensicResult[student.id].telemetry_metrics?.tab_switches}x
                                    </p>
                                    <span className="text-[7px] text-on-surface-variant/50 block mt-1">
                                      {(aiForensicResult[student.id].telemetry_metrics?.tab_switches ?? 0) === 0 ? 'Fokus terjaga' : 'Keluar viewport'}
                                    </span>
                                  </div>

                                  <div className="bg-surface-container-low p-2.5 rounded-xl border border-white/[0.03]">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/40 block leading-none mb-1">
                                      Page Reload
                                    </span>
                                    <p className={`text-[11px] font-black font-mono leading-none ${
                                      (aiForensicResult[student.id].telemetry_metrics?.reloads ?? 0) > 1 ? 'text-rose-400' : 'text-primary'
                                    }`}>
                                      {aiForensicResult[student.id].telemetry_metrics?.reloads}x
                                    </p>
                                    <span className="text-[7px] text-on-surface-variant/50 block mt-1">
                                      {(aiForensicResult[student.id].telemetry_metrics?.reloads ?? 0) > 1 ? 'Refresh berulang' : 'Normal'}
                                    </span>
                                  </div>

                                  <div className="bg-surface-container-low p-2.5 rounded-xl border border-white/[0.03]">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/40 block leading-none mb-1">
                                      Copy / Paste
                                    </span>
                                    <p className={`text-[11px] font-black font-mono leading-none ${
                                      (aiForensicResult[student.id].telemetry_metrics?.copy_pastes ?? 0) > 0 ? 'text-rose-400' : 'text-primary'
                                    }`}>
                                      {aiForensicResult[student.id].telemetry_metrics?.copy_pastes}x
                                    </p>
                                    <span className="text-[7px] text-on-surface-variant/50 block mt-1">
                                      {(aiForensicResult[student.id].telemetry_metrics?.copy_pastes ?? 0) > 0 ? 'Intersepsi input' : 'Bersih'}
                                    </span>
                                  </div>

                                  <div className="bg-surface-container-low p-2.5 rounded-xl border border-white/[0.03]">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/40 block leading-none mb-1">
                                      Sensor Logs
                                    </span>
                                    <p className="text-[11px] font-black text-tertiary font-mono leading-none">
                                      {aiForensicResult[student.id].telemetry_metrics?.total_events}
                                    </p>
                                    <span className="text-[7px] text-on-surface-variant/50 block mt-1">
                                      {aiForensicResult[student.id].telemetry_metrics?.vision_violations ?? 0} anomali kamera
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Row 3: 4 Multi-Vector Threat Scorecards */}
                              {((aiForensicResult[student.id].threat_vectors?.length ?? 0) > 0) && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h6 className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/60">
                                      Evaluasi 4 Vektor Ancaman
                                    </h6>
                                    <span className="text-[7px] text-tertiary/80 font-mono">MULTI-VECTOR TELEMETRY</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {aiForensicResult[student.id].threat_vectors!.map((vec, vIdx) => {
                                      const statusColor = 
                                        vec.status === 'KRITIS' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' :
                                        vec.status === 'WASPADA' ? 'text-amber-400 bg-amber-400/10 border-amber-400/30' :
                                        'text-tertiary bg-tertiary/10 border-tertiary/30';
                                      const barColor = 
                                        vec.status === 'KRITIS' ? 'bg-rose-500' :
                                        vec.status === 'WASPADA' ? 'bg-amber-400' :
                                        'bg-tertiary';

                                      return (
                                        <div key={vIdx} className="bg-surface-container-low/70 p-3 rounded-2xl border border-white/[0.03] space-y-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              {vIdx === 0 && <Monitor className="w-3.5 h-3.5 text-primary shrink-0" />}
                                              {vIdx === 1 && <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                                              {vIdx === 2 && <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                              {vIdx === 3 && <Copy className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                                              <span className="text-[9px] font-bold text-primary truncate leading-none">
                                                {vec.name}
                                              </span>
                                            </div>
                                            <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${statusColor} shrink-0`}>
                                              {vec.status} ({vec.score}%)
                                            </span>
                                          </div>
                                          {/* Score bar */}
                                          <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full transition-all duration-700 ${barColor}`} 
                                              style={{ width: `${Math.min(100, Math.max(5, vec.score))}%` }}
                                            />
                                          </div>
                                          <p className="text-[8px] text-on-surface-variant/70 leading-relaxed font-medium">
                                            {vec.summary}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Row 4: Modus Operandi & Forensic Timeline */}
                              <div className="bg-surface-container-low/50 p-4 rounded-2xl border border-white/[0.03]">
                                <h6 className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-1.5 leading-none">
                                  Sintesis Forensik & Modus Operandi
                                </h6>
                                <p className="text-[10px] font-medium text-on-surface-variant/90 leading-relaxed">
                                  {aiForensicResult[student.id]?.threat_vector_summary}
                                </p>
                              </div>

                              {/* Chronological Timeline */}
                              {((aiForensicResult[student.id]?.forensic_timeline?.length ?? 0) > 0) && (
                                <div className="space-y-2.5">
                                  <h6 className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-1 leading-none">
                                    Kronologi Anomali Sesi
                                  </h6>
                                  <div className="border-l border-white/[0.08] pl-3 ml-2 space-y-2.5 relative">
                                    {(aiForensicResult[student.id]?.forensic_timeline || []).map((evt, eidx) => (
                                      <div key={eidx} className="relative flex flex-col gap-0.5">
                                        <div className={`absolute -left-[16px] top-1 w-2.5 h-2.5 rounded-full border-2 border-surface-container-lowest ${
                                          evt.risk_points > 50
                                            ? 'bg-rose-500'
                                            : evt.risk_points > 25
                                            ? 'bg-amber-400'
                                            : 'bg-tertiary'
                                        }`} />
                                        <div className="flex items-center gap-2">
                                          <span className="text-[8px] font-mono font-bold text-tertiary leading-none">{evt.time}</span>
                                          <span className="text-[8px] font-black uppercase tracking-widest text-primary leading-none truncate max-w-[200px]">{evt.action}</span>
                                          <span className={`text-[7px] font-black px-1.5 py-0.2 rounded ${
                                            evt.risk_points > 50 ? 'bg-rose-500/15 text-rose-400' : evt.risk_points > 25 ? 'bg-amber-400/15 text-amber-300' : 'bg-tertiary/15 text-tertiary'
                                          }`}>+{evt.risk_points} pts</span>
                                        </div>
                                        <p className="text-[8px] font-medium text-on-surface-variant/70 leading-relaxed mt-0.5">
                                          {evt.description}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Rekomendasi Guru */}
                              {((aiForensicResult[student.id]?.mitigation_actions?.length ?? 0) > 0) && (
                                <div className="p-4 bg-tertiary/5 border border-tertiary/15 rounded-2xl">
                                  <h6 className="text-[8px] font-black uppercase tracking-widest text-tertiary mb-2 leading-none flex items-center gap-1.5">
                                    <ShieldCheck className="w-3 h-3 text-tertiary" />
                                    Rekomendasi Tindakan Guru
                                  </h6>
                                  <ul className="space-y-1.5">
                                    {(aiForensicResult[student.id]?.mitigation_actions || []).map((act, aidx) => (
                                      <li key={aidx} className="text-[9px] font-medium text-on-surface-variant/80 flex items-start gap-1.5">
                                        <span className="text-tertiary shrink-0 mt-0.5">•</span>
                                        <span>{act}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Row 5: Raw Telemetry Stream Inspector (Collapsible) */}
                              <div className="border border-white/[0.04] rounded-2xl overflow-hidden bg-surface-container-low/30">
                                <button
                                  type="button"
                                  onClick={() => setExpandedRawLogs(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Terminal className="w-3.5 h-3.5 text-on-surface-variant/60" />
                                    <span className="text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
                                      Inspeksi Raw Event Telemetri ({aiForensicResult[student.id].raw_events?.length || 0} events)
                                    </span>
                                  </div>
                                  {expandedRawLogs[student.id] ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-on-surface-variant/60" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant/60" />
                                  )}
                                </button>

                                {expandedRawLogs[student.id] && (
                                  <div className="p-3 border-t border-white/[0.04] bg-[#07090e] font-mono text-[8px] max-h-[180px] overflow-y-auto custom-scrollbar">
                                    {(!aiForensicResult[student.id].raw_events || aiForensicResult[student.id].raw_events!.length === 0) ? (
                                      <p className="text-white/40 italic py-2 text-center">
                                        Tidak ada event mencurigakan atau perpindahan tab yang tercatat pada database sesi ini.
                                      </p>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {aiForensicResult[student.id].raw_events!.map((rev, rIdx) => (
                                          <div key={rIdx} className="flex items-center justify-between border-b border-white/[0.03] pb-1 gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="text-white/40 shrink-0">{rev.time}</span>
                                              <span className={`px-1 rounded text-[7px] font-bold ${
                                                rev.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400' :
                                                rev.severity === 'MEDIUM' ? 'bg-amber-400/20 text-amber-300' :
                                                'bg-white/10 text-white/70'
                                              }`}>
                                                {rev.event}
                                              </span>
                                              <span className="text-white/70 truncate">{rev.details || '-'}</span>
                                            </div>
                                            <span className="text-[7px] text-white/30 shrink-0">{rev.severity}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Footer Actions */}
                              <div className="flex justify-between items-center pt-2">
                                <span className="text-[7px] font-mono text-on-surface-variant/40">
                                  Live audit source: PostgreSQL / gm_attempt_logs
                                </span>
                                <button
                                  onClick={() => runAiForensic(student.id)}
                                  className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 hover:text-primary transition-colors flex items-center gap-1.5"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Audit Ulang AI
                                </button>
                              </div>
                            </div>
                          )}
                        </div>


                        {/* Evaluasi Guru Section */}
                        {(student.remedialStatus === 'REMEDIAL' || student.remedialStatus === 'COMPLETED') && !student.isCheated && (
                          <section className="mb-6">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">edit_note</span> Evaluasi Akademik
                            </h5>
                            <div className="bg-surface-container-low p-4 rounded-3xl border border-white/[0.03]">
                               <div className="flex flex-col gap-4">
                                  <div className="w-full">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-2 block pl-1">Input Nilai Remedial (0-100)</label>
                                     <input 
                                       type="number"
                                       className="w-full bg-surface-container-lowest border-none rounded-2xl p-4 text-sm font-black text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-tertiary/30 outline-none disabled:opacity-50"
                                       placeholder="Murni..."
                                       value={reviewScore || (student.remedialScore || '')}
                                       onChange={(e) => setReviewScore(e.target.value)}
                                       disabled={!isAdmin || student.remedialStatus === 'COMPLETED' || isSubmitting}
                                     />
                                  </div>
                                  {student.remedialStatus === 'REMEDIAL' && (
                                    <div className="flex gap-2">
                                       <button 
                                         onClick={() => submitReview(student.id, 'review')}
                                         disabled={!isAdmin || isSubmitting || !reviewScore || reviewingStudentId === student.id}
                                         className="flex-1 py-3 bg-surface-bright text-primary text-[10px] font-black uppercase tracking-widest rounded-2xl disabled:opacity-30 border border-outline-variant active:scale-95 transition-transform disabled:cursor-not-allowed"
                                       >
                                         {reviewingStudentId === student.id ? "Menyimpan review..." : "Update"}
                                       </button>
                                       {student.teacherReviewed && (
                                         <button 
                                           onClick={() => submitReview(student.id, 'finalize')}
                                           disabled={!isAdmin || isSubmitting || finalizingStudentId === student.id}
                                           className="flex-1 py-3 bg-tertiary text-on-tertiary text-[10px] font-black uppercase tracking-widest rounded-2xl disabled:opacity-30 active:scale-95 transition-transform shadow-[0_0_20px_rgba(155,255,206,0.15)] disabled:cursor-not-allowed"
                                         >
                                           {finalizingStudentId === student.id ? "Finalisasi nilai..." : "Finalisasi"}
                                         </button>
                                       )}
                                    </div>
                                  )}
                               </div>
                               {student.teacherReviewed && student.remedialStatus !== 'COMPLETED' && (
                                 <p className="mt-3 text-[9px] text-tertiary/70 font-bold tracking-tight text-center italic leading-tight">
                                   Status: Koreksi tersimpan. Klik Finalisasi untuk memasukkan ke KKM ({kkm}).
                                 </p>
                               )}
                            </div>
                          </section>
                        )}

                        {/* Answers List */}
                        <section className="space-y-4">
                           <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 flex justify-between items-center">
                              <span>Jawaban Siswa</span>
                              <span className="text-tertiary-dim lowercase">Auto Score: {student.essayScoreAuto || 0}</span>
                           </h5>
                           {student.remedialAnswers?.map((ans, idx) => {
                             const detail = student.essayAutoDetails?.[idx];
                             return (
                               <div key={idx} className="bg-surface-container-lowest p-4 rounded-3xl border border-white/[0.03]">
                                  <div className="flex justify-between items-center mb-3">
                                     <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/30">Soal {idx + 1}</span>
                                     {detail && (
                                       <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                         detail.similarity > 0.7 ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'
                                       }`}>
                                          Matches: {Math.round(detail.similarity * 100)}%
                                       </div>
                                     )}
                                  </div>
                                  <p className="text-[11px] font-bold text-on-surface-variant/60 leading-relaxed mb-3">&quot;{scoringConfig.remedialQuestions?.[idx]}&quot;</p>
                                  <div className="bg-surface-container-high/40 p-3 rounded-2xl text-[11px] font-medium text-primary italic leading-relaxed border-l-2 border-tertiary/40">
                                     &quot;{ans || 'Kosong'}&quot;
                                  </div>
                               </div>
                             );
                           })}
                        </section>
                     </div>
                   )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Sticky Bottom Actions */}
      {activeSessionId && (
        <div className="fixed bottom-0 w-full z-40 px-6 pb-6 pt-4 bg-gradient-to-t from-surface via-surface/90 to-transparent pointer-events-none">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex flex-col md:flex-row gap-3 pointer-events-auto items-center">
              <div className="flex gap-3 w-full md:w-auto flex-1">
                <button 
                  onClick={() => setIsEditing(true)}
                  disabled={!activeSessionId}
                  className="flex-1 h-14 bg-gradient-to-br from-[#f9f9f9] to-[#a0a1a1] text-on-primary-container rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 premium-shadow active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <span className="material-symbols-outlined">auto_fix_high</span>
                  Atur Soal
                </button>
                <button 
                  onClick={generateAndCopyPendingList}
                  disabled={!activeSessionId || isEditing}
                  className={`flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 premium-shadow ${
                    copied 
                      ? 'bg-tertiary text-on-tertiary' 
                      : 'bg-surface-container border-2 border-error/40 text-error hover:bg-error/10'
                  }`}
                >
                  <span className="material-symbols-outlined">{copied ? 'check_circle' : 'content_copy'}</span>
                  {copied ? 'Tersalin' : 'Tagih Siswa'}
                </button>
              </div>
              <button 
                onClick={onBack}
                className="w-full md:w-auto px-6 py-4 text-on-surface-variant/70 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high rounded-2xl"
              >
                 <span className="material-symbols-outlined text-sm">arrow_back</span>
                 Menu Utama
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-container-low border border-white/[0.08] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-left relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-headline text-sm font-black text-primary uppercase tracking-tight">
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
                className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant/70 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Description Warning */}
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-[11px] leading-relaxed space-y-2.5 shadow-sm">
              <p className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 text-xs">
                <AlertTriangle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Perhatian: Tindakan Penguncian Nilai 0</span>
              </p>
              <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                Hanya siswa yang <strong className="text-rose-700 dark:text-rose-400">belum pernah menyelesaikan remedial</strong> setelah batas waktu yang akan ditetapkan nilainya menjadi <strong className="font-extrabold text-rose-700 dark:text-rose-400">0</strong> dengan status <em>TIME_UP</em>.
              </p>
              <div className="p-2.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 text-[10px] text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-bold text-primary flex items-center gap-1">
                  <span>🛡️ Perlindungan Nilai Siswa:</span>
                </p>
                <p className="leading-relaxed">
                  Siswa yang <strong>sudah mengerjakan remedial</strong> (termasuk yang sedang menunggu teman sekelas selesai sebelum nilai 75 difinalisasi) serta <strong>nilai yang telah diedit/dinilai guru</strong> akan otomatis terlindungi dan <strong>TIDAK AKAN diubah menjadi 0</strong>.
                </p>
              </div>
              <div className="text-[10.5px] text-emerald-900 dark:text-emerald-200 font-semibold p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2">
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs shrink-0 mt-0.5">✓</span>
                <span className="leading-snug">Nilai asli sebelum remedial tetap disimpan aman dan dapat dikembalikan kapan saja oleh admin dengan tombol <strong className="font-extrabold text-emerald-950 dark:text-emerald-100">&ldquo;Reset ke Nilai Asli&rdquo;</strong>.</span>
              </div>
            </div>

            {/* Verification Inputs */}
            <div className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-[10px] text-primary uppercase font-black tracking-widest flex items-center gap-1">
                  <span>Konfirmasi Kelas Target</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={zeroModalClass}
                  onChange={(e) => setZeroModalClass(e.target.value)}
                  placeholder="Contoh: 7A, 8B, IX-C"
                  className="w-full bg-surface-container-lowest border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs font-bold text-primary placeholder:text-on-surface-variant/40 focus:border-rose-500/50 outline-none transition-colors"
                />
                <span className="text-[9px] text-slate-500 dark:text-slate-400">
                  Harus sesuai dengan kelas sesi aktif ({displayClass}).
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label text-[10px] text-primary uppercase font-black tracking-widest flex items-center gap-1">
                  <span>Konfirmasi Tahun Ajaran</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={zeroModalAcademicYear}
                  onChange={(e) => setZeroModalAcademicYear(e.target.value)}
                  placeholder="Contoh: 2025/2026 atau 2026/2027"
                  className="w-full bg-surface-container-lowest border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs font-bold text-primary placeholder:text-on-surface-variant/40 focus:border-rose-500/50 outline-none transition-colors"
                />
                <span className="text-[9px] text-slate-500 dark:text-slate-400">
                  Harus sesuai dengan tahun ajaran sesi ({academicYear || '2025/2026'}).
                </span>
              </div>

              {/* Target info */}
              <div className="p-3 bg-surface-container-lowest rounded-xl border border-white/[0.08] text-[10px]">
                <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1 text-[9px]">
                  Cakupan Tindakan:
                </span>
                {selectedStudentForZero ? (
                  <p className="font-bold text-primary">
                    1 Siswa Terpilih: <strong className="text-rose-600 dark:text-rose-400 font-extrabold">{selectedStudentForZero.name}</strong>
                  </p>
                ) : (
                  <p className="font-bold text-primary">
                    Semua Siswa Belum Mengerjakan: <strong className="text-rose-600 dark:text-rose-400 font-extrabold">{pendingDeadlineStudents.length} siswa</strong> di sesi ini.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.05]">
              <button
                type="button"
                onClick={() => setIsZeroDeadlineModalOpen(false)}
                disabled={isZeroingSubmitting}
                className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteZeroDeadline}
                disabled={isZeroingSubmitting || !zeroModalClass.trim() || !zeroModalAcademicYear.trim()}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-rose-900/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
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
