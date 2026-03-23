"use client";

import React, { useState, useEffect } from "react";
import { 
  Key, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  XCircle, 
  LayoutGrid,
  ClipboardList,
  GraduationCap,
  FolderOpen,
  X,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  User,
  BookOpen,
  Plus
} from "lucide-react";

const OPTIONS = ['A', 'B', 'C', 'D'];
const ESSAY_COUNT = 5;
const PG_SCORE_MULTIPLIER = 2;

type ModalType = 'save' | 'load' | null;
type ToastType = { message: string; type: 'success' | 'error' } | null;
type Layer = 'home' | 'setup' | 'dashboard' | 'grading';

type SessionMeta = {
  id: string;
  session_name: string;
  teacher_name: string;
  subject: string;
  class_name: string;
  school_level: string;
  updated_at: string;
};

type GradedStudent = {
  id: string;
  name: string;
  score: number;
  percentage: number;
  kognitif: number;
  pemahaman: number;
  iq: number;
};

function parseAnswerKey(input: string): Record<number, string> {
  const newKey: Record<number, string> = {};

  const normalized = input
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ');

  const patternMatches = normalized.match(/(\d+)\s*[.:\-)\s]\s*([A-Da-d])/g);

  if (patternMatches) {
    patternMatches.forEach(match => {
      const parts = match.match(/(\d+)\s*[.:\-)\s]\s*([A-Da-d])/);
      if (parts) {
        newKey[parseInt(parts[1])] = parts[2].toUpperCase();
      }
    });
  }

  if (Object.keys(newKey).length === 0 && input.trim().length > 0) {
    const cleanLetters = input.toUpperCase().replace(/[^A-D]/g, '');
    for (let i = 0; i < cleanLetters.length; i++) {
      newKey[i + 1] = cleanLetters[i];
    }
  }

  return newKey;
}

