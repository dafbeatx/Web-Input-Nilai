import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, LogOut, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ToastType } from '@/lib/grademaster/types';
import NeonGraduationCap from '@/components/grademaster/ui/NeonGraduationCap';

interface StudentLoginLayerProps {
  onSuccess: (studentData: any) => void;
  setToast: (t: ToastType) => void;
  onLogout?: () => void;
  isLoggedIn?: boolean;
}

/**
 * GradeMaster OS - Student Portal Login Page
 * Redesigned with premium Apple + Linear aesthetics, pure white theme, 
 * and persistent session detection logic.
 */
export default function StudentLoginLayer({
  onSuccess,
  setToast,
  isLoggedIn = false,
}: StudentLoginLayerProps) {
  // Loading States
  const [isPageEntering, setIsPageEntering] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const [error, setError] = useState('');

  // ── Session & Auth Listeners ────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      // 1. Initial Page Entry Animation delay
      setTimeout(() => {
        if (isMounted) setIsPageEntering(false);
      }, 500);

      // 2. Check for existing session on mount
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Session detected - move to redirect phase
        handleSessionActive();
      } else {
        if (isMounted) setIsCheckingSession(false);
      }
    }

    // 3. Listen for Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      console.log(`[AuthListener] Event: ${event}`);
      if (event === 'SIGNED_IN' && session) {
        handleSessionActive();
      }
    });

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSessionActive = () => {
    setIsRedirecting(true);
    setIsCheckingSession(false);
    // Give user a moment to see the "Redirecting" state for a premium feel
    setTimeout(() => {
      onSuccess(null); // Trigger parent layer switch to student_claim/home
    }, 1500);
  };

  const handleGoogleLogin = async () => {
    setIsLoginInProgress(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // This matches the helper route we created
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw new Error(error.message);
      // Browser will redirect to Google shortly
    } catch (err: any) {
      setError(err.message || 'Gagal tersambung dengan Google. Silakan coba lagi.');
      setIsLoginInProgress(false);
    }
  };

  // ── RENDERING — LOADING STATES ──────────────────────────────

  // Full Screen checking state
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center animate-in fade-in duration-700">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-[3px] border-slate-100 border-t-[#0F172A] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <NeonGraduationCap size={20} />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-[0.3em] mb-2 font-outfit">GradeMaster OS</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memeriksa Sesi...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirecting transition state
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-8 max-w-xs text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center animate-bounce duration-1000 shadow-xl shadow-emerald-100/50">
            <CheckCircle2 size={40} strokeWidth={2.5} />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tighter uppercase font-outfit">Berhasil Masuk</h1>
            <p className="text-sm font-medium text-slate-400 leading-relaxed px-4">
              Menghubungkan Anda ke portal akademik GradeMaster...
            </p>
          </div>
          <div className="flex gap-1.5 justify-center pt-4">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-bounce [animation-delay:-0.3s]" />
             <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-bounce [animation-delay:-0.15s]" />
             <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN UI ─────────────────────────────────────────────────
  return (
    <div className={`min-h-screen bg-white flex flex-col font-inter transition-all duration-1000 ${isPageEntering ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'} selection:bg-slate-100`}>
      
      {/* Background Decor — Clean & Sparse */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-slate-900 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-slate-700 rounded-full blur-[120px]" />
      </div>

      {/* Top Header */}
      <header className="w-full h-20 sm:h-24 flex items-center justify-between px-8 sm:px-12 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-lg shadow-slate-200 transform hover:scale-105 transition-transform duration-300">
             <NeonGraduationCap size={18} />
          </div>
          <span className="text-xs font-black text-[#0F172A] tracking-[0.2em] uppercase font-outfit">GradeMaster OS</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-[400px] flex flex-col items-center">
          
          {/* Visual Identity */}
          <div className="mb-12 relative">
             <div className="w-[110px] h-[110px] bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transform -rotate-[6deg] hover:rotate-0 transition-all duration-700 ease-out">
                <div className="w-[85px] h-[85px] bg-[#0F172A] rounded-[2rem] flex items-center justify-center text-white">
                   <NeonGraduationCap size={44} />
                </div>
             </div>
             <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center border-4 border-white shadow-lg animate-in zoom-in-50 duration-500 delay-700">
                <ShieldCheck size={20} strokeWidth={2.5} />
             </div>
          </div>

          {/* Typography */}
          <div className="text-center mb-14 space-y-5">
            <h1 className="text-[2.75rem] sm:text-[3.5rem] font-black text-[#0F172A] tracking-[-0.05em] leading-[0.95] font-outfit uppercase">
              Siswa<br />
              <span className="text-slate-300">Portal</span>
            </h1>
            <p className="text-[1.05rem] sm:text-lg text-slate-400 font-medium leading-normal px-4">
              Masuk untuk mengakses rapor, absensi, dan poin kedisiplinan Anda.
            </p>
          </div>

          {/* Error Message */}
          {error && (
             <div className="w-full mb-8 p-5 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 text-xs font-bold text-center animate-in slide-in-from-bottom-2 duration-300">
                {error}
             </div>
          )}

          {/* Primary Action Button */}
          <div className="w-full space-y-6">
            <button
               onClick={handleGoogleLogin}
               disabled={isLoginInProgress}
               className="
                 group
                 w-full py-5 sm:py-6
                 bg-[#0F172A] text-white
                 rounded-full
                 font-black uppercase tracking-[0.25em] text-[0.7rem] sm:text-xs
                 shadow-[0_25px_60px_-10px_rgba(15,23,42,0.4)]
                 hover:shadow-[0_30px_70px_-10px_rgba(15,23,42,0.5)]
                 hover:scale-[1.02]
                 active:scale-[0.98]
                 disabled:opacity-50 disabled:grayscale disabled:scale-100
                 transition-all duration-500 ease-out
                 flex items-center justify-center gap-4
               "
            >
              {isLoginInProgress ? (
                <Loader2 size={24} className="animate-spin text-slate-400" />
              ) : (
                <>
                  <svg className="w-6 h-6 shrink-0 group-hover:scale-125 transition-transform duration-500" viewBox="0 0 24 24">
                     <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                     <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                     <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                     <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                  <ArrowRight size={18} className="opacity-0 -ml-8 group-hover:opacity-100 group-hover:ml-0 transition-all duration-500" />
                </>
              )}
            </button>
            <p className="text-center text-[0.6rem] font-bold text-slate-300 uppercase tracking-[0.4em] leading-relaxed select-none">
              Data Anda terlindungi oleh enkripsi GradeMaster OS
            </p>
          </div>

        </div>
      </main>

      {/* Footer Element */}
      <footer className="h-20 sm:h-24 flex items-center justify-center relative z-10 shrink-0">
          <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.6em] select-none">System Identity v4.6</span>
      </footer>

    </div>
  );
}
