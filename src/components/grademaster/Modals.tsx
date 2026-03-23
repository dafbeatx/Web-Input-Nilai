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
} from 'lucide-react';
import { ModalType } from '@/lib/grademaster/types';

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
  onDelete: () => void;
  onClose: () => void;
}

export default function Modals(props: ModalsProps) {
  const {
    modal, sessionName, setSessionName,
    sessionPassword, setSessionPassword,
    modalLoading, modalError,
    onSave, onLoad, onDelete, onClose,
  } = props;

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
        </div>
      </div>
    </div>
  );
}
