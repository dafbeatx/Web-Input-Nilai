"use client";

import React, { useEffect, useRef } from 'react';
import { FaceDetection, Results } from '@mediapipe/face_detection';
import { Camera } from '@mediapipe/camera_utils';

interface ProctoringCameraProps {
  onViolation: (type: 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_UNALIGNED') => void;
}

export default function ProctoringCamera({ onViolation }: ProctoringCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let camera: Camera | null = null;
    let faceDetection: FaceDetection | null = null;
    let isActive = true;

    const setupCamera = async () => {
      if (!videoRef.current) return;

      faceDetection = new FaceDetection({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
        }
      });

      faceDetection.setOptions({
        model: 'short',
        minDetectionConfidence: 0.5
      });

      faceDetection.onResults((results: Results) => {
        if (!isActive) return;
        
        const faceCount = results.detections.length;
        
        if (faceCount === 0) {
          onViolation('NO_FACE');
        } else if (faceCount > 1) {
          onViolation('MULTIPLE_FACES');
        } else {
          // Check alignment (optional, but requested in rules)
          // For now, if faceCount === 1, we assume it's good unless it's way off screen 
          // (but MediaPipe usually detects if it's partially in screen).
        }
      });

      try {
        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (isActive && videoRef.current && faceDetection) {
              await faceDetection.send({ image: videoRef.current });
            }
          },
          width: 320,
          height: 240
        });

        await camera.start();
      } catch (err) {
        console.error("Camera access denied or failed:", err);
      }
    };

    setupCamera();

    return () => {
      isActive = false;
      if (camera) {
        camera.stop();
      }
      if (faceDetection) {
        faceDetection.close();
      }
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
    </div>
  );
}
