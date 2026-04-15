import React, { useState } from 'react';
import { User, ArrowLeft, Loader2, Key, GraduationCap } from 'lucide-react';
import NeonGraduationCap from '@/components/grademaster/ui/NeonGraduationCap';
import { ToastType } from '@/lib/grademaster/types';

interface StudentLoginLayerProps {
  onBack: () => void;
  onSuccess: (studentData: any) => void;
  setToast: (t: ToastType) => void;
  onSwitchToAdmin: () => void;
}

export default function StudentLoginLayer({ onBack, onSuccess, setToast, onSwitchToAdmin }: StudentLoginLayerProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan password wajib diisi');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      setToast({ message: 'Login Siswa Berhasil', type: 'success' });
      onSuccess(data.student);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface premium-shadow backdrop-blur-xl rounded-[2.5rem] border border-outline-variant premium-shadow p-8 md:p-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <button 
          onClick={onBack}
          className="mb-8 p-3 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-2xl transition-all inline-flex items-center gap-2 font-bold text-sm border border-transparent hover:border-primary/20"
        >
          <ArrowLeft size={18} /> Beranda
        </button>

        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 mx-auto border border-emerald-500/20">
            <NeonGraduationCap size={40} />
          </div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight leading-tight uppercase font-outfit">Student Login</h2>
          <p className="text-on-surface-variant font-bold mt-2 text-sm leading-relaxed px-4">Masuk untuk melihat nilai ujian dan riwayat kehadiran Anda.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold leading-relaxed flex gap-3 animate-in fade-in zoom-in duration-300">
              <div className="mt-0.5"><Key size={14} /></div>
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Username Siswa</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-emerald-400 transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="contoh: budi.x1"
                className="w-full pl-12 pr-6 py-4 bg-surface-variant border border-outline-variant rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all placeholder:text-on-surface-variant"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-emerald-400 transition-colors">
                <Key size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password Anda"
                className="w-full pl-12 pr-6 py-4 bg-surface-variant border border-outline-variant rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all placeholder:text-on-surface-variant"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Sedang Masuk...
              </>
            ) : (
              'Masuk Ke Dashboard'
            )}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-outline-variant text-center">
          <button 
            onClick={onSwitchToAdmin}
            className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] hover:text-primary transition-colors py-2 px-4 rounded-xl hover:bg-surface-variant border border-transparent hover:border-outline-variant"
          >
            Bukan Siswa? Login Admin Di Sini
          </button>
        </div>
      </div>
    </div>
  );
}
