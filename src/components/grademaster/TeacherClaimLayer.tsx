import React, { useState } from 'react';
import { 
  User, 
  BookOpen, 
  ArrowRight, 
  LogOut, 
  Loader2, 
  ShieldCheck 
} from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';
import { supabase } from '@/lib/supabase/client';
import NeonGraduationCap from '@/components/grademaster/ui/NeonGraduationCap';

interface TeacherClaimLayerProps {
  googleUser: {
    name: string;
    email: string;
    photo_url?: string;
  };
  onSuccess: (displayName: string, subject: string) => void;
  onLogout: () => void;
  setToast: (t: ToastType) => void;
}

export default function TeacherClaimLayer({ 
  googleUser, 
  onSuccess, 
  onLogout, 
  setToast 
}: TeacherClaimLayerProps) {
  const [displayName, setDisplayName] = useState(googleUser.name);
  const [subject, setSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetup = async () => {
    if (!displayName.trim() || !subject.trim()) {
      setToast({ message: 'Nama dan Mata Pelajaran wajib diisi', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update profile in database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi tidak ditemukan');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          subject: subject.trim()
        })
        .eq('id', user.id);

      if (error) throw error;

      setToast({ message: 'Profil Guru berhasil dikonfigurasi!', type: 'success' });
      onSuccess(displayName.trim(), subject.trim());
    } catch (err: any) {
      setToast({ message: err.message || 'Gagal menyimpan profil', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-inter animate-in fade-in duration-500">
      <header className="w-full h-16 md:h-20 border-b border-slate-100 flex items-center justify-between px-6 md:px-12 sticky top-0 bg-white z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0F172A] text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
            <NeonGraduationCap size={24} />
          </div>
          <h1 className="text-sm font-black text-[#0F172A] tracking-tighter uppercase font-outfit">GradeMaster OS</h1>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all text-xs font-bold"
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto w-full">
        <div className="mb-12 flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center shadow-xl shadow-emerald-100/50 mb-6">
            <ShieldCheck size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.1] text-center mb-5">
            Selamat Datang, <br /> Rekan Pengajar
          </h2>
          <p className="text-lg text-slate-500 font-medium leading-relaxed text-center max-w-lg">
            Satu langkah lagi untuk mengaktifkan akses Admin Anda. Silakan lengkapi identitas mengajar Anda.
          </p>
        </div>

        <div className="w-full max-w-md space-y-8 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Nama Lengkap (Gelar)</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0F172A] transition-colors">
                <User size={20} />
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Pd."
                className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-3xl text-lg font-bold text-[#0F172A] placeholder:text-slate-300 focus:outline-none focus:border-[#0F172A] focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Mata Pelajaran Utama</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0F172A] transition-colors">
                <BookOpen size={20} />
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Matematika / Bahasa Inggris"
                className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-3xl text-lg font-bold text-[#0F172A] placeholder:text-slate-300 focus:outline-none focus:border-[#0F172A] focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
              />
            </div>
          </div>

          <button
            onClick={handleSetup}
            disabled={isSubmitting || !displayName || !subject}
            className="w-full py-6 bg-[#0F172A] text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group mt-4 disabled:opacity-30"
          >
            {isSubmitting ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                Aktifkan Panel Admin
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </button>
        </div>
      </main>

      <footer className="p-12 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.5em]">
        GradeMaster OS Teacher Identity v1.0
      </footer>
    </div>
  );
}
