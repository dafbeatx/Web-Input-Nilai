"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Key, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  XCircle, 
  LayoutGrid,
  ClipboardList,
  GraduationCap
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

export default function GradeMaster() {
  const [answerKey, setAnswerKey] = useState<Record<number, string>>(defaultAnswerKey);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [essayScores, setEssayScores] = useState<number[]>(new Array(ESSAY_COUNT).fill(0));
  const [keyInput, setKeyInput] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(40);

  useEffect(() => {
    // Initialize key input string from default key
    const initialInput = Object.entries(defaultAnswerKey)
      .map(([k, v]: [string, string]) => `${k}.${v}`)
      .join(' ');
    setKeyInput(initialInput);
  }, []);

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
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
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
    </div>
  );
}
