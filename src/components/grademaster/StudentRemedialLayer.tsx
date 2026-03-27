"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ToastType } from '@/lib/grademaster/types';
import { ArrowLeft, Send, AlertTriangle, ShieldX, Camera, Clock, CheckCircle2, MapPin } from 'lucide-react';

interface StudentRemedialLayerProps {
  studentName: string;
  subject: string;
  remedialEssayCount: number;
  remedialTimer: number;
  remedialQuestions: string[];
  sessionId: string;
  onBack: () => void;
  setToast: (t: ToastType) => void;
}

type RemedialStep = 'INFO' | 'EXAM' | 'COMPLETED' | 'CHEATED' | 'TIMEOUT';

export default function StudentRemedialLayer({
  studentName,
  subject,
  remedialEssayCount,
  remedialTimer,
  remedialQuestions,
  sessionId,
  onBack,
  setToast,
}: StudentRemedialLayerProps) {
  const [step, setStep] = useState<RemedialStep>('INFO');
  const [answers, setAnswers] = useState<string[]>(new Array(remedialEssayCount).fill(""));
  const [timeLeft, setTimeLeft] = useState(remedialTimer * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [note, setNote] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startExam = async () => {
    setIsSubmitting(true);
    
    // 1. Get Location (Mandatory)
    let locStr = '';
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      locStr = `${pos.coords.latitude},${pos.coords.longitude}`;
      setCurrentLocation(locStr);
    } catch (e) {
      setToast({ message: "Akses Lokasi (GPS) wajib diizinkan untuk memulai ujian!", type: "error" });
      setIsSubmitting(false);
      return;
    }

    // 2. Start Session on Server
    try {
      const res = await fetch('/api/grademaster/students/remedial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, studentName, status: 'STARTED', location: locStr })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setToast({ message: data.error || "Gagal memulai sesi", type: "error" });
        if (data.error?.includes('permanen')) {
            setStep('CHEATED'); 
        }
        setIsSubmitting(false);
        return;
      }
    } catch (e) {
      setToast({ message: "Koneksi terputus!", type: "error" });
      setIsSubmitting(false);
      return;
    }

    // 3. Get Camera (Optional Gimmick)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      setToast({ message: "Kamera gagal diakses, namun ujian tetap dilanjutkan dengan pengawasan sistem.", type: "error" });
    }
    
    setIsSubmitting(false);
    setStep('EXAM');
  };

  // Timer logic
  useEffect(() => {
    if (step !== 'EXAM') return;
    if (timeLeft <= 0) {
      handleStatusUpdate('TIMEOUT');
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [step, timeLeft]);

  // Anti-cheat mechanism
  useEffect(() => {
    if (step !== 'EXAM') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleStatusUpdate('CHEATED');
      }
    };

    const handleBlur = () => {
      handleStatusUpdate('CHEATED');
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
  }, [step, setToast]);

  const handleStatusUpdate = async (status: 'COMPLETED' | 'CHEATED' | 'TIMEOUT') => {
    setIsSubmitting(true);
    stopCamera();
    
    try {
      const res = await fetch('/api/grademaster/students/remedial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           sessionId, 
           studentName, 
           status, 
           location: currentLocation,
           answers: status === 'COMPLETED' ? answers : undefined,
           note: status === 'COMPLETED' ? note : undefined
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setToast({ message: data.error || "Terjadi kesalahan saat menyimpan", type: "error" });
        if (data.error?.includes('sudah pernah dilakukan') || data.error?.includes('permanen')) {
            setStep('CHEATED'); // generic lock screen
        }
      } else {
        setStep(status);
        if (status === 'COMPLETED') {
          setToast({ message: "Jawaban Remedial berhasil dikumpulkan.", type: "success" });
        }
      }
    } catch (e) {
      setToast({ message: "Koneksi terputus! Hubungi guru pengawas.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
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
    await handleStatusUpdate('COMPLETED');
  };

  // RENDER: INFO SCREEN
  if (step === 'INFO') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-in">
        <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border border-slate-100">
          <button onClick={onBack} className="flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-indigo-600 font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors mb-6 w-full">
            <ArrowLeft size={12} /> Kembali
          </button>
          
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
            <ShieldX size={32} />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit">Perhatian: Ujian Remedial Tersistem</h2>
          <p className="text-sm text-slate-500 font-bold mb-6 leading-relaxed">
            Anda akan memulai ujian remedial untuk mata pelajaran <strong>{subject}</strong>. Harap baca aturan berikut sebelum memulai:
          </p>

          <ul className="space-y-4 mb-8">
            <li className="flex gap-3 text-sm text-slate-600 font-bold items-start">
              <Camera className="text-indigo-500 shrink-0 mt-0.5" size={18} />
              <span>Sistem akan meminta akses kamera untuk <strong>memantau pergerakan Anda</strong> selama ujian berlangsung.</span>
            </li>
            <li className="flex gap-3 text-sm text-slate-600 font-bold items-start">
              <MapPin className="text-emerald-500 shrink-0 mt-0.5" size={18} />
              <span>Akses <strong>Lokasi (GPS) wajib diizinkan</strong> untuk memverifikasi keaslian perangkat Anda.</span>
            </li>
            <li className="flex gap-3 text-sm text-slate-600 font-bold items-start">
              <Clock className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <span>Waktu ujian adalah <strong>{remedialTimer} Menit</strong>. Jawaban otomatis terkunci jika waktu habis.</span>
            </li>
            <li className="flex gap-3 text-sm text-slate-600 font-bold items-start">
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
              <span>Dilarang keras menyalin/menempel (copy-paste), membuka tab baru, atau keluar dari layar ini. Pelanggaran mengakibatkan nilai <strong>otomatis 0 (NOL)</strong>.</span>
            </li>
          </ul>

          <button
            onClick={startExam}
            disabled={isSubmitting}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
          >
            {isSubmitting ? 'MEMPROSES...' : 'SAYA MENGERTI, MULAI REMEDIAL'}
          </button>
        </div>
      </div>
    );
  }

  // RENDER: END SCREENS (COMPLETED / CHEATED / TIMEOUT)
  if (step === 'CHEATED' || step === 'TIMEOUT' || step === 'COMPLETED') {
    const isCheat = step === 'CHEATED';
    const isTimeout = step === 'TIMEOUT';
    
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 animate-in ${isCheat ? 'bg-rose-50/50' : isTimeout ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`}>
        <div className={`bg-white max-w-md w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border-2 text-center ${isCheat ? 'border-rose-100' : isTimeout ? 'border-amber-100' : 'border-emerald-100'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCheat ? 'bg-rose-100 text-rose-600' : isTimeout ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {isCheat ? <ShieldX size={40} /> : isTimeout ? <Clock size={40} /> : <CheckCircle2 size={40} />}
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit">
            {isCheat ? 'Terdeteksi Mencontek!' : isTimeout ? 'Waktu Habis!' : 'Berhasil Disimpan!'}
          </h2>
          
          <p className="text-sm md:text-base text-slate-500 font-bold mb-8 leading-relaxed">
            {isCheat ? (
               <>Anda terdeteksi melakukan tindakan yang dilarang (keluar tab/layar). Nilai Remedial Anda diatur menjadi <strong className="text-rose-600">0</strong>.<br /><br />Hubungi <strong>Guru Mata Pelajaran</strong>.</>
            ) : isTimeout ? (
               <>Waktu pengerjaan remedial Anda sudah habis. Formulir terkunci dan nilai belum memenuhi batas KKM.</>
            ) : (
               <>Jawaban remedial Anda telah tersimpan ke dalam sistem database sekolah. Skor Anda telah diperbaharui.</>
            )}
          </p>
          
          <button
            onClick={onBack}
            className={`w-full py-4 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${isCheat ? 'bg-rose-500 shadow-rose-500/20' : isTimeout ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // RENDER: EXAM SCREEN
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-4xl mx-auto animate-in pt-20">
      
      {/* Top Floating Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 shadow-sm z-40 px-4 py-3 flex items-center justify-between">
         <div className="font-outfit font-black text-slate-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            LIVE PENGAMATAN
         </div>
         <div className="font-mono text-xl font-bold text-slate-800 bg-slate-100 px-4 py-1.5 rounded-lg border border-slate-200">
            {formatTime(timeLeft)}
         </div>
      </div>

      {/* Camera Gimmick Bubble */}
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-32 h-40 md:w-40 md:h-52 bg-slate-900 rounded-2xl shadow-2xl border-4 border-slate-800 overflow-hidden z-50 transform hover:scale-105 transition-transform group">
        <video 
           ref={videoRef} 
           autoPlay 
           playsInline 
           muted 
           className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
           <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
           <span className="text-[8px] text-white font-black uppercase tracking-wider">REC</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
           <span className="text-[10px] text-white/90 font-bold truncate block">{studentName} (Dipantau)</span>
        </div>
      </div>

      <header className="mb-6 md:mb-10 text-center">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight font-outfit mb-2">Remedial {subject}</h1>
        <p className="text-xs md:text-sm text-slate-500 font-bold">Harap kerjakan {remedialEssayCount} soal essay berikut. <strong>Jangan tinggalkan halaman ini!</strong></p>
      </header>

      <div className="space-y-4 md:space-y-6">
        {answers.map((ans, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <h3 className="text-sm md:text-base font-black text-slate-800 mb-2">Soal Essay #{idx + 1}</h3>
            {remedialQuestions && remedialQuestions[idx] && remedialQuestions[idx].trim() !== "" && (
              <p className="text-xs md:text-sm text-slate-600 font-medium mb-4 p-3 bg-slate-50 border border-slate-100 rounded-lg whitespace-pre-wrap">
                {remedialQuestions[idx]}
              </p>
            )}
            <textarea
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
              rows={5}
              placeholder="Ketik jawaban Anda di sini. Jangan menempel (paste) jawaban dari sumber lain..."
              value={ans}
              onChange={(e) => handleChange(idx, e.target.value)}
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        ))}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm relative overflow-hidden group mt-8">
           <div className="absolute top-0 left-0 w-1 h-full bg-slate-300" />
           <h3 className="text-sm md:text-base font-black text-slate-800 mb-2">Catatan untuk Guru (Opsional)</h3>
           <textarea
             className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
             rows={3}
             placeholder="Tuliskan pesan atau catatan Anda jika ada..."
             value={note}
             onChange={(e) => setNote(e.target.value)}
           />
        </div>

      </div>

      <div className="mt-8 flex justify-end pb-24">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 w-full md:w-auto disabled:opacity-50 disabled:pointer-events-none"
        >
          <Send size={16} /> {isSubmitting ? 'Memproses...' : 'Kumpulkan Jawaban'}
        </button>
      </div>
    </div>
  );
}
