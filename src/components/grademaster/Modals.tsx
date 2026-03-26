"use client";

import React from 'react';
import {
  X,
  Save,
  Trash2,
  FolderOpen,
  GraduationCap,
  Loader2,
  AlertCircle,
  FileText,
  Settings,
  User,
  Key,
} from 'lucide-react';
import { ModalType, ToastType } from '@/lib/grademaster/types';

interface ModalsProps {
  modal: ModalType;
  sessionName: string;
  setSessionName: (v: string) => void;
  sessionPassword: string;
  setSessionPassword: (v: string) => void;
  modalLoading: boolean;
  modalError: string;
  onSave: () => void;
  onLoad: () => void;
  onLoadPublic?: () => void;
  onDelete: () => void;
  onClose: () => void;
  onUpdateAdmin?: (username: string, pass: string) => Promise<void>;
}

export default function Modals(props: ModalsProps) {
  const {
    modal, sessionName, setSessionName,
    sessionPassword, setSessionPassword,
    modalLoading, modalError,
    onSave, onLoad, onLoadPublic, onDelete, onClose, onUpdateAdmin
  } = props;

  const [newUsername, setNewUsername] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [isUpdatingAdmin, setIsUpdatingAdmin] = React.useState(false);
  const [adminError, setAdminError] = React.useState('');

  // Reset local state when modal opens
  React.useEffect(() => {
    if (modal === 'adminSettings') {
      setNewUsername('');
      setNewPassword('');
      setAdminError('');
    }
  }, [modal]);

  if (!modal) return null;

  if (modal === 'about') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8 animate-in overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 pointer-events-none"></div>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors z-10">
            <X size={16} />
          </button>

          <div className="relative z-10 flex flex-col items-center text-center mt-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white shadow-xl rounded-2xl flex items-center justify-center text-indigo-600 mb-4 ring-4 ring-white/50">
              <GraduationCap size={36} className="md:w-10 md:h-10" />
            </div>
            <h3 className="font-outfit font-black text-xl md:text-3xl text-slate-800 tracking-tight">GradeMaster OS</h3>
            <p className="text-xs md:text-sm font-bold text-slate-500 mt-2 leading-relaxed">Sistem Koreksi & Analitik Performa modern. Menggunakan Cognitive Skill Index (CSI) dan Learning Performance Score (LPS) untuk evaluasi akademik yang valid.</p>
          </div>

          <div className="relative z-10 mt-8 space-y-4 text-left">
            <div className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 items-start">
              <div className="w-8 h-8 shrink-0 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center"><FileText size={16} /></div>
              <div>
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-700 mb-1">Parser Deterministik</h5>
                <p className="text-[10px] md:text-xs font-bold text-slate-500">Regex parser — dukungan format kunci jawaban bebas, tanpa ketergantungan ke AI.</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 items-start">
              <div className="w-8 h-8 shrink-0 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><GraduationCap size={16} /></div>
              <div>
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-700 mb-1">Metrik Akademik Valid</h5>
                <p className="text-[10px] md:text-xs font-bold text-slate-500">CSI & LPS menggantikan estimasi IQ pseudo-science. Semua skor berasal dari data nyata, bukan simulasi.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <button onClick={onClose} className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all">
              Tutup Informasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modal === 'error') {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 md:p-8 animate-in text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="font-outfit font-black text-xl text-slate-800 tracking-tight">Gagal Menyimpan</h3>
          <p className="text-xs md:text-sm font-bold text-slate-500 mt-2 mb-6 leading-relaxed">
            {modalError || 'Terjadi kesalahan sistem yang tidak diketahui.'}
          </p>
          <button onClick={onClose} className="w-full py-3.5 bg-rose-500 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all">
            Mengerti & Tutup
          </button>
        </div>
      </div>
    );
  }

  if (modal === 'adminSettings') {
    const handleAdminSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onUpdateAdmin) return;
      if (!newUsername || newUsername.length < 3) return setAdminError('Username minimal 3 karakter.');
      if (!newPassword || newPassword.length < 6) return setAdminError('Password minimal 6 karakter.');
      
      setIsUpdatingAdmin(true);
      setAdminError('');
      try {
        await onUpdateAdmin(newUsername, newPassword);
        onClose();
      } catch (err: any) {
        setAdminError(err.message || 'Gagal mengubah profil admin.');
      } finally {
        setIsUpdatingAdmin(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 animate-in zoom-in duration-300">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors">
            <X size={16} />
          </button>

          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3">
              <Settings size={28} />
            </div>
            <h3 className="font-black text-xl text-slate-800">Ubah Profil Admin</h3>
            <p className="text-xs font-bold text-slate-500 mt-1 text-center">Ubah username dan password untuk keamanan sistem.</p>
          </div>

          <form onSubmit={handleAdminSave} className="space-y-4">
            {adminError && (
              <div className="flex gap-2 p-3 bg-rose-50 rounded-xl text-rose-600 text-xs font-bold animate-in fade-in">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>{adminError}</p>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username Baru</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"><User size={16} /></div>
                <input
                  type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="admin123"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                  disabled={isUpdatingAdmin}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password Baru</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"><Key size={16} /></div>
                <input
                  type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                  disabled={isUpdatingAdmin}
                />
              </div>
            </div>
            <button
              type="submit" disabled={isUpdatingAdmin}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all mt-6 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUpdatingAdmin ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan Profil'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleAction = modal === 'save' ? onSave : modal === 'delete' ? onDelete : onLoad;
  const colors = {
    save: { bg: 'bg-indigo-600', shadow: 'shadow-indigo-600/20' },
    load: { bg: 'bg-sky-600', shadow: 'shadow-sky-600/20' },
    delete: { bg: 'bg-rose-600', shadow: 'shadow-rose-600/20' },
  };
  const c = colors[modal as 'save' | 'load' | 'delete'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-2xl md:rounded-3xl shadow-2xl p-5 md:p-8 animate-in">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 mb-4 md:mb-6">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white ${c.bg}`}>
            {modal === 'save' ? <Save size={16} /> : modal === 'delete' ? <Trash2 size={16} /> : <FolderOpen size={16} />}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base md:text-lg">
              {modal === 'save' ? 'Simpan Sesi' : modal === 'delete' ? 'Hapus Sesi' : 'Muat Sesi'}
            </h3>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {modal === 'save' ? 'Simpan data koreksi' : modal === 'delete' ? 'Hapus sesi permanen' : 'Muat data koreksi'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Sesi</label>
            <input
              type="text" value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Contoh: UTS Kelas 10A"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg p-2.5 text-xs md:text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-60"
              autoFocus
              disabled={modal === 'delete'}
            />
          </div>
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Password</label>
            <input
              type="password" value={sessionPassword}
              onChange={(e) => setSessionPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg p-2.5 text-xs md:text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
              onKeyDown={(e) => e.key === 'Enter' && handleAction()}
            />
          </div>

          {modalError && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-100 rounded-lg">
              <AlertCircle size={14} className="text-rose-500 shrink-0" />
              <p className="text-[10px] md:text-xs font-bold text-rose-600">{modalError}</p>
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={modalLoading}
            className={`w-full py-3 rounded-lg text-white text-xs md:text-sm font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${c.bg} ${c.shadow} hover:scale-[1.02] active:scale-95`}
          >
            {modalLoading ? <><Loader2 size={14} className="animate-spin" /> Memproses...</> :
              modal === 'save' ? <><Save size={14} /> Simpan</> :
              modal === 'delete' ? <><Trash2 size={14} /> Hapus</> :
              <><FolderOpen size={14} /> Muat</>
            }
          </button>

          {modal === 'load' && onLoadPublic && (
            <button
              onClick={onLoadPublic}
              disabled={modalLoading}
              className="w-full py-3 rounded-lg text-indigo-600 bg-indigo-50 border border-indigo-100 text-xs md:text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-indigo-100 hover:scale-[1.02] active:scale-95 mt-2"
            >
              <FolderOpen size={14} /> Lihat Publik (Tanpa Password)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
