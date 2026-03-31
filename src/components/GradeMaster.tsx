"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

import {
  SessionMeta,
  GradedStudent,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
  ModalType,
  ToastType,
  Layer,
} from "@/lib/grademaster/types";
import { parseAnswerKey, parseEssayQuestions, formatEssayQuestions } from "@/lib/grademaster/parser";
import { generateAnalytics, generateInsights } from '@/lib/grademaster/analytics';
import { loadRemedialSession } from '@/lib/grademaster/session';
import { saveActiveLayer, getActiveLayer } from '@/lib/grademaster/navigation';
import { saveAdminSession, getAdminSession, clearAdminSession } from '@/lib/grademaster/adminSession';

import HomeLayer from "./grademaster/HomeLayer";
import SetupLayer from "./grademaster/SetupLayer";
import DashboardLayer from "./grademaster/DashboardLayer";
import GradingLayer from "./grademaster/GradingLayer";
import LoginLayer from "./grademaster/LoginLayer";
import Modals from "./grademaster/Modals";
import StudentRemedialLayer from "./grademaster/StudentRemedialLayer";
import BehaviorLayer from "./grademaster/BehaviorLayer";
import RemedialDashboardLayer from "./grademaster/RemedialDashboardLayer";
import AttendanceLayer from "./grademaster/AttendanceLayer";
import Navbar from "./grademaster/Navbar";

const ESSAY_COUNT = 5;

