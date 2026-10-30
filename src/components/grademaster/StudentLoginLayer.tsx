import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Search, Loader2, CheckCircle2, KeyRound, User, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { supabase } from '@/lib/supabase/client';
import { ToastType, StudentAccount } from '@/lib/grademaster/types';
import { Session } from '@supabase/supabase-js';
import StudentAccountGenerateModal from './StudentAccountGenerateModal';

interface StudentLoginLayerProps {
  onSuccess: (studentData: StudentAccount | null) => void;
  setToast: (t: ToastType) => void;
  onLogout?: () => void;
  isLoggedIn?: boolean;
}

function setParentStudentCookie(studentName: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `gm_parent_student=${encodeURIComponent(studentName)}; path=/; max-age=604800; SameSite=Strict`;
  }
}

/**
 * Nawasena - Student Portal Login Page
 * Redesigned with premium Apple + Linear aesthetics, pure white theme, 
 * and persistent session detection logic.
 */
export default function StudentLoginLayer({
  onSuccess,
  setToast,
  isLoggedIn = false,
  onLogout,
}: StudentLoginLayerProps) {
  // Loading States
  const [isPageEntering, setIsPageEntering] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [userName, setUserName] = useState('');
  
  // State modal generate akun siswa
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Deteksi sesi login aktif di browser
  const [hasActiveSession, setHasActiveSession] = useState(() => {
    if (typeof window !== 'undefined') {
      const isSavedStudent = localStorage.getItem('gm_isStudent') === 'true';
      const savedToken = !!localStorage.getItem('gm_student_token');
      const savedData = !!localStorage.getItem('gm_studentData');
      return isSavedStudent || savedToken || savedData;
    }
    return false;
  });

  // Jika sudah ada sesi login aktif, jangan tampilkan bagian generate akun
  const isSessionActive = Boolean(isLoggedIn || hasActiveSession);
  
  const [error, setError] = useState('');

  // Opsi Login Siswa
  const [adminUsername, setAdminUsername] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gm_saved_username') || '';
    }
    return '';
  });
  const [savedStudentName, setSavedStudentName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gm_saved_student_name') || '';
    }
    return '';
  });
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);

  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gm_remember_me') !== 'false';
    }
    return true;
  });

  const isAnyLoginActive = isAdminLoggingIn || isLoginInProgress || isRedirecting;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('gm_remember_me') === null) {
        localStorage.setItem('gm_remember_me', 'true');
      }
    }
  }, []);

  const { setLayer, setIsStudent, setIsParent, setStudentData, setStudentClass, academicYear } = useGradeMaster();
  const [isParentMode, setIsParentMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  interface SearchStudentResult {
    id: string;
    student_name: string;
    class_name: string;
    academic_year?: string;
    total_points: number;
  }
  const [students, setStudents] = useState<SearchStudentResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const isStudentSelectedRef = React.useRef(false);
  const redirectTimerRef = React.useRef<NodeJS.Timeout | null>(null);

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
          .select('id, student_name, class_name, total_points, academic_year')
          .ilike('student_name', `%${debouncedQuery}%`)
          .order('academic_year', { ascending: false })
          .limit(30);

        // Deduplikasi: Jika siswa memiliki riwayat di beberapa kelas/tahun ajaran,
        // prioritaskan kelas pada tahun ajaran paling baru (teratas).
        const seen = new Map<string, SearchStudentResult>();
        for (const item of (data || [])) {
          const normName = item.student_name.trim().toLowerCase();
          if (!seen.has(normName)) {
            seen.set(normName, item);
          }
        }
        setStudents(Array.from(seen.values()).slice(0, 10));
      } catch {
      } finally {
        setIsLoadingSearch(false);
      }
    };
    if (isParentMode) fetchStudents();
  }, [debouncedQuery, isParentMode]);

  const handleSelectStudent = (s: SearchStudentResult) => {
    isStudentSelectedRef.current = true;
    setIsParentMode(false);
    setIsParent(true);
    
    // Set cookie untuk autentikasi Orang Tua di API server-side
    setParentStudentCookie(s.student_name);

    if (s.class_name) {
      setStudentClass(s.class_name);
    }

    const targetAcademicYear = s.academic_year || academicYear || '2026/2027';

    setStudentData({ 
      id: s.id, 
      name: s.student_name, 
      class_name: s.class_name, 
      total_points: s.total_points,
      academic_year: targetAcademicYear,
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
        academicYear: targetAcademicYear
      })
    }).catch(err => console.error('Gagal mengirim notifikasi login orang tua ke Telegram:', err));

    setToast({ message: `Masuk sebagai Orang Tua dari ${s.student_name}`, type: 'success' });
    setLayer('student_profile', true);
  };


  const handleSessionActive = useCallback((session?: Session | null) => {
    setIsRedirecting(true);
    setIsCheckingSession(false);
    
    if (session && session.user && session.user.user_metadata) {
      setUserName(session.user.user_metadata.full_name || session.user.email || '');
    }

    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }

    redirectTimerRef.current = setTimeout(() => {
      onSuccess(null); // Trigger parent layer switch
    }, 800);
  }, [onSuccess]);

  // ── Session & Auth Listeners ────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      // 1. Initial Page Entry Animation delay
      setTimeout(() => {
        if (isMounted) setIsPageEntering(false);
      }, 300);

      // 2. Check if student is already cached in localStorage
      if (typeof window !== 'undefined') {
        const isSavedStudent = localStorage.getItem('gm_isStudent') === 'true';
        const savedData = localStorage.getItem('gm_studentData');
        if (isSavedStudent && savedData) {
          try {
            const parsed = JSON.parse(savedData);
            setUserName(parsed.name || parsed.username || 'Siswa');
            setHasActiveSession(true);
            handleSessionActive(null);
            return;
          } catch {}
        }
      }

      // 3. Check for existing Supabase auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasActiveSession(true);
        handleSessionActive(session);
        return;
      }

      // 4. Check backend student session (cookie or explicit token)
      try {
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem('gm_student_token') : null;
        const checkUrl = savedToken ? `/api/student/check?token=${encodeURIComponent(savedToken)}` : '/api/student/check';
        const res = await fetch(checkUrl, {
          headers: savedToken ? { 'Authorization': `Bearer ${savedToken}` } : {},
          cache: 'no-store'
        });
        if (res.ok) {
          const checkData = await res.json();
          if (checkData.authenticated && checkData.role === 'student') {
            if (typeof window !== 'undefined') {
              localStorage.setItem('gm_isStudent', 'true');
              if (checkData.token) localStorage.setItem('gm_student_token', checkData.token);
              if (checkData.student) {
                localStorage.setItem('gm_studentData', JSON.stringify({ ...checkData.student, isGoogleLinked: true }));
                if (checkData.student.name) localStorage.setItem('gm_saved_student_name', checkData.student.name);
                if (checkData.student.username) localStorage.setItem('gm_saved_username', checkData.student.username);
              }
            }
            setHasActiveSession(true);
            setUserName(checkData.student?.name || checkData.student?.username || 'Siswa');
            handleSessionActive(null);
            return;
          }
        }
      } catch (err) {
        console.warn('[StudentLoginLayer] Session verify skipped:', err);
      }

      if (isMounted) setIsCheckingSession(false);
    }

    // 5. Listen for Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthListener] Event: ${event}`);
      if (event === 'SIGNED_IN' && session) {
        handleSessionActive(session);
      }
    });

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [handleSessionActive]);

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
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || 'Gagal tersambung dengan Google. Silakan coba lagi.');
      setIsLoginInProgress(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim()) {
      setError('Username akun siswa wajib diisi');
      return;
    }
    if (!adminPassword.trim()) {
      setError('Kata sandi wajib diisi');
      return;
    }

    setIsAdminLoggingIn(true);
    setError('');

    try {
      const res = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk. Periksa kembali username dan kata sandi Anda.');
      }

      const resolvedName = data.student?.name || data.student?.username || adminUsername.trim();
      setUserName(resolvedName);
      setIsRedirecting(true);

      // Persist credentials & session tokens locally so student never has to retype
      if (typeof window !== 'undefined') {
        localStorage.setItem('gm_saved_username', adminUsername.trim());
        localStorage.setItem('gm_saved_student_name', resolvedName);
        localStorage.setItem('gm_isStudent', 'true');
        if (data.token) {
          localStorage.setItem('gm_student_token', data.token);
        }
        if (data.student) {
          const studentPayload = { ...data.student, isGoogleLinked: true };
          localStorage.setItem('gm_studentData', JSON.stringify(studentPayload));
          if (data.student.class_name) {
            localStorage.setItem('gm_studentClass', data.student.class_name);
          }
        }
      }

      // Update state in context directly
      setIsStudent(true);
      if (data.student) {
        setStudentData({ ...data.student, isGoogleLinked: true });
        if (data.student.class_name) {
          setStudentClass(data.student.class_name);
        }
      }

      // Kirim Notifikasi ke Telegram
      fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: resolvedName,
          className: data.student?.class_name || 'Tidak Diketahui',
          event: 'STUDENT_LOGIN',
          deviceInfo: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown Device',
          academicYear: data.student?.academic_year
        })
      }).catch(err => console.error('Gagal mengirim notifikasi login siswa ke Telegram:', err));

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }

      redirectTimerRef.current = setTimeout(() => {
        onSuccess(null);
      }, 800);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk';
      setError(errMsg);
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  // ── RENDERING: LOADING STATES ──────────────────────────────

  // Full Screen checking state
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center animate-in fade-in duration-700">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-[3px] border-slate-100 border-t-[#0F172A] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Image src="/logo.svg" alt="Nawasena Logo" width={28} height={28} className="object-contain" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-[0.3em] mb-2 font-outfit">Nawasena</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memverifikasi akun...</p>
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
              Memuat profil siswa...
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
    <div className={`min-h-screen bg-slate-50 flex flex-col items-center justify-between relative font-inter transition-all duration-700 ${isPageEntering ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'} selection:bg-slate-100`}>
      
      {/* Top Mobile Header */}
      <header className="w-full max-w-md pt-safe pb-2 flex items-center justify-between px-4 sm:px-6 relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden bg-slate-900/5 shadow-sm">
             <Image src="/logo.svg" alt="Nawasena Logo" width={24} height={24} className="object-contain" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 tracking-wider uppercase font-outfit block leading-none">Nawasena</span>
            <span className="text-[9.5px] font-semibold text-slate-500">Portal Akademik</span>
          </div>
        </div>
      </header>

      {/* Main Mobile App Card */}
      <main className="w-full max-w-md flex-1 flex flex-col items-center justify-center px-3.5 py-2 relative z-10">
        <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col items-center">
          
          {/* Mascot Header */}
          <div className="mb-4 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 select-none pointer-events-none mb-1">
              <Image
                src="/mascot_hijab_idle.png"
                alt="Maskot Portal"
                width={80}
                height={80}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>
          </div>

          {/* Segmented Role Selector */}
          <div className="w-full grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/70 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsParentMode(false);
                setError('');
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                !isParentMode 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🎓</span>
              <span>Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsParentMode(true);
                setError('');
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                isParentMode 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👨‍👩‍👧</span>
              <span>Orang Tua / Wali</span>
            </button>
          </div>

          {/* Typography */}
          <div className="text-center mb-5 space-y-1 w-full">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-outfit tracking-tight">
              {!isParentMode ? 'Portal Masuk Siswa' : 'Portal Orang Tua & Wali'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed px-1">
              {!isParentMode 
                ? 'Masukkan username dan kata sandi Anda atau masuk via Google.' 
                : 'Cari nama ananda untuk memantau capaian belajar, presensi, dan sikap.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold text-center animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* Action Area */}
          <div className="w-full space-y-4">
            {!isParentMode ? (
              <div className="w-full space-y-4">
                {/* Form Login: Akun Siswa */}
                <form onSubmit={handleAdminLogin} className="w-full space-y-3.5 text-left">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-2.5">
                    <KeyRound size={16} className="text-indigo-600 shrink-0" />
                    <span className="text-xs font-semibold text-indigo-950">
                      Opsi 1: Masuk dengan Akun Siswa
                    </span>
                  </div>

                  {savedStudentName && adminUsername && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {savedStudentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{savedStudentName}</p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">{adminUsername}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminUsername('');
                          setSavedStudentName('');
                          if (typeof window !== 'undefined') {
                            localStorage.removeItem('gm_saved_username');
                            localStorage.removeItem('gm_saved_student_name');
                            localStorage.removeItem('gm_isStudent');
                            localStorage.removeItem('gm_student_token');
                            localStorage.removeItem('gm_studentData');
                          }
                          setHasActiveSession(false);
                          if (onLogout) onLogout();
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0 min-h-[36px]"
                      >
                        Ganti Akun
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Username Siswa
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        disabled={isAnyLoginActive}
                        placeholder="contoh: ahmad.dahlan.9a"
                        autoComplete="username"
                        autoCapitalize="none"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Kata Sandi
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        disabled={isAnyLoginActive}
                        placeholder="Masukkan kata sandi..."
                        autoComplete="current-password"
                        required
                        className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isAnyLoginActive}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAnyLoginActive}
                    className="w-full mt-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm min-h-[46px] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isAdminLoggingIn ? (
                      <>
                        <Loader2 size={18} className="animate-spin text-slate-300" />
                        <span>Memverifikasi akun...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Masuk ke Portal Siswa</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider: Atau Opsi 2 (Google) */}
                <div className="relative my-3 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    atau opsi 2: akun google
                  </div>
                </div>

                {/* Tombol Opsi 2: Login Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isAnyLoginActive}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 border border-slate-200 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-xs min-h-[46px] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoginInProgress ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-slate-400" />
                      <span>Mengaitkan profil...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Lanjutkan dengan Akun Google</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      disabled={isAnyLoginActive}
                      onChange={(e) => {
                        setRememberMe(e.target.checked);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('gm_remember_me', e.target.checked ? 'true' : 'false');
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer disabled:opacity-50"
                    />
                    <span className="text-xs font-semibold text-slate-600">
                      Ingat sesi login
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Khusus Siswa Terdaftar</span>
                </div>

                {/* Bagian Daftar Akun Siswa Mandiri: Hanya ditampilkan jika belum ada sesi login aktif */}
                {!isSessionActive && (
                  <div className="pt-3 border-t border-slate-100 w-full animate-in fade-in duration-200">
                    <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-left w-full sm:w-auto">
                        <span className="text-xs font-bold text-slate-800 block">
                          Siswa Baru? Belum Punya Akun?
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block">
                          Daftar dengan memilih nama Anda di kelas dan buat kata sandi sendiri
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsGenerateModalOpen(true)}
                        disabled={isAnyLoginActive}
                        className="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 text-slate-900 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <UserPlus size={15} className="text-indigo-600" />
                        <span>Daftar Akun Siswa</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full space-y-3 animate-in fade-in duration-200 text-left">
                <label className="text-xs font-bold text-slate-700 block">
                  Cari Nama Siswa (Ananda)
                </label>
                <div className="relative z-50">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={16} />
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
                    disabled={isAnyLoginActive}
                    placeholder="Ketik nama lengkap anak..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-150 transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
                  />

                  {showDropdown && searchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-[100] animate-in fade-in-50 duration-150">
                      {isLoadingSearch ? (
                        <div className="p-4 text-center">
                          <Loader2 size={18} className="animate-spin mx-auto text-indigo-600" />
                          <p className="text-xs text-slate-500 font-medium mt-1">Mencari data siswa...</p>
                        </div>
                      ) : students.length > 0 ? (
                        <ul className="max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                          {students.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectStudent(s)}
                                className="w-full px-4 py-3 text-left hover:bg-indigo-50/60 flex items-center justify-between transition-colors min-h-[44px] group"
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-indigo-900">{s.student_name}</span>
                                  <span className="text-[11px] font-semibold text-slate-500">
                                    {s.class_name ? `Kelas ${s.class_name}` : 'Siswa'} {s.academic_year ? `• TA ${s.academic_year}` : ''}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-indigo-600 shrink-0 bg-indigo-50 group-hover:bg-indigo-100 px-2.5 py-1 rounded-lg">
                                  Pilih
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-center text-slate-500 text-xs font-medium">
                          Nama siswa tidak ditemukan. Pastikan ejaan nama sesuai data sekolah.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Pilih nama siswa untuk langsung membuka rapor perkembangan akademik dan presensi.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="py-4 flex items-center justify-center relative z-10 shrink-0">
        <p className="text-xs text-slate-500 font-medium">
          GradeMaster Academic Portal
        </p>
      </footer>

      {/* Modal Generate Akun Siswa Mandiri */}
      <StudentAccountGenerateModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onAccountCreated={({ username, password, studentName }) => {
          setAdminUsername(username);
          setAdminPassword(password);
          setSavedStudentName(studentName);
          setToast({
            message: `Pendaftaran berhasil untuk ${studentName}! Kredensial telah terisi otomatis.`,
            type: 'success'
          });
        }}
        setToast={setToast}
      />

    </div>
  );
}
