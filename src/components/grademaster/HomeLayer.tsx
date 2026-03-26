"use client";

import React from 'react';
import {
  GraduationCap,
  BookOpen,
  User,
  Plus,
  Trash2,
  Loader2,
  HelpCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { SessionMeta, ModalType } from '@/lib/grademaster/types';

interface HomeLayerProps {
  sessions: SessionMeta[];
  isLoading: boolean;
  onCreateNew: () => void;
  onSessionClick: (name: string) => void;
  onDeleteSession: (name: string) => void;
  onOpenAbout: () => void;
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
}

export default function HomeLayer({
  sessions,
  isLoading,
  onCreateNew,
  onSessionClick,
  onDeleteSession,
  onOpenAbout,
  isAdmin,
  onLoginClick,
  onLogout,
}: HomeLayerProps) {
  return (
    <div className="min-h-screen p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto animate-in">
      <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3 text-indigo-600 mb-1 md:mb-2">
            <GraduationCap size={24} className="md:w-8 md:h-8" />
            <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em]">GradeMaster OS</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Kumpulan Kelas
            <button
              onClick={onOpenAbout}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors shadow-inner"
              title="Tentang GradeMaster"
            >
              <HelpCircle size={16} className="md:w-5 md:h-5" />
            </button>
            {isAdmin && (
              <span className="ml-3 px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-sm border border-emerald-200 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 size={12} /> Admin
              </span>
            )}
          </h1>
          <p className="text-sm md:text-base text-slate-500 font-bold mt-1 md:mt-2">Pilih sesi kelas Anda atau buat sesi baru untuk mulai evaluasi.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <button
              onClick={onLogout}
              className="px-4 py-3 md:px-5 md:py-4 bg-slate-100 text-slate-600 rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center gap-2"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={onLoginClick}
              className="px-4 py-3 md:px-5 md:py-4 bg-slate-100 text-slate-600 rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
            >
              Login Admin
            </button>
          )}
          <button
            onClick={onCreateNew}
            className="px-4 py-3 md:px-6 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} className="md:w-[18px] md:h-[18px]" /> Buat Sesi Baru
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center py-12 md:py-20">
          <Loader2 size={32} className="animate-spin text-indigo-500 md:w-10 md:h-10" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-10 md:py-16 bg-white rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 w-full max-w-4xl mx-auto px-4 md:px-8">
          <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 md:mb-6">
            <GraduationCap size={28} className="md:w-8 md:h-8" />
          </div>
          <h3 className="text-xl md:text-3xl font-black text-slate-800 mb-2 md:mb-3 font-outfit">Selamat Datang di GradeMaster OS</h3>
          <p className="text-xs md:text-sm text-slate-500 font-bold mb-6 md:mb-10 max-w-2xl mx-auto leading-relaxed">
            Platform koreksi lembar jawaban dan analitik performa cerdas untuk pendidik modern.
            Tinggalkan cara manual, kini Anda dapat mengelola puluhan kelas hanya dengan beberapa klik.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 text-left">
            <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <FileText size={20} className="text-sky-500 mb-3 md:w-6 md:h-6" />
              <h4 className="text-sm font-black text-slate-700 mb-1.5">Ekstraksi Pintar</h4>
              <p className="text-[10px] md:text-xs text-slate-500 font-bold leading-relaxed">Upload file absen format PDF, Word, atau Excel. GradeMaster akan membersihkan dan menyusunnya otomatis.</p>
            </div>
            <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <CheckCircle2 size={20} className="text-emerald-500 mb-3 md:w-6 md:h-6" />
              <h4 className="text-sm font-black text-slate-700 mb-1.5">Koreksi Kilat</h4>
              <p className="text-[10px] md:text-xs text-slate-500 font-bold leading-relaxed">Ketik kunci jawaban secara acak atau tempel dari sumber mana saja, sistem akan memahaminya dalam sedetik.</p>
            </div>
            <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <GraduationCap size={20} className="text-indigo-500 mb-3 md:w-6 md:h-6" />
              <h4 className="text-sm font-black text-slate-700 mb-1.5">Analitik Performa</h4>
              <p className="text-[10px] md:text-xs text-slate-500 font-bold leading-relaxed">Dapatkan CSI, distribusi nilai, tingkat kesulitan soal, dan insight otomatis dari hasil setiap siswa.</p>
            </div>
          </div>

          <button
            onClick={onCreateNew}
            className="px-6 py-3.5 md:px-8 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-600/20 inline-flex items-center gap-2"
          >
            <Plus size={16} /> Buat Sesi Kelas Perdana
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => onSessionClick(s.session_name)}
              className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <BookOpen size={20} className="md:w-6 md:h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSession(s.session_name); }}
                      className="p-1 md:p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Sesi"
                    >
                      <Trash2 size={14} className="md:w-4 md:h-4" />
                    </button>
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full">
                      {s.school_level || 'N/A'}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg md:text-xl font-black text-slate-800 mb-0.5 md:mb-1 truncate">{s.session_name}</h3>
                <p className="text-xs md:text-sm font-bold text-slate-500 truncate">{s.subject || 'Mapel tidak diketahui'}</p>
              </div>
              <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-slate-400">
                  <User size={12} className="md:w-[14px] md:h-[14px]" />
                  <span className="truncate max-w-[100px] md:max-w-[120px]">{s.teacher || 'Guru'}</span>
                </div>
                <div className="text-[10px] md:text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-indigo-100">
                  {s.student_count !== undefined ? `${s.student_count} siswa` : `Kls ${s.class_name || '-'}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
