"use client";

import React, { useEffect, useRef, useState } from 'react';

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

export default function ProctoringCamera({ onViolation }: ProctoringCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let stream: MediaStream | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const setup = async () => {
      try {
        // Load MediaPipe scripts from CDN
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');

        if (!isActive || !videoRef.current) return;

        // Get camera stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' }
        });

        if (!isActive || !videoRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        videoRef.current.srcObject = stream;

        // Access MediaPipe from global window scope
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

        faceDetection.onResults((results: { detections: unknown[] }) => {
          if (!isActive) return;

          const count = results.detections.length;
          if (count === 0) {
            onViolation('NO_FACE');
          } else if (count > 1) {
            onViolation('MULTIPLE_FACES');
          }
        });

        await faceDetection.initialize();
        setIsLoading(false);

        // Run detection every 1.5 seconds
        intervalId = setInterval(async () => {
          if (!isActive || !videoRef.current || videoRef.current.readyState < 2) return;

          try {
            await faceDetection.send({ image: videoRef.current });
          } catch {
            // Silently ignore send errors (e.g. video not ready)
          }
        }, 1500);

      } catch (err) {
        console.error('ProctoringCamera setup failed:', err);
        setIsLoading(false);
      }
    };

    setup();

    return () => {
      isActive = false;
      if (intervalId) clearInterval(intervalId);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [onViolation]);

  return (
    <div className="w-full h-full relative">
      <video
        ref={videoRef}
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
}
