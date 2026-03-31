"use client";

import { useEffect, useRef, useCallback } from 'react';

interface MonitorConfig {
  attemptId: string | null;
  onViolation: (type: string, message: string, severity: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  onNetworkChange: (isOnline: boolean) => void;
  examState: string;
}

export const useExamMonitor = ({ attemptId, onViolation, onNetworkChange, examState }: MonitorConfig) => {
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialWidthRef = useRef<number>(0);
  const initialHeightRef = useRef<number>(0);

  const sendLog = useCallback(async (eventType: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW', metadata: any = {}) => {
    if (!attemptId) return;

    try {
      await fetch('/api/grademaster/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          eventType,
          severity,
          networkStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE',
          metadata: {
            ...metadata,
            examState,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
              aspectRatio: (window.innerWidth / window.innerHeight).toFixed(2)
            },
            device: {
              ua: navigator.userAgent,
              platform: navigator.platform
            }
          }
        })
      });
    } catch (err) {
      console.warn('Silent log failure:', err);
    }
  }, [attemptId, examState]);

  useEffect(() => {
    if (!attemptId) return;

    // 1. Initial State
    initialWidthRef.current = window.innerWidth;
    initialHeightRef.current = window.innerHeight;
    sendLog('EXAM_START', 'LOW', { message: 'Monitoring started' });

    // 2. Heartbeat (Every 10 seconds)
    heartbeatTimerRef.current = setInterval(() => {
      const now = Date.now();
      const diff = now - lastHeartbeatRef.current;
      
      // Detection: If heartbeat is delayed, it might mean the app was suspended or killed
      if (diff > 15000) {
        sendLog('SUSPICIOUS_DELAY', 'MEDIUM', { delayMs: diff });
      }
      
      sendLog('HEARTBEAT');
      lastHeartbeatRef.current = now;
    }, 10000);

    // 3. Network Listeners
    const handleOnline = () => {
      onNetworkChange(true);
      sendLog('NETWORK_RECONNECT', 'LOW');
    };
    const handleOffline = () => {
      onNetworkChange(false);
      sendLog('NETWORK_DISCONNECT', 'MEDIUM');
    };

    // 4. Visibility Listeners
    const handleVisibility = () => {
      if (document.hidden) {
        onViolation('TAB_SWITCH', 'Student switched tabs or exited app', 'HIGH');
        sendLog('TAB_BLUR', 'HIGH');
      } else {
        sendLog('TAB_FOCUS', 'LOW');
      }
    };

    // 5. Resize / Split Screen Detection
    const handleResize = () => {
      const currWidth = window.innerWidth;
      const currHeight = window.innerHeight;
      
      // Threshold: 20% change indicates likely split-screen or orientation change
      const wDiff = Math.abs(currWidth - initialWidthRef.current) / initialWidthRef.current;
      const hDiff = Math.abs(currHeight - initialHeightRef.current) / initialHeightRef.current;
      
      if (wDiff > 0.2 || hDiff > 0.2) {
        onViolation('SPLIT_SCREEN', 'Possible split-screen or window resize detected', 'MEDIUM');
        sendLog('VIEWPORT_RESIZE', 'MEDIUM', { 
          from: { w: initialWidthRef.current, h: initialHeightRef.current },
          to: { w: currWidth, h: currHeight }
        });
      }
    };

    // 6. Force Exit Tracking
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      sendLog('UNEXPECTED_EXIT', 'HIGH', { type: 'BEFORE_UNLOAD' });
      // Standard behavior to show prompt
      e.preventDefault();
      return (e.returnValue = '');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('resize', handleResize);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [attemptId, sendLog, onViolation, onNetworkChange]);

  return { sendLog };
};
