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
  AlertCircle
} from "lucide-react";

const OPTIONS = ['A', 'B', 'C', 'D', 'E'];
const ESSAY_COUNT = 5;
const PG_SCORE_MULTIPLIER = 2;

const defaultAnswerKey: Record<number, string> = {
  1: 'C', 2: 'B', 3: 'C', 4: 'A', 5: 'A',
  6: 'B', 7: 'B', 8: 'A', 9: 'A', 10: 'B',
  11: 'A', 12: 'B', 13: 'A', 14: 'B', 15: 'A',
  16: 'A', 17: 'A', 18: 'B', 19: 'C', 20: 'B',
  21: 'A', 22: 'B', 23: 'B', 24: 'B', 25: 'C',
  26: 'B', 27: 'B', 28: 'B', 29: 'A', 30: 'A',
  31: 'B', 32: 'A', 33: 'A', 34: 'A', 35: 'A',
  36: 'B', 37: 'B', 38: 'C', 39: 'B', 40: 'A'
};

type ModalType = 'save' | 'load' | null;
type ToastType = { message: string; type: 'success' | 'error' } | null;

export default function GradeMaster() {
  const [answerKey, setAnswerKey] = useState<Record<number, string>>(defaultAnswerKey);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [essayScores, setEssayScores] = useState<number[]>(new Array(ESSAY_COUNT).fill(0));
  const [keyInput, setKeyInput] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(40);

  const [modal, setModal] = useState<ModalType>(null);
  const [sessionName, setSessionName] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState<ToastType>(null);

  useEffect(() => {
    const initialInput = Object.entries(defaultAnswerKey)
      .map(([k, v]: [string, string]) => `${k}.${v}`)
      .join(' ');
    setKeyInput(initialInput);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleKeyInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setKeyInput(val);
    parseAndApplyKey(val);
  };

  const parseAndApplyKey = (input: string) => {
    const newKey: Record<number, string> = {};
    const patternMatches = input.match(/(\d+)\s*[.:\-)\s]\s*([A-E])/gi);
    
    if (patternMatches) {
      patternMatches.forEach(match => {
        const parts = match.match(/(\d+)\s*[.:\-)\s]\s*([A-E])/i);
        if (parts) {
          newKey[parseInt(parts[1])] = parts[2].toUpperCase();
        }
      });
    }

    if (Object.keys(newKey).length === 0 && input.trim().length > 0) {
      const cleanLetters = input.toUpperCase().replace(/[^A-E]/g, '');
      for (let i = 0; i < cleanLetters.length; i++) {
        newKey[i + 1] = cleanLetters[i];
      }
    }

    if (Object.keys(newKey).length > 0) {
      setAnswerKey(newKey);
      setTotalQuestions(Object.keys(newKey).length);
    }
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

  const resetAll = () => {
    setUserAnswers({});
    setEssayScores(new Array(ESSAY_COUNT).fill(0) as number[]);
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan');
      }

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

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat sesi');
      }

      setAnswerKey(data.answerKey);
      setUserAnswers(data.studentAnswers || {});
      setEssayScores(data.essayScores || new Array(ESSAY_COUNT).fill(0));
      setTotalQuestions(data.totalQuestions || 40);

      const restoredInput = Object.entries(data.answerKey as Record<string, string>)
        .map(([k, v]) => `${k}.${v}`)
        .join(' ');
      setKeyInput(restoredInput);

      setToast({ message: `Sesi "${data.sessionName}" berhasil dimuat!`, type: 'success' });
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

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-indigo-600 mb-2">
            <GraduationCap size={28} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Koreksi Otomatis</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">GradeMaster</h1>
        </div>
        
        <div className="flex items-center gap-3">
            <button onClick={resetAll} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all flex items-center gap-2">
                <RotateCcw size={14} /> Reset
            </button>
            <button onClick={() => openModal('load')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all flex items-center gap-2">
                <FolderOpen size={14} /> Muat Sesi
            </button>
            <button onClick={() => openModal('save')} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                <Save size={14} /> Simpan Sesi
            </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Inputs */}
        <div className="lg:col-span-8 space-y-8">
          {/* Answer Key Input */}
          <section className="glass-card rounded-[2.5rem] p-8 bg-white/60">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Kunci Jawaban</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input jawaban guru</p>
                </div>
              </div>
              <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">{totalQuestions} Soal</span>
            </div>
            <textarea 
              value={keyInput}
              onChange={handleKeyInputChange}
              placeholder="Contoh: 1.A 2.B 3.C ..."
              className="w-full h-32 bg-white/50 border-2 border-indigo-50 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 resize-none"
            />
          </section>

          {/* Student Answers */}
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
                        statusText = "CORRECT";
                    } else {
                        statusClass = "bg-rose-500 text-white shadow-lg shadow-rose-500/20";
                        statusText = `WRONG (${correct})`;
                    }
                }

                return (
                  <div key={qNum} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm">{qNum}</span>
                      <div className="flex gap-2">
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

        {/* Right Side: Score Dashboard */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-6">
          <div className="glass-card rounded-[2.5rem] p-8 overflow-hidden relative group border-indigo-100 bg-white/80">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -z-10 group-hover:bg-indigo-500/20 transition-colors"></div>
            
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Skor Akhir</p>
            <div className="flex items-end gap-3 mb-8">
              <span className="text-7xl font-black text-slate-900 leading-none">{finalScore}</span>
              <span className="text-slate-300 font-bold mb-1">/ {maxScore}</span>
            </div>

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
          </div>
        </aside>
      </main>

      {/* Save/Load Modal */}
      {modal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in">
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
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 animate-in ${
          toast.type === 'success' 
            ? 'bg-emerald-600 text-white shadow-emerald-600/30' 
            : 'bg-rose-600 text-white shadow-rose-600/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
