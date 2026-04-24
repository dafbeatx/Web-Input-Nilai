"use client";

import React, { useRef, useCallback } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Save,
  RotateCcw,
  User,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Undo2,
  ScanSearch,
  Loader2,
  AlertCircle,
  AlertOctagon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { GradedStudent, ScoringConfig, DEFAULT_SCORING_CONFIG, ToastType } from '@/lib/grademaster/types';
import { calculateStudentResult, getScoreLabel } from '@/lib/grademaster/scoring';

const OPTIONS = ['A', 'B', 'C', 'D'];

interface GradingLayerProps {
  sessionId: string;
  teacherName: string;
  subject: string;
  answerKey: string[];
  studentName: string;
  setStudentName: (v: string) => void;
  studentClass: string;
  academicYear: string;
  schoolLevel: string;
  studentList: string[];
  userAnswers: Record<number, string>;
  setUserAnswers: (v: Record<number, string>) => void;
  essayScores: number[];
  setEssayScores: (v: number[]) => void;
  scoringConfig: ScoringConfig;
  onSaveStudent: (student: GradedStudent) => void;
  onBack: () => void;
  onReset: () => void;
  setToast: (t: ToastType) => void;
  kkm?: number;
}

export default function GradingLayer(props: GradingLayerProps) {
  const {
    sessionId, teacherName, subject, answerKey,
    studentName, setStudentName,
    studentClass, academicYear, schoolLevel, studentList,
    userAnswers, setUserAnswers,
    essayScores, setEssayScores,
    scoringConfig, onSaveStudent, onBack, onReset, setToast, kkm = 70
  } = props;

  const totalQuestions = answerKey.length;
  const undoStack = useRef<{ qNum: number; prev: string | undefined }[]>([]);
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isDetecting, setIsDetecting] = React.useState(false);
  const [dbStudents, setDbStudents] = React.useState<{id: string, name: string}[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isNewStudent, setIsNewStudent] = React.useState(false);

  const result = calculateStudentResult(answerKey, userAnswers, essayScores, scoringConfig);

  React.useEffect(() => {
    if (!studentClass || !academicYear) return;
    const fetchStudents = async () => {
      try {
        const { data } = await supabase
          .from('gm_behaviors')
          .select('id, student_name')
          .eq('class_name', studentClass)
          .eq('academic_year', academicYear)
          .order('student_name');
        if (data) {
          setDbStudents(data.map((d: any) => ({ id: d.id, name: d.student_name })));
        }
      } catch (err) {
        console.error("Failed to fetch db students", err);
      }
    };
    fetchStudents();
  }, [studentClass, academicYear]);

  React.useEffect(() => {
    if (!studentName) {
      setIsNewStudent(false);
    }
  }, [studentName]);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredStudents = React.useMemo(() => {
    // 1. Start with database-backed students from behavior logs
    const seen = new Set(dbStudents.map(s => s.name.toLowerCase().trim()));
    const combined = [...dbStudents];

    // 2. Add names from studentList if they aren't already represented
    (studentList || []).forEach((name, idx) => {
      const normalized = name.toLowerCase().trim();
      if (normalized && !seen.has(normalized)) {
        combined.push({ id: `list-${idx}`, name: name.trim() });
        seen.add(normalized);
      }
    });

    if (!studentName) return combined;
    return combined.filter(s => s.name.toLowerCase().includes(studentName.toLowerCase()));
  }, [dbStudents, studentName, studentList]);

  const selectStudent = (id: string, name: string) => {
    setStudentName(name);
    setIsDropdownOpen(false);
    setIsNewStudent(false);
  };

  const handleAutoDetect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDetecting(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentList', JSON.stringify(studentList));

    try {
      const res = await fetch('/api/grademaster/auto-detect', {
          method: 'POST',
          body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.studentName) setStudentName(data.studentName);
      
      const warnings: string[] = [];
      if (data.studentClass && !data.studentClass.toLowerCase().includes(studentClass.toLowerCase()) && !studentClass.toLowerCase().includes(data.studentClass.toLowerCase())) {
        warnings.push(`Kelas (${data.studentClass}) berbeda dari target sesi (${studentClass}).`);
      }
      
      if (warnings.length > 0) {
         setToast({ message: `Siswa terdeteksi: ${data.studentName}. Perhatian: ${warnings.join(' ')}`, type: 'error' });
      } else {
         setToast({ message: `Data siswa berhasil dideteksi: ${data.studentName}!`, type: 'success' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Gagal mendeteksi dokumen', type: 'error' });
    } finally {
      setIsDetecting(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAnswerSelect = useCallback((questionNum: number, option: string) => {
    undoStack.current.push({ qNum: questionNum, prev: userAnswers[questionNum] });

    setUserAnswers({ ...userAnswers, [questionNum]: option });

    // Auto-advance to next unanswered question
    const nextQ = questionNum + 1;
    if (nextQ <= totalQuestions) {
      const nextEl = questionRefs.current.get(nextQ);
      if (nextEl) {
        setTimeout(() => {
          nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }, [userAnswers, setUserAnswers, totalQuestions]);

  const handleUndo = useCallback(() => {
    const last = undoStack.current.pop();
    if (!last) return;
    const newAnswers = { ...userAnswers };
    if (last.prev === undefined) {
      delete newAnswers[last.qNum];
    } else {
      newAnswers[last.qNum] = last.prev;
    }
    setUserAnswers(newAnswers);
  }, [userAnswers, setUserAnswers]);

  const handleEssayChange = (index: number, val: string) => {
    let score = parseInt(val) || 0;
    score = Math.max(0, Math.min(4, score));
    const newScores = [...essayScores];
    newScores[index] = score;
    setEssayScores(newScores);
  };

  const handleSave = () => {
    if (!studentName.trim()) {
      setToast({ message: 'Nama siswa wajib diisi', type: 'error' });
      return;
    }

    const student: GradedStudent = {
      id: Date.now().toString(),
      name: studentName.trim(),
      answers: { ...userAnswers },
      essayScores: [...essayScores],
      correct: result.correct,
      wrong: result.wrong,
      mcqScore: Math.round(result.score),
      essayScore: Math.round(result.essayScore),
      finalScore: result.finalScore,
      percentage: result.percentage,
      csi: result.csi,
      lps: result.lps,
    };

    onSaveStudent(student);
    setToast({ message: `Nilai ${studentName} berhasil disimpan!`, type: 'success' });
    onReset();
  };

  const totalEssay = essayScores.reduce((a, b) => a + b, 0);
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="min-h-dvh bg-transparent p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto animate-in page-pt md:pt-16">
      <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 md:gap-2 text-on-surface-variant hover:text-primary font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors mb-2 md:mb-3 border border-transparent hover:border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary/10 w-fit">
            <ArrowLeft size={12} className="md:w-[14px] md:h-[14px]" /> Kembali ke Dashboard
          </button>
          <div className="flex items-center gap-2 md:gap-3 text-primary mb-1">
            <GraduationCap size={20} className="md:w-6 md:h-6" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">Koreksi Otomatis</span>
          </div>
          <h1 className="text-[22px] md:text-4xl font-black text-on-surface tracking-tight">{teacherName}</h1>
          <p className="text-xs md:text-sm text-on-surface-variant font-bold mt-1">{subject} • {totalQuestions} Soal PG</p>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={handleUndo} disabled={undoStack.current.length === 0} className="px-3 py-2.5 md:px-4 md:py-3 bg-surface-variant border border-outline-variant rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-on-surface-variant hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-30">
            <Undo2 size={12} className="md:w-[14px] md:h-[14px]" /> Undo
          </button>
          <button onClick={onReset} className="px-3 py-2.5 md:px-4 md:py-3 bg-surface-variant border border-outline-variant rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-on-surface-variant hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all flex items-center gap-1.5">
            <RotateCcw size={12} className="md:w-[14px] md:h-[14px]" /> Reset
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        <div className="lg:col-span-8 space-y-4 md:space-y-6">
          {/* Student Identity */}
          <section className="bg-surface premium-shadow backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-outline-variant premium-shadow relative z-50">
            {isDetecting && (
              <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm z-40 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center text-primary bg-slate-900 border border-outline-variant p-6 rounded-2xl premium-shadow">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Memproses LJK...</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2.5 md:gap-3 mb-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center border border-primary/20">
                <User size={16} className="md:w-5 md:h-5" />
              </div>
              <div>
                <h2 className="font-bold text-on-surface text-sm md:text-base">Data Siswa</h2>
                <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Kelas {studentClass}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest">Nama Siswa</label>
              <label className="cursor-pointer flex items-center gap-1.5 text-primary hover:text-white transition-all bg-primary/10 hover:bg-primary px-3 py-1.5 rounded-full border border-primary/20 shadow-sm active:scale-95 group">
                <ScanSearch size={12} className="md:w-3.5 md:h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">Auto-Detect LJK</span>
                <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleAutoDetect} />
              </label>
            </div>
            <div className="relative" ref={dropdownRef}>
                <div className="relative flex items-center group">
                  <User size={16} className="absolute left-4 text-on-surface-variant/50 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (!isNewStudent) setIsDropdownOpen(true);
                    }}
                    onClick={() => {
                      if (!isNewStudent) setIsDropdownOpen(true);
                    }}
                    placeholder="Cari atau ketik nama siswa..."
                    className="w-full bg-white border border-surface-container-high rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold text-on-surface outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-on-surface-variant/40 shadow-sm"
                  />
                </div>
                
                {isDropdownOpen && !isNewStudent && (
                  <div className="absolute z-[100] w-full mt-2 bg-white/90 backdrop-blur-xl border border-surface-container-high shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-2xl max-h-[280px] overflow-y-auto animate-in fade-in slide-in-from-top-2 overflow-hidden">
                    {filteredStudents.length > 0 ? (
                      <div className="p-2">
                        <div className="px-3 py-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface-variant/50">Hasil Pencarian</span>
                        </div>
                        <ul className="space-y-0.5">
                          {filteredStudents.map(s => (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => selectStudent(s.id, s.name)}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-on-surface-variant hover:bg-primary/5 hover:text-primary rounded-xl transition-all flex items-center justify-between group/item"
                              >
                                <span>{s.name}</span>
                                <CheckCircle2 size={14} className="opacity-0 group-hover/item:opacity-100 transition-opacity text-primary" />
                              </button>
                            </li>
                          ))}
                          <div className="h-px bg-surface-container-high my-2 mx-2" />
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsNewStudent(true);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-black text-primary hover:bg-primary/10 rounded-xl transition-all flex items-center gap-3"
                            >
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <AlertCircle size={14} />
                              </div>
                              Tambah "{studentName || 'baru'}"
                            </button>
                          </li>
                        </ul>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-3">
                          <User size={20} className="text-on-surface-variant/30" />
                        </div>
                        <p className="text-xs font-bold text-on-surface-variant mb-4">Siswa tidak ditemukan</p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewStudent(true);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                          Tambah Sebagai Siswa Baru
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
            {isNewStudent && (
              <p className="text-[10px] mt-2 font-bold text-amber-500 flex items-center gap-1.5 animate-in fade-in pl-1">
                <AlertCircle size={12} /> Mode tambah siswa baru
                <button 
                  onClick={() => setIsNewStudent(false)} 
                  className="text-on-surface-variant hover:text-slate-600 underline ml-1"
                >
                  Batal
                </button>
              </p>
            )}
          </section>

          {/* Answer Sheet */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center border border-emerald-500/20">
                <ClipboardList size={16} className="md:w-5 md:h-5" />
              </div>
              <div>
                <h2 className="font-bold text-on-surface text-sm md:text-base">Lembar Jawaban ({answeredCount}/{totalQuestions})</h2>
                <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Klik pilihan — otomatis ke soal berikutnya</p>
              </div>
            </div>

            {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNum => {
              const studentAns = userAnswers[qNum];
              const correctAns = answerKey[qNum - 1];
              const normalize = (val?: string) => val ? val.trim().toUpperCase() : '';
              const isAnswered = !!studentAns && studentAns.trim() !== '';
              const isCorrect = normalize(studentAns) === normalize(correctAns);

              return (
                <div
                  key={qNum}
                  ref={(el) => { if (el) questionRefs.current.set(qNum, el); }}
                  className={`flex items-center justify-between p-3 md:p-4 bg-surface premium-shadow backdrop-blur-xl rounded-xl border transition-all ${isAnswered ? (isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5') : 'border-outline-variant hover:border-primary/40 shadow-sm'}`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-surface-variant text-on-surface-variant flex items-center justify-center font-bold text-xs md:text-sm border border-outline-variant">{qNum}</span>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleAnswerSelect(qNum, opt)}
                          className={`w-9 h-9 md:w-10 md:h-10 rounded-lg border font-bold text-xs md:text-sm transition-all ${
                            studentAns === opt
                              ? (isCorrect ? 'bg-emerald-500 border-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 border-rose-500 text-white scale-110 shadow-lg shadow-rose-500/20')
                              : 'bg-surface-variant border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  {isAnswered && (
                    <div className="ml-2">
                      {isCorrect
                        ? <CheckCircle2 size={18} className="text-emerald-400" />
                        : <XCircle size={18} className="text-rose-400" />
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>

        {/* Score Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4 md:space-y-6 pb-24">
          <div className="bg-surface premium-shadow backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-outline-variant premium-shadow overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-primary/10 rounded-bl-full -z-10"></div>

            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Skor Akhir</p>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-5xl md:text-7xl font-black text-on-surface leading-none">
                {result.finalScore}
              </span>
              <span className="text-slate-600 font-bold mb-1">/ 100</span>
            </div>
            {result.finalScore < kkm ? (
              <p className="text-[10px] font-black text-rose-500 mb-4 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <AlertOctagon size={12} /> BELUM TUNTAS (REMEDIAL)
              </p>
            ) : (
              <p className="text-xs font-bold text-primary mb-4">{getScoreLabel(result.finalScore)}</p>
            )}

            {studentName.trim() && studentClass.trim() && (
              <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-1">Format Nama</p>
                <p className="text-xs font-bold text-primary break-all select-all">
                  {`${studentName}_${studentClass}_${schoolLevel}`.replace(/\s+/g, '_')}
                </p>
              </div>
            )}

            <div className="mb-6 p-4 bg-surface-variant rounded-2xl text-on-surface border border-outline-variant">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Persentase</span>
                <span className="text-xl font-black">{result.percentage}%</span>
              </div>
              <div className="h-3 bg-surface-variant rounded-full overflow-hidden p-0.5">
                <div className="h-full bg-gradient-to-r from-primary to-sky-400 rounded-full transition-all duration-500" style={{ width: `${result.percentage}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Benar" value={result.correct} icon={<CheckCircle2 size={14} />} color="emerald" />
              <MiniStat label="Salah" value={result.wrong} icon={<XCircle size={14} />} color="rose" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 bg-sky-500/10 rounded-xl text-center border border-sky-500/20">
                <p className="text-[8px] font-black uppercase tracking-widest text-sky-500/60 mb-0.5">CSI</p>
                <p className="text-lg font-black text-sky-400">{result.csi}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl text-center border border-purple-500/20">
                <p className="text-[8px] font-black uppercase tracking-widest text-purple-500/60 mb-0.5">LPS</p>
                <p className="text-lg font-black text-purple-400">{result.lps}</p>
              </div>
            </div>

            {/* Essay Section */}
            <div className="mt-6 pt-4 border-t border-outline-variant">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Skor Essay (maks 4/soal)</h4>
              <div className="grid grid-cols-5 gap-2">
                {essayScores.map((score, idx) => (
                  <div key={idx}>
                    <label className="block text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1 text-center">#{idx + 1}</label>
                    <input
                      type="number" min="0" max="4" value={score}
                      onChange={(e) => handleEssayChange(idx, e.target.value)}
                      className="w-full bg-surface-variant rounded-xl border border-outline-variant p-2 text-center font-black text-lg text-primary focus:border-primary outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between items-center text-xs font-bold text-on-surface-variant bg-surface-variant p-2.5 rounded-xl border border-outline-variant">
                <span className="uppercase tracking-widest text-[10px]">Total Essay</span>
                <span className="text-primary">{totalEssay} / {scoringConfig.essayMaxScore}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant">
              <button onClick={handleSave} className="w-full py-4 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save size={16} /> Simpan Nilai
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function MiniStat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const bg = color === 'emerald' ? 'bg-emerald-500/10' : 'bg-rose-500/10';
  const text = color === 'emerald' ? 'text-emerald-400' : 'text-rose-400';
  const border = color === 'emerald' ? 'border-emerald-500/20' : 'border-rose-500/20';
  return (
    <div className={`p-3 ${bg} rounded-xl flex flex-col items-center border ${border}`}>
      <div className={`mb-1 ${text}`}>{icon}</div>
      <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
      <span className={`text-xl font-black ${text}`}>{value}</span>
    </div>
  );
}
