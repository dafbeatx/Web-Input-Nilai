"use client";

import React, { useState } from 'react';
import {
  ArrowLeft,
  Settings,
  BookOpen,
  Calendar,
  Clock,
  ListTodo,
  CheckSquare,
  Wand2,
  Save,
  Loader2,
  Sparkles,
  Brain,
  AlertCircle,
  Cpu
} from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';
import { parseEssayQuestions } from '@/lib/grademaster/parser';

interface RemedialManagementLayerProps {
  academicYear: string;
  setToast: (t: ToastType) => void;
}

export default function RemedialManagementLayer({
  academicYear,
  setToast
}: RemedialManagementLayerProps) {
  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState("");
  const [timer, setTimer] = useState(15);
  const [questionsInput, setQuestionsInput] = useState("");
  const [answerKeysInput, setAnswerKeysInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // AI Adaptive Generator states
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [originalExamText, setOriginalExamText] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiWeakTopics, setAiWeakTopics] = useState<string[] | null>(null);
  const [aiDifficulties, setAiDifficulties] = useState<any[] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAutoFormatList = (text: string) => {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, index) => {
        const cleaned = line.replace(/^[\d]+[\.\)]\s*/, '');
        return `${index + 1}. ${cleaned}`;
      })
      .join('\n');
  };

  const handleGenerateAiQuestions = async () => {
    if (!subject) {
      setToast({ message: "Pilih Mata Pelajaran terlebih dahulu sebelum melakukan analisis AI.", type: "error" });
      return;
    }
    if (!examType) {
      setToast({ message: "Pilih Jenis Ujian terlebih dahulu sebelum melakukan analisis AI.", type: "error" });
      return;
    }
    if (aiQuestionCount < 1 || aiQuestionCount > 15) {
      setToast({ message: "Jumlah soal remedial antara 1 sampai 15.", type: "error" });
      return;
    }

    setIsGeneratingAi(true);
    setAiError(null);
    setAiWeakTopics(null);
    setAiDifficulties(null);

    try {
      const res = await fetch('/api/grademaster/remedial/generate-adaptive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          examType,
          academicYear,
          questionCount: aiQuestionCount,
          originalQuestionsText: originalExamText
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat soal remedial adaptif");

      const formattedQuestions = (data.questions || []).join('\n');
      const formattedKeys = (data.answerKeys || []).join('\n');

      setQuestionsInput(formattedQuestions);
      setAnswerKeysInput(formattedKeys);
      setAiWeakTopics(data.weakTopics || []);
      setAiDifficulties(data.difficulties || []);

      setToast({ message: "Soal remedial adaptif berhasil digenerasikan!", type: "success" });
    } catch (err: any) {
      setAiError(err.message || "Terjadi kesalahan pada AI Generator");
      setToast({ message: err.message || "Gagal membuat soal remedial", type: "error" });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmit = async () => {
    if (!subject) {
      setToast({ message: "Mata Pelajaran wajib dipilih.", type: "error" });
      return;
    }
    if (!examType) {
      setToast({ message: "Jenis Ujian wajib dipilih.", type: "error" });
      return;
    }
    if (!questionsInput.trim()) {
      setToast({ message: "Soal Remedial tidak boleh kosong.", type: "error" });
      return;
    }
    if (timer < 1) {
      setToast({ message: "Durasi remedial minimal 1 menit.", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const parsedQuestions = parseEssayQuestions(questionsInput);
      const parsedKeys = parseEssayQuestions(answerKeysInput);

      const res = await fetch('/api/grademaster/remedial/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          exam_type: examType,
          academic_year: academicYear,
          timer,
          questions: parsedQuestions,
          answer_keys: parsedKeys
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setToast({ message: data.message, type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Gagal menerapkan pengaturan", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-on-surface-variant";
  const labelClass = "flex items-center gap-2 text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2";
  const cardClass = "bg-surface premium-shadow backdrop-blur-xl rounded-2xl p-6 border border-outline-variant";

  return (
    <main className="min-h-dvh bg-white p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto page-pt md:pt-16 pb-24 font-outfit">
      
      {/* Header */}
      <header className="mb-8 md:mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-secondary/20">
              <Settings size={14} /> Global Settings
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-on-surface tracking-tight font-outfit">Manajemen Remedial</h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Atur soal dan durasi sesi remedial secara massal untuk semua kelas yang melangsungkan ujian ini.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* IDENTIFIKASI UJIAN */}
          <div className={cardClass}>
            <h2 className="flex items-center gap-2 text-sm font-black text-on-surface uppercase tracking-widest mb-6 pb-4 border-b border-outline-variant">
              <BookOpen className="text-secondary" size={18} /> Identifikasi Sesi
            </h2>
            <div className="space-y-5">
              <div>
                <label className={labelClass}><BookOpen size={14} /> Mata Pelajaran</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  <option value="Informatika">Informatika</option>
                  <option value="Matematika">Matematika</option>
                  <option value="IPA">IPA (Sains)</option>
                  <option value="IPS">IPS (Sosial)</option>
                  <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                  <option value="Bahasa Inggris">Bahasa Inggris</option>
                  <option value="PAI">PAI</option>
                  <option value="PJOK">PJOK</option>
                  <option value="Seni Budaya">Seni Budaya</option>
                  <option value="PKn">PKn</option>
                </select>
              </div>

              <div>
                <label className={labelClass}><Calendar size={14} /> Jenis Ujian</label>
                <select value={examType} onChange={(e) => setExamType(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">-- Pilih Jenis Ujian --</option>
                  <option value="UTS">UTS (Tengah Semester)</option>
                  <option value="UAS">UAS (Akhir Semester)</option>
                  <option value="PAS">PAS (Penilaian Akhir Semester)</option>
                  <option value="PAT">PAT (Penilaian Akhir Tahun)</option>
                  <option value="Ulangan Harian">Ulangan Harian</option>
                </select>
              </div>

              <div>
                <label className={labelClass}><Clock size={14} /> Durasi Remedial (Menit)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="180" 
                  value={timer} 
                  onChange={(e) => setTimer(Number(e.target.value))} 
                  className={inputClass} 
                />
              </div>
            </div>
          </div>

          {/* AI ADAPTIVE GENERATOR CARD */}
          <div className="bg-gradient-to-tr from-purple-50/50 via-white to-indigo-50/50 rounded-2xl p-6 border border-purple-200/60 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-200/30 to-indigo-200/30 rounded-bl-full pointer-events-none transition-transform duration-700 group-hover:scale-110" />
            
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100">
              <h2 className="flex items-center gap-2 text-sm font-black text-purple-950 uppercase tracking-widest">
                <Sparkles className="text-purple-600 animate-pulse" size={18} /> AI Adaptive Generator
              </h2>
              <button
                type="button"
                onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                className="text-[10px] font-black uppercase px-2.5 py-1 bg-purple-100/80 hover:bg-purple-200/80 text-purple-700 rounded-lg transition-all"
              >
                {isAiPanelOpen ? "Sembunyikan" : "Buka Panel"}
              </button>
            </div>

            {isAiPanelOpen ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-xs text-purple-900/70 font-medium leading-relaxed">
                  AI akan secara otomatis menganalisis butir soal tersulit yang paling banyak dijawab salah oleh siswa pada ujian utama, lalu memformulasikan paket soal remedial baru yang setara.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-purple-800 uppercase tracking-widest mb-1.5">
                      <Cpu size={12} /> Jumlah Soal Remedial
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="15" 
                      value={aiQuestionCount} 
                      onChange={(e) => setAiQuestionCount(Number(e.target.value))} 
                      className="w-full bg-white/70 border border-purple-200 rounded-xl p-2.5 text-sm font-bold text-purple-950 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-purple-800 uppercase tracking-widest mb-1.5">
                      <Brain size={12} /> Naskah Soal Asli / Kisi-kisi (Opsional)
                    </label>
                    <textarea 
                      placeholder="Tempel naskah soal ujian utama di sini (membantu AI mendeteksi topik dari nomor soal yang paling banyak salah secara presisi)..."
                      value={originalExamText}
                      onChange={(e) => setOriginalExamText(e.target.value)}
                      rows={4}
                      className="w-full bg-white/70 border border-purple-200 rounded-xl p-3 text-xs font-mono text-purple-950 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all resize-y placeholder:text-purple-400"
                    />
                  </div>
                </div>

                {aiError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs font-bold text-red-600">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}

                {/* AI Analysis Summary Display */}
                {aiWeakTopics && aiWeakTopics.length > 0 && (
                  <div className="p-4 bg-white/80 border border-purple-100 rounded-xl space-y-2 text-xs font-bold text-purple-950 shadow-inner">
                    <div className="text-[10px] text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Brain size={12} /> Hasil Analisis Kelemahan Kelas
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {aiWeakTopics.map((topic, i) => (
                        <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-[10px]">
                          {topic}
                        </span>
                      ))}
                    </div>
                    {aiDifficulties && aiDifficulties.length > 0 && (
                      <div className="text-[10px] text-on-surface-variant/80 font-normal pt-1">
                        Soal tersulit terdeteksi: {aiDifficulties.map(d => `#${d.questionNumber} (${d.difficultyPercent}% salah)`).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerateAiQuestions}
                  disabled={isGeneratingAi}
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-purple-500/10 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Menganalisis & Membuat Soal...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Mulai Analisis & Buat Soal AI
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-purple-900/60 font-semibold cursor-pointer" onClick={() => setIsAiPanelOpen(true)}>
                <span>Aktifkan asisten AI untuk memformulasikan soal otomatis.</span>
                <Sparkles size={14} className="text-purple-600" />
              </div>
            )}
          </div>

          {/* SOAL REMEDIAL */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
              <h2 className="flex items-center gap-2 text-sm font-black text-on-surface uppercase tracking-widest">
                <ListTodo className="text-primary" size={18} /> Soal Remedial
              </h2>
              <button
                onClick={() => setQuestionsInput(handleAutoFormatList(questionsInput))}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-variant hover:bg-surface-container-highest text-on-surface-variant hover:text-primary rounded-lg text-[10px] font-bold transition-colors"
              >
                <Wand2 size={12} /> Auto Format
              </button>
            </div>
            <div className="space-y-3">
              <textarea
                value={questionsInput}
                onChange={(e) => setQuestionsInput(e.target.value)}
                placeholder={"1. Apa yang dimaksud dengan jaringan komputer?\n2. Sebutkan contoh sistem operasi..."}
                rows={10}
                className={`${inputClass} resize-y text-sm font-mono`}
              />
              <p className="text-[10px] text-on-surface-variant font-medium">
                Gunakan format daftar bernomor (1. 2. 3.) untuk hasil terbaik.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* KUNCI JAWABAN REMEDIAL */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
              <h2 className="flex items-center gap-2 text-sm font-black text-on-surface uppercase tracking-widest">
                <CheckSquare className="text-emerald-500" size={18} /> Kunci Jawaban
              </h2>
              <button
                onClick={() => setAnswerKeysInput(handleAutoFormatList(answerKeysInput))}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-variant hover:bg-surface-container-highest text-on-surface-variant hover:text-primary rounded-lg text-[10px] font-bold transition-colors"
              >
                <Wand2 size={12} /> Auto Format
              </button>
            </div>
            <div className="space-y-3">
              <textarea
                value={answerKeysInput}
                onChange={(e) => setAnswerKeysInput(e.target.value)}
                placeholder={"1. Jaringan komputer adalah...\n2. Windows, Linux, macOS..."}
                rows={10}
                className={`${inputClass} resize-y text-sm font-mono`}
              />
              <p className="text-[10px] text-on-surface-variant font-medium">
                Opsional. Sangat disarankan jika Anda ingin AI membantu proses *grading*.
              </p>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full h-14 bg-primary hover:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Terapkan Pengaturan Remedial Ke Semua Kelas
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