export default function GradeMaster() {
  const [layer, setLayer] = useState<Layer>('home');

  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [studentList, setStudentList] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [teacherName, setTeacherName] = useState("");
  const [subject, setSubject] = useState("");
  const [keyInput, setKeyInput] = useState("");

  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [schoolLevel, setSchoolLevel] = useState("SMA");

  const [answerKey, setAnswerKey] = useState<Record<number, string>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [essayScores, setEssayScores] = useState<number[]>(new Array(ESSAY_COUNT).fill(0));
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [modal, setModal] = useState<ModalType>(null);
  const [sessionName, setSessionName] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState<ToastType>(null);
  const [gradedStudents, setGradedStudents] = useState<GradedStudent[]>([]);

  const parsedPreview = parseAnswerKey(keyInput);
  const parsedCount = Object.keys(parsedPreview).length;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/grademaster');
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleSessionClick = (name: string) => {
    setSessionName(name);
    setModal('load');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses file');

      if (data.students && data.students.length > 0) {
        setStudentList(data.students);
        setToast({ message: `${data.students.length} siswa berhasil dimuat!`, type: 'success' });
      } else {
        throw new Error('Tidak ada nama siswa ditemukan di dalam file');
      }
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setUploadingDoc(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleGoToDashboard = async () => {
    if (!teacherName.trim()) {
      setToast({ message: 'Nama guru wajib diisi', type: 'error' });
      return;
    }
    if (!subject.trim()) {
      setToast({ message: 'Mata pelajaran wajib diisi', type: 'error' });
      return;
    }
    if (!studentClass.trim()) {
      setToast({ message: 'Kelas wajib diisi', type: 'error' });
      return;
    }
    if (!sessionName.trim()) {
      setToast({ message: 'Nama sesi wajib diisi', type: 'error' });
      return;
    }
    if (!sessionPassword.trim()) {
      setToast({ message: 'Password sesi wajib diisi', type: 'error' });
      return;
    }
    if (parsedCount === 0) {
      setToast({ message: 'Kunci jawaban belum valid', type: 'error' });
      return;
    }

    setAnswerKey(parsedPreview);
    setTotalQuestions(parsedCount);
    
    setModalLoading(true);
    try {
      const res = await fetch('/api/grademaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          password: sessionPassword.trim(),
          answerKey: parsedPreview,
          studentAnswers: userAnswers,
          essayScores,
          totalQuestions: parsedCount,
          gradedStudents,
          teacherName,
          subject,
          className: studentClass,
          schoolLevel,
          studentList
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: 'Sesi kelas berhasil dibuat/disimpan', type: 'success' });
      setLayer('dashboard');
    } catch (err: any) {
      setToast({ message: err.message || 'Gagal menyimpan sesi', type: 'error' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleStartGradingStudent = () => {
    setUserAnswers({});
    setEssayScores(new Array(ESSAY_COUNT).fill(0));
    setLayer('grading');
  };

  const handleBackToSetup = () => {
    setLayer('setup');
  };

  const handleAnswerSelect = (questionNum: number, option: string) => {
    setUserAnswers((prev: Record<number, string>) => ({ ...prev, [questionNum]: option }));
  };

  const handleEssayChange = (index: number, val: string) => {
    let score = parseInt(val) || 0;
    if (score < 0) score = 0;
    if (score > 4) score = 4;
    const newScores = [...essayScores];
    newScores[index] = score;
    setEssayScores(newScores);
  };

  const resetAnswers = () => {
    setUserAnswers({});
    setEssayScores(new Array(ESSAY_COUNT).fill(0) as number[]);
    setStudentName("");
  };

  const handleSaveStudentScore = () => {
    if (!studentName.trim()) {
      setToast({ message: 'Nama siswa wajib diisi sebelum menyimpan', type: 'error' });
      return;
    }

    const correctCount = Object.keys(userAnswers).filter(k => {
      const qNum = parseInt(k);
      return userAnswers[qNum] === answerKey[qNum];
    }).length;
    
    const totalEssay = essayScores.reduce((a, b) => a + b, 0);
    const finalScore = (correctCount * PG_SCORE_MULTIPLIER) + totalEssay;
    const maxScore = (totalQuestions * PG_SCORE_MULTIPLIER) + 20;
    const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;
    
    const kognitif = percentage;
    const pemahaman = Math.min(100, percentage + Math.floor(Math.random() * 10) + 1);
    const iq = Math.round(90 + (percentage * 0.4)); // Simulate IQ

    const newStudent: GradedStudent = {
      id: Date.now().toString(),
      name: studentName.trim(),
      score: finalScore,
      percentage,
      kognitif,
      pemahaman,
      iq
    };

    setGradedStudents(prev => [...prev, newStudent]);
    setToast({ message: `Nilai ${studentName} berhasil disimpan ke daftar kelas!`, type: 'success' });
    resetAnswers();
  };

  const openModal = (type: ModalType) => {
    setModal(type);
    setSessionName("");
    setSessionPassword("");
    setModalError("");
  };

  const closeModal = () => {
    setModal(null);
    setSessionName("");
    setSessionPassword("");
    setModalError("");
    setModalLoading(false);
  };

  const handleSaveSession = async () => {
    if (!sessionName.trim() || !sessionPassword.trim()) {
      setModalError("Nama sesi dan password wajib diisi");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      const res = await fetch('/api/grademaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          password: sessionPassword.trim(),
          answerKey,
          studentAnswers: userAnswers,
          essayScores,
          totalQuestions,
          gradedStudents,
          teacherName,
          subject,
          className: studentClass,
          schoolLevel,
          studentList
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

      setToast({ message: data.message || 'Sesi berhasil disimpan!', type: 'success' });
      closeModal();
    } catch (err: any) {
      setModalError(err.message);
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
      if (!res.ok) throw new Error(data.error || 'Gagal memuat sesi');

      setAnswerKey(data.answerKey);
      setUserAnswers(data.studentAnswers || {});
      setEssayScores(data.essayScores || new Array(ESSAY_COUNT).fill(0));
      setTotalQuestions(data.totalQuestions || 0);
      setGradedStudents(data.gradedStudents || []);
      setTeacherName(data.teacherName || "");
      setSubject(data.subject || "");
      setStudentClass(data.className || "");
      setSchoolLevel(data.schoolLevel || "SMA");
      setStudentList(data.studentList || []);

      const restoredInput = Object.entries(data.answerKey as Record<string, string>)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([k, v]) => `${k}.${v}`)
        .join(' ');
      setKeyInput(restoredInput);

      setToast({ message: `Sesi "${data.sessionName}" berhasil dimuat!`, type: 'success' });
      setLayer('grading');
      closeModal();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const correctCount = Object.keys(userAnswers).filter(k => {
    const qNum = parseInt(k);
    return userAnswers[qNum] === answerKey[qNum];
  }).length;

  const incorrectCount = Object.keys(userAnswers).filter(k => {
    const qNum = parseInt(k);
    return answerKey[qNum] && userAnswers[qNum] !== answerKey[qNum];
  }).length;

  const totalEssay = essayScores.reduce((a: number, b: number) => a + b, 0);
  const finalScore = (correctCount * PG_SCORE_MULTIPLIER) + totalEssay;
  const maxScore = (totalQuestions * PG_SCORE_MULTIPLIER) + 20;
  const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;

  const avgKognitif = gradedStudents.length > 0 ? Math.round(gradedStudents.reduce((acc, curr) => acc + curr.kognitif, 0) / gradedStudents.length) : 0;
  const avgPemahaman = gradedStudents.length > 0 ? Math.round(gradedStudents.reduce((acc, curr) => acc + curr.pemahaman, 0) / gradedStudents.length) : 0;
  const avgIq = gradedStudents.length > 0 ? Math.round(gradedStudents.reduce((acc, curr) => acc + curr.iq, 0) / gradedStudents.length) : 0;
  const avgScore = gradedStudents.length > 0 ? Math.round(gradedStudents.reduce((acc, curr) => acc + curr.score, 0) / gradedStudents.length) : 0;

  if (layer === 'home') {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto animate-in">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 text-indigo-600 mb-2">
              <GraduationCap size={32} />
              <span className="text-sm font-black uppercase tracking-[0.2em]">GradeMaster OS</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">Kumpulan Kelas</h1>
            <p className="text-slate-500 font-bold mt-2">Pilih sesi kelas Anda atau buat sesi baru untuk mulai evaluasi.</p>
          </div>
          <button onClick={() => { setLayer('setup'); setSessionName(''); setKeyInput(''); setAnswerKey({}); resetAnswers(); setGradedStudents([]); setStudentList([]); }} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Buat Sesi Baru
          </button>
        </header>

        {isLoadingSessions ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={40} className="animate-spin text-indigo-500" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-black text-slate-700 mb-2">Belum Ada Sesi Kelas</h3>
            <p className="text-slate-500 font-bold mb-6">Mulai dengan membuat sesi kelas baru untuk menyimpan kunci dan menilai siswa.</p>
            <button onClick={() => setLayer('setup')} className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">
              Buat Sesi Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map(s => (
              <div key={s.id} onClick={() => handleSessionClick(s.session_name)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <BookOpen size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">{s.school_level || 'N/A'}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{s.session_name}</h3>
                  <p className="text-sm font-bold text-slate-500 truncate">{s.subject || 'Mapel tidak diketahui'}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <User size={14} />
                    <span className="truncate max-w-[120px]">{s.teacher_name || 'Guru'}</span>
                  </div>
                  <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                    Kls {s.class_name || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {renderModal()}
        {renderToast()}
      </div>
    );
  }

  if (layer === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 animate-in">
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-indigo-200">
              <GraduationCap size={14} /> Koreksi Otomatis
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight font-outfit">GradeMaster</h1>
            <p className="text-slate-400 text-sm mt-2">Isi data di bawah untuk mulai mengoreksi</p>
          </div>

          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <FolderOpen size={14} /> Nama Sesi Kelas (Unik)
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Contoh: UTS Mat 10A"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                  />
               </div>
               <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <Key size={14} /> Password Sesi
                  </label>
                  <input
                    type="password"
                    value={sessionPassword}
                    onChange={(e) => setSessionPassword(e.target.value)}
                    placeholder="Untuk akses & edit"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                  />
               </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <User size={14} /> Nama Guru
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <BookOpen size={14} /> Mata Pelajaran
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Matematika"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <LayoutGrid size={14} /> Kelas
                </label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="Contoh: 10A"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <GraduationCap size={14} /> Tingkat
                </label>
                <select
                  value={schoolLevel}
                  onChange={(e) => setSchoolLevel(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer"
                >
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <div className="flex items-center gap-2">
                  <User size={14} /> Daftar Siswa ({studentList.length} Anak)
                </div>
                {uploadingDoc && <Loader2 size={14} className="animate-spin text-indigo-500 text-xs" />}
              </label>
              <div className="relative">
                <input
                   type="file"
                   accept=".txt,.csv,.xml,.pdf,.docx"
                   onChange={handleFileUpload}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full bg-slate-50 border-2 border-slate-100 border-dashed rounded-2xl p-4 text-sm font-bold text-slate-500 text-center transition-all hover:bg-slate-100 flex flex-col items-center justify-center gap-2">
                   {studentList.length > 0 ? (
                      <span className="text-indigo-600 flex items-center gap-2"><CheckCircle2 size={24} className="mb-1" /> {studentList.length} Nama Terekstrak</span>
                   ) : (
                      <>
                        <ClipboardList size={24} className="text-slate-400" />
                        <span>Klik / Seret file daftar siswa ke sini</span>
                        <span className="text-[10px] font-normal text-slate-400">Mendukung .PDF, .DOCX, .TXT, .CSV, .XML</span>
                      </>
                   )}
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <Key size={14} /> Kunci Jawaban
              </label>
              <textarea
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={"Tempel kunci jawaban di sini, format bebas:\n1.A 2.B 3.C 4.D ...\n1.A2.B3.C4.D\n1) A  2) B  3) C\nABCDABCD..."}
                rows={5}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 resize-none font-mono"
              />

              {keyInput.trim().length > 0 && (
                <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Preview Kunci Jawaban
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${parsedCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                      {parsedCount > 0 ? `${parsedCount} soal terdeteksi` : 'Belum terdeteksi'}
                    </span>
                  </div>
                  {parsedCount > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(parsedPreview)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([num, ans]) => (
                          <span key={num} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-slate-200 text-xs font-bold">
                            <span className="text-slate-400">{num}.</span>
                            <span className="text-indigo-600">{ans}</span>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleGoToDashboard}
              disabled={modalLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {modalLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} Mulai Evaluasi 
            </button>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => { setLayer('home'); fetchSessions(); }}
                className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} /> Kembali ke Kumpulan Kelas
              </button>
            </div>
          </div>
        </div>

        {renderModal()}
        {renderToast()}
      </div>
    );
  }

  if (layer === 'dashboard') {
    return (
      <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto animate-in">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-indigo-200">
             <LayoutGrid size={14} /> Dashboard Analitik
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight font-outfit mb-3">Ikhtisar Kelas</h1>
          <p className="text-slate-500 font-bold">Halo, {teacherName} • {subject}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
               <h3 className="text-2xl font-black mb-1 relative z-10 font-outfit">Kelas {studentClass}</h3>
               <p className="text-indigo-200 text-xs font-bold mb-8 relative z-10 uppercase tracking-widest">Tingkat {schoolLevel}</p>
               <button onClick={handleStartGradingStudent} className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex justify-center items-center gap-2 relative z-10">
                  Koreksi Siswa <ArrowRight size={16} />
               </button>
            </div>
            
            <button onClick={() => setLayer('setup')} className="w-full py-4 text-slate-400 font-bold hover:text-indigo-600 transition-colors uppercase tracking-widest text-xs flex justify-center items-center gap-2">
               <ArrowLeft size={16} /> Kembali ke Pengaturan
            </button>
          </div>

          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
                 <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 relative z-10">Analitik Prediktif Rata-rata Kelas</h4>
                 
                 <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full relative z-10">
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                       <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
                          <circle cx="72" cy="72" r="62" className="stroke-slate-100" strokeWidth="14" fill="none" />
                          <circle cx="72" cy="72" r="62" className="stroke-emerald-400" strokeWidth="14" fill="none" strokeDasharray="389.5" strokeDashoffset={389.5 - ((avgIq - 90) / 40) * 389.5} strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-slate-800">{avgIq}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mt-1">Rata IQ</span>
                       </div>
                    </div>

                    <div className="flex-1 w-full max-w-sm space-y-6 text-left">
                       <div>
                          <div className="flex justify-between items-end mb-2">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-sky-500">Kecerdasan Kognitif</span>
                                <span className="text-xs font-bold text-slate-400">{avgKognitif >= 80 ? 'Tingkat Menengah Atas' : avgKognitif >= 60 ? 'Tingkat Menengah' : 'Perlu Bimbingan'}</span>
                             </div>
                             <span className="text-xl font-black text-slate-800">{avgKognitif}%</span>
                          </div>
                          <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                             <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full relative overflow-hidden transition-all duration-1000" style={{ width: `${avgKognitif}%`}}>
                                <div className="absolute inset-0 bg-white/20 w-1/2 skew-x-12 translate-x-full animate-[shimmer_2s_infinite]"></div>
                             </div>
                          </div>
                       </div>
                       
                       <div>
                          <div className="flex justify-between items-end mb-2">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Tingkat Pemahaman</span>
                                <span className="text-xs font-bold text-slate-400">{avgPemahaman >= 80 ? 'Di Atas Rata-rata' : avgPemahaman >= 60 ? 'Rata-rata' : 'Di Bawah Rata-rata'}</span>
                             </div>
                             <span className="text-xl font-black text-slate-800">{avgPemahaman}%</span>
                          </div>
                          <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                             <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full relative overflow-hidden transition-all duration-1000" style={{ width: `${avgPemahaman}%`}}>
                                <div className="absolute inset-0 bg-white/20 w-1/2 skew-x-12 translate-x-full animate-[shimmer_2s_infinite]"></div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
             </div>
          </div>
        </div>

        {/* Tabel Daftar Siswa - Setiap Anak */}
        <div className="mt-8 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
               <div>
                  <h3 className="text-lg font-black text-slate-800 font-outfit">Lembar Penilaian Siswa</h3>
                  <p className="text-xs font-bold text-slate-400">Total {gradedStudents.length} siswa telah dikoreksi (Rata-rata Kelas: {avgScore})</p>
               </div>
               <button onClick={handleStartGradingStudent} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                  <Plus size={14} /> Tambah Siswa
               </button>
            </div>

            {gradedStudents.length === 0 ? (
               <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <User size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-bold text-sm">Belum ada nilai tersimpan.</p>
                  <p className="text-slate-400 text-xs mt-1">Klik "Koreksi Siswa" untuk memulai evaluasi.</p>
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                     <thead>
                        <tr className="border-b-2 border-slate-100">
                           <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Siswa</th>
                           <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nilai Akhir</th>
                           <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Kecerdasan Kognitif</th>
                           <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Pemahaman</th>
                           <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Estimasi IQ</th>
                        </tr>
                     </thead>
                     <tbody>
                        {gradedStudents.map((s, idx) => (
                           <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 font-bold text-slate-700 text-sm flex items-center gap-3">
                                 <span className="w-6 h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">{idx + 1}</span>
                                 {s.name}
                              </td>
                              <td className="py-4">
                                 <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black">{s.score} / {maxScore}</span>
                              </td>
                              <td className="py-4">
                                 <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${s.kognitif}%` }}></div></div>
                                    <span className="text-xs font-bold text-slate-500">{s.kognitif}%</span>
                                 </div>
                              </td>
                              <td className="py-4">
                                 <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-400" style={{ width: `${s.pemahaman}%` }}></div></div>
                                    <span className="text-xs font-bold text-slate-500">{s.pemahaman}%</span>
                                 </div>
                              </td>
                              <td className="py-4 font-black text-emerald-600 text-sm">{s.iq}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
        </div>
        {renderToast()}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto animate-in">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <button onClick={() => setLayer('dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-colors mb-3">
            <ArrowLeft size={14} /> Kembali ke Dashboard
          </button>
          <div className="flex items-center gap-3 text-indigo-600 mb-1">
            <GraduationCap size={24} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Koreksi Otomatis</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">{teacherName}</h1>
          <p className="text-sm text-slate-400 font-bold mt-1">{subject} • {totalQuestions} Soal PG</p>
        </div>
        
        <div className="flex items-center gap-3">
            <button onClick={resetAnswers} className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all flex items-center gap-2">
                <RotateCcw size={14} /> Reset
            </button>
            <button onClick={() => openModal('save')} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                <Save size={14} /> Simpan
            </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Data Siswa Diperiksa</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identitas untuk format nilai (Kelas {studentClass})</p>
                </div>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Siswa</label>
                {studentList.length > 0 ? (
                  <select 
                    value={studentName} 
                    onChange={(e) => setStudentName(e.target.value)} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="" disabled>Pilih nama siswa...</option>
                    {studentList
                      .filter(name => !gradedStudents.find(gs => gs.name.toLowerCase() === name.toLowerCase()))
                      .map((name, idx) => (
                        <option key={idx} value={name}>{name}</option>
                      ))}
                  </select>
                ) : (
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Contoh: Ahmad" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"/>
                )}
             </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Lembar Jawaban Siswa</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Klik pilihan yang dijawab siswa</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: totalQuestions }).map((_: unknown, i: number) => {
                const qNum = i + 1;
                const selected = userAnswers[qNum];
                const correct = answerKey[qNum];
                
                let statusClass = "bg-slate-100 text-slate-400";
                let statusText = "PILIH";
                
                if (selected) {
                    if (!correct) {
                        statusClass = "bg-amber-50 text-amber-600 border border-amber-100";
                        statusText = "NO KEY";
                    } else if (selected === correct) {
                        statusClass = "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20";
                        statusText = "BENAR";
                    } else {
                        statusClass = "bg-rose-500 text-white shadow-lg shadow-rose-500/20";
                        statusText = `SALAH (${correct})`;
                    }
                }

                return (
                  <div key={qNum} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm">{qNum}</span>
                      <div className="flex flex-wrap gap-2 sm:gap-2">
                        {OPTIONS.map(opt => (
                          <div key={opt} className="relative">
                            <input 
                              type="radio" 
                              name={`q${qNum}`} 
                              id={`q${qNum}${opt}`}
                              className="hidden"
                              checked={selected === opt}
                              onChange={() => handleAnswerSelect(qNum, opt)}
                            />
                            <label htmlFor={`q${qNum}${opt}`} className="custom-radio-label">{opt}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusClass}`}>
                        {statusText}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-6">
          <div className="glass-card rounded-[2.5rem] p-8 overflow-hidden relative group border-indigo-100 bg-white/80">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -z-10 group-hover:bg-indigo-500/20 transition-colors"></div>
            
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Skor Akhir</p>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-7xl font-black text-slate-900 leading-none">{finalScore}</span>
              <span className="text-slate-300 font-bold mb-1">/ {maxScore}</span>
            </div>

            {studentName.trim() && studentClass.trim() && (
              <div className="mb-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Format Nama</p>
                 <p className="text-sm font-bold text-indigo-700 break-all select-all">
                   {`${studentName}_${studentClass}_${schoolLevel}`.replace(/\s+/g, '_')}
                 </p>
              </div>
            )}

            <div className="mb-8 p-6 bg-slate-900 rounded-[2rem] text-white overflow-hidden relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Persentase</span>
                <span className="text-2xl font-black">{percentage}%</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden p-1">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                  <CheckCircle2 size={20} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Benar</p>
                <span className="text-2xl font-black text-slate-800">{correctCount}</span>
              </div>
              <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3">
                  <XCircle size={20} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Salah</p>
                <span className="text-2xl font-black text-slate-800">{incorrectCount}</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
               <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                        <LayoutGrid size={16} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800">Nilai Essay (Max 4)</span>
               </div>
               
               <div className="grid grid-cols-5 gap-3">
                 {essayScores.map((score, idx) => (
                   <div key={idx}>
                     <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">#{idx+1}</label>
                     <input 
                       type="number" 
                       min="0"
                       max="4"
                       value={score}
                       onChange={(e) => handleEssayChange(idx, e.target.value)}
                       className="w-full bg-slate-50 rounded-xl border-2 border-slate-100 p-2 text-center font-black text-lg text-indigo-700 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                     />
                   </div>
                 ))}
               </div>
               <div className="mt-4 flex justify-between items-center text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                 <span className="uppercase tracking-widest">Total Essay</span>
                 <span className="text-indigo-600">{totalEssay} / 20</span>
               </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
               <button onClick={handleSaveStudentScore} className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all mb-3 flex items-center justify-center gap-2">
                  <Save size={18} /> Simpan Nilai ke Daftar
               </button>
               <div className="text-[10px] text-center font-bold text-slate-400 mt-2 px-2">
                  Simpan nilai siswa ini ke daftar kelas untuk melihat analitik dan rata-rata.
               </div>
            </div>
          </div>
        </aside>
      </main>

      {renderModal()}
      {renderToast()}
    </div>
  );

  function renderModal() {
    if (!modal) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 animate-in">
          <button onClick={closeModal} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors">
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${modal === 'save' ? 'bg-indigo-600' : 'bg-sky-600'}`}>
              {modal === 'save' ? <Save size={20} /> : <FolderOpen size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{modal === 'save' ? 'Simpan Sesi' : 'Muat Sesi'}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {modal === 'save' ? 'Simpan data koreksi ke database' : 'Muat data koreksi dari database'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Sesi</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => { setSessionName(e.target.value); setModalError(""); }}
                placeholder="Contoh: UTS Kelas 10A"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={sessionPassword}
                onChange={(e) => { setSessionPassword(e.target.value); setModalError(""); }}
                placeholder="Masukkan password"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                onKeyDown={(e) => e.key === 'Enter' && (modal === 'save' ? handleSaveSession() : handleLoadSession())}
              />
            </div>

            {modalError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                <AlertCircle size={16} className="text-rose-500 shrink-0" />
                <p className="text-xs font-bold text-rose-600">{modalError}</p>
              </div>
            )}

            <button
              onClick={modal === 'save' ? handleSaveSession : handleLoadSession}
              disabled={modalLoading}
              className={`w-full py-3.5 rounded-xl text-white text-sm font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                modal === 'save' 
                  ? 'bg-indigo-600 shadow-indigo-600/20 hover:scale-[1.02] active:scale-95' 
                  : 'bg-sky-600 shadow-sky-600/20 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {modalLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Memproses...</>
              ) : modal === 'save' ? (
                <><Save size={16} /> Simpan</>
              ) : (
                <><FolderOpen size={16} /> Muat</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderToast() {
    if (!toast) return null;
    return (
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 animate-in ${
        toast.type === 'success' 
          ? 'bg-emerald-600 text-white shadow-emerald-600/30' 
          : 'bg-rose-600 text-white shadow-rose-600/30'
      }`}>
        {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
        {toast.message}
      </div>
    );
  }
}
