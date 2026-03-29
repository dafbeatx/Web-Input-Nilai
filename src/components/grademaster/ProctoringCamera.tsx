"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { CameraOff, RefreshCw } from 'lucide-react';

interface ProctoringCameraProps {
  onViolation: (type: 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_UNALIGNED') => void;
  onCameraError?: (error: string) => void;
  onCameraReady?: () => void;
}

function loadScript(src: string, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      script.remove();
      reject(new Error(`Script load timeout: ${src}`));
    }, timeoutMs);

    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
}

const VIDEO_CONSTRAINTS_PRIORITY: MediaTrackConstraints[] = [
  { width: 320, height: 240, facingMode: 'user' },
  { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
  { facingMode: 'user' },
  { facingMode: { ideal: 'user' } },
  { width: { ideal: 320 } },
  true as unknown as MediaTrackConstraints,
];

async function acquireStream(): Promise<MediaStream> {
  let lastError: Error | null = null;

  for (const constraint of VIDEO_CONSTRAINTS_PRIORITY) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraint,
        audio: false,
      });
      return stream;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errName = (err as { name?: string })?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        throw err;
      }
      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        throw err;
      }
    }
  }

  throw lastError || new Error('Failed to acquire camera stream');
}

const MAX_SETUP_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const FACE_CHECK_INTERVAL = 1500;

