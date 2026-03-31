"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  Users,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { SessionMeta } from '@/lib/grademaster/types';

interface HomeLayerProps {
  sessions: SessionMeta[];
  isLoading: boolean;
  onCreateNew: () => void;
  onSessionClick: (session: SessionMeta) => void;
  onDeleteSession: (id: string, name: string) => void;
  onOpenAbout: () => void;
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

interface ClassGroup {
  className: string;
  academicYear: string;
  schoolLevel: string;
  sessions: SessionMeta[];
}

export default function HomeLayer({
  sessions,
  isLoading,
  onCreateNew,
  onSessionClick,
  onDeleteSession,
  onOpenAbout,
  isAdmin,
}: HomeLayerProps) {
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [behaviorSummary, setBehaviorSummary] = useState<Record<string, { count: number; avgPoints: number }>>({});

  const classGroups = useMemo(() => {
    const map: Record<string, ClassGroup> = {};
    for (const s of sessions) {
      const key = `${s.class_name || 'Umum'}__${s.academic_year || '2025/2026'}`;
      if (!map[key]) {
        map[key] = {
          className: s.class_name || 'Umum',
          academicYear: s.academic_year || '2025/2026',
          schoolLevel: s.school_level || 'SMP',
          sessions: [],
        };
      }
      map[key].sessions.push(s);
    }
    return Object.values(map).sort((a, b) => a.className.localeCompare(b.className));
  }, [sessions]);

  useEffect(() => {
    const uniqueKeys = classGroups.map(g => `${g.className}__${g.academicYear}`);
    const fetchAll = async () => {
      const summaryMap: Record<string, { count: number; avgPoints: number }> = {};
      await Promise.all(
        classGroups.map(async (g) => {
          try {
            const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(g.className)}&year=${encodeURIComponent(g.academicYear)}`);
            const data = await res.json();
            const students = data.students || [];
            const avg = students.length > 0
              ? Math.round(students.reduce((sum: number, s: any) => sum + (s.total_points || 0), 0) / students.length)
              : 0;
            summaryMap[`${g.className}__${g.academicYear}`] = { count: students.length, avgPoints: avg };
          } catch {
            summaryMap[`${g.className}__${g.academicYear}`] = { count: 0, avgPoints: 0 };
          }
        })
      );
      setBehaviorSummary(summaryMap);
    };
    if (classGroups.length > 0) fetchAll();
  }, [classGroups]);

  const getBehaviorLabel = (avg: number) => {
    if (avg >= 100) return { text: 'Sangat Baik', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (avg >= 80) return { text: 'Baik', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (avg >= 60) return { text: 'Cukup', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (avg >= 40) return { text: 'Kurang', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    return { text: '-', color: 'text-slate-500 bg-white/5 border-white/10' };
  };

  const expandedGroup = expandedClass ? classGroups.find(g => `${g.className}__${g.academicYear}` === expandedClass) : null;

  return (
    <div className="min-h-screen bg-slate-950 p-3 sm:p-5 lg:p-8 pb-safe-bottom max-w-7xl mx-auto animate-in mb-20 md:mb-0 pt-16">
      <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3 text-primary mb-1 md:mb-2">
            <GraduationCap size={24} className="md:w-8 md:h-8" />
            <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em] opacity-80">SMP Terpadu Al-Ittihadiyah</span>
            <span className="text-[10px] md:text-xs font-black text-slate-700">•</span>
            <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em] opacity-80">SMA Terpadu As Salaam</span>
          </div>
          <h1 className="text-xl md:text-4xl font-black text-white tracking-tight flex items-center gap-2 md:gap-3">
            {expandedGroup ? (
              <>
                <button onClick={() => setExpandedClass(null)} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors border border-white/10 hover:border-primary/20">
                  <ArrowLeft size={16} className="md:w-5 md:h-5" />
                </button>
                Kelas {expandedGroup.className}
              </>
            ) : (
              <>
                Daftar Kelas
                <button
                  onClick={onOpenAbout}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors shadow-inner border border-white/10 hover:border-primary/20"
                  title="Tentang Sistem"
                >
                  <HelpCircle size={16} className="md:w-5 md:h-5" />
                </button>
              </>
            )}
          </h1>
          <p className="text-sm md:text-base text-slate-400 font-bold mt-1 md:mt-2">
            {expandedGroup
              ? `Tahun Ajaran ${expandedGroup.academicYear} • ${expandedGroup.schoolLevel}`
              : 'Pilih kelas untuk melihat sesi ujian dan data kehadiran siswa.'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={onCreateNew}
              className="px-4 py-3 md:px-6 md:py-4 bg-primary text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} className="md:w-[18px] md:h-[18px]" /> Buat Sesi Baru
            </button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center py-12 md:py-20">
          <Loader2 size={32} className="animate-spin text-primary md:w-10 md:h-10" />
        </div>
      ) : sessions.length === 0 ? (
        isAdmin ? (
          <div className="text-center py-10 md:py-16 bg-slate-900/40 backdrop-blur-xl rounded-2xl md:rounded-[3rem] border border-white/10 shadow-2xl w-full max-w-4xl mx-auto px-4 md:px-8">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-primary/10 text-primary rounded-2xl mb-4 md:mb-6 shadow-lg shadow-primary/20">
              <GraduationCap size={28} className="md:w-8 md:h-8" />
            </div>
            <h3 className="text-lg md:text-3xl font-black text-white mb-2 md:mb-3 font-outfit">Selamat Datang di GradeMaster OS</h3>
            <p className="text-xs md:text-sm text-slate-400 font-bold mb-6 md:mb-10 max-w-2xl mx-auto leading-relaxed">
              Platform koreksi lembar jawaban dan analitik performa cerdas untuk pendidik modern.
              Tinggalkan cara manual, kini Anda dapat mengelola puluhan kelas hanya dengan beberapa klik.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 text-left">
              <div className="p-4 md:p-6 bg-white/5 rounded-2xl border border-white/10">
                <FileText size={20} className="text-sky-400 mb-3 md:w-6 md:h-6" />
                <h4 className="text-sm font-black text-white mb-1.5">Ekstraksi Pintar</h4>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold leading-relaxed">Upload file absen format PDF, Word, atau Excel. Sistem akan membersihkan dan menyusunnya otomatis.</p>
              </div>
              <div className="p-4 md:p-6 bg-white/5 rounded-2xl border border-white/10">
                <CheckCircle2 size={20} className="text-emerald-400 mb-3 md:w-6 md:h-6" />
                <h4 className="text-sm font-black text-white mb-1.5">Koreksi Kilat</h4>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold leading-relaxed">Ketik kunci jawaban secara acak atau tempel dari sumber mana saja, sistem akan memahaminya dalam sedetik.</p>
              </div>
              <div className="p-4 md:p-6 bg-white/5 rounded-2xl border border-white/10">
                <GraduationCap size={20} className="text-primary mb-3 md:w-6 md:h-6" />
                <h4 className="text-sm font-black text-white mb-1.5">Analitik Performa</h4>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold leading-relaxed">Dapatkan Indeks Kesulitan, distribusi nilai, dan insight otomatis dari hasil setiap siswa.</p>
              </div>
            </div>

            <button
              onClick={onCreateNew}
              className="px-6 py-3.5 md:px-8 md:py-4 bg-primary text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 inline-flex items-center gap-2"
            >
              <Plus size={16} /> Buat Sesi Kelas Perdana
            </button>
          </div>
        ) : (
          <div className="text-center py-12 md:py-20 bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-dashed border-white/10 shadow-2xl w-full max-w-2xl mx-auto px-4">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-white/5 shadow-inner text-slate-700 rounded-full mb-4 border border-white/5">
              <GraduationCap size={28} className="md:w-8 md:h-8" />
            </div>
            <h3 className="text-base md:text-xl font-black text-white mb-1">Belum Ada Data</h3>
            <p className="text-xs md:text-sm text-slate-500 font-bold">Saat ini tidak ada sesi evaluasi yang aktif untuk ditampilkan.</p>
          </div>
        )
      ) : expandedGroup ? (
        /* ── Expanded Class View ── */
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Sessions */}
          <div className="mb-6">
            <h2 className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BookOpen size={16} /> Sesi Ujian
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {expandedGroup.sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => onSessionClick(s)}
                  className="bg-slate-900/40 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/10 shadow-2xl hover:border-primary/40 hover:shadow-primary/10 transition-all cursor-pointer group animate-in zoom-in-95 duration-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 bg-white/5 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all relative border border-white/5">
                      <BookOpen size={18} />
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-[8px] shadow-lg ${s.is_public ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-white'}`}>
                        {s.is_public ? '🔓' : '🔒'}
                      </div>
                    </div>
                      <div className="flex items-center gap-2">
                         <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${s.is_public ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 bg-white/5 border-white/10'}`}>
                          {s.is_public ? 'Public' : 'Private'}
                        </span>
                        {s.is_demo && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
                            🧪 Demo
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id, s.session_name); }}
                            className="p-1.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                            title="Hapus Sesi"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                          {s.exam_type || 'UJIAN'}
                        </span>
                      </div>
                  </div>
                  <h3 className="text-sm md:text-lg font-black text-white mb-0.5 truncate">{s.session_name}</h3>
                  <p className="text-xs font-bold text-slate-500 truncate">{s.subject || 'Mapel'}</p>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <User size={12} />
                      <span className="truncate max-w-[100px]">{s.teacher || 'Guru'}</span>
                    </div>
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                      {s.student_count !== undefined ? `${s.student_count} siswa` : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Behavior Summary */}
          {(() => {
            const key = `${expandedGroup.className}__${expandedGroup.academicYear}`;
            const bData = behaviorSummary[key];
            if (!bData || bData.count === 0) return null;
            const label = getBehaviorLabel(bData.avgPoints);
            return (
              <div className="mb-6">
                <h2 className="text-xs md:text-sm font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} /> Kehadiran & Perilaku
                </h2>
                <div className="bg-slate-900/40 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 border border-primary/20">
                      <Users size={28} />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white">{bData.count}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Siswa Terdaftar</p>
                    </div>
                  </div>
                  <div className="h-px md:h-12 md:w-px bg-white/5" />
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-black text-white">{bData.avgPoints}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rata-Rata Poin</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${label.color}`}>{label.text}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* ── Class Cards Grid ── */
        /* ── Class Cards Grid / Mobile List ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 pb-6">
          {classGroups.map(g => {
            const key = `${g.className}__${g.academicYear}`;
            const bData = behaviorSummary[key];
            const label = bData ? getBehaviorLabel(bData.avgPoints) : null;
            return (
              <button
                key={key}
                onClick={() => setExpandedClass(key)}
                className="relative w-full flex md:flex-col items-center md:items-start gap-3 md:gap-4 bg-slate-900/40 backdrop-blur-xl p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 active:bg-white/5 active:scale-[0.98] md:active:scale-100 transition-all text-left group outline-none shadow-2xl md:shadow-none"
              >
                {/* Mobile: Left Icon, Desktop: Top Icon */}
                <div className="w-11 h-11 md:w-14 md:h-14 shrink-0 bg-white/5 text-slate-400 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all border border-white/5 group-hover:border-primary shadow-lg">
                  <Users size={20} className="md:w-7 md:h-7" />
                </div>
                
                {/* Text Content */}
                <div className="flex-1 min-w-0 md:w-full">
                  <h3 className="text-base md:text-2xl font-black text-white mb-0.5 md:mb-1 truncate group-hover:text-primary transition-colors">Kelas {g.className}</h3>
                  
                  <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-3">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded-md uppercase tracking-widest border border-white/5">{g.schoolLevel}</span>
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-600 flex items-center gap-1"><Calendar size={10} />{g.academicYear}</span>
                  </div>

                  {/* Desktop Only Stats Footer */}
                  <div className="hidden md:flex pt-3 border-t border-white/5 items-center justify-between w-full">
                    <span className="text-[10px] md:text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                      {g.sessions.length} Sesi Ujian
                    </span>
                    {label && bData && bData.count > 0 && (
                      <span className={`text-[10px] md:text-xs font-black px-2 py-0.5 rounded-md border ${label.color}`}>
                        {bData.count} Siswa
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Only Quick Stats */}
                <div className="flex md:hidden flex-col items-end gap-1.5 shrink-0 ml-1">
                  <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                    {g.sessions.length} Sesi
                  </span>
                  {label && bData && bData.count > 0 && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${label.color}`}>
                      {bData.count} Siswa
                    </span>
                  )}
                </div>
                
                {/* Chevron icon */}
                <ChevronRight size={18} className="text-slate-600 md:hidden ml-1 shrink-0 group-hover:text-primary transition-colors" />
                <div className="hidden md:block absolute top-6 right-6">
                  <ChevronRight size={18} className="text-slate-700 group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
