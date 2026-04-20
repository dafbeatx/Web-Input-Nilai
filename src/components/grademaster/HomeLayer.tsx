"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
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

  const expandedGroup = expandedClass ? classGroups.find(g => `${g.className}__${g.academicYear}` === expandedClass) : null;

  return (
    <main className="min-h-screen pt-[env(safe-area-inset-top,20px)] mt-24 pb-32 px-6 flex flex-col gap-10 max-w-md mx-auto animate-in fade-in transition-all duration-300">
      {/* Header Section */}
      <header className="flex flex-col">
        {expandedGroup ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold tracking-widest text-on-surface-variant uppercase border-t border-surface-container-high pt-4 inline-block">
              Tahun Ajaran {expandedGroup.academicYear}
            </p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setExpandedClass(null)} 
                className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center transition-all active:scale-90 border border-outline-variant/10 shadow-sm"
              >
                <span className="material-symbols-outlined text-on-surface text-xl">arrow_back</span>
              </button>
              <h1 className="font-headline text-4xl font-bold text-on-primary-fixed tracking-[-0.04em]">Kelas {expandedGroup.className}</h1>
            </div>
            <p className="text-on-surface-variant text-base leading-relaxed">Daftar sesi evaluasi dan ujian yang aktif untuk kelas ini.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <p className="text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-4 border-t border-surface-container-high pt-4 inline-block">
              Tahun Ajaran 2025/2026
            </p>
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-4xl font-headline font-bold text-on-primary-fixed tracking-[-0.04em]">Daftar Kelas</h1>
              {isAdmin && (
                <button 
                  onClick={onCreateNew}
                  className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-surface-container-lowest shrink-0 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                  title="Buat Sesi Kelas Baru"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 600" }}>add</span>
                </button>
              )}
            </div>
            <p className="text-on-surface-variant text-base leading-relaxed w-[85%]">Pilih kelas untuk melihat sesi ujian dan data kehadiran siswa.</p>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-24 gap-4">
          <Loader2 size={40} className="animate-spin text-tertiary" />
          <p className="font-label text-sm uppercase tracking-widest text-on-surface-variant animate-pulse">Menyiapkan Database...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-surface-container rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center px-6 premium-shadow">
           <div className="w-16 h-16 rounded-3xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-6">
             <span className="material-symbols-outlined text-4xl">folder_off</span>
           </div>
           <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Belum Ada Sesi Kelas</h3>
           <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6">Mulai perjalanan akademik Anda dengan membuat sesi evaluasi atau ujian untuk kelas pertama.</p>
           {isAdmin && (
            <button
             onClick={onCreateNew}
             className="px-6 py-3 bg-primary text-surface-container-lowest rounded-xl text-sm font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontVariationSettings: "'wght' 600" }}>add</span>
              Buat Evaluasi Perdana
            </button>
           )}
        </div>
      ) : expandedGroup ? (
        /* --- SESION LIST (Expanded View) --- */
        <section className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
          {expandedGroup.sessions.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => onSessionClick(s)}
              className="group relative w-full text-left bg-surface-container-lowest ambient-shadow p-6 rounded-2xl transition-all duration-300 ease-out active:scale-[0.98] border border-outline-variant/10 overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex-1 pr-6">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {s.is_public ? (
                      <span className="bg-primary-container/10 text-on-primary-fixed text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">Public</span>
                    ) : (
                      <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">Private</span>
                    )}
                    {s.is_demo && (
                      <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">science</span> Demo
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-on-surface leading-tight tracking-tight">{s.session_name}</h3>
                </div>
                
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300 transform group-hover:rotate-12 shadow-sm">
                  <span className="material-symbols-outlined text-xl">analytics</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between relative z-10 border-t border-surface-container-low pt-4">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Mata Pelajaran</p>
                    <p className="text-sm font-semibold text-on-surface truncate max-w-[120px]">{s.subject || 'Mapel'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Tipe Evaluasi</p>
                    <p className="text-sm font-semibold text-on-surface">{s.exam_type || 'UJIAN'}</p>
                  </div>
                </div>
                
                {isAdmin && (
                  <div 
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id, s.session_name); }}
                    className="w-10 h-10 rounded-full hover:bg-error/10 text-on-surface-variant/40 hover:text-error flex items-center justify-center transition-all z-20 active:scale-90"
                    title="Hapus Sesi"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </div>
                )}
              </div>
              
              {/* Highlight decorative */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors pointer-events-none"></div>
            </button>
          ))}
        </section>
      ) : (
        /* --- DAFTAR KELAS (Home / Default View) --- */
        <>
          <section className="flex flex-col gap-6">
            {classGroups.map((g, index) => {
              const key = `${g.className}__${g.academicYear}`;
              const bData = behaviorSummary[key] || { count: 0 };
              const isActive = index === 0;

              return (
                <button 
                  key={key} 
                  onClick={() => setExpandedClass(key)} 
                  className={`bg-surface-container-lowest ambient-shadow rounded-2xl p-6 text-left w-full group hover:bg-surface-container-low transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border border-outline-variant/10 relative overflow-hidden`}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-fixed/30 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
                  )}
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center space-x-3">
                      <h2 className={`text-3xl font-headline font-bold tracking-tight ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                        {g.className}
                      </h2>
                      {isActive ? (
                        <span className="bg-secondary-container/20 text-on-secondary-container text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider flex items-center border border-secondary-container/30">
                          <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> Aktif
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: '20px' }}>person</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/5">
                      {g.schoolLevel}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end relative z-10 border-t border-surface-container-low pt-4">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 font-semibold">Sesi Ujian</p>
                      <p className="text-sm font-extrabold text-on-surface leading-none">{g.sessions.length} Sesi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 font-semibold">Total Siswa</p>
                      <p className="text-sm font-extrabold text-on-surface leading-none">{bData.count} Siswa</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>

          {/* Info Card - Bento Style */}
          <section className="bg-surface-container-low/50 p-6 rounded-2xl flex flex-col gap-4 border border-outline-variant/10 shadow-sm mt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                <span className="material-symbols-outlined text-primary text-xl">insights</span>
              </div>
              <h4 className="font-headline font-bold text-on-surface tracking-tight">
                {isAdmin ? 'Ringkasan Sistem' : 'Info Akademik'}
              </h4>
            </div>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed opacity-80">
              {isAdmin ? (
                <>Terdeteksi <span className="text-primary font-bold">{classGroups.length} Kelas</span> aktif dengan total <span className="text-primary font-bold">{sessions.length} Sesi</span>. Sinkronisasi berjalan otomatis untuk memastikan integritas data.</>
              ) : (
                <>Terdapat <span className="text-primary font-bold">{classGroups.length} Kelas</span> terbuka dengan <span className="text-primary font-bold">{sessions.length} Sesi</span> aktif. Pilih kelas Anda untuk melihat laporan lengkap.</>
              )}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
