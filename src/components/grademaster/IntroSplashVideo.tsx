"use client";

import React, { useState, useEffect, useRef } from "react";

export default function IntroSplashVideo() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Check if running in browser
    if (typeof window === "undefined") return;

    try {
      const now = Date.now();
      const sessionPlayed = sessionStorage.getItem("nawasena_splash_session");
      const lastPlayedTime = Number(localStorage.getItem("nawasena_splash_time") || "0");
      const isReopeningAfterInactivity = now - lastPlayedTime > 30 * 60 * 1000; // 30 minutes

      // Check if URL forces intro or if it's a fresh link click / session / reopening
      const urlParams = new URLSearchParams(window.location.search);
      const forceIntro = urlParams.get("intro") === "true";

      if (forceIntro || !sessionPlayed || isReopeningAfterInactivity) {
        setIsVisible(true);
        sessionStorage.setItem("nawasena_splash_session", "true");
        localStorage.setItem("nawasena_splash_time", now.toString());
      }
    } catch {
      // In case localStorage / sessionStorage is blocked in private mode
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

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(pct);
    }
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="Nawasena Welcome Video"
    >
      {/* Top Floating Controls */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-white/90 via-white/50 to-transparent">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
            Nawasena
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            type="button"
            onClick={toggleAudio}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-900/5 hover:bg-slate-900/10 active:scale-95 text-slate-700 backdrop-blur-sm transition-all"
            title={isMuted ? "Aktifkan Suara" : "Matikan Suara"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isMuted ? "volume_off" : "volume_up"}
            </span>
          </button>

          {/* Skip button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-medium backdrop-blur-sm active:scale-95 transition-all shadow-sm"
          >
            <span>Lewati</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Video Container (Vertical 9:16 optimized, seamless white backdrop) */}
      <div className="relative w-full h-full max-w-[480px] max-h-screen flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src="/media/after-click-link.mp4"
          poster="/media/after-click-poster.webp"
          autoPlay
          playsInline
          muted={isMuted}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleDismiss}
          onError={handleDismiss}
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>

      {/* Bottom Progress Bar */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-100 z-20">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

