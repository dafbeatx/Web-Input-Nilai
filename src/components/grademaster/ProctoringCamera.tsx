"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { CameraOff } from 'lucide-react';

interface ProctoringCameraProps {
  onViolation: (type: 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_UNALIGNED') => void;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

const ProctoringCamera = forwardRef<HTMLVideoElement, ProctoringCameraProps>(({ onViolation }, ref) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onViolationRef = useRef(onViolation);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Expose the video element to the parent ref
  useImperativeHandle(ref, () => internalVideoRef.current as HTMLVideoElement);

  // Keep the violation callback ref up-to-date without triggering re-init
  useEffect(() => {
    onViolationRef.current = onViolation;
  });

  // Init camera & face detection ONCE on mount
  useEffect(() => {
    let isActive = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const setup = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');

        if (!isActive || !internalVideoRef.current) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' }
        });

        if (!isActive || !internalVideoRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        internalVideoRef.current.srcObject = stream;

        const win = window as any;
        if (!win.FaceDetection) {
          console.warn('FaceDetection not found on window after script load');
          setIsLoading(false);
          return;
        }

        const faceDetection = new win.FaceDetection({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
        });

        faceDetection.setOptions({
          model: 'short',
          minDetectionConfidence: 0.5
        });

        const violationsRef = { type: '', count: 0 };

        faceDetection.onResults((results: { detections: unknown[] }) => {
          if (!isActive) return;
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

            // Only trigger if violation persists for 2 consecutive checks (~3 seconds total)
            if (violationsRef.count >= 2) {
              onViolationRef.current(currentViolation as any);
              // Reset count after triggering to avoid continuous firing every 1.5s
              // but keep type to detect next sequence if it persists
              violationsRef.count = 0; 
            }
          } else {
            // Valid state: reset violation tracker
            violationsRef.type = '';
            violationsRef.count = 0;
          }
        });

        await faceDetection.initialize();
        setIsLoading(false);

        intervalId = setInterval(async () => {
          if (!isActive || !internalVideoRef.current || internalVideoRef.current.readyState < 2) return;
          try {
            await faceDetection.send({ image: internalVideoRef.current });
          } catch {
            // Silently ignore send errors
          }
        }, 1500);

      } catch (err: any) {
        console.error('ProctoringCamera setup failed:', err);
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setPermissionDenied(true);
        }
        setIsLoading(false);
      }
    };

    setup();

    return () => {
      isActive = false;
      if (intervalId) clearInterval(intervalId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  if (permissionDenied) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-2 p-3">
        <CameraOff size={24} className="text-rose-400" />
        <span className="text-[9px] font-bold text-center leading-tight text-slate-300">
          Aktifkan kamera untuk melanjutkan
        </span>
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});

ProctoringCamera.displayName = 'ProctoringCamera';
export default ProctoringCamera;
