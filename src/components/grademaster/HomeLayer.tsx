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
    <main className="min-h-screen pt-[env(safe-area-inset-top,20px)] mt-24 pb-32 px-5 flex flex-col gap-8 max-w-md mx-auto animate-in fade-in transition-all duration-300">
      {/* Header Section */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-[2px] bg-tertiary rounded-full"></span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-semibold">
             {expandedGroup ? `Tahun Ajaran ${expandedGroup.academicYear}` : 'Academic Year 2025/2026'}
          </span>
        </div>
        
        {expandedGroup ? (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setExpandedClass(null)} 
              className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center justify-center transition-colors shadow-lg active:scale-95 border border-transparent hover:border-outline-variant/20"
            >
              <span className="material-symbols-outlined text-primary">arrow_back</span>
            </button>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Kelas {expandedGroup.className}</h2>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Daftar Kelas</h2>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">Pilih kelas untuk melihat sesi ujian dan data kehadiran siswa.</p>
            </div>
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
        <section className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
          {expandedGroup.sessions.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => onSessionClick(s)}
              className="group relative w-full text-left bg-surface-container hover:bg-surface-bright p-5 rounded-3xl transition-all duration-300 ease-out active:scale-[0.98] border border-transparent hover:border-outline-variant/20 shadow-lg shadow-black/10 overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-6">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {s.is_public ? (
                      <span className="px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary text-[9px] font-bold uppercase tracking-wider">Public</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-[9px] font-bold uppercase tracking-wider">Private</span>
                    )}
                    {s.is_demo && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">science</span> Demo
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline text-xl font-bold text-on-surface truncate leading-tight">{s.session_name}</h3>
                </div>
                
                {/* Admin Deletion Action */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-surface-container-high flex items-center justify-center group-hover:bg-primary group-hover:text-surface-container-lowest transition-colors duration-300">
                    <span className="material-symbols-outlined">analytics</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex flex-col">
                  <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-tighter">Event</span>
                  <span className="font-body text-sm font-semibold text-primary">{s.exam_type || 'UJIAN'}</span>
                </div>
                <div className="w-[1px] h-6 bg-outline-variant/30"></div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-tighter">Mata Pelajaran</span>
                  <span className="font-body text-sm font-semibold text-primary truncate max-w-[140px]">{s.subject || 'Mapel'}</span>
                </div>
                {isAdmin && (
                  <div className="ml-auto">
                    <div 
                      onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id, s.session_name); }}
                      className="w-10 h-10 rounded-full hover:bg-error/20 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors z-10"
                      title="Hapus Sesi"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                    </div>
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
          <section className="flex flex-col gap-4">
            {classGroups.map((g, index) => {
              const key = `${g.className}__${g.academicYear}`;
              const bData = behaviorSummary[key] || { count: 0 };
              
              // Tentukan "Active Highlight" - Bisa di-harcode pakai index===0 atau string check.
              const isActive = index === 0;

              let icon = 'group';
              let iconFilled = false;
              let levelBadge = g.schoolLevel;

              if (g.schoolLevel.toUpperCase().includes('SMA')) {
                icon = 'account_balance';
              } else if (g.className.includes('9')) {
                icon = 'school';
              }
              
              if (isActive) {
                icon = 'stars';
                iconFilled = true;
                return (
                  <button 
                    key={key} 
                    onClick={() => setExpandedClass(key)} 
                    className="group relative w-full text-left bg-gradient-to-br from-surface-container to-surface-container-high hover:from-surface-bright hover:to-surface-bright p-5 rounded-3xl transition-all duration-300 ease-out active:scale-[0.98] shadow-2xl shadow-black/20"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-label text-[10px] uppercase tracking-widest text-tertiary-dim font-bold">{levelBadge}</span>
                          <span className="px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary text-[9px] font-bold uppercase tracking-wider">Active</span>
                        </div>
                        <h3 className="font-headline text-2xl font-bold text-on-surface mt-1">Kelas {g.className}</h3>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-tertiary flex items-center justify-center text-on-tertiary shadow-lg shadow-tertiary/10 transform group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined" style={iconFilled ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-tighter">Sesi Ujian</span>
                        <span className="font-body text-sm font-semibold text-primary">{g.sessions.length} Sesi</span>
                      </div>
                      <div className="w-[1px] h-6 bg-outline-variant/30"></div>
                      <div className="flex flex-col">
                        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-tighter">Total Siswa</span>
                        <span className="font-body text-sm font-semibold text-primary">{bData.count} Siswa</span>
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <button 
                  key={key} 
                  onClick={() => setExpandedClass(key)} 
                  className="group relative w-full text-left bg-surface-container hover:bg-surface-bright p-5 rounded-3xl transition-all duration-300 ease-out active:scale-[0.98] border border-transparent hover:border-outline-variant/20 overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="font-label text-[10px] uppercase tracking-widest text-tertiary-dim font-bold">{levelBadge}</span>
                      <h3 className="font-headline text-2xl font-bold text-on-surface mt-1">Kelas {g.className}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center group-hover:bg-primary group-hover:text-surface-container-lowest transition-colors duration-300">
                      <span className="material-symbols-outlined">{icon}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-tighter">Sesi Ujian</span>
                      <span className="font-body text-sm font-semibold text-primary">{g.sessions.length} Sesi</span>
                    </div>
                    <div className="w-[1px] h-6 bg-outline-variant/30"></div>
                    <div className="flex flex-col">
                      <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-tighter">Total Siswa</span>
                      <span className="font-body text-sm font-semibold text-primary">{bData.count} Siswa</span>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-tertiary/10 transition-colors pointer-events-none"></div>
                </button>
              );
            })}
          </section>

          {/* Promotional / Info Card */}
          <section className="bg-surface-container-low p-6 rounded-3xl flex flex-col gap-4 border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-lg">info</span>
              </div>
              <h4 className="font-headline font-bold text-on-surface">
                {isAdmin ? 'Insight Sinkronisasi' : 'Informasi Akademik'}
              </h4>
            </div>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              {isAdmin ? (
                <>Anda mengelola <span className="text-tertiary font-bold">{classGroups.length} Kelas Aktif</span> dengan total mencapai <span className="text-tertiary font-bold">{sessions.length} Sesi Evaluasi</span>. Pastikan perangkat Anda terhubung Internet secara reguler untuk menyinkronkan data ke panel pusat.</>
              ) : (
                <>Saat ini terdapat <span className="text-tertiary font-bold">{classGroups.length} Kelas</span> yang terbuka dengan <span className="text-tertiary font-bold">{sessions.length} Sesi Ujian</span> aktif. Silakan masuk ke kelas Anda untuk melihat peringkat, hasil evaluasi, dan rekapitulasi kehadiran.</>
              )}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
