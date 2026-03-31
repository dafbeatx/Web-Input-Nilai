import React, { useState } from 'react';
import { Lock, ArrowLeft, Loader2, User, Key } from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';

interface LoginLayerProps {
  onBack: () => void;
  onSuccess: (username: string) => void;
  setToast: (t: ToastType) => void;
}

export default function LoginLayer({ onBack, onSuccess, setToast }: LoginLayerProps) {
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
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      setToast({ message: 'Login Admin Berhasil', type: 'success' });
      onSuccess(data.username);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl p-8 md:p-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <button 
          onClick={onBack}
          className="mb-8 p-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all inline-flex items-center gap-2 font-bold text-sm border border-transparent hover:border-primary/20"
        >
          <ArrowLeft size={18} /> Kembali
        </button>

        <div className="mb-10">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <Lock size={32} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight leading-tight">Admin Login</h2>
          <p className="text-slate-400 font-bold mt-2 text-sm leading-relaxed">Masuk untuk membuat sesi kelas baru dan mengelola data GradeMaster.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold leading-relaxed flex gap-3 animate-in fade-in zoom-in duration-300">
              <div className="mt-0.5"><Lock size={14} /></div>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username admin"
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-600"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <Key size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password admin"
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-600"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.15em] text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Sedang Masuk...
              </>
            ) : (
              'Masuk Sistem'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          GradeMaster OS Secure Backend Authentication
        </p>
      </div>
    </div>
  );
}
