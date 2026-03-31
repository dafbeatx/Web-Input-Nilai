"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ToastType } from '@/lib/grademaster/types';
import { ArrowLeft, Send, AlertTriangle, ShieldX, Camera, Clock, CheckCircle2, MapPin, User, Star, ShieldCheck, ArrowRight, Cpu, MonitorOff, Play, Monitor, Activity, AppWindow, Wifi, Video, CloudLightning, Info, FileText, CircleHelp, Settings, LayoutTemplate, RefreshCw } from 'lucide-react';
import ProctoringCamera from './ProctoringCamera';
import { saveRemedialSession, loadRemedialSession, clearRemedialSession } from '@/lib/grademaster/session';
import { assessClientRisk } from '@/lib/grademaster/services/risk-engine.service';

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
  kkm: number;
  onBack: () => void;
  setToast: (t: ToastType) => void;
}

type RemedialStep = 'RULES' | 'INFO' | 'GUIDE' | 'EXAM' | 'COMPLETED' | 'CHEATED' | 'TIMEOUT' | 'SECOND_CHANCE' | 'AI_BOT_DETECTED';

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
  kkm,
  onBack,
  setToast,
}: StudentRemedialLayerProps) {
  const [step, setStep] = useState<RemedialStep>('RULES');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
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
  const MAX_CAMERA_RETRIES = 5;
  
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
  const MAX_NETWORK_WARNINGS = 3;
  const [activeWarning, setActiveWarning] = useState<{
    type: 'TAB' | 'NETWORK' | 'CAMERA';
    count: number;
    limit: number;
    message: string;
  } | null>(null);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isPermanentlyBlocked, setIsPermanentlyBlocked] = useState(false);
  const [remainingStudents, setRemainingStudents] = useState<{name: string}[]>([]);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const hasSubmittedRef = useRef(false);
  const hasSentStartNotifRef = useRef(false);
  const wakeLockRef = useRef<any>(null); // Screen Wake Lock
  const lastPhotoHashRef = useRef<string>(''); // Dedup: track last sent photo hash
  const consecutiveDupCountRef = useRef<number>(0); // Track how many dupes skipped in a row

  // Draggable PiP Camera State
  const pipRef = useRef<HTMLDivElement>(null);
  const [pipPos, setPipPos] = useState<{x: number, y: number} | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({x: 0, y: 0});
  const dragStartPosRef = useRef({x: 0, y: 0});
  const wasDraggedRef = useRef(false);
  
  // Face Education Popup State
  const [showFaceEducation, setShowFaceEducation] = useState(false);
  const lastEducationShownRef = useRef(0);
  
  const [showFiveMinWarning, setShowFiveMinWarning] = useState(false);
  const hasShownFiveMinWarningRef = useRef(false);
  const [isPenaltyApplied, setIsPenaltyApplied] = useState(false);
  
  // AI Bot & Screen Overlay Detection
  const [showAiBotWarning, setShowAiBotWarning] = useState(false);
  const [aiCountdown, setAiCountdown] = useState(10);
  const aiDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const [overlayViolationCount, setOverlayViolationCount] = useState(0);
  
  // Monitoring & Lock States
  const [isConnectionLocked, setIsConnectionLocked] = useState(false);
  const [consecutiveHeartbeatFailures, setConsecutiveHeartbeatFailures] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Split Screen Detection
  const [splitScreenViolationCount, setSplitScreenViolationCount] = useState(0);
  const [isSplitLocked, setIsSplitLocked] = useState(false);

  const syncWithServer = async () => {
    if (!attemptId || step !== 'EXAM') return;
    setIsSyncing(true);
    try {
      // Perform a real handshake to ensure we are actually online and synced with the DB
      const res = await fetch('/api/grademaster/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attemptId, 
          networkStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE',
          latencyMs: 0
        })
      });
      if (res.ok) {
        setIsConnectionLocked(false);
        setConsecutiveHeartbeatFailures(0);
        setToast({ message: "Koneksi pulih. Sinkronisasi sukses.", type: "success" });
        flushOfflineLogs();
      } else {
        setToast({ message: "Sinkronisasi gagal. Pastikan internet stabil.", type: "error" });
      }
    } catch (err) {
      setToast({ message: "Gagal terhubung ke server. Periksa koneksi Anda.", type: "error" });
    } finally {
      setIsSyncing(false);
    }
  };

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
      // 1. Triple-layered fallback: props -> recovered session state -> global storage -> 'Unknown'
      const saved = loadRemedialSession();
      const currentStudentName = studentName || saved?.studentName || (typeof window !== 'undefined' ? localStorage.getItem('gm_studentName') : '') || 'Unknown Student';
      const currentClassName = className || saved?.className || (typeof window !== 'undefined' ? localStorage.getItem('gm_studentClass') : '') || 'Unknown Class';
      const currentSubject = subject || saved?.subject || (typeof window !== 'undefined' ? localStorage.getItem('gm_subject') : '') || 'Unknown Subject';

      const netInfo = getNetworkInfo();
      const payload = {
        studentName: currentStudentName,
        className: currentClassName,
        subject: currentSubject,
        event,
        message: message ? `${message}${message.includes('Network:') ? '' : ` | Network: ${netInfo}`}` : `Network: ${netInfo}`,
        photo,
        score,
        kkm: kkm || saved?.kkm || 70,
        academicYear: academicYear || '2025/2026',
        examType: examType || 'UTS',
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

  const computeSimpleHash = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): string => {
    const w = canvas.width;
    const h = canvas.height;
    const samplePoints = [
      [Math.floor(w * 0.25), Math.floor(h * 0.25)],
      [Math.floor(w * 0.5), Math.floor(h * 0.25)],
      [Math.floor(w * 0.75), Math.floor(h * 0.25)],
      [Math.floor(w * 0.25), Math.floor(h * 0.5)],
      [Math.floor(w * 0.5), Math.floor(h * 0.5)],
      [Math.floor(w * 0.75), Math.floor(h * 0.5)],
      [Math.floor(w * 0.25), Math.floor(h * 0.75)],
      [Math.floor(w * 0.5), Math.floor(h * 0.75)],
      [Math.floor(w * 0.75), Math.floor(h * 0.75)],
      [Math.floor(w * 0.1), Math.floor(h * 0.1)],
      [Math.floor(w * 0.9), Math.floor(h * 0.9)],
      [Math.floor(w * 0.5), Math.floor(h * 0.1)],
    ];
    let hash = '';
    for (const [x, y] of samplePoints) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      hash += `${Math.floor(pixel[0] / 16)}${Math.floor(pixel[1] / 16)}${Math.floor(pixel[2] / 16)}`;
    }
    return hash;
  };

  const capturePhoto = (): string | undefined => {
    if (!videoRef.current) return undefined;
    try {
      const video = videoRef.current;
      if (video.paused || video.ended) {
        try { video.play(); } catch { /* ignore */ }
      }
      if (video.readyState < 2) {
        console.warn('Video not ready for capture (readyState:', video.readyState, ')');
        return undefined;
      }

      const w = video.videoWidth || 320;
      const h = video.videoHeight || 240;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;

      ctx.drawImage(video, 0, 0, w, h);

      const samplePoints = [
        [Math.floor(w / 2), Math.floor(h / 2)],
        [Math.floor(w * 0.25), Math.floor(h * 0.25)],
        [Math.floor(w * 0.75), Math.floor(h * 0.25)],
        [Math.floor(w * 0.25), Math.floor(h * 0.75)],
        [Math.floor(w * 0.75), Math.floor(h * 0.75)],
      ];
      let allBlack = true;
      for (const [sx, sy] of samplePoints) {
        const px = ctx.getImageData(sx, sy, 1, 1).data;
        if (px[0] > 5 || px[1] > 5 || px[2] > 5) {
          allBlack = false;
          break;
        }
      }
      if (allBlack) {
        console.warn('Captured a blank/black frame (5-point check), skipping');
        return undefined;
      }

      return canvas.toDataURL('image/jpeg', 0.6);
    } catch (err) {
      console.error('Failed to capture photo:', err);
    }
    return undefined;
  };

  const isPhotoDuplicate = (base64: string): boolean => {
    try {
      const img = new Image();
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 320;
      tempCanvas.height = 240;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx || !videoRef.current) return false;

      tempCtx.drawImage(videoRef.current, 0, 0, 320, 240);
      const hash = computeSimpleHash(tempCanvas, tempCtx);

      if (hash === lastPhotoHashRef.current) {
        consecutiveDupCountRef.current++;
        return true;
      }

      lastPhotoHashRef.current = hash;
      consecutiveDupCountRef.current = 0;
      return false;
    } catch {
      return false;
    }
  };

  const [agreedRules, setAgreedRules] = useState(false);
  const offlineBufferKey = `gm_log_buffer_${attemptId}`;

  // ── ADVANCED MONITORING (Pulse & Surveillance) ──
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef<boolean>(true);

  const getLogBuffer = (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(offlineBufferKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  };

  const saveLogBuffer = (logs: any[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(offlineBufferKey, JSON.stringify(logs.slice(-100))); // Cap at 100
    } catch (e) { console.error('Failed to save log buffer', e); }
  };

  const flushOfflineLogs = async () => {
    if (!attemptId || !navigator.onLine) return;
    const buffer = getLogBuffer();
    if (buffer.length === 0) return;

    try {
      const res = await fetch('/api/grademaster/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, events: buffer })
      });
      if (res.ok) {
        localStorage.removeItem(offlineBufferKey);
        console.log(`[Monitoring] Successfully flushed ${buffer.length} offline logs.`);
      }
    } catch (err) {
      console.warn('[Monitoring] Flush failed, will retry later.', err);
    }
  };

  const trackEvent = async (type: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', points: number, metadata: Record<string, any> = {}) => {
    const event = {
      eventType: type,
      severity,
      riskPoints: points,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        network: getNetworkInfo(),
        device: getDeviceInfo()
      }
    };

    if (!navigator.onLine) {
      const buffer = getLogBuffer();
      saveLogBuffer([...buffer, event]);
      return;
    }

    try {
      const res = await fetch('/api/grademaster/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, events: [event] })
      });
      if (!res.ok) throw new Error('Network response not ok');
    } catch (err) {
      const buffer = getLogBuffer();
      saveLogBuffer([...buffer, event]);
    }
  };

  const sendHeartbeat = async () => {
    if (!attemptId || step !== 'EXAM') return;
    
    const start = Date.now();
    try {
      const res = await fetch('/api/grademaster/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attemptId, 
          networkStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE',
          latencyMs: 0
        })
      });
      
      if (res.ok) {
        setConsecutiveHeartbeatFailures(0);
        flushOfflineLogs();
      } else {
        throw new Error('Heartbeat non-ok response');
      }
    } catch (err) {
      console.warn('[Pulse] Heartbeat failed');
      const newFailCount = consecutiveHeartbeatFailures + 1;
      setConsecutiveHeartbeatFailures(newFailCount);
      
      // If heartbeat fails consistently, lock the screen even if the browser thinks it is "online"
      // (This prevents cases where the network is technically UP but proxy/firewall blocks us)
      if (newFailCount >= 3) {
        setIsConnectionLocked(true);
      }
    }
  };
  const sendActivityLog = async (message: string, photo?: string, eventTypeOverride?: string) => {
    if (step !== 'EXAM') return;

    const netInfo = getNetworkInfo();
    const formattedMessage = message.includes('Network:') ? message : `${message} | Network: ${netInfo}`;

    // 1. Send to Telegram for real-time alert
    sendTelegramNotify(eventTypeOverride || 'ACTIVITY', photo, formattedMessage);

    // 2. Send to Activity Log API for database synchronization & Risk Scoring
    if (attemptId) {
      try {
        const assessment = assessClientRisk([message]); // Map message to structured risk event
        const events = assessment.flags.map(f => ({
          eventType: eventTypeOverride || f.event,
          severity: f.severity,
          riskPoints: f.points,
          metadata: { 
            originalMessage: formattedMessage,
            network: netInfo,
            device: getDeviceInfo(),
            timestamp: new Date().toISOString()
          }
        }));

        await fetch('/api/grademaster/activity-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId, events })
        });
      } catch (err) {
        console.error('Failed to sync data log:', err);
      }
    }
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
      const constraintsList: MediaTrackConstraints[] = [
        { width: 160, height: 120, facingMode: 'user' },
        { width: { ideal: 160 }, height: { ideal: 120 }, facingMode: 'user' },
        { facingMode: 'user' },
        { facingMode: { ideal: 'user' } },
        { width: { ideal: 160 } },
        true as unknown as MediaTrackConstraints,
      ];

      let lastCamErr: Error | null = null;
      for (const constraint of constraintsList) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: constraint, audio: false });
          stream.getTracks().forEach(t => t.stop());
          camReady = true;
          setCameraRetryCount(0);
          setCameraErrorDetail(null);
          setExamMode('STRICT');
          setCameraStatus('ACTIVE');
          break;
        } catch (err: unknown) {
          lastCamErr = err instanceof Error ? err : new Error(String(err));
          const errName = (err as { name?: string })?.name || '';
          if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
            // Log to Telegram: Student explicitly denied camera
            sendTelegramNotify('ACTIVITY', undefined, `🚫 Siswa MENOLAK izin kamera pada perangkatnya.`);
            break;
          }
          if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
            break;
          }
        }
      }

      if (!camReady && lastCamErr) {
        const detail = getCameraErrorMessage(lastCamErr);
        setCameraErrorDetail(detail);
        setCameraRetryCount(prev => {
          const next = prev + 1;
          if (next >= MAX_CAMERA_RETRIES) {
            sendTelegramNotify('ACTIVITY', undefined, `Kamera gagal ${next}x (${(lastCamErr as { name?: string })?.name}). Siswa diarahkan ke Mode Terbatas.`);
          }
          return next;
        });
        sendTelegramNotify('ACTIVITY', undefined, `Kamera error: ${(lastCamErr as { name?: string })?.name || 'unknown'} (percobaan ${cameraRetryCount + 1}/${MAX_CAMERA_RETRIES})`);
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

  // 1. Visitor Tracking & Logging
  useEffect(() => {
    const trackVisit = async () => {
      let visitorId = localStorage.getItem('gm_visitor_id');
      const isReturning = !!visitorId;
      
      if (!visitorId) {
        visitorId = 'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('gm_visitor_id', visitorId);
      }

      try {
        const res = await fetch('/api/grademaster/visitor/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            isReturning,
            studentName: studentName || 'Unknown',
            sessionId,
            subject,
            className
          })
        });

        if (res.ok && isReturning) {
          const data = await res.json();
          // Notify returning visitor as requested "beritahu orangnya"
          // setToast({ 
          //   message: `Sistem mendeteksi kehadiran Anda kembali. Pengawasan proctoring tetap aktif. (IP: ${data.ip})`, 
          //   type: 'success' 
          // });
        }
      } catch (err) {
        console.error('Visitor tracking failed:', err);
      }
    };

    trackVisit();
  }, []);

  // Restore session on mount (localStorage)
  useEffect(() => {
    const saved = loadRemedialSession();
    if (saved && (saved.studentName === studentName || !studentName)) {
      if (['EXAM', 'INFO', 'GUIDE'].includes(saved.step)) {
        // Determine if questions are available before restoring EXAM step
        const hasPropsQuestions = remedialQuestions && remedialQuestions.length > 0;
        const hasSavedQuestions = saved.remedialQuestions && saved.remedialQuestions.length > 0;
        const questionsAvailable = hasPropsQuestions || hasSavedQuestions;

        // Only restore non-EXAM meta immediately; EXAM step requires verified questions
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
        if (saved.isPenaltyApplied) {
          setIsPenaltyApplied(true);
        }

        if (questionsAvailable) {
          // Questions confirmed — safe to restore step
          setStep(saved.step as RemedialStep);
          console.log(hasPropsQuestions ? "Questions from props" : "Recovering questions from local session...");
        } else {
          // No questions in props or localStorage — fetch from server before setting EXAM
          console.warn("No questions available on mount. Fetching from server before restoring EXAM...");
          const fetchQuestionsWithRetry = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
              try {
                const res = await fetch(`/api/grademaster/students/remedial?sessionId=${sessionId}&studentName=${encodeURIComponent(studentName)}`, { cache: 'no-store' });
                if (res.ok) {
                  const data = await res.json();
                  if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(data.status)) {
                    setStep(data.status as RemedialStep);
                    return;
                  }
                  if (data.status === null) {
                    clearRemedialSession();
                    setStep('RULES');
                    return;
                  }
                }
                // Status is active but we still need questions — re-fetch via INITIATED (idempotent)
                const initRes = await fetch('/api/grademaster/students/remedial', {
                  method: 'POST',
                  cache: 'no-store' as RequestCache,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId, studentName, status: 'INITIATED' })
                });
                if (initRes.ok) {
                  const initData = await initRes.json();
                  const serverQuestions = initData.remedialQuestions || [];
                  if (serverQuestions.length > 0) {
                    saveRemedialSession({ ...saved, remedialQuestions: serverQuestions });
                    const indices = saved.shuffledIndices && saved.shuffledIndices.length > 0
                      ? saved.shuffledIndices
                      : serverQuestions.map((_: string, idx: number) => idx);
                    setShuffledQuestions(indices.map((idx: number) => ({ text: serverQuestions[idx] || '', originalIndex: idx })));
                    setStep(saved.step as RemedialStep);
                    // setToast({ message: "Soal berhasil dimuat dari server. Melanjutkan ujian...", type: "success" });
                    return;
                  }
                }
              } catch {
                // Network error — retry with backoff
              }
              if (i < retries - 1) {
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
              }
            }
            // All retries exhausted
            setToast({ message: "Data soal tidak ditemukan. Silakan masuk kembali.", type: "error" });
            setTimeout(() => { clearRemedialSession(); handleExit(); }, 2000);
          };
          fetchQuestionsWithRetry();
          return;
        }

        const baseTimer = (saved.remedialTimer || remedialTimer) * 60;
        const elapsedSeconds = Math.floor((Date.now() - saved.startedAt) / 1000);
        let remaining = baseTimer + (saved.extendedTime || 0) - elapsedSeconds;
        if (remaining < 0) remaining = 0;
        setTimeLeft(remaining);

        // setToast({ message: "Melanjutkan sesi remedial sebelumnya...", type: "success" });
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
      let res;
      try {
        res = await fetch(`/api/grademaster/students/remedial?sessionId=${sessionId}&studentName=${encodeURIComponent(studentName)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.isBlocked) {
             setIsPermanentlyBlocked(true);
             setIsTabHidden(false); 
          }
          if (data.violationCount) {
             setTabWarningCount(data.violationCount);
          }
          
          // RESET DETECTION: If server says status is null/NONE and we aren't at START, clear local
          if (data.status === null && step !== 'RULES') {
            console.log("Server indicated session reset. Moving to RULES...");
            clearRemedialSession();
            setToast({ message: "Sesi Anda telah direset oleh Guru. Silakan masuk kembali.", type: "success" });
            setStep('RULES');
            return;
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
        } else if (res.status === 400) {
          // Handle error cases (e.g. data deleted by admin)
          const errData = await res.json().catch(() => ({}));
          if (errData.error === 'RESET_REQUIRED') {
            console.log("Server indicated reset is required. Clearing local session...");
            clearRemedialSession();
            setStep('RULES');
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
      className,
      subject,
      remedialQuestions: (remedialQuestions && remedialQuestions.length > 0) ? remedialQuestions : prevQuestions,
      remedialTimer: (remedialTimer && remedialTimer > 0) ? remedialTimer : prevTimer,
    });
  }, [answers, note, step, sessionId, studentName, className, subject, currentLocation, shuffledQuestions, currentStudentId, examMode, cameraStatus, remedialQuestions, remedialTimer]);

  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => { isSubmittingRef.current = isSubmitting; });

  // ── Session Health Monitoring ──
  const healthCheckAttemptedRef = useRef(false);
  useEffect(() => {
    if (step === 'EXAM' && shuffledQuestions.length === 0 && !isSubmitting && !isRefreshingRef.current && !healthCheckAttemptedRef.current) {
      healthCheckAttemptedRef.current = true;
      console.warn("Detected EXAM step with 0 questions. Attempting question recovery...");
      sendTelegramNotify('ERROR', undefined, `⚠️ [HEALTH_CHECK] ${studentName} - Sesi EXAM tapi soal kosong. Mencoba recovery soal dari server...`);

      const attemptRecovery = async () => {
        // 1. Check terminal status first
        try {
          const res = await fetch(`/api/grademaster/students/remedial?sessionId=${sessionId}&studentName=${encodeURIComponent(studentName)}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (['COMPLETED', 'CHEATED', 'TIMEOUT'].includes(data.status)) {
              setStep(data.status as RemedialStep);
              if (data.status === 'COMPLETED') setFinalScore(data.finalScore);
              return;
            }
            if (data.status === null) {
              clearRemedialSession();
              setStep('RULES');
              return;
            }
          }
        } catch { /* continue to question recovery */ }

        // 2. Try recovering questions from localStorage
        const saved = loadRemedialSession();
        if (saved?.remedialQuestions && saved.remedialQuestions.length > 0) {
          const indices = saved.shuffledIndices && saved.shuffledIndices.length > 0
            ? saved.shuffledIndices
            : saved.remedialQuestions.map((_: string, i: number) => i);
          setShuffledQuestions(indices.map((idx: number) => ({ text: saved.remedialQuestions![idx] || '', originalIndex: idx })));
          sendTelegramNotify('ACTIVITY', undefined, `[HEALTH_CHECK] Recovery berhasil dari localStorage (${saved.remedialQuestions.length} soal)`);
          healthCheckAttemptedRef.current = false;
          return;
        }

        // 3. Fetch questions via INITIATED endpoint with retry (idempotent, critical for 3G)
        for (let retry = 0; retry < 3; retry++) {
          try {
            const initRes = await fetch('/api/grademaster/students/remedial', {
              method: 'POST',
              cache: 'no-store' as RequestCache,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, studentName, status: 'INITIATED' })
            });
            if (initRes.ok) {
              const initData = await initRes.json();
              const serverQuestions = initData.remedialQuestions || [];
              if (serverQuestions.length > 0) {
                const indices = saved?.shuffledIndices && saved.shuffledIndices.length > 0
                  ? saved.shuffledIndices
                  : serverQuestions.map((_: string, i: number) => i);
                setShuffledQuestions(indices.map((idx: number) => ({ text: serverQuestions[idx] || '', originalIndex: idx })));
                if (saved) {
                  saveRemedialSession({ ...saved, remedialQuestions: serverQuestions });
                }
                // setToast({ message: "Soal berhasil dimuat ulang dari server.", type: "success" });
                sendTelegramNotify('ACTIVITY', undefined, `[HEALTH_CHECK] Recovery berhasil dari server API (${serverQuestions.length} soal, retry ${retry + 1})`);
                healthCheckAttemptedRef.current = false;
                return;
              }
            }
          } catch { /* network error, retry */ }
          await new Promise(r => setTimeout(r, 3000 * (retry + 1)));
        }

        // 4. All recovery paths exhausted — reset
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
      if (type === 'FACE_UNALIGNED') flagMessage = "Posisi wajah tidak sejajar";
      if (type === 'PHONE_DETECTED') flagMessage = "Terdeteksi penggunaan HP (Ponsel)";

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
        // setToast({ message: `Peringatan Kamera: ${flagMessage} (${newCount}/10)`, type: "error" });
        
        // Handle Phone detection with high priority notification & Modal
        if (type === 'PHONE_DETECTED') {
            const snap = capturePhoto();
            sendTelegramNotify('PHONE_DETECTED', snap || undefined);
            
            // Show Urgent Modal for Phone Detection
            setActiveWarning({
                type: 'CAMERA',
                count: newCount,
                limit: 10,
                message: "⚠️ HP TERDETEKSI! Sistem AI mendeteksi adanya ponsel di depan kamera. Penggunaan HP dilarang keras selama ujian! Aktivitas ini telah dilaporkan ke Admin Telegram."
            });
        }

        // Custom: Show Educational Popup if no face detected (debounce 1 minute)
        if (type === 'NO_FACE' && Date.now() - lastEducationShownRef.current > 60000) {
          setShowFaceEducation(true);
          lastEducationShownRef.current = Date.now();
        }
      }

      return newCount;
    });
  }, [secondChanceUsed, capturePhoto]);

  // Shuffle logic
  useEffect(() => {
    const saved = loadRemedialSession();
    if ((!remedialQuestions || remedialQuestions.length === 0) && (!saved?.remedialQuestions || saved.remedialQuestions.length === 0)) return;

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
          // Log to Telegram: Student explicitly denied location
          sendTelegramNotify('ACTIVITY', undefined, `📍 Siswa MENOLAK izin lokasi (GPS) pada browser/perangkat.`);
          // If explicitly denied, fallback to IP immediately to prevent getting stuck
          fetchIpFallback(errHigh);
          return;
        }
        // Fallback: try without high accuracy
        navigator.geolocation.getCurrentPosition(resolve, (errLow) => {
          if (errLow.code === 1) {
            // Log to Telegram: Student explicitly denied location (retry)
            sendTelegramNotify('ACTIVITY', undefined, `📍 Siswa MENOLAK izin lokasi (GPS) pada percobaan kedua.`);
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
    // DEADLINE CHECK: Senin, 30 Maret 2026 Jam 07:00 WIB
    const deadline = new Date('2026-03-30T07:00:00+07:00').getTime();
    if (Date.now() > deadline) {
      setToast({ 
        message: "Sesi remedial telah selesai. Nilai pengerjaan Anda sekarang adalah 0. Jika ingin perbaikan, harap hubungi pengawas untuk mendapatkan poin kebaikan.", 
        type: "error" 
      });
      return;
    }

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
        kkm: kkm || 70,
        academicYear: academicYear || '2025/2026',
        examType: examType || 'UTS'
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
      // EMERGENCY SAVE: Immediate save when time is up to ensure last typed characters are not lost
      const current = loadRemedialSession();
      saveRemedialSession({
        sessionId,
        studentName,
        startedAt: current?.startedAt || startedAtRef.current || Date.now(),
        refreshCount: current?.refreshCount || 0,
        ...current,
        answers,
        note,
        className,
        subject,
        kkm: kkm || 70,
        academicYear: academicYear || '2025/2026',
        examType: examType || 'UTS',
        step: 'EXAM',
        isPenaltyApplied,
        lastUpdated: Date.now()
      });
      
      // If penalty is already applied, we don't show the modal again, just let them finish
      if (!isPenaltyApplied) {
        setShowTimeUpModal(true);
      }
      return;
    }

    // Trigger 5 minute warning
    if (timeLeft === 300 && !hasShownFiveMinWarningRef.current) {
       hasShownFiveMinWarningRef.current = true;
       setShowFiveMinWarning(true);
       // Autosave on warning
       const s = loadRemedialSession();
       if (s) {
         saveRemedialSession({ ...s, answers, note, lastUpdated: Date.now() });
       }
    }

    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [step, timeLeft, showTimeUpModal, pointsBal, answers, note]);

  // Proctoring: START photo + 30s auto-snap (depends ONLY on step, NOT timeLeft)
  useEffect(() => {
    if (step !== 'EXAM') return;

    // Helper: retry capture with short delay between attempts
    const captureWithRetry = async (maxAttempts = 3, delayMs = 500): Promise<string | undefined> => {
      for (let i = 0; i < maxAttempts; i++) {
        const snap = capturePhoto();
        if (snap) return snap;
        if (i < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
      return undefined;
    };

    // Auto-capture START photo when exam interface is fully rendered
    if (!hasSentStartNotifRef.current) {
      hasSentStartNotifRef.current = true;
      setTimeout(async () => {
        const snap = await captureWithRetry(4, 800);
        const compressed = snap ? await compressImage(snap) : undefined;
        sendTelegramNotify('START', compressed);
        
        const net = getNetworkInfo();
        if (net.includes('2g') || net.includes('3g')) {
          // setToast({ message: "Koneksi lambat terdeteksi. Harap bersabar saat mengunggah jawaban.", type: "error" });
        }
      }, 2500);
    }

    // Auto-Snap for Proctoring (Telegram)
    // Using recursive setTimeout instead of setInterval to prevent overlap and backlog issues
    let isProctoringActive = true;
    let proctorTimerId: NodeJS.Timeout;
    const PROCTOR_INTERVAL = 30000;
    let consecutiveFailCount = 0;
    const MAX_CONSECUTIVE_FAIL_BEFORE_ALERT = 5;

    const runProctorCycle = async () => {
      if (!isProctoringActive || step !== 'EXAM') return;
      
      try {
        if (!document.hidden) {
          const snap = await captureWithRetry(3, 500);
          if (snap) {
            consecutiveFailCount = 0;

            if (isPhotoDuplicate(snap) && consecutiveDupCountRef.current < 5) {
              // Skip duplicate, tapi jangan terlalu lama — setelah 5 skip, kirim tetap
            } else {
              if (consecutiveDupCountRef.current >= 5) {
                consecutiveDupCountRef.current = 0;
                lastPhotoHashRef.current = '';
              }
              const compressed = await compressImage(snap);
              await sendTelegramNotify('PROCTORING', compressed, `📸 Auto-Snap`);
            }
          } else {
            consecutiveFailCount++;
            console.warn(`Proctoring snap gagal (${consecutiveFailCount}x berturut-turut)`);

            if (consecutiveFailCount === MAX_CONSECUTIVE_FAIL_BEFORE_ALERT) {
              sendTelegramNotify('ACTIVITY', undefined, `⚠️ Kamera siswa gagal di-capture ${MAX_CONSECUTIVE_FAIL_BEFORE_ALERT}x berturut-turut. Kemungkinan kamera mati / tertutup.`);
            }
          }
        }
      } catch (err) {
        console.error("Proctoring auto-snap error:", err);
      } finally {
        if (isProctoringActive && step === 'EXAM') {
          proctorTimerId = setTimeout(runProctorCycle, PROCTOR_INTERVAL);
        }
      }
    };

    // Initial trigger after 30 seconds
    proctorTimerId = setTimeout(runProctorCycle, PROCTOR_INTERVAL);

    return () => {
      isProctoringActive = false;
      clearTimeout(proctorTimerId);
    };
  }, [step]);

  // ── MONITORING SETUP (Heartbeat & Event Listeners) ──
  useEffect(() => {
    if (step !== 'EXAM' || !attemptId) return;

    // 1. Start Heartbeat Pulse (20s)
    heartbeatTimerRef.current = setInterval(sendHeartbeat, 20000);
    sendHeartbeat(); // Immediate first beat

    // 2. Network Listeners
    const handleOnline = () => {
      // Don't auto-unlock immediately, wait for syncWithServer handshake
      syncWithServer();
      trackEvent('NETWORK_ONLINE', 'LOW', 0, { reason: 'Connection restored' });
    };
    const handleOffline = () => {
      setIsConnectionLocked(true);
      trackEvent('NETWORK_OFFLINE', 'HIGH', 15, { reason: 'Connection lost' });
    };

    // 3. Visibility Listener (Minimalize detection)
    const handleVisibility = () => {
      if (document.hidden) {
        trackEvent('VISIBILITY_LOST', 'MEDIUM', 15, { reason: 'Siswa meminimalisir tab / buka aplikasi lain' });
      } else {
        trackEvent('VISIBILITY_RESTORED', 'LOW', 0, { reason: 'Siswa kembali fokus ke tab ujian' });
        // Also perform a sync check when visibility returns to ensure we weren't "locked out"
        syncWithServer();
      }
    };

    // 4. Exit Protection (Beacon API for Stealth Logging)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const beaconPayload = JSON.stringify({
        attemptId,
        events: [{
          eventType: 'FORCE_EXIT',
          severity: 'CRITICAL',
          riskPoints: 50,
          metadata: { reason: 'Siswa mencoba menutup tab / browser secara paksa' }
        }]
      });
      navigator.sendBeacon('/api/grademaster/activity-log', beaconPayload);
      
      // Standard Alert
      e.preventDefault();
      e.returnValue = '';
    };

    // 5. Split-Screen / Resize Detector (Multi-window)
    const handleResize = () => {
      if (step !== 'EXAM') return;
      
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const sh = window.screen.height;
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile) return;

      const isInputActive = document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT';
      
      // Heuristic: Split-screen typically takes 50-70% of the screen. 
      // Virtual keyboard also shrinks vh, but only when input is active.
      const heightRatio = vh / sh;
      
      if (heightRatio < 0.7 && !isInputActive) {
        // High probability of split screen
        setIsSplitLocked(true);
        trackEvent('SECURITY_SPLIT_SCREEN', 'MEDIUM', 10, { vh, vw, sh, ratio: heightRatio });
      } else {
        // Auto-unlock if restored to near full-screen
        if (heightRatio > 0.8) {
          setIsSplitLocked(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('resize', handleResize);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('resize', handleResize);
    };
  }, [step, attemptId]);

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
          if (data.isBlocked) {
             setClientCheatingFlags(f => [...f, `Batas maksimal pelanggaran tab tercapai`]);
             setIsPermanentlyBlocked(true);
             hasTriggeredCheatingRef.current = true;
             setActiveWarning({ type: 'TAB', count: data.count, limit: data.limit, message: 'Batas Anda sudah habis tertangkap meninggalkan halaman ujian.' });
             sendTelegramNotify('CHEATED', capturePhoto() || undefined, 'Meninggalkan halaman ujian melebihi batas yang diizinkan sistem.');
             handleStatusUpdate('CHEATED', 'Meninggalkan tab browser melebihi batas 3 kali');
          } else {
             setActiveWarning({ type: 'TAB', count: data.count, limit: data.limit, message: 'Sistem mendeteksi Anda meninggalkan halaman ujian. Dilarang membuka aplikasi atau tab lain selama ujian!' });
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
      // PROCTORING: If focus is lost, check for AI overlay presence
      // Increase delay to 1.5s to avoid false positives on quick system blips/tabs
      setTimeout(() => {
        if (step !== 'EXAM' || isSubmitting || isRefreshingRef.current) return;
        
        // If the window loses focus but the document IS NOT hidden, 
        // it suggests an overlay or floating app is active.
        if (!document.hasFocus() && !document.hidden && !showAiBotWarning) {
           setShowAiBotWarning(true);
           setAiCountdown(10);
           setOverlayViolationCount(prev => {
             const next = prev + 1;
             const confidence = next >= 2 ? 'MEDIUM' : 'LOW';
             sendActivityLog(`TERDETEKSI LAYER/OVERLAY (Indikasi Aktivitas Tidak Biasa) | Strike ${next}/3 | Kepercayaan: ${confidence}`);
             return next;
           });
        } else if (document.hidden) {
           // Normal tab leaving behavior
           sendActivityLog("Halaman kehilangan fokus (Blur)");
           handleTabLeave();
        }
      }, 1500);
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
        if (next >= MAX_NETWORK_WARNINGS) {
          setClientCheatingFlags(f => [...f, reason]);
          hasTriggeredCheatingRef.current = true;
          setActiveWarning({ type: 'NETWORK', count: next, limit: MAX_NETWORK_WARNINGS, message: 'Batas mematikan koneksi tercapai.' });
          handleStatusUpdate('CHEATED', 'Mematikan internet melebihi batas yang diizinkan sistem');
        } else {
          sendActivityLog(reason);
          setActiveWarning({ type: 'NETWORK', count: next, limit: MAX_NETWORK_WARNINGS, message: 'Koneksi terputus tiba-tiba atau sengaja dimatikan. Pastikan koneksi stabil untuk mencegah ujian digagalkan!' });
        }
        return next;
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      sendActivityLog("Koneksi internet kembali aktif");
      // setToast({ message: "Koneksi terhubung kembali. Lanjutkan ujian.", type: "success" });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    
    // PiP Detector: Polling for Picture-in-Picture usage (usually AI bot overlays)
    // We don't use PiP for our camera, so any PiP is a violation
    const pipCheck = setInterval(() => {
      if (step === 'EXAM' && document.pictureInPictureElement && !showAiBotWarning) {
        setShowAiBotWarning(true);
        setAiCountdown(10);
        setOverlayViolationCount(prev => {
          const next = prev + 1;
          const confidence = next >= 2 ? 'MEDIUM' : 'LOW';
          sendActivityLog(`TERDETEKSI PICTURE-IN-PICTURE (Indikasi Aktivitas Tidak Biasa) | Strike ${next}/3 | Kepercayaan: ${confidence}`);
          return next;
        });
      }
    }, 3000);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("copy", handleCopyPaste);
      window.removeEventListener("paste", handleCopyPaste);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearInterval(pipCheck);
    };
  }, [step, setToast, showAiBotWarning, isSubmitting]);

  // AI Warning Feedback Timer (WITH AUTO-LOCK ON STRIKE 3)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showAiBotWarning && aiCountdown > 0) {
      timer = setInterval(() => {
        setAiCountdown(prev => prev - 1);
        
        // Auto-release warning if they fix the issue (focus back & PiP closed)
        if (document.hasFocus() && !document.pictureInPictureElement) {
           setShowAiBotWarning(false);
        }
      }, 1000);
    } else if (showAiBotWarning && aiCountdown === 0) {
      if (overlayViolationCount >= 3) {
        // LOCKOUT: Time is up and violation still detected on Strike 3
        setShowAiBotWarning(false);
        handleStatusUpdate('CHEATED', 'Terdeteksi penggunaan Layer/Overlay secara berulang (Auto-Lock)');
      } else {
        // Flag instead of Lockout: Add to flags but don't terminate session for Strike 1 & 2
        const reason = `Indikasi Layer/Overlay (Strike ${overlayViolationCount}/3)`;
        setClientCheatingFlags(f => f.includes(reason) ? f : [...f, reason]);
        
        // Send synchronized log (DB + Tele) with Medium Confidence
        sendActivityLog(`⚠️ ${reason} | Tingkat Kepercayaan: MEDIUM (Persisten 10s)`);
        
        // Stay visible for 5 more seconds then hide automatically
        setTimeout(() => setShowAiBotWarning(false), 5000);
      }
    }
    return () => clearInterval(timer);
  }, [showAiBotWarning, aiCountdown, overlayViolationCount]);

  const handleExtendTime = async () => {
    const fixedPoints = 10;
    
    // Check if pointsBal is available. If not, we can't extend, but we shouldn't get stuck.
    if (pointsBal === null) {
      setToast({ message: "Data poin disiplin Anda tidak tersedia. Harap hubungi Pengawas.", type: "error" });
      return;
    }

    if (pointsBal.usedToday + fixedPoints > 10) {
      setToast({ message: `Sisa kuota harian ekstensi waktu Anda tersisa ${10 - pointsBal.usedToday} menit.`, type: "error" });
      return;
    }
    
    setExtendLoading(true);
    try {
      // ATOMIC PROTECTION: Save answers before extending time
      const s = loadRemedialSession();
      if (s) {
        saveRemedialSession({ ...s, answers, note, lastUpdated: Date.now() });
      }

      const res = await fetch('/api/grademaster/behaviors/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentName, 
          className, 
          academicYear, 
          pointsToSpend: fixedPoints 
        })
      });
      
      let data: { error?: string; newPoints?: number };
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("Server tidak merespon dengan benar (JSON Error). Harap hubungi Pengawas.");
      }

      if (!res.ok) throw new Error(data.error || "Gagal menambah waktu");
      
      // Calculate Added Secs
      const addedSeconds = fixedPoints * 60;
      
      // ATOMIC UPDATE: Save to LocalStorage IMMEDIATELY before updating UI state
      // This ensures if the page is refreshed right now, the time is already added.
      const updatedS = loadRemedialSession();
      if (updatedS) {
        saveRemedialSession({ 
          ...updatedS, 
          extendedTime: (updatedS.extendedTime || 0) + addedSeconds,
          lastUpdated: Date.now()
        });
      }
      
      // Update UI state
      setTimeLeft(prev => prev > 0 ? prev + addedSeconds : addedSeconds);
      setPointsBal(prev => prev ? { total: data.newPoints ?? prev.total, usedToday: prev.usedToday + fixedPoints } : null);
      
      // Success - Close modal
      setShowTimeUpModal(false);
      setToast({ message: `Waktu berhasil ditambah ${fixedPoints} menit.`, type: "success" });
      sendActivityLog(`Ekstensi waktu: Menggunakan ${fixedPoints} poin untuk +${fixedPoints} menit.`);
      
    } catch(err: any) {
      setToast({ message: err.message || "Gagal menghubungi server", type: "error" });
    } finally {
      setExtendLoading(false);
    }
  };

    const validateSubmission = () => {
      const minLength = 20;
      const garbagePhrases = ['tidak tahu', 'gak tahu', 'ndak tahu', 'kosong', 'null', 'undefined', 'asdf', 'qwerty'];
      
      const invalidIndices = answers.map((a, i) => {
        const text = (a || '').trim().toLowerCase();
        
        // Check length
        if (text.length < minLength) return i;
        
        // Check for garbage phrases
        if (garbagePhrases.some(phrase => text.includes(phrase))) return i;
        
        // Check for repetitive characters (e.g., "aaaaaaaaaaaa")
        if (/(.)\1{9,}/.test(text)) return i;
        
        // Check for repetitive words (e.g., "jawab jawab jawab")
        const words = text.split(/\s+/);
        const uniqueWords = new Set(words);
        if (words.length > 5 && (uniqueWords.size / words.length) < 0.4) return i;
        
        return -1;
      }).filter(index => index !== -1);
      
      if (invalidIndices.length > 0) {
        setToast({ 
          message: `⚠️ JAWABAN TIDAK VALID: Ada ${invalidIndices.length} soal yang belum diisi dengan jawaban yang memadai atau terdeteksi asal-asalan.`, 
          type: "error" 
        });
        return false;
      }
      return true;
    };

    const handleStatusUpdate = async (status: 'COMPLETED' | 'CHEATED' | 'TIMEOUT', explicitReason?: string) => {
      // For manual completion, we require validation
      if (status === 'COMPLETED' && !validateSubmission()) {
        return;
      }

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
      cheatingReason: explicitReason,
      isPenaltyApplied
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
          } else if (finalStatus === 'CHEATED' || finalStatus === 'AI_BOT_DETECTED') {
            let photo = capturePhoto();
            const cheatedReason = explicitReason || allFlags.join(', ') || 'Pelanggaran proctoring terdeteksi oleh sistem';
            const eventType = finalStatus === 'AI_BOT_DETECTED' ? 'AI_BOT_DETECTED' : 'CHEATED';
            
            compressImage(photo || "").then(compressed => {
              sendTelegramNotify(eventType, compressed || photo || undefined, cheatedReason);
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
              <span>Lokasi <strong>(GPS) dipantau AI secara langsung</strong> untuk mendeteksi alamat yang sama. Dilarang mengerjakan secara berkelompok! Pelanggaran koordinat akan dilaporkan otomatis!</span>
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
                  onClick={() => setStep('GUIDE')}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl bg-orange-500 text-white shadow-orange-500/20 hover:scale-105 transition-all flex items-center justify-center"
                >
                  {isSubmitting ? 'MEMPROSES...' : 'SAYA MENGERTI, LANJUTKAN'}
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
                onClick={() => setStep('GUIDE')}
                disabled={isSubmitting || !allPermsOk || (remedialQuestions.length === 0 && !loadRemedialSession()?.remedialQuestions)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
              >
                {isSubmitting ? 'MEMPROSES...' : 
                 (remedialQuestions.length === 0 && !loadRemedialSession()?.remedialQuestions) ? '⏳ MEMUAT DATA UJIAN...' :
                 !allPermsOk ? '⛔ AKTIFKAN IZIN TERLEBIH DAHULU' : 'SAYA MENGERTI, LANJUTKAN'}
              </button>
            </>
          )}
        </div>

        {/* Camera preview removed from INFO screen to prevent dual-instance issues.
           The single ProctoringCamera instance renders in the EXAM step below. */}
      </div>
    );
  }

  // RENDER: GUIDE SCREEN (Educational instructions for proctoring camera)
  if (step === 'GUIDE') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-in">
        <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 md:p-10 shadow-2xl border border-slate-100 flex flex-col items-center">
          <button onClick={() => setStep('INFO')} className="flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-indigo-600 font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors mb-6 w-full">
            <ArrowLeft size={12} /> Kembali ke Persiapan
          </button>
          
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
            <CheckCircle2 size={32} />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 mb-2 font-outfit uppercase tracking-tight">Panduan Wajah (PENTING)</h2>
          <p className="text-sm text-slate-500 font-bold mb-6 text-center leading-relaxed">
            Sistem proctoring membutuhkan wajah yang terlihat jelas untuk menghindari peringatan kecurangan otomatis.
          </p>

          <div className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-6 flex items-start gap-3 shadow-sm">
            <div className="bg-indigo-500 text-white p-2 rounded-xl shrink-0">
               <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">🤖 Pengawasan AI Aktif</p>
              <p className="text-[11px] text-indigo-900 font-bold leading-relaxed">
                Ujian ini diawasi secara otomatis oleh **Artificial Intelligence**. Sistem akan mendeteksi wajah, pergerakan, dan aktivitas layar Anda secara real-time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 w-full">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
               <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                 <User size={20} />
               </div>
               <p className="text-[10px] font-black uppercase text-indigo-900 mb-1">Wajah Penuh</p>
               <p className="text-[9px] text-slate-500 font-bold">Pastikan seluruh wajah (dahi sampai dagu) masuk dalam layar.</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
               <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-3">
                 <ShieldX size={20} />
               </div>
               <p className="text-[10px] font-black uppercase text-rose-900 mb-1">Tanpa Penutup</p>
               <p className="text-[9px] text-slate-500 font-bold">Jangan menutupi wajah dengan tangan, masker, atau benda lain.</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
               <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                 <Star size={20} />
               </div>
               <p className="text-[10px] font-black uppercase text-amber-900 mb-1">Cukup Cahaya</p>
               <p className="text-[9px] text-slate-500 font-bold">Cari ruangan yang terang. Jangan membelakangi lampu/jendela.</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
               <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                 <Camera size={20} />
               </div>
               <p className="text-[10px] font-black uppercase text-indigo-900 mb-1">Tetap Di Frame</p>
               <p className="text-[9px] text-slate-500 font-bold">Jangan bergerak keluar dari jangkauan kamera selama ujian.</p>
            </div>
          </div>

          <div className="w-full p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl mb-8 flex gap-3">
            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
            <p className="text-[10px] md:text-xs text-amber-800 font-black leading-snug">
              ⚠️ PELANGGARAN TERHADAP POSISI WAJAH AKAN MENGURANGI POIN DISIPLIN DAN DAPAT MEMICU DISKUALIFIKASI OTOMATIS!
            </p>
          </div>

          <button
            onClick={startExam}
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'MEMPROSES...' : 'SAYA MENGERTI, MULAI REMEDIAL'}
          </button>
        </div>
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
          <p className="text-sm font-bold text-slate-500 mb-6 font-outfit">
            Pilih <strong className="text-indigo-600">Setuju</strong> di bawah ini untuk mengambil tambahan waktu 10 menit dengan memotong <span className="text-rose-600">10 Poin Disiplin</span> Anda.
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
          
          <div className="w-full flex flex-col gap-3">
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
            <button
              onClick={() => handleStatusUpdate('TIMEOUT')}
              disabled={extendLoading || isSubmitting}
              className="w-full py-3 bg-slate-100 text-rose-500 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
            >
              <span>TIDAK, GAGALKAN SESI SEKARANG</span>
              <span className="text-[8px] opacity-60 font-bold uppercase">Status: Tidak Valid (Skor 0)</span>
            </button>
            {(!pointsBal || pointsBal.total < 10 || pointsBal.usedToday >= 10) && pointsBal !== null && (
              <p className="text-[10px] md:text-xs text-rose-500 font-bold mt-2">
                Saldo poin Anda tidak cukup (Minimal 10) atau telah mencapai limit harian.
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
            Tetap fokus pada layar untuk menghindari pelanggaran sistem.
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
      // SET STATIS DEADLINE: SENIN, 30 MARET 2026 JAM 07:00 WIB
      const deadline = new Date('2026-03-30T07:00:00+07:00').getTime();
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
      const text = `SAYA SUDAH BERES REMEDIAL! 🎓\n\n👤 Nama: ${studentName}\n🏫 Kelas: ${className}\n📚 Mapel: ${subject}\n📊 Jenis: ${examType} (TA ${academicYear})\n🔥 Skor: ${finalScore}\n\nYuk buruan remedial bagi yang belum! Sisa waktu input nilai tinggal ${timeStr} lagi (Deadline Jakarta). Pantau terus ya!`;
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
    <div className="relative min-h-screen bg-surface font-body text-on-surface selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden">
      
      {/* ── TOP APP BAR (Premium Header) ── */}
      <header className="fixed top-0 w-full z-50 glass-header shadow-[0px_12px_32px_rgba(25,28,30,0.06)] px-6 py-3 md:px-8 md:py-4">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 overflow-hidden shadow-sm">
              <span className="text-primary font-bold text-lg font-headline">
                {studentName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tighter text-on-surface font-headline leading-tight">The Vigilant Editorial</h1>
              <span className="text-[10px] font-medium tracking-wider uppercase text-slate-500 font-label">GradeMaster OS</span>
            </div>
          </div>
          
          {/* Header Stats (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-medium text-slate-500 font-label uppercase">Sisa Waktu</span>
              <span className="text-2xl font-bold tracking-tighter font-headline text-primary tabular-nums">
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant/20"></div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface line-clamp-1 max-w-[200px]">{subject}</span>
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-tight">{examType} (TA {academicYear})</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-tertiary-fixed/20">
              <span className={`w-2 h-2 rounded-full emerald-pulse ${isOffline ? 'bg-rose-500' : 'bg-tertiary'}`}></span>
              <span className={`text-[10px] font-bold font-label uppercase ${isOffline ? 'text-rose-600' : 'text-tertiary'}`}>
                {isOffline ? 'OFFLINE' : 'ONLINE'}
              </span>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl text-sm font-semibold hover:scale-105 active:opacity-90 transition-all duration-200 shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
              <span className="hidden xs:inline">Submit</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT (Dashboard Layout) ── */}
      <main className={`max-w-7xl mx-auto px-6 pt-24 md:pt-32 pb-20 flex flex-col lg:flex-row gap-8 transition-opacity duration-500 ${(isTabHidden || isPermanentlyBlocked || isOffline || isConnectionLocked) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Monitoring Panel */}
        <aside className="w-full lg:w-64 lg:sticky lg:top-24 h-fit space-y-6 animate-in slide-in-from-left duration-700">
          <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col gap-4 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold font-headline text-on-surface">Monitoring</h2>
              <Monitor className="text-primary" size={20} />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white text-primary font-bold rounded-xl shadow-sm border border-primary/10">
                <ShieldCheck size={18} />
                <span className="text-xs font-label">Proteksi Aktif</span>
              </div>
              
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${tabWarningCount > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                <AppWindow size={18} />
                <span className="text-xs font-bold font-label uppercase">Tab Switches: {tabWarningCount}/{MAX_TAB_WARNINGS}</span>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isOffline ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                <Wifi size={18} />
                <span className="text-xs font-bold font-label uppercase">{isOffline ? 'Offline' : 'Koneksi Stabil'}</span>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 shadow-sm">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Pengerjaan</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold font-headline text-primary">
                {answers.filter(a => a.trim() !== '').length}/{remedialEssayCount}
              </p>
              <p className="text-[10px] font-bold text-slate-400 mb-1 italic">Soal Terisi</p>
            </div>
            <div className="w-full h-2 bg-primary/10 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-700 ease-out" 
                style={{ width: `${(answers.filter(a => a.trim() !== '').length / remedialEssayCount) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Question Area */}
        <section className="flex-1 space-y-8 privacy-mode animate-in fade-in duration-1000">
          {answers.map((ans, idx) => (
            <div key={idx} className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-outline-variant/30 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary/10 group-hover:bg-primary transition-colors duration-500" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg font-headline border-2 border-primary/20">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface tracking-tighter font-headline">Soal Essay {idx + 1}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pengerjaan Mandiri</p>
                </div>
              </div>

              {shuffledQuestions[idx] && (
                <div className="bg-surface-container-lowest p-8 rounded-[2rem] mb-10 border border-outline-variant/10 shadow-inner">
                  <p className="text-on-surface font-medium leading-relaxed whitespace-pre-wrap text-lg italic">
                    "{shuffledQuestions[idx].text}"
                  </p>
                </div>
              )}

              <textarea
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-lg font-medium text-on-surface outline-none focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all resize-none min-h-[300px] shadow-sm"
                placeholder="Ketikkan jawaban lengkap Anda di sini..."
                value={ans}
                onChange={(e) => handleChange(idx, e.target.value)}
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                autoComplete="off"
                spellCheck="false"
              />
              
              <div className="mt-6 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Penyimpanan Otomatis Aktif
                </span>
                <span>{ans.length} Karakter</span>
              </div>
            </div>
          ))}

          {/* Bottom Actions */}
          <div className="bg-surface-container p-10 rounded-[2.5rem] border border-outline-variant/30 flex flex-col items-center text-center">
            <h3 className="text-2xl font-black text-on-surface mb-2 font-headline uppercase tracking-tighter">Selesaikan Ujian</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 max-w-md">Pastikan semua jawaban telah terisi dan diperiksa kembali sebelum dikumpulkan.</p>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isOffline}
              className={`group flex items-center gap-4 px-12 py-5 rounded-[2rem] text-lg font-black uppercase tracking-widest transition-all shadow-2xl ${
                isSubmitting || isOffline 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-primary text-on-primary hover:scale-105 active:scale-95 shadow-primary/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="animate-spin" size={24} />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={24} />
                  Kumpulkan Jawaban
                </>
              )}
            </button>
          </div>
        </section>
      </main>

      {/* ── DRAGGABLE CAMERA (PiP) ── */}
      {step === 'EXAM' && (
        <div
          ref={pipRef}
          className="fixed z-[60] rounded-[2rem] overflow-hidden border-4 border-on-surface shadow-2xl bg-surface w-24 h-36 md:w-44 md:h-64 animate-in slide-in-from-right duration-500 cursor-grab active:cursor-grabbing select-none touch-none"
          style={pipPos
            ? { left: `${pipPos.x}px`, top: `${pipPos.y}px`, transition: isDraggingRef.current ? 'none' : 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)' }
            : { right: '32px', bottom: '32px' }
          }
          onMouseDown={(e) => {
            if (!pipRef.current) return;
            const rect = pipRef.current.getBoundingClientRect();
            isDraggingRef.current = true;
            wasDraggedRef.current = false;
            dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            dragStartPosRef.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();

            const onMove = (ev: MouseEvent) => {
              const dx = Math.abs(ev.clientX - dragStartPosRef.current.x);
              const dy = Math.abs(ev.clientY - dragStartPosRef.current.y);
              if (dx > 3 || dy > 3) wasDraggedRef.current = true;
              const elW = pipRef.current?.offsetWidth || 96;
              const elH = pipRef.current?.offsetHeight || 144;
              const newX = Math.min(Math.max(12, ev.clientX - dragOffsetRef.current.x), window.innerWidth - elW - 12);
              const newY = Math.min(Math.max(12, ev.clientY - dragOffsetRef.current.y), window.innerHeight - elH - 12);
              setPipPos({ x: newX, y: newY });
            };
            const onUp = (ev: MouseEvent) => {
              isDraggingRef.current = false;
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
              if (pipRef.current) {
                const elW = pipRef.current.offsetWidth;
                const rectInner = pipRef.current.getBoundingClientRect();
                const centerX = rectInner.left + elW / 2;
                const snapX = centerX < window.innerWidth / 2 ? 24 : window.innerWidth - elW - 24;
                const curY = Math.min(Math.max(24, rectInner.top), window.innerHeight - pipRef.current.offsetHeight - 24);
                setPipPos({ x: snapX, y: curY });
              }
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
          onTouchStart={(e) => {
            if (!pipRef.current) return;
            const touch = e.touches[0];
            const rect = pipRef.current.getBoundingClientRect();
            isDraggingRef.current = true;
            wasDraggedRef.current = false;
            dragOffsetRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
            dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchMove={(e) => {
            if (!isDraggingRef.current || !pipRef.current) return;
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - dragStartPosRef.current.x);
            const dy = Math.abs(touch.clientY - dragStartPosRef.current.y);
            if (dx > 3 || dy > 3) wasDraggedRef.current = true;
            const elW = pipRef.current?.offsetWidth || 96;
            const elH = pipRef.current?.offsetHeight || 144;
            const newX = Math.min(Math.max(12, touch.clientX - dragOffsetRef.current.x), window.innerWidth - elW - 12);
            const newY = Math.min(Math.max(12, touch.clientY - dragOffsetRef.current.y), window.innerHeight - elH - 12);
            setPipPos({ x: newX, y: newY });
          }}
          onTouchEnd={(e) => {
            isDraggingRef.current = false;
            if (pipRef.current) {
              const elW = pipRef.current.offsetWidth;
              const rectInner = pipRef.current.getBoundingClientRect();
              const centerX = rectInner.left + elW / 2;
              const snapX = centerX < window.innerWidth / 2 ? 24 : window.innerWidth - elW - 24;
              const snapY = Math.min(Math.max(24, rectInner.top), window.innerHeight - pipRef.current.offsetHeight - 24);
              setPipPos({ x: snapX, y: snapY });
            }
          }}
        >
          <div className="w-full h-full relative pointer-events-none grayscale hover:grayscale-0 transition-all duration-500">
            <ProctoringCamera ref={videoRef} onViolation={handleCameraViolation} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Monitoring AI</span>
              </div>
              <div className="text-[12px] font-black font-mono text-white/80">{formatTime(timeLeft)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS & OVERLAYS ── */}
      {activeWarning && step === 'EXAM' && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-xl flex justify-center items-center p-4">
          <div className="bg-white max-w-sm w-full rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-4 border-rose-500/20">
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-8 flex flex-col items-center">
              <AlertTriangle size={64} className="text-white" />
              <h2 className="text-2xl font-black text-white mt-4 uppercase">Pelanggaran</h2>
            </div>
            <div className="p-6 text-center">
              <div className="bg-rose-50 border border-rose-100 px-5 py-2.5 rounded-full text-base font-black text-rose-600 mb-6">
                Peringatan {activeWarning.count}/{activeWarning.limit}
              </div>
              <p className="text-xs text-slate-600 font-bold mb-6">{activeWarning.message}</p>
              <button 
                onClick={() => setActiveWarning(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiBotWarning && step === 'EXAM' && (
         <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className={`bg-white max-w-sm w-full rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 border-4 ${overlayViolationCount >= 3 ? 'shadow-rose-500/30 border-rose-500' : 'shadow-amber-500/30 border-amber-500'}`}>
               <div className={`p-8 flex flex-col items-center text-white text-center ${overlayViolationCount >= 3 ? 'bg-rose-600' : 'bg-amber-500'}`}>
                  <Cpu size={56} className="text-white mb-6 animate-pulse" />
                  <h2 className="text-xl font-black mb-1 tracking-tight font-outfit uppercase">
                    {overlayViolationCount >= 3 ? 'AI TERDETEKSI (KRITIS)' : 'INDIKASI AKTIVITAS TIDAK BIASA'}
                  </h2>
                  <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${overlayViolationCount >= 3 ? 'bg-rose-900/30' : 'bg-amber-900/30'}`}>
                    Peringatan {overlayViolationCount} dari 3
                  </div>
               </div>
               <div className="p-8 text-center bg-slate-50">
                  <p className="text-sm text-slate-700 font-bold leading-relaxed mb-6">
                    Sistem mendeteksi adanya aktivitas mencurigakan. Harap matikan aplikasi lain demi integritas ujian.
                  </p>
                  <div className="text-5xl font-black text-primary font-mono">{aiCountdown}</div>
               </div>
            </div>
         </div>
      )}

      {showTimeUpModal && step === 'EXAM' && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white max-w-sm w-full rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="bg-rose-600 p-8 text-white text-center">
                 <Clock size={44} className="mx-auto mb-4" />
                 <h2 className="text-2xl font-black uppercase">Waktu Habis!</h2>
              </div>
              <div className="p-8 text-center">
                 <p className="text-sm text-slate-600 font-bold mb-6">Sesi pengerjaan Anda telah berakhir secara sistem.</p>
                 <button onClick={() => handleStatusUpdate('TIMEOUT')} className="w-full py-4 bg-primary text-white rounded-xl font-black uppercase tracking-widest">Selesaikan Sesi</button>
              </div>
           </div>
        </div>
      )}

      {showFiveMinWarning && step === 'EXAM' && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white max-w-sm w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-indigo-100">
             <div className="bg-indigo-600 p-8 text-white text-center">
                <Clock size={44} className="mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-black uppercase">Waktu Kritis!</h2>
             </div>
             <div className="p-8 text-center">
                <p className="text-sm text-slate-600 font-bold mb-8">Waktu pengerjaan Anda tersisa kurang dari 5 menit.</p>
                <button onClick={() => setShowFiveMinWarning(false)} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest">Saya Mengerti</button>
             </div>
          </div>
        </div>
      )}

      {(isConnectionLocked || isSplitLocked) && step === 'EXAM' && (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mb-8 animate-bounce shadow-xl shadow-rose-500/10">
            {isConnectionLocked ? <MonitorOff size={48} /> : <Monitor size={48} />}
          </div>
          <h2 className="text-3xl font-black text-on-surface mb-3 font-headline uppercase tracking-tighter">
            {isConnectionLocked ? 'Koneksi Terputus' : 'Layar Terbagi Terdeteksi'}
          </h2>
          <p className="text-slate-500 font-medium max-w-xs mb-10 leading-relaxed">
            {isConnectionLocked 
               ? 'Ujian ditangguhkan sementara untuk keamanan data. Silakan sambungkan kembali internet Anda.' 
               : 'Gunakan mode layar penuh (Full Screen) untuk melanjutkan ujian demi menjaga integritas pengawasan.'}
          </p>
          {isConnectionLocked && (
            <button onClick={syncWithServer} className="px-10 py-4 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Coba Pulihkan Sesi</button>
          )}
        </div>
      )}

      {/* Global Style Tags */}
      <style jsx global>{`
        .glass-header { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
        .emerald-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
    </div>
  );
}
