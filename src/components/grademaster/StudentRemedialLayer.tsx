"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ToastType } from '@/lib/grademaster/types';
import { ArrowLeft, Send, AlertTriangle, ShieldX, Camera, Clock, CheckCircle2, MapPin } from 'lucide-react';
import ProctoringCamera from './ProctoringCamera';
import { saveRemedialSession, loadRemedialSession, clearRemedialSession } from '@/lib/grademaster/session';

interface StudentRemedialLayerProps {
  studentName: string;
  subject: string;
  remedialEssayCount: number;
  remedialTimer: number;
  remedialQuestions: string[];
  sessionId: string;
  className: string;
  academicYear: string;
  examType: string;
  semester: string;
  onBack: () => void;
  setToast: (t: ToastType) => void;
}

type RemedialStep = 'RULES' | 'INFO' | 'EXAM' | 'COMPLETED' | 'CHEATED' | 'TIMEOUT';

export default function StudentRemedialLayer({
  studentName,
  subject,
  remedialEssayCount,
  remedialTimer,
  remedialQuestions,
  sessionId,
  className,
  academicYear,
  examType,
  semester,
  onBack,
  setToast,
}: StudentRemedialLayerProps) {
  const [step, setStep] = useState<RemedialStep>('RULES');
  const [answers, setAnswers] = useState<string[]>(new Array(remedialEssayCount).fill(""));
  const [timeLeft, setTimeLeft] = useState(remedialTimer * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [note, setNote] = useState("");
  const [shuffledQuestions, setShuffledQuestions] = useState<{text: string, originalIndex: number}[]>([]);
  
  const [warningCount, setWarningCount] = useState(0);
  const [tabWarningCount, setTabWarningCount] = useState(0);
  const [clientCheatingFlags, setClientCheatingFlags] = useState<string[]>([]);
  const hasTriggeredCheatingRef = useRef(false);
  const startedAtRef = useRef<number>(0);
  const isRefreshingRef = useRef(false);

  // Pre-exam agreement
  const [agreedRules, setAgreedRules] = useState(false);

  // Permission states
  const [cameraOk, setCameraOk] = useState(false);
  const [locationOk, setLocationOk] = useState(false);
  const [checkingPerms, setCheckingPerms] = useState(false);

  // Draggable camera — default top-left
  const [camPos, setCamPos] = useState({ x: -1, y: -1 });
  const draggingCam = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const CAM_W = 160;
  const CAM_H = 208;

  useEffect(() => {
    if (camPos.x === -1) {
      setCamPos({ x: 12, y: 12 });
    }
  }, []);

  const clampPos = (x: number, y: number) => ({
    x: Math.max(0, Math.min(window.innerWidth - CAM_W, x)),
    y: Math.max(0, Math.min(window.innerHeight - CAM_H, y)),
  });

  const handleDragStart = (clientX: number, clientY: number) => {
    draggingCam.current = true;
    dragOffset.current = { x: clientX - camPos.x, y: clientY - camPos.y };
  };
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!draggingCam.current) return;
    setCamPos(clampPos(clientX - dragOffset.current.x, clientY - dragOffset.current.y));
  };
  const handleDragEnd = () => { draggingCam.current = false; };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => { if (draggingCam.current) { e.preventDefault(); handleDragMove(e.touches[0].clientX, e.touches[0].clientY); } };
    const onTouchEnd = () => handleDragEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [camPos]);

  const MAX_TAB_WARNINGS = 3;

  // Navigation lock during exam
  useEffect(() => {
    if (step !== 'EXAM') return;

    const handleBeforeUnload2 = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setToast({ message: '⛔ Anda tidak diperbolehkan keluar saat ujian berlangsung!', type: 'error' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload2);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload2);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [step]);

  // Check permissions (camera + location)
  const checkPermissions = async () => {
    setCheckingPerms(true);
    let camReady = false;
    let locReady = false;

    // Check camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120, facingMode: 'user' } });
      stream.getTracks().forEach(t => t.stop());
      camReady = true;
    } catch {
      camReady = false;
    }
    setCameraOk(camReady);

    // Check location properly with fallback chain
    try {
      await getPosition();
      locReady = true;
      setLocationOk(true);
    } catch (err: any) {
      locReady = false;
      setLocationOk(false);
      if (err?.code === 1) {
        setToast({ message: 'Izin lokasi ditolak browser. Mohon izinkan dari pengaturan.', type: 'error' });
      }
    }

    setCheckingPerms(false);

    if (!camReady || !locReady) {
      const missing: string[] = [];
      if (!camReady) missing.push('Kamera');
      if (!locReady) missing.push('Lokasi (GPS)');
      setToast({ message: `Anda harus mengaktifkan ${missing.join(' dan ')} untuk melanjutkan ujian.`, type: 'error' });
    }
  };

  // Restore session on mount
  useEffect(() => {
    const saved = loadRemedialSession();
    if (saved && saved.sessionId === sessionId && saved.studentName === studentName) {
      if (['EXAM'].includes(saved.step)) {
        setStep(saved.step as RemedialStep);
        setAnswers(saved.answers.length === remedialEssayCount ? saved.answers : new Array(remedialEssayCount).fill(""));
        setNote(saved.note || '');
        setCurrentLocation(saved.location || '');
        startedAtRef.current = saved.startedAt;

        // Calculate remaining time from startedAt
        const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
        const remaining = Math.max(0, (remedialTimer * 60) - elapsed);
        setTimeLeft(remaining);

        // Track refresh
        saveRemedialSession({ ...saved, refreshCount: (saved.refreshCount || 0) + 1 });
      } else if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(saved.step)) {
        setStep(saved.step as RemedialStep);
        clearRemedialSession();
      }
    }
  }, [sessionId, studentName, remedialEssayCount, remedialTimer]);

  // Mark refresh vs tab-leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      isRefreshingRef.current = true;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Persist answers whenever they change
  useEffect(() => {
    if (step !== 'EXAM' || !startedAtRef.current) return;
    saveRemedialSession({
      sessionId,
      studentName,
      step,
      startedAt: startedAtRef.current,
      answers,
      note,
      location: currentLocation,
      refreshCount: loadRemedialSession()?.refreshCount || 0,
    });
  }, [answers, note, step, sessionId, studentName, currentLocation]);

  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => { isSubmittingRef.current = isSubmitting; });

  const handleCameraViolation = useCallback((type: string) => {
    if (hasTriggeredCheatingRef.current || isSubmittingRef.current) return;

    setWarningCount(prev => {
      const newCount = prev + 1;
      
      let flagMessage = "";
      if (type === 'NO_FACE') flagMessage = "Wajah tidak terdeteksi";
      if (type === 'MULTIPLE_FACES') flagMessage = "Terdeteksi lebih dari satu orang";

      setClientCheatingFlags(oldFlags => {
        if (!oldFlags.includes(flagMessage)) {
           return [...oldFlags, flagMessage];
        }
        return oldFlags;
      });

      if (newCount >= 5) {
        hasTriggeredCheatingRef.current = true;
        setToast({ message: "Batas pelanggaran terlampaui. Ujian dihentikan.", type: "error" });
        handleStatusUpdate('CHEATED');
      } else {
        setToast({ message: `Peringatan Kamera: ${flagMessage} (${newCount}/5)`, type: "error" });
      }

      return newCount;
    });
  }, []);

  // Shuffle logic
  useEffect(() => {
    if (remedialQuestions && remedialQuestions.length > 0) {
      const mapped = remedialQuestions.map((q, i) => ({ text: q, originalIndex: i }));
      // Fisher-Yates shuffle
      for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
      }
      setShuffledQuestions(mapped);
    }
  }, [remedialQuestions]);



  const getPosition = (): Promise<{ coords: { latitude: number; longitude: number } }> => {
    return new Promise((resolve, reject) => {
      
      const fetchIpFallback = (fallbackErr: any) => {
        fetch('https://get.geojs.io/v1/ip/geo.json')
          .then(res => res.json())
          .then(data => {
            if (data && data.latitude && data.longitude) {
              resolve({ coords: { latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) } });
            } else {
              reject(fallbackErr);
            }
          })
          .catch(() => reject(fallbackErr));
      };

      if (!navigator.geolocation) {
        fetchIpFallback({ code: 0, message: 'Browser tidak mendukung Geolocation' });
        return;
      }
      
      // Try high accuracy first
      navigator.geolocation.getCurrentPosition(resolve, (errHigh) => {
        if (errHigh.code === 1) {
          // PERMISSION_DENIED — no point retrying IP, user explicitly denied.
          reject(errHigh);
          return;
        }
        // Fallback: try without high accuracy
        navigator.geolocation.getCurrentPosition(resolve, (errLow) => {
          if (errLow.code === 1) {
            reject(errLow);
            return;
          }
          // Ultimate Fallback: IP-based location (fixes Chromium 400 Network location provider error)
          fetchIpFallback(errLow);
        }, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  const getLocationErrorMessage = (err: any): string => {
    const code = err?.code;
    if (code === 1) return 'Akses Lokasi ditolak. Buka Pengaturan Browser → Izin Situs → Lokasi → Izinkan, lalu coba lagi.';
    if (code === 2) return 'Lokasi tidak tersedia. Pastikan GPS aktif di Pengaturan HP Anda dan browser tidak dalam mode penyamaran/privat.';
    if (code === 3) return 'Waktu permintaan lokasi habis. Pastikan Anda berada di area dengan sinyal GPS yang baik, lalu coba lagi.';
    if (code === 0) return 'Browser Anda tidak mendukung fitur Lokasi. Gunakan browser Chrome, Firefox, atau Edge versi terbaru.';
    return 'Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin lokasi telah diberikan.';
  };

  const startExam = async () => {
    setIsSubmitting(true);
    
    // 1. Get Location (Mandatory) - with fallback
    let locStr = '';
    try {
      const pos = await getPosition();
      locStr = `${pos.coords.latitude},${pos.coords.longitude}`;
      setCurrentLocation(locStr);
    } catch (e: any) {
      setToast({ message: getLocationErrorMessage(e), type: "error" });
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

    // MediaPipe ProctoringCamera will handle media access and stream locally
    startedAtRef.current = Date.now();
    saveRemedialSession({
      sessionId,
      studentName,
      step: 'EXAM',
      startedAt: startedAtRef.current,
      answers,
      note,
      location: locStr,
      refreshCount: 0,
    });
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

  // Anti-cheat mechanism — 3 warnings before ban
  useEffect(() => {
    if (step !== 'EXAM') return;

    const handleTabLeave = () => {
      if (isRefreshingRef.current || hasTriggeredCheatingRef.current) return;
      setTabWarningCount(prev => {
        const next = prev + 1;
        if (next >= MAX_TAB_WARNINGS) {
          hasTriggeredCheatingRef.current = true;
          setClientCheatingFlags(f => [...f, `Meninggalkan halaman ${next} kali`]);
          setToast({ message: 'Batas peringatan terlampaui. Ujian dihentikan.', type: 'error' });
          handleStatusUpdate('CHEATED');
        } else {
          setToast({ message: `⚠️ PERINGATAN ${next}/${MAX_TAB_WARNINGS}: Jangan tinggalkan halaman ujian! (Sisa ${MAX_TAB_WARNINGS - next} peringatan)`, type: 'error' });
        }
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isRefreshingRef.current) handleTabLeave();
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (!isRefreshingRef.current && document.hidden) handleTabLeave();
      }, 500);
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
    clearRemedialSession();
    
    try {
      const res = await fetch('/api/grademaster/students/remedial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           sessionId, 
           studentName, 
           status, 
           location: currentLocation,
            answers: status === 'COMPLETED' ? (() => {
               const mappedAnswers = new Array(remedialEssayCount).fill("");
               shuffledQuestions.forEach((sq, i) => {
                 mappedAnswers[sq.originalIndex] = answers[i];
               });
               return mappedAnswers;
            })() : undefined,
            note: status === 'COMPLETED' ? note : undefined,
            clientCheatingFlags: clientCheatingFlags.length > 0 ? clientCheatingFlags : undefined
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setToast({ message: data.error || "Terjadi kesalahan saat menyimpan", type: "error" });
        if (data.error?.includes('sudah pernah dilakukan') || data.error?.includes('permanen')) {
            setStep('CHEATED');
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

  // RENDER: RULES SCREEN (Pre-exam instruction popup)
  if (step === 'RULES') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-in">
        <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border border-slate-100">
          <button onClick={onBack} className="flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-indigo-600 font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors mb-6 w-full">
            <ArrowLeft size={12} /> Kembali
          </button>
          
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
            <ShieldX size={32} />
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit">📋 Peraturan Ujian Remedial</h2>
          <p className="text-sm text-slate-500 font-bold mb-6 leading-relaxed">
            Baca dan pahami seluruh aturan berikut sebelum memulai ujian.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 space-y-3">
            <div className="flex gap-3 text-sm text-slate-700 font-bold items-start">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-xs font-black">1</span>
              <span>Wajib mengenakan <strong>pakaian yang rapi dan sopan</strong>.</span>
            </div>
            <div className="flex gap-3 text-sm text-slate-700 font-bold items-start">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-xs font-black">2</span>
              <span><strong>Wajah harus selalu terlihat jelas</strong> di kamera selama ujian berlangsung.</span>
            </div>
            <div className="flex gap-3 text-sm text-slate-700 font-bold items-start">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-xs font-black">3</span>
              <span>Dilarang <strong>meninggalkan layar</strong> selama ujian. Anda mendapat <strong>3 peringatan</strong>, setelah itu ujian otomatis dihentikan.</span>
            </div>
            <div className="flex gap-3 text-sm text-slate-700 font-bold items-start">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-xs font-black">4</span>
              <span>Dilarang <strong>membuka aplikasi lain</strong> atau tab baru di browser.</span>
            </div>
            <div className="flex gap-3 text-sm text-slate-700 font-bold items-start">
              <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 text-xs font-black">5</span>
              <span>Pelanggaran akan <strong>terdeteksi otomatis</strong> oleh sistem. Nilai otomatis menjadi <strong className="text-rose-600">0 (NOL)</strong>.</span>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6 cursor-pointer select-none hover:bg-emerald-100 transition-colors">
            <input
              type="checkbox"
              checked={agreedRules}
              onChange={() => setAgreedRules(!agreedRules)}
              className="w-5 h-5 rounded border-2 border-emerald-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
            />
            <span className="text-sm font-black text-emerald-800">Saya siap mengikuti ujian dengan jujur</span>
          </label>

          <button
            onClick={() => setStep('INFO')}
            disabled={!agreedRules}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} className="rotate-180" /> Lanjutkan
          </button>
        </div>
      </div>
    );
  }

  // RENDER: INFO SCREEN (Camera/GPS/Timer confirmation + Permission Check)
  if (step === 'INFO') {
    const allPermsOk = cameraOk && locationOk;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-in">
        <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border border-slate-100">
          <button onClick={() => setStep('RULES')} className="flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-indigo-600 font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors mb-6 w-full">
            <ArrowLeft size={12} /> Kembali ke Peraturan
          </button>
          
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
            <Camera size={32} />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit">Persiapan Teknis</h2>
          <p className="text-sm text-slate-500 font-bold mb-6 leading-relaxed">
            Pastikan perangkat Anda siap sebelum memulai ujian.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Identitas Sesi Remedial</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mb-1">Mata Pelajaran</p>
                <Badge color="slate">{subject}</Badge>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mb-1">Kelas</p>
                <Badge color="emerald">{className}</Badge>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mb-1">Tahun Ajaran</p>
                <Badge color="amber">{academicYear}</Badge>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mb-1">Semester / Ujian</p>
                <Badge color="indigo">{semester} ({examType})</Badge>
              </div>
            </div>
          </div>

          <ul className="space-y-4 mb-6">
            <li className="flex gap-3 text-sm text-slate-600 font-bold items-start">
              <Camera className="text-indigo-500 shrink-0 mt-0.5" size={18} />
              <span>Kamera wajib aktif untuk <strong>pengawasan otomatis</strong>. Anda bisa menggeser posisi kamera selama ujian.</span>
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
              <span>Anda mendapat <strong>3 peringatan</strong> jika meninggalkan halaman. Setelah itu ujian otomatis dihentikan dan nilai menjadi <strong>0</strong>.</span>
            </li>
          </ul>

          {/* Permission Status Indicators */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border-2 flex items-center gap-2.5 ${checkingPerms ? 'bg-amber-50 border-amber-200' : cameraOk ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${checkingPerms ? 'bg-amber-500 text-white' : cameraOk ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                <Camera size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Kamera</p>
                <p className={`text-xs font-bold ${checkingPerms ? 'text-amber-600' : cameraOk ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {checkingPerms ? '🟡 Sedang dicek...' : cameraOk ? '🟢 Aktif' : '🔴 Belum diizinkan'}
                </p>
              </div>
            </div>
            <div className={`p-3 rounded-xl border-2 flex items-center gap-2.5 ${checkingPerms ? 'bg-amber-50 border-amber-200' : locationOk ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${checkingPerms ? 'bg-amber-500 text-white' : locationOk ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                <MapPin size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Lokasi</p>
                <p className={`text-xs font-bold ${checkingPerms ? 'text-amber-600' : locationOk ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {checkingPerms ? '🟡 Sedang dicek...' : locationOk ? '📍 Aktif' : '🔴 Belum diizinkan'}
                </p>
              </div>
            </div>
          </div>

          {!allPermsOk && (
            <button
              onClick={checkPermissions}
              disabled={checkingPerms}
              className="w-full py-3 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all mb-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {checkingPerms ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memeriksa...</>
              ) : (
                <><AlertTriangle size={14} /> Periksa Izin Kamera & Lokasi</>
              )}
            </button>
          )}

          <button
            onClick={startExam}
            disabled={isSubmitting || !allPermsOk}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
          >
            {isSubmitting ? 'MEMPROSES...' : !allPermsOk ? '⛔ AKTIFKAN IZIN TERLEBIH DAHULU' : 'SAYA MENGERTI, MULAI REMEDIAL'}
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
    <>
      {/* Top Floating Bar — outside animate-in so position:fixed works */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 shadow-sm z-40 px-4 py-3 flex items-center justify-between">
         <div className="font-outfit font-black text-slate-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            LIVE PENGAMATAN
         </div>
         <div className="font-mono text-xl font-bold text-slate-800 bg-slate-100 px-4 py-1.5 rounded-lg border border-slate-200">
            {formatTime(timeLeft)}
         </div>
      </div>

      {/* Draggable Camera Bubble — outside animate-in so position:fixed works */}
      <div
        className="bg-slate-900 rounded-2xl shadow-2xl border-4 border-slate-800 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          position: 'fixed',
          left: camPos.x,
          top: camPos.y,
          width: CAM_W,
          height: CAM_H,
          zIndex: 50,
          touchAction: 'none',
        }}
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
      >
        <ProctoringCamera onViolation={handleCameraViolation} />
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
           <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
           <span className="text-[8px] text-white font-black uppercase tracking-wider">REC</span>
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
           <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
           <span className="text-[7px] text-emerald-300 font-black uppercase tracking-wider">Aktif</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
           <span className="text-[10px] text-white/90 font-bold truncate block">{studentName}</span>
           {(warningCount > 0 || tabWarningCount > 0) && (
             <span className="text-[9px] text-rose-400 font-bold truncate block">
               Tab: {tabWarningCount}/{MAX_TAB_WARNINGS} • Cam: {warningCount}/5
             </span>
           )}
        </div>
      </div>

      {/* Main Exam Content */}
      <div className="p-3 sm:p-5 lg:p-8 max-w-4xl mx-auto animate-in pt-20">

      <header className="mb-6 md:mb-10 text-center">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight font-outfit mb-2">Remedial {subject}</h1>
        <p className="text-xs md:text-sm text-slate-500 font-bold">Harap kerjakan {remedialEssayCount} soal essay berikut. <strong>Jangan tinggalkan halaman ini!</strong></p>
      </header>

      <div className="space-y-4 md:space-y-6">
        {answers.map((ans, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <h3 className="text-sm md:text-base font-black text-slate-800 mb-2">Soal Essay #{idx + 1}</h3>
            {shuffledQuestions[idx] && shuffledQuestions[idx].text.trim() !== "" && (
              <p className="text-xs md:text-sm text-slate-600 font-medium mb-4 p-3 bg-slate-50 border border-slate-100 rounded-lg whitespace-pre-wrap">
                {shuffledQuestions[idx].text}
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
    </>
  );
}

function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };
  return (
    <span className={`px-2 md:px-3 py-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-tight border shadow-sm inline-block ${colors[color]}`}>
      {children}
    </span>
  );
}
