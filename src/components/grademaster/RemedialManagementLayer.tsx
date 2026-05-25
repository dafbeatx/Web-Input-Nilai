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
  Loader2
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
