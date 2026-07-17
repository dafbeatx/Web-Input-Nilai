import React, { useState, useEffect } from 'react';
import { Search, GraduationCap } from 'lucide-react';
import { useGradeMaster } from '@/context/GradeMasterContext';
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
  const [userName, setUserName] = useState('');
  
  const [error, setError] = useState('');

  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gm_remember_me') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('gm_remember_me') === null) {
        localStorage.setItem('gm_remember_me', 'true');
      }
    }
  }, []);

  const { setLayer, setIsParent, setStudentData, setStudentClass, academicYear } = useGradeMaster();
  const [isParentMode, setIsParentMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const isStudentSelectedRef = React.useRef(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (isStudentSelectedRef.current) return;
      if (!debouncedQuery.trim()) {
        setStudents([]);
        return;
      }
      setIsLoadingSearch(true);
      try {
        const { data } = await supabase
          .from('gm_behaviors')
          .select('id, student_name, class_name, total_points')
          .ilike('student_name', `%${debouncedQuery}%`)
          .order('student_name', { ascending: true })
          .limit(10);
        setStudents(data || []);
      } catch (err) {} finally {
        setIsLoadingSearch(false);
      }
    };
    if (isParentMode) fetchStudents();
  }, [debouncedQuery, isParentMode]);

  const handleSelectStudent = (s: any) => {
    isStudentSelectedRef.current = true;
    setIsParentMode(false);
    setIsParent(true);
    
    // Set cookie untuk autentikasi Orang Tua di API server-side
    document.cookie = `gm_parent_student=${encodeURIComponent(s.student_name)}; path=/; max-age=604800; SameSite=Strict`;

    if (s.class_name) {
      setStudentClass(s.class_name);
    }

    setStudentData({ 
      id: s.id, 
      name: s.student_name, 
      class_name: s.class_name, 
      total_points: s.total_points,
      isGoogleLinked: false,
      isParentView: true 
    });

    // Kirim Notifikasi ke Telegram
    fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: s.student_name,
        className: s.class_name || 'Tidak Diketahui',
        event: 'PARENT_LOGIN',
        deviceInfo: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown Device',
        academicYear: academicYear || '2025/2026'
      })
    }).catch(err => console.error('Gagal mengirim notifikasi login orang tua ke Telegram:', err));

    setToast({ message: `Masuk sebagai Orang Tua dari ${s.student_name}`, type: 'success' });
    setLayer('student_profile');
  };


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
        handleSessionActive(session);
      } else {
        if (isMounted) setIsCheckingSession(false);
      }
    }

    // 3. Listen for Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      console.log(`[AuthListener] Event: ${event}`);
      if (event === 'SIGNED_IN' && session) {
        handleSessionActive(session);
      }
    });

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSessionActive = (session?: any) => {
    setIsRedirecting(true);
    setIsCheckingSession(false);
    
    if (session && session.user && session.user.user_metadata) {
      setUserName(session.user.user_metadata.full_name || session.user.email || '');
    }

    // Give user a moment to see the "Redirecting" state for a premium feel
    setTimeout(() => {
      onSuccess(null); // Trigger parent layer switch to student_claim/home
    }, 1800);
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
            {userName && (
              <p className="text-sm font-black text-emerald-500 uppercase tracking-widest leading-relaxed px-4">
                {userName}
              </p>
            )}
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
    <div className={`min-h-screen bg-white flex flex-col relative font-inter transition-all duration-1000 ${isPageEntering ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'} selection:bg-slate-100`}>
      
      {/* Mascot Waving Character - Desktop Only */}
      <div className="hidden lg:block absolute bottom-0 right-10 w-[240px] xl:w-[280px] z-0 select-none pointer-events-none animate-in slide-in-from-right-10 duration-1000 ease-out">
        <img
          src="/mascot_hijab_idle.png"
          alt="Student Mascot"
          className="w-full h-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-300"
        />
      </div>

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
          <div className="mb-10 relative flex flex-col items-center">
             {/* Mascot visible on mobile, hidden on desktop */}
             <div className="lg:hidden w-[140px] h-[140px] select-none pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out mb-2">
                <img
                  src="/mascot_hijab_idle.png"
                  alt="Student Mascot"
                  className="w-full h-full object-contain"
                />
             </div>
             
             {/* Desktop-only Visual Identity Box */}
             <div className="hidden lg:flex w-[110px] h-[110px] bg-white border border-slate-100 rounded-[2.5rem] items-center justify-center shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transform -rotate-[6deg] hover:rotate-0 transition-all duration-700 ease-out">
                <div className="w-[85px] h-[85px] bg-[#0F172A] rounded-[2rem] flex items-center justify-center text-white">
                   <NeonGraduationCap size={44} />
                </div>
             </div>
             <div className="absolute -bottom-2 -right-2 hidden lg:flex w-10 h-10 bg-emerald-500 text-white rounded-2xl items-center justify-center border-4 border-white shadow-lg animate-in zoom-in-50 duration-500 delay-700">
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
            {!isParentMode ? (
            <>
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
                <>
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                  <span>Menyambungkan ke Akun Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 shrink-0 group-hover:scale-125 transition-transform duration-500" viewBox="0 0 24 24">
                     <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                     <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                     <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                     <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                  <ArrowRight size={18} className="opacity-0 -ml-8 group-hover:opacity-100 group-hover:ml-0 transition-all duration-500" />
                </>
              )}
            </button>
            <div className="flex items-center justify-start px-2 py-1">
              <label className="flex items-center gap-2.5 cursor-pointer group select-none min-h-[44px]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('gm_remember_me', e.target.checked ? 'true' : 'false');
                    }
                  }}
                  className="w-5 h-5 rounded-lg border-2 border-slate-200 text-[#0F172A] focus:ring-[#0F172A] transition-all cursor-pointer accent-[#0F172A]"
                />
                <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors uppercase tracking-widest">
                  Ingat Sesi Saya
                </span>
              </label>
            </div>
            <button
               onClick={() => setIsParentMode(true)}
               className="
                 w-full py-4 sm:py-5
                 bg-white text-slate-500 border-2 border-slate-200
                 rounded-full
                 font-black uppercase tracking-[0.15em] text-[0.7rem]
                 hover:bg-slate-50 hover:text-slate-700
                 hover:border-slate-300
                 active:scale-[0.98]
                 transition-all duration-300 ease-out
                 flex items-center justify-center gap-3
               "
            >
              Masuk Sebagai Orang Tua
            </button>
            </>
            ) : (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cari Nama Siswa</label>
              <div className="relative group z-50">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0F172A] transition-colors">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    isStudentSelectedRef.current = false;
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  placeholder="Ketik nama anak..."
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-[#0F172A] placeholder:text-slate-300 focus:outline-none focus:border-[#0F172A] focus:ring-4 focus:ring-slate-100 transition-all"
                />

                {showDropdown && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2">
                    {isLoadingSearch ? (
                      <div className="p-6 text-center">
                        <Loader2 size={20} className="animate-spin mx-auto text-slate-300" />
                      </div>
                    ) : students.length > 0 ? (
                      <ul className="max-h-[250px] overflow-y-auto">
                        {students.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSelectStudent(s)}
                            className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group/btn"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[#0F172A] group-hover/btn:translate-x-1 transition-transform">{s.student_name}</span>
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{s.class_name}</span>
                            </div>
                            <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs font-medium">
                        Nama tidak ditemukan.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                 onClick={() => setIsParentMode(false)}
                 className="w-full py-3 text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
              >
                Kembali
              </button>
            </div>
            )}
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
