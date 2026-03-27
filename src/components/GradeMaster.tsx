"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, Menu, X, ClipboardList, ShieldCheck, Users } from "lucide-react";

import {
  SessionMeta,
  GradedStudent,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
  ModalType,
  ToastType,
  Layer,
} from "@/lib/grademaster/types";
import { parseAnswerKey } from "@/lib/grademaster/parser";
import { generateAnalytics } from "@/lib/grademaster/analytics";

import HomeLayer from "./grademaster/HomeLayer";
import SetupLayer from "./grademaster/SetupLayer";
import DashboardLayer from "./grademaster/DashboardLayer";
import GradingLayer from "./grademaster/GradingLayer";
import LoginLayer from "./grademaster/LoginLayer";
import Modals from "./grademaster/Modals";
import StudentRemedialLayer from "./grademaster/StudentRemedialLayer";
import BehaviorLayer from "./grademaster/BehaviorLayer";

const ESSAY_COUNT = 5;

export default function GradeMaster() {
  const [layer, setInternalLayer] = useState<Layer>("home");

  const setLayer = useCallback((newLayer: Layer) => {
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
    const hash = window.location.hash.replace('#', '');
    if (['home', 'setup', 'dashboard', 'grading'].includes(hash)) {
      setInternalLayer(hash as Layer);
      window.history.replaceState({ layer: hash }, '', `#${hash}`);
    } else {
      window.history.replaceState({ layer: 'home' }, '', '#home');
    }

    const handlePopState = (e: PopStateEvent) => {
      setInternalLayer((prev) => {
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

  // Session list
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
  const [kkm, setKkm] = useState<number>(70);
  const [remedialEssayCount, setRemedialEssayCount] = useState<number>(5);
  const [remedialTimer, setRemedialTimer] = useState<number>(15);

  // Grading state
  const [studentName, setStudentName] = useState("");
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [essayScores, setEssayScores] = useState<number[]>(new Array(ESSAY_COUNT).fill(0));
  const [gradedStudents, setGradedStudents] = useState<GradedStudent[]>([]);

  // UI state
  const [isPublicView, setIsPublicView] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState<ToastType>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

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

  const analytics = generateAnalytics(gradedStudents, answerKey);

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
          sessionName: sessionName.trim(),
          password: sessionPassword.trim(),
          answerKey,
          teacher: teacherName,
          subject,
          className: studentClass,
          schoolLevel,
          studentList,
          scoringConfig,
          examType,
          academicYear,
          kkm,
          remedialEssayCount,
          remedialTimer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.sessionId) setSessionId(data.sessionId);
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

  const handleLoadSession = async () => {
    if (!sessionName.trim() || !sessionPassword.trim()) {
      setModalError("Nama sesi dan password wajib diisi");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      const params = new URLSearchParams({
        name: sessionName.trim(),
        password: sessionPassword.trim(),
      });
      const res = await fetch(`/api/grademaster?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId || "");
      setAnswerKey(data.answerKey || []);
      setTeacherName(data.teacher || "");
      setSubject(data.subject || "");
      setStudentClass(data.className || "");
      setSchoolLevel(data.schoolLevel || "SMA");
      setExamType(data.examType || "UTS");
      setAcademicYear(data.academicYear || "2025/2026");
      setKkm(data.kkm || 70);
      setRemedialEssayCount(data.remedialEssayCount || 5);
      setRemedialTimer(data.remedialTimer || 15);
      setStudentList(data.studentList || []);
      setGradedStudents(data.gradedStudents || []);

      // Reconstruct keyInput for display
      const key = data.answerKey as string[];
      if (Array.isArray(key)) {
        setKeyInput(key.map((ans: string, idx: number) => `${idx + 1}.${ans}`).join(" "));
      }

      setToast({ message: `Sesi "${data.sessionName}" berhasil dimuat!`, type: "success" });
      setIsPublicView(false);
      setLayer("dashboard");
      closeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat";
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleLoadPublicSession = async () => {
    if (!sessionName.trim()) {
      setModalError("Nama sesi wajib diisi");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      const params = new URLSearchParams({
        name: sessionName.trim(),
      });
      const res = await fetch(`/api/grademaster?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId || "");
      setAnswerKey([]);
      setTeacherName(data.teacher || "");
      setSubject(data.subject || "");
      setStudentClass(data.className || "");
      setSchoolLevel(data.schoolLevel || "SMA");
      setExamType(data.examType || "UTS");
      setAcademicYear(data.academicYear || "2025/2026");
      setKkm(data.kkm || 70);
      setRemedialEssayCount(data.remedialEssayCount || 5);
      setRemedialTimer(data.remedialTimer || 15);
      setStudentList(data.studentList || []);
      setGradedStudents(data.gradedStudents || []);
      setKeyInput("");

      setToast({ message: `Sesi "${data.sessionName}" dimuat sebagai publik!`, type: "success" });
      setIsPublicView(true);
      setLayer("dashboard");
      closeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat sesi publik";
      setModalError(msg);
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

  const handleSaveStudent = async (student: GradedStudent) => {
    setGradedStudents((prev) => [...prev, student]);

    // Persist to DB if we have a session ID
    if (sessionId) {
      try {
        await fetch("/api/grademaster/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            id: student.id,
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
      } catch (err) {
        console.error("Failed to persist student:", err);
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
          kkm,
          remedialEssayCount,
          remedialTimer,
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
    <>
      {isAdmin && !['login', 'remedial'].includes(layer) && (
        <>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="fixed top-4 md:top-6 left-4 md:left-6 z-[200] w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 shadow-lg rounded-xl md:rounded-2xl flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:scale-105 active:scale-95 transition-all"
          >
            {isMenuOpen ? <X size={20} className="md:w-6 md:h-6" /> : <Menu size={20} className="md:w-6 md:h-6" />}
          </button>
          
          {isMenuOpen && (
            <div className="fixed inset-0 z-[190] flex">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)} />
              <div className="relative w-72 md:w-80 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left-full duration-200 border-r border-slate-100">
                <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="font-black text-xl text-slate-800 tracking-tight flex items-center gap-2"><ShieldCheck className="text-indigo-600" /> Admin Panel</h2>
                  <p className="text-[10px] md:text-xs font-bold text-emerald-500 uppercase tracking-widest mt-1.5 flex items-center gap-1.5"><CheckCircle2 size={12}/> Halo, {adminUser || 'Guru'}</p>
                </div>
                <div className="flex-1 p-4 md:p-6 flex flex-col gap-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1">Navigasi Utama</p>
                  <button
                    onClick={() => { setInternalLayer('home'); setIsMenuOpen(false); }}
                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-left text-xs md:text-sm font-bold transition-all flex items-center gap-3 ${layer !== 'behavior' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                  >
                    <ClipboardList size={18} /> Penilaian Ujian
                  </button>
                  <button
                    onClick={() => { setInternalLayer('behavior'); setIsMenuOpen(false); }}
                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-left text-xs md:text-sm font-bold transition-all flex items-center gap-3 ${layer === 'behavior' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                  >
                    <Users size={18} /> Kehadiran & Perilaku
                  </button>
                </div>
                <div className="p-6 border-t border-slate-100">
                  <button onClick={() => { handleAdminLogout(); setIsMenuOpen(false); }} className="w-full p-3 md:p-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest transition-colors text-center shadow-sm border border-rose-100">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

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
              setAnswerKey([]);
              resetGrading();
              setGradedStudents([]);
              setStudentList([]);
              setKkm(70);
              setRemedialEssayCount(5);
              setRemedialTimer(15);
            } else {
              setLayer("login");
            }
          }}
          onSessionClick={(name) => {
            setSessionName(name);
            setModal("load");
          }}
          onDeleteSession={(name) => {
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
          kkm={kkm}
          setKkm={setKkm}
          remedialEssayCount={remedialEssayCount}
          setRemedialEssayCount={setRemedialEssayCount}
          remedialTimer={remedialTimer}
          setRemedialTimer={setRemedialTimer}
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
          academicYear={academicYear}
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
          sessionId={sessionId}
          onBack={() => setLayer("dashboard")}
          setToast={setToast}
        />
      )}

      {layer === "behavior" && (
        <BehaviorLayer
          onBack={() => setLayer("home")}
          setToast={setToast}
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
    </>
  );
}
