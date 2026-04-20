import React, { useState } from 'react';
import { Loader2, LogIn, ShieldCheck, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ToastType } from '@/lib/grademaster/types';
import NeonGraduationCap from '@/components/grademaster/ui/NeonGraduationCap';

// ============================================================
// StudentLoginLayer — Student Portal Login Page
// GradeMaster OS · Apple + Linear Design Language
// ============================================================

interface StudentLoginLayerProps {
  /** Callback saat login berhasil (redirect setelah identifikasi siswa) */
  onSuccess: (studentData: any) => void;
  /** Callback untuk toast notifikasi */
  setToast: (t: ToastType) => void;
  /** Callback navigasi ke panel admin */
  onSwitchToAdmin: () => void;
  /** Callback untuk logout */
  onLogout?: () => void;
  /** Status login siswa — mengontrol tampilan tombol "Keluar" */
  isLoggedIn?: boolean;
}

export default function StudentLoginLayer({
  onSuccess,
  setToast,
  onSwitchToAdmin,
  onLogout,
  isLoggedIn = false,
}: StudentLoginLayerProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Google OAuth Handler ──────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw new Error(error.message);
      // Browser akan redirect ke Google
    } catch (err: any) {
      setError(err.message || 'Gagal masuk melalui akun Google. Silakan coba lagi.');
      setIsGoogleLoading(false);
    }
  };

  // ── Logout Handler ────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout?.();
      setToast({ message: 'Berhasil keluar dari akun.', type: 'success' });
    } catch {
      setToast({ message: 'Gagal keluar. Silakan muat ulang halaman.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-inter animate-in fade-in duration-500 selection:bg-emerald-100 selection:text-emerald-900">

      {/* ── TOP BAR ──────────────────────────────────────────── */}
      <header className="w-full px-5 sm:px-8 py-5 flex items-center justify-between shrink-0">
        {/* Logo — Ubah teks di sini jika branding berubah */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-md shadow-slate-200">
            <NeonGraduationCap size={16} />
          </div>
          <span className="text-sm font-black text-[#0F172A] tracking-tight uppercase">
            GradeMaster<span className="text-slate-300 ml-1">OS</span>
          </span>
        </div>

        {/* Tombol Keluar — hanya muncul jika isLoggedIn === true */}
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="
              flex items-center gap-2 px-5 py-2.5
              text-xs font-bold uppercase tracking-wider
              text-rose-500 bg-rose-50 border border-rose-100
              rounded-full
              hover:bg-rose-500 hover:text-white hover:border-rose-500
              active:scale-[0.97]
              transition-all duration-200
            "
          >
            <LogOut size={14} strokeWidth={2.5} />
            Keluar
          </button>
        )}
      </header>

      {/* ── MAIN CONTENT — centered vertically & horizontally ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm flex flex-col items-center">

          {/* ── Logo Ikon Besar ─────────────────────────────── */}
          <div className="mb-10 relative group">
            {/* Icon utama — graduation cap */}
            <div
              className="
                w-[6.5rem] h-[6.5rem]
                bg-[#0F172A] text-white
                rounded-[2rem]
                flex items-center justify-center
                shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)]
                transform -rotate-3 group-hover:rotate-0
                transition-transform duration-700 ease-out
              "
            >
              <NeonGraduationCap size={52} />
            </div>
            {/* Shield badge — keamanan data siswa */}
            <div
              className="
                absolute -bottom-2.5 -right-2.5
                w-10 h-10
                bg-[#10B981] text-white
                rounded-2xl
                flex items-center justify-center
                shadow-lg shadow-emerald-200
                border-[3px] border-white
                group-hover:scale-110
                transition-transform duration-500
              "
            >
              <ShieldCheck size={18} strokeWidth={2.5} />
            </div>
          </div>

          {/* ── Judul & Deskripsi ───────────────────────────── */}
          <div className="text-center mb-10">
            {/* Ubah teks judul di sini */}
            <h1
              className="
                text-[2.25rem] sm:text-5xl
                font-black text-[#0F172A]
                tracking-[-0.04em] leading-[1.05]
                mb-4
                uppercase
              "
              style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
            >
              Student<br />Portal
            </h1>
            {/* Ubah teks subtitle di sini */}
            <p className="text-slate-400 font-medium leading-relaxed max-w-[300px] mx-auto text-[0.95rem] sm:text-base">
              Masuk untuk mengakses laporan hasil belajar dan kedisiplinan Anda.
            </p>
          </div>

          {/* ── Error Alert ─────────────────────────────────── */}
          {error && (
            <div
              className="
                w-full mb-6 px-5 py-4
                bg-rose-50 border border-rose-100
                text-rose-600 rounded-2xl
                text-xs font-bold leading-relaxed
                flex items-start gap-3
                animate-in fade-in slide-in-from-bottom-2 duration-300
              "
              role="alert"
            >
              <LogIn size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Tombol Login Google ──────────────────────────── */}
          {/* Hanya tampil jika belum login */}
          {!isLoggedIn && (
            <div className="w-full">
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="
                  w-full py-[1.1rem] sm:py-5
                  bg-white
                  border-2 border-[#0F172A]
                  text-[#0F172A]
                  rounded-full
                  font-black uppercase tracking-[0.15em]
                  text-xs sm:text-[0.8rem]
                  shadow-sm
                  hover:bg-[#0F172A] hover:text-white
                  hover:shadow-[0_12px_40px_-10px_rgba(15,23,42,0.35)]
                  active:scale-[0.98]
                  transition-all duration-300 ease-out
                  flex items-center justify-center gap-3.5
                  group
                  disabled:opacity-40 disabled:pointer-events-none
                "
              >
                {isGoogleLoading ? (
                  <Loader2 size={22} className="animate-spin text-slate-400" />
                ) : (
                  <>
                    {/* Google "G" Logo SVG */}
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 group-hover:scale-110 transition-transform duration-300"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Lanjutkan dengan Google
                  </>
                )}
              </button>

              {/* Security notice — mempertegas kesan "wajib login" */}
              <p className="text-center text-[0.65rem] text-slate-300 font-semibold mt-5 leading-relaxed px-4">
                Data siswa dilindungi enkripsi. Hanya akun Google terdaftar yang dapat mengakses portal ini.
              </p>
            </div>
          )}

          {/* ── Sudah Login — Pesan Konfirmasi ────────────── */}
          {isLoggedIn && (
            <div className="w-full text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-emerald-50 border border-emerald-100 rounded-full mb-4">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Anda sudah masuk
                </span>
              </div>
              <p className="text-slate-400 text-sm font-medium">
                Gunakan tombol <span className="font-bold text-rose-400">"Keluar"</span> di pojok kanan atas untuk berpindah akun.
              </p>
            </div>
          )}

          {/* ── Divider + Akses Admin ───────────────────────── */}
          <div className="mt-14 pt-8 border-t border-slate-100 w-full text-center">
            <button
              onClick={onSwitchToAdmin}
              className="
                text-[0.6rem] font-black text-slate-300
                uppercase tracking-[0.3em]
                hover:text-[#0F172A]
                transition-colors duration-300
              "
            >
              Akses Administrator
            </button>
          </div>
        </div>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="pb-8 text-center text-[0.6rem] font-black text-slate-200 uppercase tracking-[0.5em] select-none">
        GradeMaster OS — Identifikasi Siswa
      </footer>
    </div>
  );
}
