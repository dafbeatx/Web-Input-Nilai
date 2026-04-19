import React, { useState } from 'react';
import { Lock, ArrowLeft, Loader2, User, Key } from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';
import { supabase } from '@/lib/supabase/client';

interface LoginLayerProps {
  onBack: () => void;
  onSuccess: (username: string) => void;
  setToast: (t: ToastType) => void;
}

export default function LoginLayer({ onBack, onSuccess, setToast }: LoginLayerProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

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

      if (error) {
        throw new Error(error.message);
      }
      
      // The page will redirect to Google
    } catch (err: any) {
      setError(err.message || 'Gagal login via Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface premium-shadow backdrop-blur-xl rounded-[2rem] border border-outline-variant premium-shadow p-8 md:p-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <button 
          onClick={onBack}
          className="mb-8 p-3 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-2xl transition-all inline-flex items-center gap-2 font-bold text-sm border border-transparent hover:border-primary/20"
        >
          <ArrowLeft size={18} /> Kembali
        </button>

        <div className="mb-10">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <Lock size={32} />
          </div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight leading-tight">Secure Login</h2>
          <p className="text-on-surface-variant font-bold mt-2 text-sm leading-relaxed">Pilih metode masuk untuk mengakses panel maupun sesi profil spesifik Anda.</p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold leading-relaxed flex gap-3 animate-in fade-in zoom-in duration-300">
              <div className="mt-0.5"><Lock size={14} /></div>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-4 bg-white text-slate-800 border border-slate-200 rounded-2xl font-bold text-sm shadow-sm hover:shadow-md hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Lanjutkan dengan Google
          </button>
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          GradeMaster OS Secure Auth
        </p>
      </div>
    </div>
  );
}