const ProctoringCamera = forwardRef<HTMLVideoElement, ProctoringCameraProps>(
  ({ onViolation, onCameraError, onCameraReady }, ref) => {
    const internalVideoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const onViolationRef = useRef(onViolation);
    const onCameraErrorRef = useRef(onCameraError);
    const onCameraReadyRef = useRef(onCameraReady);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const isActiveRef = useRef(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const setupAttemptRef = useRef(0);

    useImperativeHandle(ref, () => internalVideoRef.current as HTMLVideoElement);

    useEffect(() => { onViolationRef.current = onViolation; });
    useEffect(() => { onCameraErrorRef.current = onCameraError; });
    useEffect(() => { onCameraReadyRef.current = onCameraReady; });

    const stopCurrentStream = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (internalVideoRef.current) {
        internalVideoRef.current.srcObject = null;
      }
    }, []);

    const setupCamera = useCallback(async (attempt = 0): Promise<void> => {
      if (!isActiveRef.current) return;

      setupAttemptRef.current = attempt;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        try {
          await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js');
          await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        } catch (scriptErr) {
          console.warn('MediaPipe scripts failed to load, continuing without face detection:', scriptErr);
        }

        if (!isActiveRef.current || !internalVideoRef.current) return;

        const stream = await acquireStream();

        if (!isActiveRef.current || !internalVideoRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        stopCurrentStream();
        streamRef.current = stream;
        internalVideoRef.current.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const video = internalVideoRef.current;
          if (!video) { reject(new Error('Video element lost')); return; }

          const onLoadedData = () => {
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
            clearTimeout(timeout);
            resolve();
          };
          const onError = () => {
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
            clearTimeout(timeout);
            reject(new Error('Video element failed to load stream'));
          };
          const timeout = setTimeout(() => {
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
            if (video.readyState >= 2) {
              resolve();
            } else {
              reject(new Error('Video load timeout'));
            }
          }, 8000);

          if (video.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
          } else {
            video.addEventListener('loadeddata', onLoadedData);
            video.addEventListener('error', onError);
          }
        });

        stream.getVideoTracks().forEach(track => {
          track.onended = () => {
            if (isActiveRef.current) {
              console.warn('Camera track ended unexpectedly, attempting recovery...');
              onCameraErrorRef.current?.('Kamera tiba-tiba berhenti. Mencoba menghubungkan ulang...');
              setTimeout(() => {
                if (isActiveRef.current) setupCamera(0);
              }, RETRY_DELAY_MS);
            }
          };
        });

        const win = window as unknown as Record<string, unknown>;
        if (win.FaceDetection && typeof win.FaceDetection === 'function') {
          try {
            const FD = win.FaceDetection as new (config: Record<string, unknown>) => {
              setOptions: (opts: Record<string, unknown>) => void;
              onResults: (cb: (r: { detections: unknown[] }) => void) => void;
              initialize: () => Promise<void>;
              send: (data: { image: HTMLVideoElement }) => Promise<void>;
            };

            const faceDetection = new FD({
              locateFile: (file: string) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
            });

            faceDetection.setOptions({
              model: 'short',
              minDetectionConfidence: 0.5
            });

            const violationsRef = { type: '', count: 0 };

            faceDetection.onResults((results: { detections: unknown[] }) => {
              if (!isActiveRef.current) return;
              const count = results.detections.length;
              let currentViolation = '';

              if (count === 0) {
                currentViolation = 'NO_FACE';
              } else if (count > 1) {
                currentViolation = 'MULTIPLE_FACES';
              }

              if (currentViolation) {
                if (violationsRef.type === currentViolation) {
                  violationsRef.count++;
                } else {
                  violationsRef.type = currentViolation;
                  violationsRef.count = 1;
                }

                if (violationsRef.count >= 2) {
                  onViolationRef.current(currentViolation as 'NO_FACE' | 'MULTIPLE_FACES');
                  violationsRef.count = 0;
                }
              } else {
                violationsRef.type = '';
                violationsRef.count = 0;
              }
            });

            await faceDetection.initialize();

            intervalRef.current = setInterval(async () => {
              if (!isActiveRef.current || !internalVideoRef.current || internalVideoRef.current.readyState < 2) return;
              try {
                await faceDetection.send({ image: internalVideoRef.current });
              } catch {
                // Silently ignore send errors
              }
            }, FACE_CHECK_INTERVAL);
          } catch (fdErr) {
            console.warn('FaceDetection init failed, camera still active without face detection:', fdErr);
          }
        }

        setIsLoading(false);
        setPermissionDenied(false);
        setErrorMessage(null);
        setRetryCount(0);
        onCameraReadyRef.current?.();

      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        const errName = (error as { name?: string }).name || '';
        console.error(`ProctoringCamera setup failed (attempt ${attempt + 1}):`, error);

        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setPermissionDenied(true);
          setIsLoading(false);
          setErrorMessage(getHumanError(errName));
          onCameraErrorRef.current?.(getHumanError(errName));
          return;
        }

        if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setIsLoading(false);
          setErrorMessage('Tidak ditemukan kamera di perangkat ini.');
          onCameraErrorRef.current?.('Tidak ditemukan kamera di perangkat ini.');
          return;
        }

        if (attempt < MAX_SETUP_RETRIES - 1 && isActiveRef.current) {
          setRetryCount(attempt + 1);
          setErrorMessage(`Gagal menghubungi kamera, mencoba ulang (${attempt + 2}/${MAX_SETUP_RETRIES})...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          if (isActiveRef.current) {
            return setupCamera(attempt + 1);
          }
        } else {
          setIsLoading(false);
          const msg = getHumanError(errName);
          setErrorMessage(msg);
          onCameraErrorRef.current?.(msg);
        }
      }
    }, [stopCurrentStream]);

    const handleManualRetry = useCallback(() => {
      setPermissionDenied(false);
      setErrorMessage(null);
      setRetryCount(0);
      setupCamera(0);
    }, [setupCamera]);

    useEffect(() => {
      isActiveRef.current = true;
      setupCamera(0);

      return () => {
        isActiveRef.current = false;
        stopCurrentStream();
      };
    }, [setupCamera, stopCurrentStream]);

    // Recovery: re-acquire camera when tab becomes visible again
    useEffect(() => {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && isActiveRef.current) {
          const video = internalVideoRef.current;
          const stream = streamRef.current;

          // Check if the stream is still alive
          if (!stream || stream.getVideoTracks().length === 0 || stream.getVideoTracks().every(t => t.readyState === 'ended')) {
            console.warn('Camera stream lost after tab switch, recovering...');
            setupCamera(0);
          } else if (video && (!video.srcObject || video.readyState < 2)) {
            console.warn('Video element lost connection, re-attaching stream...');
            video.srcObject = stream;
            video.play().catch(() => {
              setupCamera(0);
            });
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [setupCamera]);

    if (permissionDenied || errorMessage) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-2 p-3">
          <CameraOff size={24} className="text-rose-400" />
          <span className="text-[9px] font-bold text-center leading-tight text-slate-300">
            {errorMessage || 'Aktifkan kamera untuk melanjutkan'}
          </span>
          <button
            onClick={handleManualRetry}
            className="mt-1 flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all"
          >
            <RefreshCw size={10} /> Coba Lagi
          </button>
        </div>
      );
    }

    return (
      <div className="w-full h-full relative">
        <video
          ref={internalVideoRef}
          className="w-full h-full object-cover rounded-xl"
          playsInline
          muted
          autoPlay
        />
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl gap-1.5">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {retryCount > 0 && (
              <span className="text-[8px] text-white/60 font-bold">
                Percobaan {retryCount + 1}/{MAX_SETUP_RETRIES}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

function getHumanError(errName: string): string {
  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    return 'Izin kamera ditolak. Tutup balon chat/overlay, lalu izinkan kamera di pengaturan browser.';
  }
  if (errName === 'NotReadableError' || errName === 'TrackStartError') {
    return 'Kamera dipakai aplikasi lain (WhatsApp/Zoom). Tutup aplikasi tersebut.';
  }
  if (errName === 'AbortError') {
    return 'Kamera dibatalkan sistem. Tutup overlay/balon chat lalu coba lagi.';
  }
  if (errName === 'OverconstrainedError') {
    return 'Kamera tidak mendukung spesifikasi yang diminta.';
  }
  if (errName === 'SecurityError') {
    return 'Browser memblokir kamera. Jangan buka link dari dalam app lain, salin dan buka di Chrome.';
  }
  return 'Gagal mengakses kamera. Pastikan tidak ada aplikasi lain menggunakan kamera.';
}

ProctoringCamera.displayName = 'ProctoringCamera';
export default ProctoringCamera;