export default function GradeMaster() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Session data
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionName, setSessionName] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [subject, setSubject] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [schoolLevel, setSchoolLevel] = useState("SMA");
  const [keyInput, setKeyInput] = useState("");
  const [answerKey, setAnswerKey] = useState<string[]>([]);
  const [studentList, setStudentList] = useState<string[]>([]);
  const [scoringConfig] = useState<ScoringConfig>(DEFAULT_SCORING_CONFIG);
  const [examType, setExamType] = useState("UTS");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [semester, setSemester] = useState("Ganjil");
  const [kkm, setKkm] = useState<number>(70);
  const [remedialEssayCount, setRemedialEssayCount] = useState<number>(5);
  const [remedialTimer, setRemedialTimer] = useState<number>(15);
  const [remedialQuestions, setRemedialQuestions] = useState<string[]>([]);
  const [remedialQuestionsInput, setRemedialQuestionsInput] = useState("");
  const [remedialAnswerKeys, setRemedialAnswerKeys] = useState<string[]>([]);
  const [remedialAnswerKeysInput, setRemedialAnswerKeysInput] = useState("");

  // Grading state
  const [studentName, setStudentName] = useState("");
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [essayScores, setEssayScores] = useState<number[]>(new Array(ESSAY_COUNT).fill(0));
  const [gradedStudents, setGradedStudents] = useState<GradedStudent[]>([]);

  // UI state
  const [layer, setInternalLayer] = useState<Layer>("home");
  const [isPublicView, setIsPublicView] = useState(false);
  const [isSessionPublic, setIsSessionPublic] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState<ToastType>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [apiQuestionDifficulties, setApiQuestionDifficulties] = useState<any[]>([]);

  const setLayer = useCallback((newLayer: Layer) => {
    // Route guard: only admin can access setup
    if (newLayer === 'setup') {
      const adminSession = getAdminSession();
      if (!adminSession?.isAdmin) {
        newLayer = 'login';
      }
    }

    setInternalLayer((prev) => {
      if (prev === newLayer) return prev;
      
      if (prev === 'home' && newLayer !== 'home') {
        window.history.pushState({ layer: newLayer }, '', `#${newLayer}`);
      } else {
        window.history.replaceState({ layer: newLayer }, '', `#${newLayer}`);
      }
      return newLayer;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLayer = localStorage.getItem("gm_layer");
    const savedSessionId = localStorage.getItem("gm_sessionId");
    const savedSessionName = localStorage.getItem("gm_sessionName");
    const savedSessionPassword = localStorage.getItem("gm_sessionPassword");
    const savedIsPublicView = localStorage.getItem("gm_isPublicView") === "true";

    const hash = window.location.hash.replace('#', '');
    const validLayers = ['home', 'setup', 'dashboard', 'grading', 'remedial', 'behavior', 'remedial_dashboard', 'attendance'];
    
    // Restore admin session
    const adminSession = getAdminSession();
    const isUserAdmin = adminSession ? adminSession.isAdmin : false;
    if (isUserAdmin) {
      setIsAdmin(true);
      setAdminUser(adminSession!.adminUser);
    }
    
    let initialLayer: Layer = 'home';
    
    // Hash takes precedence if valid, otherwise use persisted, otherwise home
    if (validLayers.includes(hash)) {
      initialLayer = hash as Layer;
    } else if (!hash) {
      // If no hash, force home to be the landing page
      initialLayer = 'home';
    } else {
      const persistedLayer = getActiveLayer() || (savedLayer as Layer) || 'home';
      if (validLayers.includes(persistedLayer)) {
        initialLayer = persistedLayer as Layer;
      }
    }

    // Apply route guard for setup
    if (initialLayer === 'setup' && !isUserAdmin) {
      initialLayer = 'login';
    }

    setInternalLayer(initialLayer);
    saveActiveLayer(initialLayer);
    window.history.replaceState({ layer: initialLayer }, '', `#${initialLayer}`);

    // Restore active remedial exam session
    const remedialSession = loadRemedialSession();
    const VALID_REMEDIAL_STEPS = ['RULES', 'INFO', 'GUIDE', 'EXAM', 'COMPLETED', 'CHEATED', 'TIMEOUT', 'SECOND_CHANCE'];
    if (remedialSession && VALID_REMEDIAL_STEPS.includes(remedialSession.step)) {
      if (remedialSession.studentName) setStudentName(remedialSession.studentName);
      if (remedialSession.className) setStudentClass(remedialSession.className);
      if (remedialSession.subject) setSubject(remedialSession.subject);
      if (remedialSession.sessionId) setSessionId(remedialSession.sessionId);
      
      if (initialLayer !== 'remedial') {
        setInternalLayer('remedial');
        window.history.replaceState({ layer: 'remedial' }, '', '#remedial');
      }
    }

    if (savedSessionName) {
      setSessionName(savedSessionName);
      if (savedSessionId) setSessionId(savedSessionId);
      if (savedSessionPassword) setSessionPassword(savedSessionPassword);
      setIsPublicView(savedIsPublicView);

      // Auto-load session data if we have identifier
      if (savedIsPublicView) {
        handleLoadPublicSession(savedSessionName);
      } else if (savedSessionPassword) {
        // We use a small timeout to ensure state is settled
        setTimeout(() => {
          fetchSessionData(savedSessionName, savedSessionPassword)
            .then(data => {
              setSessionId(data.sessionId || "");
              setAnswerKey(data.answerKey || []);
              setTeacherName(data.teacher || "");
              setSubject(data.subject || "");
              setStudentClass(data.className || "");
              setSchoolLevel(data.schoolLevel || "SMA");
              setExamType(data.examType || "UTS");
              setAcademicYear(data.academicYear || "2025/2026");
              setSemester(data.semester || "Ganjil");
              setKkm(data.kkm || 70);
              setRemedialEssayCount(data.remedialEssayCount || 5);
              setRemedialTimer(data.remedialTimer || 15);
              setStudentList(data.studentList || []);
              setGradedStudents(data.gradedStudents || []);
              const questions = data.scoringConfig?.remedialQuestions || [];
              setRemedialQuestions(questions);
              setRemedialQuestionsInput(formatEssayQuestions(questions));
              const ansKeys = data.scoringConfig?.remedialAnswerKeys || [];
              setRemedialAnswerKeys(ansKeys);
              setRemedialAnswerKeysInput(formatEssayQuestions(ansKeys));
              setApiQuestionDifficulties(data.questionDifficulties || []);
              setIsSessionPublic(data.isPublic);
              setIsDemo(data.isDemo === true);

              const key = data.answerKey as string[];
              if (Array.isArray(key)) {
                setKeyInput(key.map((ans: string, idx: number) => `${idx + 1}.${ans}`).join(" "));
              }
            })
            .catch(console.error);
        }, 100);
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      const hash = window.location.hash.replace('#', '');
      const validLayers = ['home', 'setup', 'dashboard', 'grading', 'remedial', 'behavior', 'remedial_dashboard', 'login', 'attendance'];
      
      setInternalLayer((prev) => {
        let dest = hash as Layer;

        // Apply route guard for setup on popstate
        if (dest === 'setup') {
          const s = getAdminSession();
          if (!s?.isAdmin) {
            window.history.replaceState({ layer: 'login' }, '', '#login');
            return 'login';
          }
        }

        if (validLayers.includes(dest)) {
          return dest;
        }
        if (prev !== 'home') {
          window.history.replaceState({ layer: 'home' }, '', '#home');
          return 'home';
        }
        return prev;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gm_layer", layer);
      localStorage.setItem("gm_sessionId", sessionId);
      localStorage.setItem("gm_sessionName", sessionName);
      localStorage.setItem("gm_sessionPassword", sessionPassword);
      localStorage.setItem("gm_isPublicView", String(isPublicView));
      localStorage.setItem("gm_studentName", studentName || "");
      localStorage.setItem("gm_studentClass", studentClass || "");
      localStorage.setItem("gm_subject", subject || "");
    }
  }, [layer, sessionId, sessionName, sessionPassword, isPublicView, studentName, studentClass, subject]);



  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const [isUpdatingQuestions, setIsUpdatingQuestions] = useState(false);

  const checkAdmin = async () => {
    try {
      const res = await fetch("/api/admin/check");
      const data = await res.json();
      setIsAdmin(data.authenticated);
      setAdminUser(data.username || null);
    } catch (err) {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    checkAdmin();
  }, []);

  const analytics = React.useMemo(() => {
    const base = generateAnalytics(gradedStudents, answerKey);
    // Student View: Answer key is hidden, so re-merge and re-calculate insights using pre-calculated API data
    if (answerKey.length === 0 && apiQuestionDifficulties.length > 0) {
      // Re-calculate insights specifically using the apiDifficulties
      const studentInsights = generateInsights(
        gradedStudents, 
        apiQuestionDifficulties, 
        base.standardDeviation, 
        base.avgScore
      );
      return { 
        ...base, 
        questionDifficulties: apiQuestionDifficulties,
        insights: studentInsights
      };
    }
    return base;
  }, [gradedStudents, answerKey, apiQuestionDifficulties]);

  // ── API calls ──

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch("/api/grademaster");
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setIsAdmin(false);
      setAdminUser(null);
      clearAdminSession();
      setToast({ message: "Logout berhasil", type: "success" });
    } catch (err) {
      setToast({ message: "Gagal logout", type: "error" });
    }
  };

  const handleUpdateAdmin = async (username: string, pass: string) => {
    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah profil admin');
    setToast({ message: 'Profil admin berhasil diperbarui!', type: 'success' });
    setAdminUser(username);
  };

  const handleSaveSession = async () => {
    if (!sessionName.trim() || !sessionPassword.trim()) {
      setModalError("Nama sesi dan password wajib diisi");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch("/api/grademaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sessionName: sessionName.trim(),
          password: sessionPassword.trim(),
          answerKey,
          teacher: teacherName,
          subject,
          className: studentClass,
          schoolLevel,
          studentList,
          scoringConfig: { ...scoringConfig, remedialQuestions, remedialAnswerKeys },
          examType,
          academicYear,
          semester,
          kkm,
          remedialEssayCount,
          remedialTimer,
          isDemo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.sessionId) setSessionId(data.sessionId);
      setApiQuestionDifficulties([]); // Reset on new session since no students yet
      
      setToast({ message: data.message || "Sesi berhasil disimpan!", type: "success" });
      closeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan";
      setModalError(msg);
      setModal('error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateRemedialQuestions = async (newQuestions: string[], newKeys: string[]) => {
    if (!sessionId) {
      setToast({ message: "Sesi belum dimuat. Silakan login ke sesi terlebih dahulu.", type: "error" });
      return;
    }
    setIsUpdatingQuestions(true);
    try {
      const res = await fetch("/api/grademaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sessionName: sessionName.trim(),
          password: sessionPassword.trim(),
          answerKey,
          teacher: teacherName,
          subject,
          className: studentClass,
          schoolLevel,
          studentList,
          scoringConfig: { ...scoringConfig, remedialQuestions: newQuestions, remedialAnswerKeys: newKeys },
          examType,
          academicYear,
          kkm,
          remedialEssayCount,
          remedialTimer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRemedialQuestions(newQuestions);
      setRemedialAnswerKeys(newKeys);
      setToast({ message: "Soal & Kunci remedial berhasil diperbarui!", type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsUpdatingQuestions(false);
    }
  };

  const handleLoadPublicSession = async (name?: string) => {
    const targetName = name || sessionName.trim();
    if (!targetName) {
      setModalError("Nama sesi wajib diisi");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`/api/grademaster?name=${encodeURIComponent(targetName)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId || "");
      setSessionName(data.sessionName);
      setTeacherName(data.teacher || "");
      setSubject(data.subject || "");
      setStudentClass(data.className || "");
      setSchoolLevel(data.schoolLevel || "SMA");
      setStudentList(data.studentList || []);
      setGradedStudents(data.gradedStudents || []);
      setKkm(data.kkm || 70);
      setRemedialEssayCount(data.remedialEssayCount || 5);
      setRemedialTimer(data.remedialTimer || 15);
      const questions = data.scoringConfig?.remedialQuestions || [];
      setRemedialQuestions(questions);
      setRemedialQuestionsInput(formatEssayQuestions(questions));
      const ansKeys = data.scoringConfig?.remedialAnswerKeys || [];
      setRemedialAnswerKeys(ansKeys);
      setRemedialAnswerKeysInput(formatEssayQuestions(ansKeys));
      setApiQuestionDifficulties(data.questionDifficulties || []);
      setIsSessionPublic(data.isPublic);
      setIsDemo(data.isDemo === true);
      setIsPublicView(true);
      setLayer("dashboard");
      closeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat sesi publik";
      setToast({ message: msg, type: "error" });
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchSessionData = async (name: string, pass: string) => {
    const params = new URLSearchParams({
      name: name.trim(),
      password: pass.trim(),
    });
    const res = await fetch(`/api/grademaster?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const handleLoadSession = async () => {
    if (!sessionName.trim() || !sessionPassword.trim()) {
      setModalError("Nama sesi dan password wajib diisi");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      const data = await fetchSessionData(sessionName, sessionPassword);

      setSessionId(data.sessionId || "");
      setAnswerKey(data.answerKey || []);
      setTeacherName(data.teacher || "");
      setSubject(data.subject || "");
      setStudentClass(data.className || "");
      setSchoolLevel(data.schoolLevel || "SMA");
      setExamType(data.examType || "UTS");
      setAcademicYear(data.academicYear || "2025/2026");
      setSemester(data.semester || "Ganjil");
      setKkm(data.kkm || 70);
      setRemedialEssayCount(data.remedialEssayCount || 5);
      setRemedialTimer(data.remedialTimer || 15);
      setStudentList(data.studentList || []);
      setGradedStudents(data.gradedStudents || []);
      const questions = data.scoringConfig?.remedialQuestions || [];
      setRemedialQuestions(questions);
      setRemedialQuestionsInput(formatEssayQuestions(questions));
      const ansKeys = data.scoringConfig?.remedialAnswerKeys || [];
      setRemedialAnswerKeys(ansKeys);
      setRemedialAnswerKeysInput(formatEssayQuestions(ansKeys));
      setApiQuestionDifficulties(data.questionDifficulties || []);
      setIsSessionPublic(data.isPublic);
      setIsPublicView(false); // Admin/Teacher view
      
      // Reconstruct keyInput for display
      const key = data.answerKey as string[];
      if (Array.isArray(key)) {
        setKeyInput(key.map((ans: string, idx: number) => `${idx + 1}.${ans}`).join(" "));
      }

      setToast({ message: `Sesi "${data.sessionName}" berhasil dimuat!`, type: "success" });
      setLayer("dashboard");
      closeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat";
      setModalError(msg);
      setModal('error');
    } finally {
      setModalLoading(false);
    }
  };


  const handleDeleteSession = async () => {
    if (!sessionName.trim() || !sessionPassword.trim()) {
      setModalError("Nama sesi dan password wajib diisi");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch("/api/grademaster", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sessionName: sessionName.trim(),
          password: sessionPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: data.message || "Sesi berhasil dihapus!", type: "success" });
      closeModal();
      fetchSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus";
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleReSync = async () => {
    if (!sessionId) return;
    setIsUpdatingQuestions(true);
    try {
      const res = await fetch("/api/grademaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'resync',
          sessionId,
          sessionName: sessionName.trim(),
          password: sessionPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: data.message || "Berhasil sinkronisasi nilai siswa!", type: "success" });
      
      // Refresh session data to get updated student records
      const refreshed = await fetchSessionData(sessionName, sessionPassword);
      if (refreshed) {
        setGradedStudents(refreshed.gradedStudents || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal sinkronisasi";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsUpdatingQuestions(false);
    }
  };

  const handleRemedialInputChange = (input: string) => {
    setRemedialQuestionsInput(input);
    const parsed = parseEssayQuestions(input);
    setRemedialQuestions(parsed);
    setRemedialEssayCount(parsed.length);
  };

  const handleAnswerKeysInputChange = (input: string) => {
    setRemedialAnswerKeysInput(input);
    const parsed = parseEssayQuestions(input);
    setRemedialAnswerKeys(parsed);
  };

  const refreshSessionData = async () => {
    if (!sessionName) return;
    try {
      const data = await fetchSessionData(sessionName, sessionPassword);
      if (data && data.gradedStudents) {
        setGradedStudents(data.gradedStudents);
      }
    } catch (err) {
      console.error("Auto-refresh session failed:", err);
    }
  };

  const handleSaveStudent = async (student: GradedStudent) => {
    setGradedStudents((prev) => [...prev, student]);

    // Persist to DB if we have a session ID
    if (sessionId) {
      try {
        const res = await fetch("/api/grademaster/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            name: student.name,
            mcqAnswers: student.answers,
            essayScores: student.essayScores,
            mcqScore: student.mcqScore,
            essayScore: student.essayScore,
            finalScore: student.finalScore,
            csi: student.csi,
            lps: student.lps,
            correct: student.correct,
            wrong: student.wrong,
            answerKey,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("Failed to persist student:", data.error);
          setToast({ message: `Gagal menyimpan ke database: ${data.error}`, type: "error" });
        }
      } catch (err) {
        console.error("Failed to persist student:", err);
        setToast({ message: "Gagal menyimpan ke database. Periksa koneksi.", type: "error" });
      }
    }
  };

  // ── Helpers ──

  const closeModal = () => {
    setModal(null);
    if (layer === "home") {
      setSessionName("");
      setSessionPassword("");
    }
    setModalError("");
    setModalLoading(false);
  };

  const resetGrading = () => {
    setUserAnswers({});
    setEssayScores(new Array(ESSAY_COUNT).fill(0));
    setStudentName("");
  };

  const handleSetupSubmit = async () => {
    const parsed = parseAnswerKey(keyInput);
    setAnswerKey(parsed);

    setModalLoading(true);
    try {
      const res = await fetch("/api/grademaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          password: sessionPassword.trim(),
          answerKey: parsed,
          teacher: teacherName,
          subject,
          className: studentClass,
          schoolLevel,
          studentList,
          scoringConfig,
          examType,
          academicYear,
          semester,
          kkm,
          remedialEssayCount,
          remedialTimer,
          isDemo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const savedSessionId = data.sessionId;
      if (savedSessionId) {
        setSessionId(savedSessionId);
        try {
          const studentsRes = await fetch(`/api/grademaster/students?sessionId=${savedSessionId}`);
          const studentsData = await studentsRes.json();
          if (studentsRes.ok && studentsData.students) {
            setGradedStudents(studentsData.students);
          }
        } catch (err) {
          console.error("Failed to reload students:", err);
        }
      }
      setToast({ message: "Sesi berhasil dibuat/disimpan", type: "success" });
      setLayer("dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan sesi";
      setModalError(msg);
      setModal('error');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Render ──

  return (
    <div className="relative flex flex-col bg-slate-50 min-h-screen">
      {!['login', 'remedial'].includes(layer) && (
        <Navbar
          isAdmin={isAdmin}
          adminUser={adminUser}
          layer={layer}
          onNavigate={(target) => setLayer(target)}
          onLogout={handleAdminLogout}
          onLoginClick={() => setLayer("login")}
          onOpenSettings={() => setModal("adminSettings")}
        />
      )}

      <div className="w-full">
        {layer === "home" && (
        <HomeLayer
          sessions={sessions}
          isLoading={isLoadingSessions}
          onCreateNew={() => {
            if (isAdmin) {
              setLayer("setup");
              setSessionId("");
              setSessionName("");
              setSessionPassword("");
              setKeyInput("");
              setGradedStudents([]);
              setIsSessionPublic(true);
            } else {
              setLayer("login");
            }
          }}
          onSessionClick={(session: SessionMeta) => {
            if (isAdmin) {
              setSessionName(session.session_name);
              setModal("load");
            } else {
              // Always allow loading public view for all sessions
              handleLoadPublicSession(session.session_name);
            }
          }}
          onDeleteSession={(id, name) => {
            setSessionId(id);
            setSessionName(name);
            setModal("delete");
          }}
          onOpenAbout={() => setModal("about")}
          isAdmin={isAdmin}
          onLoginClick={() => setLayer("login")}
          onLogout={handleAdminLogout}
          onOpenSettings={() => setModal("adminSettings")}
        />
        )}

      {layer === "login" && (
        <LoginLayer
          onBack={() => setLayer("home")}
          onSuccess={(user) => {
            setIsAdmin(true);
            setAdminUser(user);
            saveAdminSession(user);
            setLayer("setup");
          }}
          setToast={setToast}
        />
      )}

      {layer === "setup" && (
        <SetupLayer
          sessionName={sessionName}
          setSessionName={setSessionName}
          sessionPassword={sessionPassword}
          setSessionPassword={setSessionPassword}
          teacherName={teacherName}
          setTeacherName={setTeacherName}
          subject={subject}
          setSubject={setSubject}
          studentClass={studentClass}
          setStudentClass={setStudentClass}
          schoolLevel={schoolLevel}
          setSchoolLevel={setSchoolLevel}
          keyInput={keyInput}
          setKeyInput={setKeyInput}
          studentList={studentList}
          setStudentList={setStudentList}
          examType={examType}
          setExamType={setExamType}
          academicYear={academicYear}
          setAcademicYear={setAcademicYear}
          semester={semester}
          setSemester={setSemester}
          kkm={kkm}
          setKkm={setKkm}
          remedialTimer={remedialTimer}
          setRemedialTimer={setRemedialTimer}
          isPublic={isSessionPublic}
          setIsPublic={setIsSessionPublic}
          isDemo={isDemo}
          setIsDemo={setIsDemo}
          onSubmit={handleSetupSubmit}
          onBack={() => {
            setLayer("home");
            fetchSessions();
          }}
          isLoading={modalLoading}
          setToast={setToast}
        />
      )}

      {layer === "dashboard" && (
        <DashboardLayer
          teacherName={teacherName}
          subject={subject}
          studentClass={studentClass}
          schoolLevel={schoolLevel}
          gradedStudents={gradedStudents}
          analytics={analytics}
          isPublicView={isPublicView}
          sessionName={sessionName}
          kkm={kkm}
          remedialEssayCount={remedialEssayCount}
          isDemo={isDemo}
          sessionId={sessionId}
          academicYear={academicYear}
          semester={semester}
          isAdmin={isAdmin}
          onGradeStudent={() => {
            resetGrading();
            setLayer("grading");
          }}
          onBack={() => {
            setLayer(isPublicView ? "home" : "setup");
            if (isPublicView) fetchSessions();
          }}
          onStudentRemedial={(name) => {
            setStudentName(name);
            setLayer("remedial");
          }}
        />
      )}

      {layer === "grading" && (
        <GradingLayer
          sessionId={sessionId}
          teacherName={teacherName}
          subject={subject}
          answerKey={answerKey}
          studentName={studentName}
          setStudentName={setStudentName}
          studentClass={studentClass}
          academicYear={academicYear}
          schoolLevel={schoolLevel}
          studentList={studentList}
          userAnswers={userAnswers}
          setUserAnswers={setUserAnswers}
          essayScores={essayScores}
          setEssayScores={setEssayScores}
          scoringConfig={scoringConfig}
          onSaveStudent={handleSaveStudent}
          onBack={() => setLayer("dashboard")}
          onReset={resetGrading}
          setToast={setToast}
        />
      )}

      {layer === "remedial" && (
        <StudentRemedialLayer
          studentName={studentName}
          subject={subject}
          remedialEssayCount={remedialEssayCount}
          remedialTimer={remedialTimer}
          remedialQuestions={remedialQuestions}
          sessionId={sessionId}
          className={studentClass}
          academicYear={academicYear}
          examType={examType}
          semester={semester}
          kkm={kkm}
          onBack={() => {
            refreshSessionData();
            setLayer("dashboard");
          }}
          setToast={setToast}
        />
      )}

      {layer === "behavior" && (
        <BehaviorLayer 
          onBack={() => setLayer("home")} 
          setToast={setToast}
          isAdmin={isAdmin}
          activeClass={studentClass}
          activeYear={academicYear}
          gradedStudents={gradedStudents}
        />
      )}

      {layer === "remedial_dashboard" && (
        <RemedialDashboardLayer
          gradedStudents={gradedStudents}
          kkm={kkm}
          examType={examType}
          academicYear={academicYear}
          studentClass={studentClass}
          subject={subject}
          schoolLevel={schoolLevel}
          semester={semester}
          scoringConfig={{ ...scoringConfig, remedialQuestions, remedialAnswerKeys }}
          remedialQuestionsInput={remedialQuestionsInput}
          onBack={() => setLayer("home")}
          remedialAnswerKeysInput={remedialAnswerKeysInput}
          onAnswerKeysInputChange={handleAnswerKeysInputChange}
          onUpdateRemedial={handleUpdateRemedialQuestions}
          onRemedialInputChange={handleRemedialInputChange}
          isSaving={isUpdatingQuestions}
        />
      )}

      {layer === "attendance" && (
        <AttendanceLayer
          onBack={() => setLayer("home")}
          setToast={setToast}
          isAdmin={isAdmin}
          activeClass={studentClass}
          activeYear={academicYear}
        />
      )}

      <Modals
        modal={modal}
        sessionName={sessionName}
        setSessionName={setSessionName}
        sessionPassword={sessionPassword}
        setSessionPassword={setSessionPassword}
        modalLoading={modalLoading}
        modalError={modalError}
        onSave={handleSaveSession}
        onLoad={handleLoadSession}
        onLoadPublic={handleLoadPublicSession}
        onDelete={handleDeleteSession}
        onClose={closeModal}
        onUpdateAdmin={handleUpdateAdmin}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 animate-in ${
            toast.type === "success"
              ? "bg-emerald-600 text-white shadow-emerald-600/30"
              : "bg-rose-600 text-white shadow-rose-600/30"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.message}
        </div>
      )}
      </div>
    </div>
  );
}
