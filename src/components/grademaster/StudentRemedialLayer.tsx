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

type RemedialStep = 'RULES' | 'INFO' | 'EXAM' | 'COMPLETED' | 'CHEATED' | 'TIMEOUT' | 'SECOND_CHANCE';

const Badge = ({ children, color = 'indigo' }: { children: React.ReactNode; color?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' }) => {
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
};

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
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptToken, setAttemptToken] = useState<string | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  
  // Points & Time Extension State
  const [pointsBal, setPointsBal] = useState<{total: number, usedToday: number} | null>(null);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [pointsToSpend, setPointsToSpend] = useState<number>(3);
  const hasActivatedRef = useRef(false);
  const [cameraRetryCount, setCameraRetryCount] = useState(0);
  const [cameraErrorDetail, setCameraErrorDetail] = useState<string | null>(null);
  const [examMode, setExamMode] = useState<'STRICT' | 'LIMITED'>('STRICT');
  const [cameraStatus, setCameraStatus] = useState<'ACTIVE' | 'FAILED'>('ACTIVE');
  const MAX_CAMERA_RETRIES = 3;
  
  const [warningCount, setWarningCount] = useState(0);
  const [tabWarningCount, setTabWarningCount] = useState(0);
  const [clientCheatingFlags, setClientCheatingFlags] = useState<string[]>([]);
  const hasTriggeredCheatingRef = useRef(false);
  const startedAtRef = useRef<number>(0);
  const isRefreshingRef = useRef(false);
  const isDeploymentReloadRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [backPressCount, setBackPressCount] = useState(0);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [secondChanceReason, setSecondChanceReason] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [networkWarningCount, setNetworkWarningCount] = useState(0);
  const MAX_NETWORK_WARNINGS = 2;
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isPermanentlyBlocked, setIsPermanentlyBlocked] = useState(false);
  const [remainingStudents, setRemainingStudents] = useState<{name: string}[]>([]);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const hasSubmittedRef = useRef(false);
  const hasSentStartNotifRef = useRef(false);
  const wakeLockRef = useRef<any>(null); // Screen Wake Lock

  const handleExit = () => {
    clearRemedialSession();
    onBack();
  };

  const getDeviceInfo = () => {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    let os = "Other";
    if (ua.indexOf("Win") !== -1) os = "Windows";
    if (ua.indexOf("Mac") !== -1) os = "MacOS";
    if (ua.indexOf("Android") !== -1) os = "Android";
    if (ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1) os = "iOS";

    let browser = "Other";
    if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (ua.indexOf("Safari") !== -1) browser = "Safari";
    else if (ua.indexOf("Edge") !== -1) browser = "Edge";
    
    return `${os} | ${browser}`;
  };

  const getNetworkInfo = () => {
    if (typeof navigator === 'undefined') return 'unknown';
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!conn) return 'unknown';
    return `${conn.effectiveType || 'unknown'} (${conn.downlink || '?'}Mbps)`;
  };

  const compressImage = async (base64Str: string, maxWidth = 320, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const sendTelegramNotify = async (event: string, photo?: string, message?: string, score?: number) => {
    try {
      const netInfo = getNetworkInfo();
      const payload = {
        studentName,
        className,
        subject,
        event,
        message: message ? `${message}${message.includes('Network:') ? '' : ` | Network: ${netInfo}`}` : `Network: ${netInfo}`,
        photo,
        score,
        deviceInfo: getDeviceInfo()
      };

      await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to send Telegram notify:', err);
    }
  };

  const capturePhoto = (): string | undefined => {
    if (!videoRef.current) return undefined;
    try {
      if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
        console.warn('Video not ready for capture');
        return undefined;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 320;
      canvas.height = videoRef.current.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.6); 
      }
    } catch (err) {
      console.error('Failed to capture photo:', err);
    }
    return undefined;
  };

  const [agreedRules, setAgreedRules] = useState(false);
  
  const sendActivityLog = (message: string) => {
    if (step !== 'EXAM') return;
    sendTelegramNotify('ACTIVITY', undefined, message);
  };

  // Permission states
  const [cameraOk, setCameraOk] = useState(false);
  const [locationOk, setLocationOk] = useState(false);
  const [checkingPerms, setCheckingPerms] = useState(false);

  // Camera dimensions
  const CAM_W = 160;
  const CAM_H = 112; // Adjusted to match h-28 for standardizing with tailwind classes (will mostly be handled by CSS now)

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
      setBackPressCount(prev => {
        const next = prev + 1;
        const reason = `Mencoba menekan tombol kembali ${next} kali`;
        sendActivityLog(`Mencoba menekan tombol Kembali (Back Button) - Percobaan ke-${next}`);
        if (next >= 5) {
          setClientCheatingFlags(f => [...f, reason]);
          if (secondChanceUsed) {
            hasTriggeredCheatingRef.current = true;
            setToast({ message: 'Batas percobaan navigasi terlampaui. Ujian dihentikan.', type: 'error' });
            handleStatusUpdate('CHEATED', reason);
          } else {
            setSecondChanceReason(reason);
            setStep('SECOND_CHANCE');
            sendTelegramNotify('SECOND_CHANCE', capturePhoto() || undefined, reason);
          }
        } else if (next >= 3) {
          setToast({ message: `⚠️ PERINGATAN: Jika mengetuk kembali lagi, sistem akan menandakan anda curang! (${next}/5)`, type: 'error' });
        } else {
          setToast({ message: '⛔ Anda tidak diperbolehkan keluar saat ujian berlangsung!', type: 'error' });
        }
        return next;
      });
    };

    const handlePrint = (e: any) => {
      e.preventDefault();
      setToast({ message: 'Aksi Cetak/Print tidak diizinkan!', type: 'error' });
      sendActivityLog("Mencoba mencetak halaman/soal (Print/PDF Attempt)");
    };

    window.addEventListener('beforeunload', handleBeforeUnload2);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeprint', handlePrint);

    // Error Logging: Detect if user closes the tab during exam (Abandoned)
    const handleAbandoned = () => {
      if (!isRefreshingRef.current && !isSubmittingRef.current && !isDeploymentReloadRef.current) {
        const payload = JSON.stringify({
          studentName, className, subject, event: 'ACTIVITY', message: 'Siswa menutup browser / Hard Close', deviceInfo: getDeviceInfo()
        });
        navigator.sendBeacon('/api/telegram/notify', payload);
      }
    };
    window.addEventListener('unload', handleAbandoned);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload2);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('unload', handleAbandoned);
      window.removeEventListener('beforeprint', handlePrint);
    };
  }, [step]);

  const getCameraErrorMessage = (err: any): string => {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Izin ditolak atau dihalangi oleh sistem HP Anda (contoh: ada Balon chat/Overlay layar yang sedang aktif). Tutup balon chat/overlay tersebut, Izinkan pengaturan kamera, atau coba salin link ini dan buka langsung di Google Chrome.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Kamera sedang dipakai aplikasi lain (misal WhatsApp Video, Zoom, atau HP sedang merekam). Tutup aplikasi tersebut lalu coba lagi.';
    }
    if (name === 'AbortError') {
      return 'Permintaan kamera dibatalkan oleh sistem. Kemungkinan ada balon/overlay dari aplikasi lain yang menghalangi. Tutup semua overlay lalu coba lagi.';
    }
    if (name === 'OverconstrainedError') {
      return 'Kamera perangkat Anda tidak mendukung spesifikasi yang diminta. Hubungi guru untuk bantuan.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Tidak ditemukan kamera di perangkat ini. Pastikan perangkat memiliki kamera depan.';
    }
    if (name === 'SecurityError') {
      return 'Browser memblokir akses kamera (keamanan). Pastikan jangan membuka link dari dalam aplikasi (misal Telegram/Line/WA). Salin link dan buka di Chrome.';
    }
    return `Gagal mengakses kamera (${name || 'unknown'}). Pastikan tidak ada aplikasi lain yang menggunakan kamera, atau salin link dan buka di Google Chrome.`;
  };

  // Check permissions (camera only — location is best-effort logging)
  const checkPermissions = async () => {
    setCheckingPerms(true);
    setCameraErrorDetail(null);
    let camReady = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errMsg = 'Browser atau HP Anda tidak mendukung akses kamera secara langsung. Harap salin link ini dan buka pada aplikasi Google Chrome terbaru.';
      setCameraErrorDetail(errMsg);
      setCameraRetryCount(3);
      sendTelegramNotify('ERROR', undefined, `Kamera gagal total (mediaDevices undefined). Siswa mengakses panel Bypass.`);
      camReady = false;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120, facingMode: 'user' } });
        stream.getTracks().forEach(t => t.stop());
        camReady = true;
        setCameraRetryCount(0);
        setCameraErrorDetail(null);
        setExamMode('STRICT');
        setCameraStatus('ACTIVE');
      } catch (err: any) {
        camReady = false;
        const detail = getCameraErrorMessage(err);
        setCameraErrorDetail(detail);
        setCameraRetryCount(prev => {
          const next = prev + 1;
          if (next >= MAX_CAMERA_RETRIES) {
            sendTelegramNotify('ACTIVITY', undefined, `Kamera gagal ${next}x (${err?.name}). Siswa diarahkan ke Mode Terbatas.`);
          }
          return next;
        });
        sendTelegramNotify('ACTIVITY', undefined, `Kamera error: ${err?.name || 'unknown'} (percobaan ${cameraRetryCount + 1}/${MAX_CAMERA_RETRIES})`);
      }
    }
    setCameraOk(camReady);

    // Location: best-effort only, never blocks exam access
    try {
      const pos = await getPosition();
      const locStr = `${pos.coords.latitude},${pos.coords.longitude}`;
      setCurrentLocation(locStr);
      setLocationOk(true);
    } catch {
      setLocationOk(false);
      setCurrentLocation('UNAVAILABLE');
    }

    setCheckingPerms(false);

    if (!camReady) {
      setToast({ message: 'Anda harus mengaktifkan Kamera untuk melanjutkan ujian.', type: 'error' });
    }
  };

  // Wake Lock: Keep screen on during EXAM
  useEffect(() => {
    if (step !== 'EXAM') {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => { wakeLockRef.current = null; });
      }
      return;
    }

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('Screen Wake Lock is active');
        }
      } catch (err: any) {
        console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
      }
    };

    requestWakeLock();

    // Re-acquire on focus
    const handleReacquire = () => {
      if (document.visibilityState === 'visible' && step === 'EXAM') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleReacquire);

    return () => {
      document.removeEventListener('visibilitychange', handleReacquire);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => { wakeLockRef.current = null; });
      }
    };
  }, [step]);

  // Restore session on mount (localStorage)
  useEffect(() => {
    const saved = loadRemedialSession();
    if (saved && (saved.studentName === studentName || !studentName)) {
      if (['EXAM', 'INFO'].includes(saved.step)) {
        setStep(saved.step as RemedialStep);
        setAnswers(saved.answers.length === remedialEssayCount ? saved.answers : new Array(remedialEssayCount).fill(""));
        setNote(saved.note || '');
        setCurrentLocation(saved.location || '');
        startedAtRef.current = saved.startedAt;
        if (saved.attemptId) setAttemptId(saved.attemptId);
        if (saved.attemptToken) setAttemptToken(saved.attemptToken);
        if (saved.studentId) setCurrentStudentId(saved.studentId);
        if (saved.examMode) {
          setExamMode(saved.examMode);
          setCameraStatus(saved.cameraStatus || 'ACTIVE');
        }

        // Recovery for questions/timer if prop is empty (common on refresh)
        if ((!remedialQuestions || remedialQuestions.length === 0) && saved.remedialQuestions) {
          console.log("Recovering questions from local session...");
        } else if ((!remedialQuestions || remedialQuestions.length === 0) && !saved.remedialQuestions) {
          // Both prop and localStorage empty — force-fetch from server before giving up
          console.warn("No questions in props or localStorage. Attempting server recovery...");
          fetch(`/api/grademaster/students/remedial?sessionId=${sessionId}&studentName=${encodeURIComponent(studentName)}`, { cache: 'no-store' })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data && ['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(data.status)) {
                setStep(data.status as RemedialStep);
                return;
              }
              console.error("Critical: No remedial questions found anywhere. Resetting.");
              setToast({ message: "Data soal tidak ditemukan. Silakan masuk kembali.", type: "error" });
              setTimeout(() => { clearRemedialSession(); handleExit(); }, 2000);
            })
            .catch(() => {
              console.error("Server unreachable. Resetting session.");
              setToast({ message: "Data soal tidak ditemukan. Silakan masuk kembali.", type: "error" });
              setTimeout(() => { clearRemedialSession(); handleExit(); }, 2000);
            });
          return;
        }

        const baseTimer = (saved.remedialTimer || remedialTimer) * 60;
        const elapsedSeconds = Math.floor((Date.now() - saved.startedAt) / 1000);
        let remaining = baseTimer + (saved.extendedTime || 0) - elapsedSeconds;
        if (remaining < 0) remaining = 0;
        setTimeLeft(remaining);

        // Track refresh & Toast recovery
        setToast({ message: "Melanjutkan sesi remedial sebelumnya...", type: "success" });
        saveRemedialSession({ ...saved, refreshCount: (saved.refreshCount || 0) + 1 });
      } else if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(saved.step)) {
        setStep(saved.step as RemedialStep);
      }
    }
  }, [sessionId, studentName, remedialEssayCount, remedialTimer]);

  // Check server status on mount (Database) - Persist terminal state across devices/hard-clears
  useEffect(() => {
    // Guard: only fetch if we have identifying info
    if (!sessionId || !studentName) return;

    const checkServerStatus = async () => {
      try {
        const res = await fetch(`/api/grademaster/students/remedial?sessionId=${sessionId}&studentName=${encodeURIComponent(studentName)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.isBlocked) {
             setIsPermanentlyBlocked(true);
             setIsTabHidden(false); 
          }
          if (data.violationCount) {
             setTabWarningCount(data.violationCount);
          }
          
          // If server says terminal status, override local state
          if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(data.status)) {
            setStep(data.status as RemedialStep);
            
            if (data.status === 'COMPLETED') {
              setFinalScore(data.finalScore);
              // Pre-fetch friends list for results screen
              fetch(`/api/grademaster/sessions/${sessionId}/remaining-students`, { cache: 'no-store' })
                .then(r => r.json())
                .then(d => {
                  setRemainingStudents(d.students || []);
                  setSessionCreatedAt(d.sessionCreatedAt);
                });
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch server-side status:', err);
      }
      
      // Fetch behavior points for time extension
      try {
        const pRes = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(className)}&year=${encodeURIComponent(academicYear)}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          const pRecord = pData.students?.find((s: any) => s.student_name === studentName);
          if (pRecord) {
            const currentDate = new Date().toISOString().split('T')[0];
            const usedToday = pRecord.points_date === currentDate ? (pRecord.points_used_today || 0) : 0;
            setPointsBal({ total: pRecord.total_points, usedToday });
          }
        }
      } catch (err) {
        console.error('Failed to fetch points status:', err);
      }
    };
    checkServerStatus();
  }, [sessionId, studentName]);

  // Mark refresh vs tab-leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      isRefreshingRef.current = true;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Detect deployment reload flag set by DeploymentGuard
    if (typeof window !== 'undefined') {
      const deployFlag = localStorage.getItem('gm_deployment_reload_active');
      if (deployFlag === 'true') {
        isDeploymentReloadRef.current = true;
        isRefreshingRef.current = true;
        setTimeout(() => { isDeploymentReloadRef.current = false; }, 5000);
      }
    }

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Persist answers whenever they change
  useEffect(() => {
    if (step !== 'EXAM' || !startedAtRef.current) return;
    const saved = loadRemedialSession();
    const refreshCount = saved?.refreshCount || 0;
    const prevQuestions = saved?.remedialQuestions || [];
    const prevTimer = saved?.remedialTimer || 0;

    saveRemedialSession({
      ...saved,
      sessionId,
      studentName,
      step,
      startedAt: startedAtRef.current,
      answers,
      note,
      location: currentLocation,
      refreshCount,
      shuffledIndices: shuffledQuestions.map(q => q.originalIndex),
      studentId: currentStudentId || undefined,
      examMode,
      cameraStatus,
      remedialQuestions: (remedialQuestions && remedialQuestions.length > 0) ? remedialQuestions : prevQuestions,
      remedialTimer: (remedialTimer && remedialTimer > 0) ? remedialTimer : prevTimer,
    });
  }, [answers, note, step, sessionId, studentName, currentLocation, shuffledQuestions, currentStudentId, examMode, cameraStatus, remedialQuestions, remedialTimer]);

  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => { isSubmittingRef.current = isSubmitting; });

  // ── Session Health Monitoring ──
  useEffect(() => {
    if (step === 'EXAM' && shuffledQuestions.length === 0 && !isSubmitting && !isRefreshingRef.current) {
      console.warn("Detected EXAM step with 0 questions. Attempting server recovery...");
      sendTelegramNotify('ERROR', undefined, `⚠️ [HEALTH_CHECK] ${studentName} - Sesi EXAM tapi soal kosong. Mencoba recovery dari server...`);

      const attemptRecovery = async () => {
        try {
          const res = await fetch(`/api/grademaster/students/remedial?sessionId=${sessionId}&studentName=${encodeURIComponent(studentName)}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(data.status)) {
              setStep(data.status as RemedialStep);
              if (data.status === 'COMPLETED') setFinalScore(data.finalScore);
              return;
            }
          }
        } catch { /* server unreachable */ }

        // Recovery failed — reset
        setToast({ message: "Sesi tidak valid (soal kosong). Silakan masuk kembali.", type: "error" });
        setTimeout(() => {
          clearRemedialSession();
          handleExit();
          window.location.reload();
        }, 2000);
      };
      attemptRecovery();
    }
  }, [step, shuffledQuestions.length]);

  const handleCameraViolation = useCallback((type: string) => {
    if (hasTriggeredCheatingRef.current || isSubmittingRef.current) return;

    setWarningCount(prev => {
      const newCount = prev + 1;
      
      let flagMessage = "";
      if (type === 'NO_FACE') flagMessage = "Wajah tidak terdeteksi";
      if (type === 'MULTIPLE_FACES') flagMessage = "Terdeteksi lebih dari satu orang";

      const reason = `${flagMessage} (${newCount} kali)`;

      setClientCheatingFlags(oldFlags => {
        if (!oldFlags.includes(flagMessage)) {
           return [...oldFlags, flagMessage];
        }
        return oldFlags;
      });

      if (newCount >= 10) {
        setClientCheatingFlags(f => [...f, reason]);
        if (secondChanceUsed) {
          hasTriggeredCheatingRef.current = true;
          setToast({ message: "Batas pelanggaran terlampaui. Ujian dihentikan.", type: "error" });
          handleStatusUpdate('CHEATED', reason);
        } else {
          setSecondChanceReason(reason);
          setStep('SECOND_CHANCE');
          sendTelegramNotify('SECOND_CHANCE', capturePhoto() || undefined, reason);
        }
      } else {
        setToast({ message: `Peringatan Kamera: ${flagMessage} (${newCount}/10)`, type: "error" });
      }

      return newCount;
    });
  }, [secondChanceUsed]);

  // Shuffle logic
  useEffect(() => {
    if (!remedialQuestions || remedialQuestions.length === 0) return;

    const saved = loadRemedialSession();
    let indices: number[] = [];
    let sourceQuestions = remedialQuestions;

    // Prioritize indices from saved session to keep order consistent on refresh
    if (saved && saved.sessionId === sessionId) {
      if (saved.shuffledIndices && saved.shuffledIndices.length > 0) {
        indices = saved.shuffledIndices;
        // If prop is empty, use questions from session
        if ((!sourceQuestions || sourceQuestions.length === 0) && saved.remedialQuestions) {
          sourceQuestions = saved.remedialQuestions;
        }
      }
    }
    
    if (indices.length === 0 && sourceQuestions && sourceQuestions.length > 0) {
      // Generate new shuffle
      indices = sourceQuestions.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    }

    if (sourceQuestions && sourceQuestions.length > 0) {
      const mapped = indices.map(idx => ({ text: sourceQuestions[idx] || '', originalIndex: idx }));
      setShuffledQuestions(mapped);
    }
  }, [remedialQuestions, sessionId]);

  // Activate EXAM when mounted
  useEffect(() => {
    if (step === 'EXAM' && attemptId && attemptToken && currentStudentId && !hasActivatedRef.current) {
      hasActivatedRef.current = true;
      const activate = async () => {
        try {
          const res = await fetch('/api/grademaster/students/remedial/activate', {
             method: 'POST',
             cache: 'no-store' as RequestCache,
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               action: 'ACTIVATE',
               attemptId,
               studentId: currentStudentId,
               token: attemptToken
             })
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            if (errorData.error === 'RESET_REQUIRED') {
              setToast({ message: "Sesi sebelumnya telah direset oleh guru. Silakan mulai ulang.", type: "error" });
              setTimeout(() => {
                clearRemedialSession();
                window.location.reload();
              }, 3000);
              return;
            }
            throw new Error(errorData.error || 'Gagal aktivasi session');
          }
        } catch (e: any) {
          console.error(e);
          setToast({ message: `Gagal memuat soal: ${e.message}. Silakan mulai ulang.`, type: "error" });
          setTimeout(() => {
            clearRemedialSession();
            window.location.reload();
          }, 3000);
        }
      };
      activate();
    }
  }, [step, attemptId, attemptToken, currentStudentId]);



  const getPosition = (): Promise<{ coords: { latitude: number; longitude: number } }> => {
    return new Promise((resolve, reject) => {
      
      const fetchIpFallback = (fallbackErr: any) => {
        fetch('https://get.geojs.io/v1/ip/geo.json')
          .then(res => res.json())
          .then(data => {
            if (data && data.latitude && data.longitude) {
              resolve({ coords: { latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) } });
            } else {
              // Always resolve to prevent trapping old devices (Nokia 5.2 etc)
              resolve({ coords: { latitude: 0, longitude: 0 } });
            }
          })
          .catch(() => resolve({ coords: { latitude: 0, longitude: 0 } }));
      };

      if (!navigator.geolocation) {
        fetchIpFallback({ code: 0, message: 'Browser tidak mendukung Geolocation' });
        return;
      }
      
      // Try high accuracy first
      navigator.geolocation.getCurrentPosition(resolve, (errHigh) => {
        if (errHigh.code === 1) {
          // If explicitly denied, fallback to IP immediately to prevent getting stuck
          fetchIpFallback(errHigh);
          return;
        }
        // Fallback: try without high accuracy
        navigator.geolocation.getCurrentPosition(resolve, (errLow) => {
          if (errLow.code === 1) {
            fetchIpFallback(errLow);
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

    const saved = loadRemedialSession();
    let effectiveQuestions = remedialQuestions;
    
    // Check local session fallback if prop is empty
    if ((!effectiveQuestions || effectiveQuestions.length === 0) && saved?.remedialQuestions) {
      effectiveQuestions = saved.remedialQuestions;
    }

    if (!effectiveQuestions || effectiveQuestions.length === 0) {
      const errMsg = "Soal remedial belum diatur atau sesi Anda telah direset oleh guru. Silakan masuk kembali.";
      setToast({ message: errMsg, type: "error" });
      
      // Try to get some metadata for the log even if it's currently empty state
      const logName = studentName || saved?.studentName || 'Siswa Unknown';
      const logClass = className || saved?.location?.split(' - ')[0] || 'Kelas Unknown';
      
      sendTelegramNotify('ERROR', undefined, `⚠️ [${logClass}] ${logName} - Gagal Mulai: Soal Kosong (Mapel: ${subject || 'Informatika'})`);
      
      // Clear persistence and reload to let student re-type their name/session
      setTimeout(() => {
        clearRemedialSession();
        window.location.reload();
      }, 3000);
      
      setIsSubmitting(false);
      return;
    }

    // 1. Get Location (best-effort — never blocks exam start)
    let locStr = currentLocation || 'UNAVAILABLE';
    try {
      const pos = await getPosition();
      locStr = `${pos.coords.latitude},${pos.coords.longitude}`;
      setCurrentLocation(locStr);
    } catch {
      locStr = 'UNAVAILABLE';
      setCurrentLocation('UNAVAILABLE');
    }

    // Capture & Compress Photo (non-blocking — exam proceeds even if photo fails)
    let capturedImg = capturePhoto();
    if (!capturedImg && examMode !== 'LIMITED') {
      // Small delay to wait for video to reach readyState if just mounted
      await new Promise(r => setTimeout(r, 500));
      capturedImg = capturePhoto();
    }

    if (capturedImg) {
      capturedImg = await compressImage(capturedImg);
    } else {
      if (examMode === 'LIMITED') {
        setClientCheatingFlags(f => [...f, "Ujian dimulai dengan Mode Terbatas (Tanpa Kamera/Lokasi)"]);
        sendTelegramNotify('ACTIVITY', undefined, `⚠️ Siswa melanjutkan ujian dengan mode LIMITED karena perangkat tidak mendukung.`);
      } else {
        sendTelegramNotify('ACTIVITY', undefined, "Foto verifikasi gagal diambil (kamera mungkin belum sepenuhnya siap)");
      }
    }

    let attemptIdFromServer: string | undefined;
    let attemptTokenFromServer: string | undefined;
    let studentIdFromServer: string | undefined;

      // 3. Start Session on Server
    try {
      const res = await fetch('/api/grademaster/students/remedial', {
        method: 'POST',
        cache: 'no-store' as RequestCache,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          studentName, 
          status: 'INITIATED', 
          location: locStr, 
          photo: capturedImg 
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.error === 'RESET_REQUIRED') {
          setToast({ message: "Sesi anda telah direset. Silakan login kembali.", type: "error" });
          setTimeout(() => {
            clearRemedialSession();
            window.location.reload();
          }, 3000);
          return;
        }
        
        // Handle specifically missing questions from server side
        if (data.error?.includes('INVALID_SESSION_DATA') || data.error?.includes('Guru belum mengatur')) {
          setToast({ message: "Gagal memulai: Soal remedial belum diatur oleh guru.", type: "error" });
          sendTelegramNotify('ERROR', undefined, `⚠️ ${studentName} - Gagal Mulai: Soal Kosong di Server (Mapel: ${subject})`);
          setIsSubmitting(false);
          return;
        }

        const errMsg = data.error || "Terjadi kesalahan saat memulai ujian. Coba lagi.";
        setToast({ message: errMsg, type: "error" });
        sendTelegramNotify('ERROR', undefined, `Gagal API Mulai: ${errMsg}`);
        if (data.error?.includes('permanen')) {
            setStep('CHEATED'); 
        }
        setIsSubmitting(false);
        return;
      }

      // If server returned fresh questions, update local state
      if (data.remedialQuestions && data.remedialQuestions.length > 0) {
        setShuffledQuestions(data.remedialQuestions.map((q: string, i: number) => ({ text: q, originalIndex: i })));
      }
      
      if (data.attemptId && data.attemptToken && data.studentId) {
        attemptIdFromServer = data.attemptId;
        attemptTokenFromServer = data.attemptToken;
        studentIdFromServer = data.studentId;

        setAttemptId(data.attemptId);
        setAttemptToken(data.attemptToken);
        setCurrentStudentId(data.studentId);
      }

      // MediaPipe ProctoringCamera will handle media access and stream locally
      startedAtRef.current = Date.now();
      
      // 4. Generate initial shuffle on start
      // Use the most up-to-date questions (possibly refreshed from server above)
      const activeQuestions = data.remedialQuestions && data.remedialQuestions.length > 0 
        ? data.remedialQuestions 
        : effectiveQuestions;

      const indices = activeQuestions.map((_: any, i: number) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      const initialShuffled = indices.map((idx: number) => ({ 
        text: activeQuestions[idx], 
        originalIndex: idx 
      }));
      
      setShuffledQuestions(initialShuffled);
      setAnswers(new Array(activeQuestions.length).fill(""));

      saveRemedialSession({
        sessionId,
        studentName,
        step: 'EXAM',
        startedAt: startedAtRef.current,
        answers: new Array(activeQuestions.length).fill(""),
        note,
        location: locStr || 'UNAVAILABLE',
        refreshCount: 0,
        shuffledIndices: indices,
        attemptId: attemptIdFromServer || attemptId || undefined,
        attemptToken: attemptTokenFromServer || attemptToken || undefined,
        studentId: studentIdFromServer || currentStudentId || undefined,
        examMode,
        cameraStatus,
        remedialQuestions: activeQuestions,
        remedialTimer,
      });
      // Initialize session and set step to EXAM
      setIsSubmitting(false);
      setStep('EXAM');
    } catch (e) {
      setToast({ message: "Terjadi kesalahan saat menghubungi server. Coba lagi.", type: "error" });
      sendTelegramNotify('ERROR', undefined, "Gagal Network: Put Remedial failed");
      setIsSubmitting(false);
      return;
    }
  };

  // Timer countdown (depends on timeLeft)
  useEffect(() => {
    if (step !== 'EXAM') return;
    if (showTimeUpModal) return; // Pause timer physically if modal intercepts
    
    if (timeLeft <= 0) {
      setShowTimeUpModal(true);
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [step, timeLeft, showTimeUpModal, pointsBal]);

  // Proctoring: START photo + 10s auto-snap (depends ONLY on step, NOT timeLeft)
  useEffect(() => {
    if (step !== 'EXAM') return;

    // Auto-capture START photo when exam interface is fully rendered
    if (!hasSentStartNotifRef.current) {
      hasSentStartNotifRef.current = true;
      setTimeout(async () => {
        let snap = capturePhoto();
        if (!snap) {
           await new Promise(r => setTimeout(r, 1000));
           snap = capturePhoto();
        }
        const compressed = snap ? await compressImage(snap) : undefined;
        sendTelegramNotify('START', compressed);
        
        const net = getNetworkInfo();
        if (net.includes('2g') || net.includes('3g')) {
          setToast({ message: "Koneksi lambat terdeteksi. Harap bersabar saat mengunggah jawaban.", type: "error" });
        }
      }, 2500);
    }

    // Auto-Snap for Proctoring (Telegram)
    // Using recursive setTimeout instead of setInterval to prevent overlap and backlog issues, especially on slow devices
    let isProctoringActive = true;
    let proctorTimerId: NodeJS.Timeout;

    const runProctorCycle = async () => {
      if (!isProctoringActive || step !== 'EXAM') return;
      
      try {
        // Prevent capturing static images when the tab is inactive/backgrounded
        if (!document.hidden) {
          const snap = capturePhoto();
          if (snap) {
            const compressed = await compressImage(snap);
            await sendTelegramNotify('PROCTORING', compressed, `📸 Auto-Snap`);
          }
        }
      } catch (err) {
        console.error("Proctoring auto-snap error:", err);
      } finally {
        if (isProctoringActive && step === 'EXAM') {
          // Schedule next run 10 seconds AFTER the current one completely finished
          proctorTimerId = setTimeout(runProctorCycle, 10000);
        }
      }
    };

    // Initial trigger
    proctorTimerId = setTimeout(runProctorCycle, 10000);

    return () => {
      isProctoringActive = false;
      clearTimeout(proctorTimerId);
    };
  }, [step]);

  // Anti-cheat mechanism — 3 warnings before ban
  useEffect(() => {
    if (step !== 'EXAM') return;

    const handleTabLeave = async () => {
      if (isRefreshingRef.current || hasTriggeredCheatingRef.current || isPermanentlyBlocked) return;
      
      try {
        const res = await fetch('/api/grademaster/students/remedial/violation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, studentName })
        });
        
        if (res.ok) {
          const data = await res.json();
          setTabWarningCount(data.count);
          
          if (data.isBlocked) {
             setClientCheatingFlags(f => [...f, `Batas maksimal pelanggaran tab tercapai`]);
             setIsPermanentlyBlocked(true);
             hasTriggeredCheatingRef.current = true;
             setToast({ message: 'Batas peringatan terlampaui. Akses ujian Anda ditutup sistem.', type: 'error' });
             sendTelegramNotify('CHEATED', capturePhoto() || undefined, 'Meninggalkan halaman ujian melebihi batas yang diizinkan sistem.');
          } else {
             setToast({ message: `⚠️ PERINGATAN ${data.count}/${data.limit}: Jangan tinggalkan halaman ujian! (Sisa ${data.limit - data.count} peringatan)`, type: 'error' });
          }
        }
      } catch (err) {
        console.error('Failed to log violation via API:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
         setIsTabHidden(true);
         if (!isRefreshingRef.current && !isDeploymentReloadRef.current) {
           sendActivityLog("Meninggalkan layar ujian (Tab Switch / Task Switcher)");
           handleTabLeave();
         }
      } else {
         setIsTabHidden(false);
         sendActivityLog("Kembali ke layar ujian");
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (!isRefreshingRef.current && !isDeploymentReloadRef.current && document.hidden) {
           sendActivityLog("Halaman kehilangan fokus (Blur)");
           handleTabLeave();
        }
      }, 500);
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setToast({ message: "Tidak diperkenankan untuk menyalin lembar soal", type: "error" });
      sendActivityLog("Mencoba menyalin/copy teks soal");
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);

    const handleOffline = () => {
      setIsOffline(true);
      setNetworkWarningCount(prev => {
        const next = prev + 1;
        const reason = `Mematikan koneksi internet (Peringatan ${next})`;
        if (next > MAX_NETWORK_WARNINGS) {
          setClientCheatingFlags(f => [...f, reason]);
          hasTriggeredCheatingRef.current = true;
          setToast({ message: 'Terlalu sering mematikan data. Ujian dihentikan.', type: 'error' });
          handleStatusUpdate('CHEATED', 'Mematikan internet lebih dari 2 kali');
        } else {
          sendActivityLog(reason);
        }
        return next;
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      sendActivityLog("Koneksi internet kembali aktif");
      setToast({ message: "Koneksi terhubung kembali. Lanjutkan ujian.", type: "success" });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [step, setToast]);

  const handleExtendTime = async () => {
    const fixedPoints = 10;
    
    if (pointsBal !== null && (pointsBal.usedToday + fixedPoints > 10)) {
      setToast({ message: `Sisa kuota harian ekstensi waktu Anda tersisa ${10 - pointsBal.usedToday} menit.`, type: "error" });
      return;
    }
    
    setExtendLoading(true);
    try {
      const res = await fetch('/api/grademaster/behaviors/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, className, academicYear, pointsToSpend: fixedPoints })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah waktu");
      
      // Calculate Added Secs
      const addedSeconds = fixedPoints * 60;
      setTimeLeft(prev => prev > 0 ? prev + addedSeconds : addedSeconds);
      
      // Update local storage so a refresh doesn't zero it
      const s = loadRemedialSession();
      if (s) {
        saveRemedialSession({ ...s, extendedTime: (s.extendedTime || 0) + addedSeconds });
      }
      
      // Update points visual cache
      setPointsBal(prev => prev ? { total: data.newPoints, usedToday: prev.usedToday + fixedPoints } : null);
      
      setShowTimeUpModal(false);
      setToast({ message: `Waktu ditambah ${fixedPoints} menit. Cepat selesaikan!`, type: "success" });
      sendActivityLog(`Menggunakan poin sebanyak ${fixedPoints} untuk tambahan waktu ujian ${fixedPoints} menit.`);
      
    } catch(err: any) {
      setToast({ message: err.message || "Gagal menghubungi server", type: "error" });
    } finally {
      setExtendLoading(false);
    }
  };

  const handleStatusUpdate = async (status: 'COMPLETED' | 'CHEATED' | 'TIMEOUT', explicitReason?: string) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    
    setIsSubmitting(true);

    const allFlags = explicitReason 
      ? (clientCheatingFlags.includes(explicitReason) ? clientCheatingFlags : [...clientCheatingFlags, explicitReason])
      : clientCheatingFlags;

    const payload = { 
      sessionId, 
      studentName, 
      status, 
      location: currentLocation,
      answers: (status === 'COMPLETED' || status === 'TIMEOUT') ? (() => {
        const mappedAnswers = new Array(remedialEssayCount).fill("");
        shuffledQuestions.forEach((sq, i) => {
          if (sq.originalIndex < remedialEssayCount) {
            mappedAnswers[sq.originalIndex] = answers[i] || "";
          }
        });
        return mappedAnswers;
      })() : undefined,
      note: status === 'COMPLETED' ? note : undefined,
      clientCheatingFlags: allFlags.length > 0 ? allFlags : undefined,
      examMode,
      cameraStatus,
      riskLevel: allFlags.length > 0 ? 'HIGH' : (examMode === 'LIMITED' ? 'MEDIUM' : 'LOW'),
      cheatingReason: explicitReason
    };

    const MAX_SUBMIT_RETRIES = 3;
    let lastError = '';

    for (let attempt = 1; attempt <= MAX_SUBMIT_RETRIES; attempt++) {
      try {
        const res = await fetch('/api/grademaster/students/remedial', {
          method: 'POST',
          cache: 'no-store' as RequestCache,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          
          if (errorData.error === 'RESET_REQUIRED') {
            setToast({ message: "Sesi anda telah direset oleh proktor. Data lokal dihapus.", type: "error" });
            setTimeout(() => {
              clearRemedialSession();
              window.location.reload();
            }, 3000);
            return;
          }

          const errMsg = errorData.error || "Terjadi kesalahan saat mengirim jawaban.";
          
          if (errorData.error?.includes('sudah pernah dilakukan') || errorData.error?.includes('permanen') || res.status === 403) {
            clearRemedialSession();
            setStep('CHEATED');
            setToast({ message: errMsg, type: "error" });
            setIsSubmitting(false);
            return;
          }

          lastError = errMsg;
          if (attempt < MAX_SUBMIT_RETRIES) {
            const delay = 500 * Math.pow(2, attempt - 1);
            setToast({ message: `Gagal mengirim (${attempt}/${MAX_SUBMIT_RETRIES}). Mencoba ulang...`, type: "error" });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          const data = await res.json();
          
          // STRICT KKM ENFORCEMENT: If status is 'REMEDIAL', it means score < KKM
          if (data.status === 'REMEDIAL') {
            setToast({ message: "⚠️ NILAI BELUM MENCAPAI KKM (70). Silakan perbaiki jawaban Anda dan kumpulkan lagi!", type: "error" });
            setIsSubmitting(false);
            hasSubmittedRef.current = false; // Allow re-submission
            setFinalScore(data.newFinalScore || data.final_score);
            return; // STAY ON EXAM STEP
          }

          clearRemedialSession();
          
          const finalStatus = data.status || status;
          setStep(finalStatus);
          
          if (finalStatus === 'COMPLETED') {
            setToast({ message: "Jawaban Remedial berhasil dikumpulkan. Selamat, Anda LULUS KKM!", type: "success" });
            const fScore = data.newFinalScore || data.final_score;
            setFinalScore(fScore);
            sendTelegramNotify('FINISH', undefined, undefined, fScore);
            
            fetch(`/api/grademaster/sessions/${sessionId}/remaining-students`, { cache: 'no-store' })
              .then(r => r.json())
              .then(d => {
                setRemainingStudents(d.students || []);
                setSessionCreatedAt(d.sessionCreatedAt);
              });
          } else if (finalStatus === 'CHEATED') {
            let photo = capturePhoto();
            const cheatedReason = explicitReason || allFlags.join(', ') || 'Pelanggaran proctoring terdeteksi oleh sistem';
            compressImage(photo || "").then(compressed => {
              sendTelegramNotify('CHEATED', compressed || photo || undefined, cheatedReason);
            });
          }
          setIsSubmitting(false);
          return;
        }
      } catch (e) {
        lastError = "Kesalahan jaringan";
        if (attempt < MAX_SUBMIT_RETRIES) {
          const delay = 500 * Math.pow(2, attempt - 1);
          setToast({ message: `Koneksi gagal (${attempt}/${MAX_SUBMIT_RETRIES}). Mencoba ulang...`, type: "error" });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries failed — save to localStorage as safety net
    try {
      localStorage.setItem('gm_failed_submission', JSON.stringify({ ...payload, failedAt: Date.now() }));
    } catch { /* localStorage might be full */ }

    setToast({ message: `Gagal mengirim jawaban setelah ${MAX_SUBMIT_RETRIES} percobaan: ${lastError}. Data tersimpan lokal, hubungi guru.`, type: "error" });
    sendTelegramNotify('ERROR', undefined, `Submit gagal ${MAX_SUBMIT_RETRIES}x: ${lastError}`);
    setIsSubmitting(false);
    hasSubmittedRef.current = false; // ALLOW RETRY
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
    const allPermsOk = examMode === 'LIMITED' || cameraOk;

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
              <span>Lokasi <strong>(GPS) akan dicatat otomatis</strong> jika tersedia. Tidak wajib untuk memulai ujian.</span>
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
                  {checkingPerms ? '🟡 Sedang dicek...' : locationOk ? '📍 Aktif' : '⚪ Tidak tersedia (opsional)'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={checkPermissions}
            disabled={checkingPerms}
            className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all mb-4 flex items-center justify-center gap-2 border-2 ${cameraOk ? 'bg-emerald-50 text-emerald-600 border-emerald-400' : 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95'}`}
          >
            {checkingPerms ? '🟡 Sedang Memproses...' : cameraOk ? '✅ Kamera Aktif' : '🔐 Izinkan Kamera'}
          </button>

          {/* Camera error detail banner */}
          {cameraErrorDetail && !cameraOk && (
            <div className="mb-4 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-xs font-black text-rose-700 uppercase tracking-wider mb-1">Kamera Tidak Dapat Diakses</p>
                  <p className="text-xs text-rose-600 font-bold leading-relaxed">{cameraErrorDetail}</p>
                  {cameraRetryCount > 0 && (
                    <p className="text-[10px] text-rose-400 font-bold mt-2">
                      Percobaan: {cameraRetryCount}/{MAX_CAMERA_RETRIES}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {examMode === 'LIMITED' ? (
            <>
              <div className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-inner">
                <p className="text-xs text-amber-900 font-black mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600" /> MODE UJIAN TERBATAS
                </p>
                <p className="text-[10px] text-amber-800 font-bold leading-relaxed mb-3">
                  Anda masuk menggunakan Mode Terbatas karena keterbatasan perangkat (Gagal akses kamera/lokasi). Tindakan ini akan tercatat di sistem admin.
                </p>
                <button
                  onClick={startExam}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl bg-orange-500 text-white shadow-orange-500/20 hover:scale-105 transition-all flex items-center justify-center"
                >
                  {isSubmitting ? 'MEMPROSES...' : 'SAYA MENGERTI, MULAI UJIAN'}
                </button>
              </div>
            </>
          ) : cameraRetryCount >= MAX_CAMERA_RETRIES ? (
            <>
              <div className="mb-4 p-4 bg-slate-900 rounded-2xl text-center">
                <p className="text-xs text-white font-bold mb-1">Perangkat tidak mendukung / gagal akses.</p>
                <p className="text-[10px] text-slate-400 font-bold mb-4">Anda dapat melanjutkan ujian dalam <strong className="text-amber-400">Mode Terbatas (LIMITED)</strong>. Monitoring anti-cheat seperti tab-switch tetap berjalan.</p>
                <button
                  onClick={() => {
                    setExamMode('LIMITED');
                    if (!cameraOk) setCameraStatus('FAILED');
                  }}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                >
                   Masuk Mode Terbatas
                </button>
              </div>
              <button
                onClick={onBack}
                className="w-full py-3 text-slate-400 bg-slate-800 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} /> Kembali ke Halaman Utama
              </button>
            </>
          ) : (
            <>
              {!allPermsOk && (
                <button
                  onClick={checkPermissions}
                  disabled={checkingPerms}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all mb-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkingPerms ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memeriksa...</>
                  ) : cameraRetryCount > 0 ? (
                    <><AlertTriangle size={14} /> Coba Lagi ({cameraRetryCount}/{MAX_CAMERA_RETRIES})</>
                  ) : (
                    <><AlertTriangle size={14} /> Periksa Izin Kamera</>
                  )}
                </button>
              )}

              <button
                onClick={startExam}
                disabled={isSubmitting || !allPermsOk || (remedialQuestions.length === 0 && !loadRemedialSession()?.remedialQuestions)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
              >
                {isSubmitting ? 'MEMPROSES...' : 
                 (remedialQuestions.length === 0 && !loadRemedialSession()?.remedialQuestions) ? '⏳ MEMUAT DATA UJIAN...' :
                 !allPermsOk ? '⛔ AKTIFKAN IZIN TERLEBIH DAHULU' : 'SAYA MENGERTI, MULAI REMEDIAL'}
              </button>
            </>
          )}
        </div>

        {cameraOk && (
          <div className="fixed top-4 right-4 w-24 h-18 md:w-32 md:h-24 rounded-2xl overflow-hidden border-4 border-white shadow-2xl z-[60] animate-in zoom-in duration-500">
            <ProctoringCamera ref={videoRef} onViolation={handleCameraViolation} />
          </div>
        )}
      </div>
    );
  }

  // RENDER: TIME UP MODAL (Extension points feature)
  if (step === 'EXAM' && showTimeUpModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
        <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-rose-100 text-rose-600 animate-pulse">
            <Clock size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit uppercase tracking-tight">Waktu Habis!</h2>
          <p className="text-sm font-bold text-slate-500 mb-6">
            Pilih <strong className="text-indigo-600">Setuju</strong> di bawah ini untuk mengambil tambahan waktu 10 menit dengan memotong 10 Poin Disiplin Anda. Ujian tidak akan selesai sebelum Anda mengumpulkannya.
          </p>
          
          <div className="bg-slate-50 rounded-2xl w-full p-4 mb-6 border border-slate-100 shadow-sm text-center flex flex-col gap-3">
            <div className="flex justify-between items-center px-4">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sisa Poin Anda:</span>
              <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{pointsBal ? pointsBal.total : '...'} Poin</span>
            </div>
            <div className="flex justify-between items-center px-4">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Biaya Penambahan:</span>
              <span className="text-sm font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-lg">-10 Poin</span>
            </div>
          </div>
          
          <div className="w-full">
            <button
              onClick={() => {
                setPointsToSpend(10);
                setTimeout(handleExtendTime, 0);
              }}
              disabled={extendLoading || !pointsBal || pointsBal.total < 10 || pointsBal.usedToday >= 10}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              {extendLoading ? 'MEMPROSES...' : 'SETUJU TAMBAH WAKTU (-10 POIN)'}
            </button>
            {(!pointsBal || pointsBal.total < 10 || pointsBal.usedToday >= 10) && (
              <p className="text-[10px] md:text-xs text-rose-500 font-bold mt-4">
                Poin Anda tidak cukup atau limit harian mencapai batas. Harap hubungi Pengawas.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RENDER: SECOND CHANCE SCREEN
  if (step === 'SECOND_CHANCE') {
    const handleUseSecondChance = () => {
      setSecondChanceUsed(true);
      setWarningCount(0);
      setTabWarningCount(0);
      setBackPressCount(0);
      setClientCheatingFlags([]); // Clear stale flags so they aren't sent on submit
      hasTriggeredCheatingRef.current = false;
      setStep('EXAM');
      setToast({ message: '⚠️ Ini adalah kesempatan terakhir Anda. Pelanggaran berikutnya akan langsung didiskualifikasi!', type: 'error' });
      sendTelegramNotify('ACTIVITY', capturePhoto() || undefined, `Siswa melanjutkan ujian dengan kesempatan kedua. Alasan sebelumnya: ${secondChanceReason}`);
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-in bg-amber-50/50">
        <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border-2 border-amber-200 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-amber-100 text-amber-600 animate-pulse">
            <AlertTriangle size={40} />
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit">⚠️ Pelanggaran Terdeteksi!</h2>

          <p className="text-sm text-slate-500 font-bold mb-4 leading-relaxed">
            Sistem mendeteksi tindakan yang melanggar aturan ujian:
          </p>

          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 mb-6">
            <p className="text-sm font-black text-rose-700">{secondChanceReason}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-left space-y-3">
            <p className="text-xs font-black text-amber-800 uppercase tracking-wider">📢 Peringatan Penting</p>
            <p className="text-sm text-amber-700 font-bold leading-relaxed">
              Anda mendapat <strong className="text-rose-600">1x kesempatan terakhir</strong> untuk melanjutkan ujian.
              Jika melakukan pelanggaran lagi, Anda akan <strong className="text-rose-600">langsung didiskualifikasi</strong> dan 
              nilai menjadi <strong className="text-rose-600">0 (NOL)</strong>.
            </p>
            <p className="text-xs text-amber-600 font-bold">
              ⏱️ Timer ujian tetap berjalan selama jeda ini.
            </p>
          </div>

          <button
            onClick={handleUseSecondChance}
            className="w-full py-4 bg-amber-500 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 mb-3"
          >
            🔄 Saya Mengerti, Lanjutkan Ujian
          </button>

          <p className="text-[10px] text-slate-400 font-bold">
            Foto otomatis tetap diambil setiap 10 detik selama ujian berlangsung.
          </p>
        </div>
      </div>
    );
  }

  // RENDER: COMPLETED / CHEATED / TIMEOUT
  if (step === 'CHEATED' || step === 'TIMEOUT' || step === 'COMPLETED') {
    const isCheat = step === 'CHEATED';
    const isTimeout = step === 'TIMEOUT';
    const isCompleted = step === 'COMPLETED';

    const getRemainingTimeStr = () => {
      if (!sessionCreatedAt) return "";
      const deadline = new Date(sessionCreatedAt).getTime() + (5 * 24 * 60 * 60 * 1000);
      const diff = deadline - Date.now();
      if (diff <= 0) return "Waktu Habis";

      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      
      let str = "";
      if (days > 0) str += `${days} Hari `;
      if (hours > 0) str += `${hours} Jam `;
      str += `${mins} Menit`;
      return str;
    };

    const handleShare = () => {
      const timeStr = getRemainingTimeStr();
      const text = `Halo! Saya sudah beres remedial ${subject} dengan nilai ${finalScore}. Yuk buruan remedial bagi yang belum, sisa waktu tinggal ${timeStr} lagi (Deadline Jakarta)!`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
      <div className={`min-h-screen py-10 flex items-center justify-center p-4 animate-in ${isCheat ? 'bg-rose-50/50' : isTimeout ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`}>
        <div className={`bg-white max-w-lg w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border-2 text-center ${isCheat ? 'border-rose-100' : isTimeout ? 'border-amber-100' : 'border-emerald-100'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCheat ? 'bg-rose-100 text-rose-600' : isTimeout ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {isCheat ? <ShieldX size={40} /> : isTimeout ? <Clock size={40} /> : <CheckCircle2 size={40} />}
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit">
            {isCheat ? 'Terdeteksi Mencontek!' : isTimeout ? 'Waktu Habis!' : 'Berhasil Disimpan!'}
          </h2>
          
          <p className="text-sm md:text-base text-slate-500 font-bold mb-4 leading-relaxed">
            {isCheat ? (
               <>Anda terdeteksi melakukan tindakan yang dilarang (keluar tab/layar). Nilai Remedial Anda diatur menjadi <strong className="text-rose-600">0</strong>.<br /><br />Hubungi <strong>Guru Mata Pelajaran</strong>.</>
            ) : isTimeout ? (
               <>Waktu pengerjaan remedial Anda sudah habis. Formulir terkunci dan nilai belum memenuhi batas KKM.</>
            ) : (
               <>
                 {finalScore !== null && finalScore < 70 ? (
                   <>
                     <span className="text-rose-600 block mb-2 font-black uppercase text-xs tracking-widest">⚠️ Belum Mencapai KKM</span>
                     Nilai kamu (<strong className="text-rose-600">{finalScore}</strong>) masih kurang memenuhi KKM (70). 
                     Silakan pelajari lagi dan <strong>coba lagi</strong> untuk memperbaikinya.
                   </>
                 ) : (
                   <>Jawaban remedial Anda telah tersimpan ke dalam sistem database sekolah. Skor akhir Anda: <strong className="text-emerald-600 font-black text-lg">{finalScore}</strong></>
                 )}
               </>
            )}
          </p>

          {isCompleted && (
            <div className="mt-8 mb-8">
               {finalScore !== null && finalScore < 70 ? (
                 <button
                    onClick={() => {
                      clearRemedialSession();
                      window.location.reload();
                    }}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all mb-6"
                 >
                   <Clock size={16} /> Coba Lagi Sekarang
                 </button>
               ) : (
                 <button
                   onClick={handleShare}
                   className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all mb-6"
                 >
                   <Send size={16} /> Bagikan ke Teman Class
                 </button>
               )}

               {remainingStudents.length > 0 && (
                 <div className="text-left bg-slate-50 border border-slate-100 rounded-2xl p-5 overflow-hidden">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                       <span>Daftar Teman Belum Remedial</span>
                       <span className="text-rose-500">Sisa: {getRemainingTimeStr()}</span>
                    </h3>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                       {remainingStudents.map((s, i) => (
                         <div key={i} className="flex items-center justify-between text-xs font-bold text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                            <span>{s.name}</span>
                            <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 font-black">BELUM</span>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          )}
          
          {/* Only show Exit if passed KKM or it's a cheat/timeout which are terminal */}
          {(!isCompleted || (finalScore !== null && finalScore >= 70) || isCheat || isTimeout) && (
            <button
              onClick={handleExit}
              className={`w-full py-4 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${isCheat ? 'bg-rose-500 shadow-rose-500/20' : isTimeout ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}
            >
              Selesai & Keluar
            </button>
          )}
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
      {/* Anti-Screenshot / Privacy Overlay (Activates when tab/app switcher is opened or permanently blocked) */}
      {(isTabHidden || isPermanentlyBlocked) && step === 'EXAM' && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
           <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <ShieldX size={48} />
           </div>
           <h2 className="text-xl font-black text-white mb-2 font-outfit">Layar Diproteksi</h2>
           <p className="text-slate-400 text-sm font-bold max-w-xs leading-relaxed">
             {isPermanentlyBlocked 
                ? "Akses Anda ke halaman ujian telah diblokir permanen karena melanggar aturan ujian (Meninggalkan Halaman). Hubungi Guru Pengawas." 
                : "Konten disembunyikan untuk menjaga keamanan ujian. Kembalilah ke halaman untuk melanjutkan."}
           </p>
        </div>
      )}

      {/* Global Anti-Selection Styles */}
      <style jsx global>{`
        .privacy-mode {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
        }
        @media print {
          body { display: none !important; }
        }
      `}</style>

      <div className={`privacy-mode ${(isTabHidden || isPermanentlyBlocked || isOffline) && step === 'EXAM' ? 'invisible' : ''}`}>
        {/* Fixed Responsive Camera Bubble */}
        {step === 'EXAM' && (
          <div
            className="fixed z-50 rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-slate-800 shadow-2xl bg-slate-900 pointer-events-none top-3 right-3 w-28 h-20 lg:top-auto lg:bottom-4 lg:right-4 lg:w-40 lg:h-28 animate-in slide-in-from-right duration-500"
          >
            <div className="w-full h-full relative">
                <ProctoringCamera 
                  ref={videoRef}
                  onViolation={handleCameraViolation} 
                />
              </div>
            
            {/* Timer Label */}
            <div className="absolute top-1 left-1 bg-black/70 text-white font-mono text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded backdrop-blur-sm tracking-wider font-bold">
              ⏱️ {formatTime(timeLeft)}
            </div>
    
            {/* Monitoring Label */}
            <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 px-1.5 md:px-2 py-0.5 md:py-1 rounded backdrop-blur-sm">
               <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${examMode === 'STRICT' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
               <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-wider ${examMode === 'STRICT' ? 'text-emerald-300' : 'text-amber-300'}`}>
                 {examMode === 'STRICT' ? 'Strict Mode' : 'Limited Mode'}
               </span>
            </div>
    
            {/* Penalty Info (if any) */}
            {(warningCount > 0 || tabWarningCount > 0) && (
              <div className="absolute top-1 right-1 flex flex-col gap-0.5 items-end">
                {tabWarningCount > 0 && (
                  <span className="text-[7px] md:text-[8px] bg-rose-500/90 text-white px-1 rounded font-bold backdrop-blur-sm">
                    TAB: {tabWarningCount}/{MAX_TAB_WARNINGS}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-[7px] md:text-[8px] bg-rose-500/90 text-white px-1 rounded font-bold backdrop-blur-sm">
                    CAM: {warningCount}/10
                  </span>
                )}
              </div>
            )}
          </div>
        )}

      {/* Main Exam Content */}
      <div className="p-3 sm:p-5 lg:p-8 max-w-4xl mx-auto animate-in pt-8 md:pt-10">

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
        {shuffledQuestions.length > 0 ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isOffline}
            className={`px-6 py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto ${
              isSubmitting || isOffline
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white shadow-indigo-600/20'
            }`}
          >
            <Send size={16} /> {isSubmitting ? 'Memproses...' : 'Kumpulkan Jawaban'}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-[10px] md:text-xs font-bold justify-center w-full">
            <AlertTriangle size={16} />
            DATA SOAL TIDAK TERSEDIA
          </div>
        )}
      </div>
    </div>
  </div>
  </>
  );
}
