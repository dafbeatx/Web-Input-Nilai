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
import { parseAnswerKey } from "@/lib/grademaster/parser";
import { generateAnalytics } from "@/lib/grademaster/analytics";

import HomeLayer from "./grademaster/HomeLayer";
import SetupLayer from "./grademaster/SetupLayer";
import DashboardLayer from "./grademaster/DashboardLayer";
import GradingLayer from "./grademaster/GradingLayer";
import Modals from "./grademaster/Modals";

const ESSAY_COUNT = 5;

export default function GradeMaster() {
  const [layer, setInternalLayer] = useState<Layer>("home");

  const setLayer = useCallback((newLayer: Layer) => {
    window.history.pushState({ layer: newLayer }, '', `#${newLayer}`);
    setInternalLayer(newLayer);
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
      const stateLayer = e.state?.layer || window.location.hash.replace('#', '') || 'home';
      if (['home', 'setup', 'dashboard', 'grading'].includes(stateLayer)) {
        setInternalLayer(stateLayer as Layer);
      } else {
        setInternalLayer('home');
      }
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

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
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
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.sessionId) setSessionId(data.sessionId);
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
      {layer === "home" && (
        <HomeLayer
          sessions={sessions}
          isLoading={isLoadingSessions}
          onCreateNew={() => {
            setLayer("setup");
            setSessionName("");
            setSessionPassword("");
            setKeyInput("");
            setAnswerKey([]);
            resetGrading();
            setGradedStudents([]);
            setStudentList([]);
            setSessionId("");
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
          onGradeStudent={() => {
            resetGrading();
            setLayer("grading");
          }}
          onBack={() => {
            setLayer(isPublicView ? "home" : "setup");
            if (isPublicView) fetchSessions();
          }}
        />
      )}

      {layer === "grading" && (
        <GradingLayer
          teacherName={teacherName}
          subject={subject}
          answerKey={answerKey}
          studentName={studentName}
          setStudentName={setStudentName}
          studentClass={studentClass}
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
