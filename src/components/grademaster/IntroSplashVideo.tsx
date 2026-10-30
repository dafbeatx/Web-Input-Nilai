"use client";

import React, { useState, useEffect, useRef } from "react";

export default function IntroSplashVideo() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const now = Date.now();
      const sessionPlayed = sessionStorage.getItem("nawasena_splash_session");
      const lastPlayedTime = Number(localStorage.getItem("nawasena_splash_time") || "0");
      const isReopeningAfterInactivity = now - lastPlayedTime > 30 * 60 * 1000; // 30 minutes

      const urlParams = new URLSearchParams(window.location.search);
      const forceIntro = urlParams.get("intro") === "true";

      if (forceIntro || !sessionPlayed || isReopeningAfterInactivity) {
        setIsVisible(true);
        sessionStorage.setItem("nawasena_splash_session", "true");
        localStorage.setItem("nawasena_splash_time", now.toString());
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 500); // 500ms fade transition
  };

  useEffect(() => {
    if (!isVisible || !videoRef.current) return;
    const video = videoRef.current;
    
    // Always enable audio by default
    video.muted = false;
    video.volume = 1.0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback for browsers that block unmuted autoplay without prior gesture:
        // Start playback and immediately unmute upon first user interaction
        video.muted = true;
        video.play().catch(() => {});

        const unmuteOnUserGesture = () => {
          if (videoRef.current) {
            videoRef.current.muted = false;
          }
          window.removeEventListener("pointerdown", unmuteOnUserGesture);
          window.removeEventListener("touchstart", unmuteOnUserGesture);
          window.removeEventListener("keydown", unmuteOnUserGesture);
        };

        window.addEventListener("pointerdown", unmuteOnUserGesture, { once: true });
        window.addEventListener("touchstart", unmuteOnUserGesture, { once: true });
        window.addEventListener("keydown", unmuteOnUserGesture, { once: true });
      });
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      onClick={() => {
        if (videoRef.current) {
          videoRef.current.muted = false;
        }
      }}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-white select-none transition-opacity duration-500 ease-out cursor-default overflow-hidden ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="Nawasena Welcome Video"
    >
      {/* Clean full-screen presentation - no overlay buttons or progress bar */}
      <div className="relative w-full h-full max-w-[480px] max-h-screen flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src="/media/after-click-link.mp4"
          poster="/media/after-click-poster.webp"
          autoPlay
          playsInline
          muted={false}
          preload="auto"
          onEnded={handleDismiss}
          onError={handleDismiss}
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>
    </div>
  );
}
