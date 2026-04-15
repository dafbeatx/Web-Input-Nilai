"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ToastType } from '@/lib/grademaster/types';
import { ArrowLeft, Send, AlertTriangle, ShieldX, Camera, Clock, CheckCircle2, MapPin, User, Star, ShieldCheck, ArrowRight, Cpu, MonitorOff, Play, Monitor, Activity, AppWindow, Wifi, Video, CloudLightning, Info, FileText, CircleHelp, Settings, LayoutTemplate, RefreshCw } from 'lucide-react';
import ProctoringCamera from './ProctoringCamera';
import { saveRemedialSession, loadRemedialSession, clearRemedialSession } from '@/lib/grademaster/session';
import { assessClientRisk } from '@/lib/grademaster/services/risk-engine.service';
import { useExamMonitor } from '@/lib/grademaster/hooks/useExamMonitor';

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
    indigo: 'bg-primary/10 text-primary border-primary/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    slate: 'bg-surface-variant text-on-surface-variant border-outline-variant',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
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

  // Monitor Hook Integration
  const { sendLog } = useExamMonitor({
    attemptId,
    examState: step,
    onNetworkChange: (online) => {
      setIsOffline(!online);
      if (!online) {
        setIsConnectionLocked(true);
      } else {
        // Auto-sync on reconnect
        syncWithServer();
      }
    },
    onViolation: (type, message, severity) => {
      setWarningCount(prev => prev + 1);
      if (type === 'TAB_SWITCH') {
        setTabWarningCount(prev => prev + 1);
        setToast({ message: "Peringatan: Jangan pindah tab atau aplikasi!", type: "error" });
      }
      if (type === 'SPLIT_SCREEN') {
        setSplitScreenViolationCount(prev => prev + 1);
        setToast({ message: "Layar Terbagi (Split Screen) Terdeteksi!", type: "error" });
      }
      
      // Update DB with violation
      sendTelegramNotify("SECURITY_VIOLATION", undefined, `${type}: ${message} (Severity: ${severity})`);
    }
  });

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

    const handleVisibility = () => {
      if (document.hidden) {
        trackEvent('VISIBILITY_LOST', 'MEDIUM', 15, { reason: 'Siswa meminimalisir tab / buka aplikasi lain' });
      } else {
        trackEvent('VISIBILITY_RESTORED', 'LOW', 0, { reason: 'Siswa kembali fokus ke tab ujian' });
        syncWithServer();
      }
    };

    if (step !== 'EXAM') return;
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [step, attemptId]);

  // Anti-cheat mechanism — basic keyboard protection
  useEffect(() => {
    if (step !== 'EXAM') return;

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setToast({ message: "Tidak diperkenankan untuk menyalin lembar soal", type: "error" });
      sendLog('CLIPBOARD_VIOLATION', 'LOW', { action: e.type });
    };

    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);

    return () => {
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
    };
  }, [step, setToast, sendLog]);

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
      <div className="fixed inset-0 z-[100] bg-transparent flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#3b82f615,transparent)]"></div>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30"></div>
        
        <div className="w-full max-w-xl relative bg-surface premium-shadow backdrop-blur-2xl border border-outline-variant rounded-[2.5rem] premium-shadow p-6 md:p-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <header className="text-center mb-8">
              <div className="w-20 h-20 bg-primary/20 rounded-[2rem] border border-primary/30 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/20">
                 <ShieldCheck size={40} className="text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight uppercase leading-tight font-outfit">Protokol Keamanan <br /><span className="text-primary italic">GradeMaster OS</span></h2>
              <div className="flex justify-center gap-2 mt-4">
                 <Badge color="indigo">{subject}</Badge>
                 <Badge color="emerald">{examType}</Badge>
              </div>
           </header>

           <div className="space-y-4 mb-8 h-[320px] overflow-y-auto pr-2 custom-scrollbar focus:outline-none">
              {[
                { icon: <MonitorOff size={18}/>, title: "Layar Penuh", desc: "Sistem akan mendeteksi aktifitas pemisahan layar atau pergantian tab secara instan." },
                { icon: <Camera size={18}/>, title: "Monitoring Visual", desc: "Akses kamera diperlukan untuk verifikasi identitas dan pengawasan berkelanjutan." },
                { icon: <Monitor size={18}/>, title: "Cek Screen Overlay", desc: "Terdeteksinya aplikasi melayang atau screen recorder akan mengunci sesi Anda." },
                { icon: <Activity size={18}/>, title: "Koneksi Stabil", desc: "Setiap aksi disinkronisasi setiap detik. Pastikan internet Anda stabil." },
                { icon: <AppWindow size={18}/>, title: "Deteksi Multi-Aplikasi", desc: "Menutup browser atau berpindah aplikasi akan dianggap pelanggaran berat." }
              ].map((rule, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-surface-variant border border-outline-variant hover:bg-surface-container-highest transition-all group">
                   <div className="w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                      {rule.icon}
                   </div>
                   <div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-on-surface mb-1">{rule.title}</h4>
                      <p className="text-[10px] md:text-xs font-bold text-on-surface-variant leading-relaxed text-left">{rule.desc}</p>
                   </div>
                </div>
              ))}
           </div>

           <label className="flex items-center gap-3 p-5 bg-primary/5 border border-primary/10 rounded-2xl mb-8 cursor-pointer select-none hover:bg-primary/10 transition-all">
             <input
               type="checkbox"
               checked={agreedRules}
               onChange={() => setAgreedRules(!agreedRules)}
               className="w-6 h-6 rounded-lg border-2 border-primary/30 bg-slate-900 text-primary focus:ring-primary/20 accent-primary"
             />
             <span className="text-[11px] md:text-xs font-black text-primary uppercase tracking-widest text-left">Saya siap mengikuti ujian dengan jujur</span>
           </label>

           <button 
             onClick={() => setStep('INFO')}
             disabled={!agreedRules}
             className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group border border-outline-variant disabled:opacity-30 disabled:grayscale disabled:pointer-events-none"
           >
             Mulai Verifikasi Sistem <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    );
  }

  // RENDER: INFO SCREEN (Camera/GPS/Timer confirmation + Permission Check)
  if (step === 'INFO') {
    const allPermsOk = examMode === 'LIMITED' || cameraOk;

    return (
      <div className="fixed inset-0 z-[100] bg-transparent flex flex-col items-center justify-center p-4 pt-safe">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#3b82f610,transparent)]"></div>
        <div className="w-full max-w-lg relative bg-surface premium-shadow backdrop-blur-2xl border border-outline-variant rounded-[2.5rem] premium-shadow p-6 md:p-10 animate-in zoom-in duration-500">
           <button onClick={() => setStep('RULES')} className="flex items-center gap-2 text-on-surface-variant hover:text-white font-black text-[10px] uppercase tracking-widest transition-all mb-8 group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Peraturan
          </button>
          
          <header className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-rose-500/10 text-rose-400 rounded-[2rem] border border-rose-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-rose-500/10">
              <Camera size={40} />
            </div>
            <h2 className="text-2xl font-black text-on-surface tracking-tight uppercase font-outfit">Persiapan Teknis</h2>
            <p className="text-[10px] md:text-xs font-bold text-on-surface-variant mt-2 uppercase tracking-widest">Verifikasi lingkungan pengerjaan</p>
          </header>

          <div className="bg-surface-variant border border-outline-variant rounded-2xl p-6 mb-8 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
               <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Identitas Peserta</span>
               <Badge color="emerald">{studentName}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-safe">
              <div>
                <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-tighter mb-1.5">Mata Pelajaran</p>
                <div className="text-[11px] font-bold text-on-surface uppercase truncate">{subject}</div>
              </div>
              <div>
                <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-tighter mb-1.5">Waktu Ujian</p>
                <div className="text-[11px] font-bold text-on-surface uppercase">{remedialTimer} Menit</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${checkingPerms ? 'bg-amber-500/5 border-amber-500/20' : cameraOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-surface-variant border-outline-variant'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${checkingPerms ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' : cameraOk ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-surface-variant text-slate-600 border-outline-variant'}`}>
                <Camera size={18} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-0.5">Sensor Kamera</p>
                <p className={`text-[11px] font-black uppercase ${checkingPerms ? 'text-amber-400 animate-pulse' : cameraOk ? 'text-emerald-400' : 'text-on-surface-variant'}`}>
                  {checkingPerms ? 'Mengevaluasi...' : cameraOk ? 'Terhubung' : 'Terputus'}
                </p>
              </div>
              {!cameraOk && !checkingPerms && (
                <button onClick={checkPermissions} className="px-4 py-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Aktifkan</button>
              )}
            </div>
          </div>

          {cameraErrorDetail && !cameraOk && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 animate-in fade-in">
              <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider mb-1">Akses Kamera Ditolak</p>
                <p className="text-[10px] text-rose-300/80 font-bold leading-relaxed">{cameraErrorDetail}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep('GUIDE')}
            disabled={isSubmitting || !allPermsOk || (remedialQuestions.length === 0 && !loadRemedialSession()?.remedialQuestions)}
            className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all border border-outline-variant disabled:opacity-30 disabled:grayscale disabled:pointer-events-none group flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Sinkronisasi...' : 
             (remedialQuestions.length === 0 && !loadRemedialSession()?.remedialQuestions) ? 'Mengunduh Data...' :
             !allPermsOk ? 'Izin Diperlukan' : 'Lanjutkan ke Panduan'}
             {allPermsOk && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>
      </div>
    );
  }

  // RENDER: GUIDE SCREEN (Educational instructions for proctoring camera)
  if (step === 'GUIDE') {
    return (
      <div className="fixed inset-0 z-[100] bg-transparent flex flex-col items-center justify-center p-4 pt-safe">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,#3b82f610,transparent)]"></div>
        <div className="w-full max-w-xl relative bg-surface premium-shadow backdrop-blur-2xl border border-outline-variant rounded-[2.5rem] premium-shadow p-6 md:p-10 animate-in slide-in-from-bottom-8 duration-700">
          <button onClick={() => setStep('INFO')} className="flex items-center gap-2 text-on-surface-variant hover:text-white font-black text-[10px] uppercase tracking-widest transition-all mb-8 group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Persiapan
          </button>
          
          <header className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-[2rem] border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/10">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight uppercase font-outfit">Panduan Visual</h2>
            <p className="text-[10px] md:text-xs font-bold text-on-surface-variant mt-2 uppercase tracking-widest">Optimalkan Pengawasan Sistem</p>
          </header>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { icon: <User size={20}/>, title: "Wajah Jelas", desc: "Dahi hingga dagu harus terlihat penuh." },
              { icon: <ShieldX size={20}/>, title: "Tanpa Masker", desc: "Jangan menutupi wajah dengan benda apapun." },
              { icon: <Star size={20}/>, title: "Cahaya Cukup", desc: "Pastikan area wajah terang & tidak silau." },
              { icon: <Camera size={20}/>, title: "Tetap Fokus", desc: "Jangan bergerak keluar dari jangkauan kamera." }
            ].map((item, idx) => (
              <div key={idx} className="bg-surface-variant border border-outline-variant p-5 rounded-2xl flex flex-col items-center text-center group hover:bg-surface-container-highest transition-all hover:border-primary/30">
                 <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4 border border-primary/20 group-hover:scale-110 transition-transform">
                   {item.icon}
                 </div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface mb-1.5">{item.title}</h4>
                 <p className="text-[9px] text-on-surface-variant font-bold leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 mb-8 flex gap-4 items-center">
            <div className="w-10 h-10 shrink-0 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
               <AlertTriangle size={20} />
            </div>
            <p className="text-[10px] md:text-xs text-rose-400 font-black leading-relaxed uppercase tracking-tight text-left">
              Pelanggaran posisi wajah yang disengaja akan memicu diskualifikasi otomatis & nilai <span className="text-rose-500">NOL</span>.
            </p>
          </div>

          <button
            onClick={startExam}
            disabled={isSubmitting}
            className="w-full py-5 bg-emerald-500 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all border border-outline-variant flex items-center justify-center gap-3 group"
          >
            {isSubmitting ? 'Inisialisasi...' : 'Saya Mengerti, Mulai Sesi'}
            {!isSubmitting && <Play size={18} className="fill-current group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>
      </div>
    );
  }

  // RENDER: TIME UP MODAL (Extension points feature)
  if (step === 'EXAM' && showTimeUpModal) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-xl animate-in fade-in duration-300">
        <div className="bg-surface premium-shadow backdrop-blur-2xl border border-outline-variant max-w-lg w-full rounded-[2.5rem] p-8 md:p-10 premium-shadow flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent"></div>
          <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <Clock size={40} />
          </div>
          <h2 className="text-2xl font-black text-on-surface mb-2 tracking-tight uppercase font-outfit">Waktu Habis!</h2>
          <p className="text-[12px] font-bold text-on-surface-variant mb-8 leading-relaxed uppercase tracking-wider">
            Sistem mendeteksi durasi ujian Anda telah berakhir.
          </p>
          
          <div className="bg-surface-variant border border-outline-variant rounded-2xl w-full p-6 mb-8 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Saldo Poin Disiplin</span>
              <span className="text-sm font-black text-primary">{pointsBal ? pointsBal.total : '...'} Poin</span>
            </div>
            <div className="flex justify-between items-center text-rose-400">
              <span className="text-[10px] font-black uppercase tracking-widest">Biaya Perpanjangan</span>
              <span className="text-sm font-black">-10 Poin</span>
            </div>
          </div>
          
          <div className="w-full flex flex-col gap-4 pt-safe">
            <button
              onClick={() => {
                setPointsToSpend(10);
                setTimeout(handleExtendTime, 0);
              }}
              disabled={extendLoading || !pointsBal || pointsBal.total < 10 || pointsBal.usedToday >= 10}
              className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all border border-outline-variant disabled:opacity-30 disabled:grayscale"
            >
              {extendLoading ? 'Sinkronisasi...' : 'Gunakan 10 Poin (+10 Menit)'}
            </button>
            <button
              onClick={() => handleStatusUpdate('TIMEOUT')}
              disabled={extendLoading || isSubmitting}
              className="w-full py-3 bg-surface-variant text-rose-400 border border-outline-variant rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] hover:bg-rose-500/10 transition-all"
            >
              Akhiri Sesi (Gagal)
            </button>
            {(!pointsBal || pointsBal.total < 10 || pointsBal.usedToday >= 10) && pointsBal !== null && (
              <p className="text-[9px] text-rose-500/60 font-black uppercase tracking-widest mt-2">
                Poin Tidak Mencukupi atau Limit Tercapai
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
      setClientCheatingFlags([]); 
      hasTriggeredCheatingRef.current = false;
      setStep('EXAM');
      setToast({ message: '⚠️ Kesempatan Terakhir Aktif. Fokus!', type: 'error' });
      sendTelegramNotify('ACTIVITY', capturePhoto() || undefined, `Siswa menggunakan kesempatan kedua. Alasan: ${secondChanceReason}`);
    };

    return (
      <div className="fixed inset-0 z-[1000] bg-transparent flex items-center justify-center p-4 pt-safe">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#f59e0b10,transparent)]"></div>
        <div className="bg-surface premium-shadow backdrop-blur-2xl border border-amber-500/20 max-w-lg w-full rounded-[2.5rem] p-8 md:p-10 premium-shadow text-center relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
          <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
            <AlertTriangle size={40} />
          </div>

          <h2 className="text-2xl font-black text-on-surface mb-2 tracking-tight uppercase font-outfit">Pelanggaran Terdeteksi</h2>
          <p className="text-[10px] md:text-xs font-bold text-on-surface-variant mb-6 uppercase tracking-widest leading-relaxed">
            Sistem merekam aktivitas mencurigakan pada sesi Anda
          </p>

          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 mb-8">
            <p className="text-[11px] font-black text-rose-400 uppercase tracking-tight">{secondChanceReason}</p>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 mb-8 text-left space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
                <p className="text-[10px] font-black text-on-surface uppercase tracking-widest">Kesempatan Terakhir (1/1)</p>
             </div>
             <p className="text-[11px] text-on-surface-variant font-bold leading-relaxed">
               Anda diberikan <span className="text-amber-500">satu</span> kali kesempatan untuk melanjutkan. Pelanggaran berikutnya akan memicu diskualifikasi otomatis & nilai <span className="text-rose-500 font-black">NOL</span>.
             </p>
          </div>

          <button
            onClick={handleUseSecondChance}
            className="w-full py-5 bg-amber-500 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all border border-outline-variant flex items-center justify-center gap-3 mb-4"
          >
            Pulihkan Sesi Ujian <Play size={18} className="fill-current" />
          </button>

          <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">Tetap Fokus Pada Layar</p>
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
      const deadline = new Date('2026-03-30T07:00:00+07:00').getTime();
      const diff = deadline - Date.now();
      if (diff <= 0) return "Selesai";

      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      
      let str = "";
      if (days > 0) str += `${days}d `;
      if (hours > 0) str += `${hours}h `;
      str += `${mins}m`;
      return str;
    };

    const handleShare = () => {
      const timeStr = getRemainingTimeStr();
      const text = `SAYA SUDAH BERES REMEDIAL! 🎓\n\n👤 Nama: ${studentName}\n🏫 Kelas: ${className}\n📚 Mapel: ${subject}\n📊 Jenis: ${examType}\n🔥 Skor: ${finalScore}\n\nSisa waktu input nilai: ${timeStr}. Buruan dikerjakan!`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
      <div className="fixed inset-0 z-[100] bg-transparent flex flex-col items-center justify-center p-4 overflow-y-auto custom-scrollbar">
        <div className={`absolute inset-0 opacity-20 ${isCheat ? 'bg-rose-500/10' : isTimeout ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}></div>
        
        <div className={`w-full max-w-xl relative bg-surface premium-shadow backdrop-blur-2xl border rounded-[2.5rem] premium-shadow p-8 md:p-12 text-center animate-in zoom-in-95 duration-700 ${isCheat ? 'border-rose-500/20' : isTimeout ? 'border-amber-500/20' : 'border-emerald-500/20'}`}>
          <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-${isCheat ? 'rose' : isTimeout ? 'amber' : 'emerald'}-500/50 to-transparent`}></div>
          
          <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border ${isCheat ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : isTimeout ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            {isCheat ? <ShieldX size={48} /> : isTimeout ? <Clock size={48} /> : <CheckCircle2 size={48} />}
          </div>
          
          <h2 className="text-3xl font-black text-on-surface mb-3 tracking-tight uppercase font-outfit">
            {isCheat ? 'Diskualifikasi!' : isTimeout ? 'Waktu Berakhir' : 'Sesi Selesai!'}
          </h2>
          
          <div className="space-y-4 mb-10">
            {isCheat ? (
               <p className="text-[12px] md:text-sm text-on-surface-variant font-bold leading-relaxed uppercase tracking-wide">Pelanggaran berat terdeteksi. Skor otomatis diatur menjadi <span className="text-rose-500 font-black">NOL</span>. Silakan hubungi Guru Pengampu.</p>
            ) : isTimeout ? (
               <p className="text-[12px] md:text-sm text-on-surface-variant font-bold leading-relaxed uppercase tracking-wide">Sesi ditutup otomatis oleh sistem. Jawaban terakhir yang tersimpan akan dievaluasi.</p>
            ) : (
               <div className="space-y-4">
                  <p className="text-[12px] md:text-sm text-on-surface-variant font-bold leading-relaxed uppercase tracking-wide">Evaluasi mandiri selesai. Data Anda telah disinkronisasi dengan Server Nilai Pusat.</p>
                  <div className="py-6 px-10 bg-surface-variant border border-outline-variant rounded-3xl inline-block">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-1">Skor Akhir</p>
                    <p className={`text-5xl font-black font-outfit tracking-tighter ${finalScore !== null && finalScore < 70 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {finalScore}
                    </p>
                  </div>
                  {finalScore !== null && finalScore < 70 && (
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 py-2 rounded-full border border-rose-500/20 px-4 inline-block">⚠️ Belum Mencapai KKM (70)</p>
                  )}
               </div>
            )}
          </div>

          <div className="space-y-4">
            {isCompleted && (
              <>
                 {finalScore !== null && finalScore < 70 ? (
                    <button
                      onClick={() => { clearRemedialSession(); window.location.reload(); }}
                      className="w-full py-5 bg-primary text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all border border-outline-variant flex items-center justify-center gap-3"
                    >
                      Coba Lagi Sekarang <RefreshCw size={18} />
                    </button>
                 ) : (
                    <button
                      onClick={handleShare}
                      className="w-full py-5 bg-emerald-500 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all border border-outline-variant flex items-center justify-center gap-3"
                    >
                      Kabarkan Teman Sekelas <Send size={18} />
                    </button>
                 )}
              </>
            )}
            
            <button
              onClick={handleExit}
              className={`w-full py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all border border-outline-variant ${isCheat ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container-highest'}`}
            >
              Keluar ke Dasbor
            </button>
          </div>

          {isCompleted && remainingStudents.length > 0 && (
            <div className="mt-12 pt-8 border-t border-outline-variant text-left">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Rekan Belum Mengerjakan</h4>
                <Badge color="rose">Sisa {getRemainingTimeStr()}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {remainingStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-variant border border-outline-variant group hover:border-primary/30 transition-all">
                    <span className="text-[11px] font-bold text-on-surface-variant truncate group-hover:text-white transition-colors">{s.name}</span>
                    <div className="w-2 h-2 rounded-full bg-rose-500/50"></div>
                  </div>
                ))}
              </div>
            </div>
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
    <div className="relative min-h-screen bg-transparent font-inter text-on-surface selection:bg-primary/30 selection:text-white overflow-x-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,#3b82f605,transparent)] pointer-events-none"></div>
      
      {/* ── TOP APP BAR (GradeMaster OS Header) ── */}
      <header className="fixed top-0 w-full z-[80] bg-surface premium-shadow backdrop-blur-2xl border-b border-outline-variant px-6 py-4">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4 pt-safe">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
              <span className="text-primary font-black text-lg">
                {studentName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden xs:flex flex-col">
              <h1 className="text-sm font-black tracking-tight text-on-surface uppercase font-outfit leading-tight">{studentName}</h1>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary italic">Sesi Remedial Terproteksi</span>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            {/* Timer Desktop */}
            <div className="hidden md:flex items-center gap-6 pt-safe">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Durasi Tersisa</span>
                <span className={`text-xl font-black font-outfit tabular-nums tracking-tighter ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-on-surface'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="h-8 w-px bg-surface-variant"></div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-on-surface uppercase tracking-tight truncate max-w-[150px]">{subject}</span>
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter">{examType} • {academicYear}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-safe">
              <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-variant border border-outline-variant">
                <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isOffline ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isOffline ? 'Offline' : 'Server Aktif'}
                </span>
              </div>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-30 flex items-center gap-2 border border-outline-variant"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                Submit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className={`max-w-7xl mx-auto px-6 pt-28 md:pt-36 pb-20 flex flex-col lg:flex-row gap-8 transition-opacity duration-700 ${(isTabHidden || isPermanentlyBlocked || isOffline || isConnectionLocked) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Monitoring Panel */}
        <aside className="w-full lg:w-72 lg:sticky lg:top-32 h-fit space-y-6">
          <div className="bg-surface premium-shadow backdrop-blur-2xl border border-outline-variant p-6 rounded-[2rem] shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface">Telemetri</h2>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Activity size={16} />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-surface-variant border border-outline-variant rounded-2xl">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                   <ShieldCheck size={16} />
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-on-surface uppercase tracking-widest">Proteksi AI</p>
                   <p className="text-[9px] font-bold text-emerald-400 uppercase">Terverifikasi</p>
                 </div>
              </div>
              
              <div className={`flex items-center gap-3 p-4 bg-surface-variant border rounded-2xl transition-colors ${tabWarningCount > 0 ? 'border-rose-500/30' : 'border-outline-variant'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${tabWarningCount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-surface-variant text-on-surface-variant border-outline-variant'}`}>
                  <AppWindow size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-on-surface uppercase tracking-widest">Layar Aktif</p>
                  <p className={`text-[9px] font-bold uppercase ${tabWarningCount > 0 ? 'text-rose-400' : 'text-on-surface-variant'}`}>
                    Warn: {tabWarningCount}/{MAX_TAB_WARNINGS}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-4 bg-surface-variant border rounded-2xl transition-colors ${isOffline ? 'border-rose-500/30' : 'border-outline-variant'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isOffline ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-surface-variant text-on-surface-variant border-outline-variant'}`}>
                  <Wifi size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-on-surface uppercase tracking-widest">Konektivitas</p>
                  <p className={`text-[9px] font-bold uppercase ${isOffline ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isOffline ? 'Terputus' : 'Stabil'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/20 transition-colors"></div>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-4">Statistik Progres</p>
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-4xl font-black font-outfit text-on-surface tracking-tighter">
                {answers.filter(a => a.trim() !== '').length}
              </span>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">/ {remedialEssayCount} Soal</span>
            </div>
            <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden border border-outline-variant">
              <div 
                className="h-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out" 
                style={{ width: `${(answers.filter(a => a.trim() !== '').length / remedialEssayCount) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Question Area */}
        <section className="flex-1 space-y-8 animate-in fade-in duration-1000">
          {answers.map((ans, idx) => (
            <div key={idx} className="bg-surface premium-shadow backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 border border-outline-variant premium-shadow relative overflow-hidden group hover:border-primary/30 transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20 group-hover:bg-primary transition-all duration-500" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shadow-lg shadow-primary/20">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="text-xl font-black text-on-surface tracking-tight font-outfit uppercase">Soal Essay {idx + 1}</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Kategori Pengerjaan Mandiri</p>
                </div>
              </div>

              {shuffledQuestions[idx] && (
                <div className="bg-surface-variant p-8 rounded-[2rem] mb-10 border border-outline-variant shadow-sm">
                  <p className="text-on-surface-variant font-bold leading-relaxed whitespace-pre-wrap text-lg font-outfit italic">
                    "{shuffledQuestions[idx].text}"
                  </p>
                </div>
              )}

              <div className="relative">
                <textarea
                  className="w-full bg-surface-variant border border-outline-variant rounded-[2rem] p-8 text-lg font-bold text-on-surface outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all resize-none min-h-[320px] shadow-sm custom-scrollbar"
                  placeholder="Ketikkan argumentasi jawaban Anda secara sistematis di sini..."
                  value={ans}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onCopy={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  autoComplete="off"
                  spellCheck="false"
                />
                <div className="absolute top-4 right-8">
                   <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                     <span className="text-[9px] font-black text-primary uppercase tracking-widest">Essay Mode</span>
                   </div>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-2">
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  Sistem Sinkronisasi Aktif
                </span>
                <span className="bg-surface-variant px-4 py-1.5 rounded-full border border-outline-variant">{ans.length} Karakter</span>
              </div>
            </div>
          ))}

          {/* Bottom Actions */}
          <div className="bg-surface premium-shadow backdrop-blur-2xl p-10 md:p-16 rounded-[3rem] border border-outline-variant flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,#3b82f605,transparent)]"></div>
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mb-8 border border-primary/20 shadow-2xl shadow-primary/20">
              <ShieldCheck size={36} />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-on-surface mb-3 font-outfit uppercase tracking-tight">Finalisasi Jawaban</h3>
            <p className="text-[11px] md:text-xs text-on-surface-variant font-bold mb-10 max-w-sm uppercase tracking-widest leading-loose">Pastikan seluruh poin argumentasi telah terjawab secara komprehensif sebelum mengunci sesi ujian.</p>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isOffline}
              className={`group flex items-center gap-4 px-12 py-5 rounded-2xl text-[11px] md:text-xs font-black uppercase tracking-[0.3em] transition-all premium-shadow border border-outline-variant ${
                isSubmitting || isOffline 
                  ? 'bg-slate-800 text-slate-600 border-outline-variant cursor-not-allowed grayscale' 
                  : 'bg-primary text-white hover:scale-105 active:scale-95 shadow-primary/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  Sinkronisasi...
                </>
              ) : (
                <>
                  Kumpulkan Seluruh Jawaban <Send className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={20} />
                </>
              )}
            </button>
          </div>
        </section>
      </main>

      {/* ── DRAGGABLE CAMERA (GradeMaster PiP) ── */}
      {step === 'EXAM' && (
        <div
          ref={pipRef}
          className="fixed z-[90] rounded-3xl overflow-hidden border-2 border-white/20 premium-shadow bg-slate-900 w-28 h-40 md:w-48 md:h-72 animate-in slide-in-from-right duration-500 cursor-grab active:cursor-grabbing select-none touch-none"
          style={pipPos
            ? { left: `${pipPos.x}px`, top: `${pipPos.y}px`, transition: isDraggingRef.current ? 'none' : 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }
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
              const elW = pipRef.current?.offsetWidth || 112;
              const elH = pipRef.current?.offsetHeight || 160;
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
            const elW = pipRef.current?.offsetWidth || 112;
            const elH = pipRef.current?.offsetHeight || 160;
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
          <div className="w-full h-full relative pointer-events-none transition-all duration-500 overflow-hidden">
            <ProctoringCamera ref={videoRef} onViolation={handleCameraViolation} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-3 left-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <span className="text-[8px] font-black text-on-surface uppercase tracking-widest">Live AI</span>
              </div>
            </div>
            <div className="absolute top-3 right-3 bg-surface/60 backdrop-blur-md px-2 py-1 rounded-lg border border-outline-variant">
              <span className="text-[10px] font-black font-mono text-on-surface/90">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS & OVERLAYS ── */}
      {activeWarning && step === 'EXAM' && (
        <div className="fixed inset-0 z-[1000] bg-surface/90 backdrop-blur-xl flex justify-center items-center p-4 pt-safe">
          <div className="bg-surface premium-shadow border border-outline-variant max-w-sm w-full rounded-[2.5rem] premium-shadow overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 flex items-center justify-center border border-white/30 mb-4">
                <AlertTriangle size={36} className="text-on-surface" />
              </div>
              <h2 className="text-xl font-black text-on-surface uppercase tracking-tight font-outfit">Sistem Peringatan</h2>
            </div>
            <div className="p-8 pt-safe text-center">
              <div className="bg-rose-500/10 border border-rose-500/20 px-5 py-2 rounded-full text-xs font-black text-rose-400 mb-6 inline-block uppercase tracking-widest">
                Pelanggaran {activeWarning.count}/{activeWarning.limit}
              </div>
              <p className="text-[12px] text-on-surface-variant font-bold mb-8 leading-relaxed uppercase tracking-wide">{activeWarning.message}</p>
              <button 
                onClick={() => setActiveWarning(null)}
                className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all border border-outline-variant"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiBotWarning && step === 'EXAM' && (
         <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-surface/90 backdrop-blur-xl animate-in fade-in duration-300 text-center">
            <div className={`bg-surface premium-shadow border-2 max-w-sm w-full rounded-[2.5rem] overflow-hidden premium-shadow animate-in zoom-in-95 ${overlayViolationCount >= 3 ? 'border-rose-500/50' : 'border-amber-500/50'}`}>
               <div className={`p-10 flex flex-col items-center text-white ${overlayViolationCount >= 3 ? 'bg-rose-600/20' : 'bg-amber-600/20'}`}>
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 border ${overlayViolationCount >= 3 ? 'bg-rose-500/20 border-rose-500/30' : 'bg-amber-500/20 border-amber-500/30'}`}>
                    <Cpu size={36} className="animate-pulse" />
                  </div>
                  <h2 className="text-xl font-black mb-1 tracking-tight font-outfit uppercase">
                    {overlayViolationCount >= 3 ? 'AI KRITIS' : 'Aktivitas Ilegal'}
                  </h2>
                  <div className="px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-surface-variant border border-outline-variant mt-2">
                    Lacak {overlayViolationCount}/3
                  </div>
               </div>
               <div className="p-8 text-center bg-surface premium-shadow">
                  <p className="text-[11px] text-on-surface-variant font-bold leading-relaxed mb-6 uppercase tracking-widest">
                    Sistem mendeteksi aplikasi pihak ketiga yang berjalan di latar belakang.
                  </p>
                  <div className="text-5xl font-black text-rose-500 font-outfit tracking-tighter">{aiCountdown}</div>
               </div>
            </div>
         </div>
      )}

      {(isConnectionLocked || isSplitLocked) && step === 'EXAM' && (
        <div className="fixed inset-0 z-[1002] bg-transparent flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#f43f5e10,transparent)]"></div>
           <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2.5rem] border border-rose-500/20 flex items-center justify-center mb-8 animate-bounce shadow-2xl shadow-rose-500/20">
            {isConnectionLocked ? <MonitorOff size={48} /> : <Monitor size={48} />}
          </div>
          <h2 className="text-3xl font-black text-on-surface mb-3 tracking-tighter uppercase font-outfit">
            {isConnectionLocked ? 'Koneksi Terputus' : 'Layar Terpisah'}
          </h2>
          <p className="text-on-surface-variant font-bold max-w-xs mb-12 leading-relaxed uppercase text-[11px] tracking-widest">
            {isConnectionLocked 
               ? 'Ujian ditangguhkan. Hubungkan kembali akses internet untuk melanjutkan sinkronisasi data.' 
               : 'Aktivitas Split-Screen dilarang demi integritas pengawasan. Gunakan mode layar penuh.'}
          </p>
          {isConnectionLocked && (
            <button 
              onClick={syncWithServer} 
              className="px-12 py-5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all border border-outline-variant"
            >
              Pulihkan Sesi
            </button>
          )}
        </div>
      )}

      {/* Global Style Tags */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.3); }
        .privacy-mode { filter: blur(0px); transition: filter 0.3s; }
      `}</style>
      {/* Offline Security Overlay */}
      {(isOffline || isConnectionLocked) && step === 'EXAM' && (
        <div className="fixed inset-0 z-[9999] bg-surface/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-8 border border-rose-500/20 animate-pulse">
              <Wifi size={48} />
           </div>
           <h2 className="text-3xl font-black text-on-surface uppercase tracking-tight mb-4">Koneksi Terputus</h2>
           <p className="text-on-surface-variant max-w-xs mb-8 font-bold leading-relaxed">
             Sistem mengunci ujian untuk mencegah kecurangan. Konten disembunyikan sampai koneksi kembali stabil.
           </p>
           
           <div className="flex flex-col gap-3 w-full max-w-xs">
              <div className="p-4 bg-surface-variant rounded-2xl border border-outline-variant flex items-center gap-3">
                 <RefreshCw size={20} className="text-primary animate-spin" />
                 <div className="text-left">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Status Sinkronisasi</p>
                    <p className="text-xs font-black text-on-surface">{isSyncing ? "Menghubungkan..." : "Menunggu Sinyal..."}</p>
                 </div>
              </div>
              
              <button 
                onClick={syncWithServer}
                disabled={isSyncing}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isSyncing ? "Mencoba Re-koneksi..." : "Coba Hubungkan Sekarang"}
              </button>
           </div>
           
           <div className="mt-12">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">GradeMaster Dynamic Security v2.0</p>
           </div>
        </div>
      )}
    </div>
  );
}
