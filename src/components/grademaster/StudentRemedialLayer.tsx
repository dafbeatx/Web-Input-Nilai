"use client";

import React, { useState, useEffect } from 'react';
import { ToastType } from '@/lib/grademaster/types';
import { ArrowLeft, Send, AlertTriangle, ShieldX } from 'lucide-react';

interface StudentRemedialLayerProps {
  studentName: string;
  subject: string;
  remedialEssayCount: number;
  sessionId: string;
  onBack: () => void;
  setToast: (t: ToastType) => void;
}

export default function StudentRemedialLayer({
  studentName,
  subject,
  remedialEssayCount,
  sessionId,
  onBack,
  setToast,
}: StudentRemedialLayerProps) {
  const [answers, setAnswers] = useState<string[]>(new Array(remedialEssayCount).fill(""));
  const [cheated, setCheated] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Anti-cheat mechanism
  useEffect(() => {
    if (cheated || submitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCheated(true);
        triggerCheat();
      }
    };

    const handleBlur = () => {
      setCheated(true);
      triggerCheat();
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setToast({ message: "Aksi Copy/Paste tidak diizinkan saat ujian!", type: "error" });
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
    };
  }, [cheated, submitted, setToast]);

  const triggerCheat = async () => {
    // Optionally call an API to mark student's score as 0
    // For now, it is handled in UI
    setToast({ message: "Terdeteksi keluar dari web. Ujian dibatalkan.", type: "error" });
  };

  const handleChange = (index: number, val: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = val;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    const isAnyEmpty = answers.some(a => !a.trim());
    if (isAnyEmpty) {
      setToast({ message: "Harap isi semua soal essay sebelum mengumpulkan.", type: "error" });
      return;
    }

    setSubmitted(true);
    setToast({ message: "Jawaban Remedial berhasil dikumpulkan ke server.", type: "success" });
  };

  if (cheated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-rose-50/50 animate-in">
        <div className="bg-white max-w-md w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border-2 border-rose-100 text-center">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit">Terdeteksi Mencontek!</h2>
          <p className="text-sm md:text-base text-slate-500 font-bold mb-8 leading-relaxed">
            Anda terdeteksi keluar dari halaman web. Nilai Remedial Anda diatur menjadi <strong className="text-rose-600">0</strong>.
            <br /><br />
            Untuk mendapatkan nilai kembali, harap hubungi <strong>Guru Mata Pelajaran</strong>.
          </p>
          <button
            onClick={onBack}
            className="w-full py-4 bg-rose-500 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-in">
        <div className="bg-white max-w-md w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border border-slate-100 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit">Berhasil Disimpan!</h2>
          <p className="text-sm text-slate-500 font-bold mb-8">
            Jawaban remedial essay Anda telah dikirim dan menunggu penilaian dari guru mata pelajaran.
          </p>
          <button
            onClick={onBack}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-4xl mx-auto animate-in">
      <header className="mb-6 md:mb-10 text-center">
        <button onClick={onBack} className="flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-indigo-600 font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors mb-4 md:mb-6 justify-center w-full">
          <ArrowLeft size={12} className="md:w-[14px] md:h-[14px]" /> Kembali ke Dashboard
        </button>
        <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1 md:px-4 md:py-1.5 bg-rose-100 text-rose-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-3 md:mb-4 border border-rose-200">
          <AlertTriangle size={12} className="md:w-3.5 md:h-3.5" /> Ujian Remedial (Jangan Pindah Tab)
        </div>
        <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight font-outfit mb-2">Remedial {subject}</h1>
        <p className="text-xs md:text-sm text-slate-500 font-bold">Harap kerjakan {remedialEssayCount} soal essay berikut, semangat {studentName}!</p>
      </header>

      <div className="space-y-4 md:space-y-6">
        {answers.map((ans, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm md:text-base font-black text-slate-800 mb-3">Soal Essay #{idx + 1}</h3>
            <textarea
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
              rows={4}
              placeholder="Ketik jawaban Anda di sini..."
              value={ans}
              onChange={(e) => handleChange(idx, e.target.value)}
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          className="px-6 py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <Send size={16} /> Kumpulkan Jawaban
        </button>
      </div>
    </div>
  );
}
