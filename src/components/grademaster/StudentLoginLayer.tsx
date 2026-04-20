import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  LogIn, 
  ShieldCheck, 
  LayoutDashboard,
  GraduationCap
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ToastType } from '@/lib/grademaster/types';
import NeonGraduationCap from '@/components/grademaster/ui/NeonGraduationCap';

interface StudentLoginLayerProps {
  onBack: () => void;
  onSuccess: (studentData: any) => void;
  setToast: (t: ToastType) => void;
  onSwitchToAdmin: () => void;
}

export default function StudentLoginLayer({ onBack, onSuccess, setToast, onSwitchToAdmin }: StudentLoginLayerProps) {
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

      if (error) throw new Error(error.message);
      // Success will redirect to Google
    } catch (err: any) {
      setError(err.message || 'Gagal login via Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-inter animate-in fade-in duration-500">
      {/* Top Bar for Navigation */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="p-3 text-slate-400 hover:text-slate-900 transition-all flex items-center gap-2 font-bold text-sm"
        >
          <ArrowLeft size={20} />
          <span>Beranda</span>
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo / Icon */}
        <div className="mb-12 relative">
          <div className="w-24 h-24 bg-[#0F172A] text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-300 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <NeonGraduationCap size={48} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#7C3AED] text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Text Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-[#0F172A] tracking-tighter leading-none mb-4 font-outfit uppercase">
            Student <br /> Portal
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed max-w-[280px] mx-auto text-base">
            Masuk untuk mengakses laporan hasil belajar dan kedisiplinan Anda.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold leading-relaxed flex items-center gap-3 animate-in shake duration-500">
            <LogIn size={16} />
            {error}
          </div>
        )}

        {/* Primary Action Button */}
        <div className="w-full space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-6 bg-white border-2 border-slate-100 text-[#0F172A] rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-sm hover:shadow-xl hover:border-[#0F172A] transition-all flex items-center justify-center gap-4 group disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 size={24} className="animate-spin text-slate-400" />
            ) : (
              <>
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Lanjutkan dengan Google
              </>
            )}
          </button>
        </div>

        {/* Secondary Info */}
        <div className="mt-12 pt-8 border-t border-slate-50 w-full text-center">
          <button 
            onClick={onSwitchToAdmin}
            className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-[#0F172A] transition-colors"
          >
            Akses Administrator
          </button>
        </div>
      </div>

      {/* Footer Design Element */}
      <footer className="absolute bottom-8 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.5em]">
        GradeMaster OS Platform Identification
      </footer>
    </div>
  );
}
