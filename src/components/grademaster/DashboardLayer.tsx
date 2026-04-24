"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight, Plus, User, Download, RefreshCcw,
  Trash2, AlertCircle, Eye, AlertOctagon, Users, Timer, Clock,
  Send, MonitorOff, Cpu, Edit2, Loader2, Globe, CheckCircle2, XCircle,
  MoreVertical, Check, Target, Trophy, TrendingUp, Info, BarChart3,
  ClipboardList, ShieldCheck, DownloadCloud, FileText, Filter, ChevronRight
} from 'lucide-react';
import { GradedStudent, AnalyticsResult } from '@/lib/grademaster/types';
import { getCsiLabel, getLpsLabel } from '@/lib/grademaster/scoring';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid 
} from 'recharts';
import InsightPanel from './InsightPanel';

interface BehaviorRecord {
  student_name: string;
  total_points: number;
  avatar_url?: string;
  behavior_logs: { reason: string; points: number; type: string; date: string }[];
}

interface DashboardLayerProps {
  teacherName: string;
  subject: string;
  studentClass: string;
  schoolLevel: string;
  gradedStudents: GradedStudent[];
  analytics: AnalyticsResult;
  isPublicView?: boolean;
  sessionName?: string;
  kkm: number;
  remedialEssayCount: number;
  onGradeStudent: () => void;
  onStudentRemedial?: (name: string) => void;
  onBack: () => void;
  onReSync?: () => void;
  onOpenRemedialDashboard?: () => void;
  academicYear?: string;
  semester?: string;
  examType?: string;
  isDemo?: boolean;
  sessionId?: string;
  isAdmin?: boolean;
  showRemedialButton?: boolean;
  isStudent?: boolean;
  currentStudentName?: string;
}

const PIE_COLORS = ['#9bffce', '#ff6e84'];

export default function DashboardLayer({
  teacherName, subject, studentClass, schoolLevel, gradedStudents,
  analytics, isPublicView, sessionName, kkm, remedialEssayCount,
  onGradeStudent, onStudentRemedial, onBack, onReSync, academicYear,
  semester, examType, isDemo, sessionId, isAdmin = false, showRemedialButton = false,
  isStudent = false, currentStudentName = '', onOpenRemedialDashboard
}: DashboardLayerProps) {
  const [activeTab, setActiveTab] = useState<'ikhtisar' | 'analisis' | 'laporan'>('ikhtisar');
  const [behaviorMap, setBehaviorMap] = useState<Record<string, BehaviorRecord>>({});
  const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);
  const [similarityReports, setSimilarityReports] = useState<any[] | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditingScore, setIsEditingScore] = useState<string | null>(null);

  useEffect(() => {
    if (!studentClass) return;
    const year = academicYear || '2025/2026';
    fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(studentClass)}&year=${encodeURIComponent(year)}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, BehaviorRecord> = {};
        (data.students || []).forEach((s: BehaviorRecord) => {
          map[s.student_name.toLowerCase()] = s;
        });
        setBehaviorMap(map);
      })
      .catch(() => {});
  }, [studentClass, academicYear]);

  const handleDeleteStudent = async (name: string) => {
    const student = gradedStudents.find(s => s.name === name);
    if (!student) return;
    if (!window.confirm(`Yakin ingin menghapus data siswa "${name}"?`)) return;
    setIsDeleting(student.id);
    try {
      const res = await fetch('/api/grademaster/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id })
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      window.location.reload(); 
    } catch (err) { alert('Gagal menghapus'); } finally { setIsDeleting(null); }
  };

  const handleEditScore = async (studentId: string, currentScore: number) => {
    const newScoreStr = window.prompt("Ubah Nilai Akhir Siswa (0-100):", currentScore.toString());
    if (newScoreStr === null) return;
    const newScore = parseInt(newScoreStr);
    if (isNaN(newScore) || newScore < 0 || newScore > 100) return alert("Nilai tidak valid");
    setIsEditingScore(studentId);
    try {
      const res = await fetch('/api/grademaster/students/score', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, newScore })
      });
      if (!res.ok) throw new Error('Gagal mengubah');
      window.location.reload();
    } catch (err) { alert('Gagal mengubah'); } finally { setIsEditingScore(null); }
  };

  const handleExportXML = () => {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<Report>\n`;
    let xml = xmlHeader + `  <SchoolIdentity>\n    <SessionName>${sessionName || 'Sesi'}</SessionName>\n    <Teacher>${teacherName}</Teacher>\n    <Subject>${subject}</Subject>\n    <Class>${studentClass}</Class>\n  </SchoolIdentity>\n  <Statistics>\n    <Mean>${analytics.avgScore}</Mean>\n    <Max>${analytics.highestScore}</Max>\n    <Min>${analytics.lowestScore}</Min>\n  </Statistics>\n  <Students>\n`;
    gradedStudents.forEach(s => { xml += `    <Student>\n      <Name>${s.name}</Name>\n      <Score>${s.finalScore}</Score>\n    </Student>\n`; });
    xml += `  </Students>\n</Report>`;
    const blob = new Blob([xml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Nilai_${studentClass}_${subject}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const passCount = gradedStudents.filter(s => s.finalScore >= kkm).length;
  const remCount = gradedStudents.length - passCount;
  const passRate = gradedStudents.length > 0 ? Math.round((passCount / gradedStudents.length) * 100) : 0;

  // Student Remedial Detection
  const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
  
  const myStudentRecord = isStudent && currentStudentName
    ? gradedStudents.find(s => normalizeName(s.name) === normalizeName(currentStudentName))
    : null;
  const needsRemedial = myStudentRecord ? myStudentRecord.finalScore < kkm : false;
  const canStartRemedial = needsRemedial && showRemedialButton && onStudentRemedial;

  // Debugging logs requested by user
  useEffect(() => {
    if (isStudent) {
      console.log("[REMEDIAL DEBUG] State Analysis:", {
        currentStudentName,
        isStudent,
        kkm,
        myStudentRecord: myStudentRecord ? { name: myStudentRecord.name, score: myStudentRecord.finalScore } : 'Not Found in This Session',
        needsRemedial,
        showRemedialButton,
        canStartRemedial,
        totalGradedStudents: gradedStudents.length
      });
    }
  }, [isStudent, currentStudentName, kkm, myStudentRecord, needsRemedial, showRemedialButton, canStartRemedial, gradedStudents.length]);

  return (
    <div className="font-body text-on-surface min-h-dvh flex flex-col bg-surface">
      {/* Main Content — padded for global Navbar top & bottom */}
      <main className="flex-1 px-4 sm:px-6 pt-6 pb-28 overflow-x-hidden max-w-4xl mx-auto w-full page-pt">
        {/* Admin Quick-Action Strip (Mobile) */}
        {isAdmin && (
          <div className="md:hidden flex items-center justify-between mb-4 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={14} className="text-emerald-500" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Mode Admin</span>
            </div>
            <button
              onClick={onGradeStudent}
              className="flex items-center gap-1.5 px-3 py-2 bg-tertiary text-on-tertiary rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-tertiary/20"
            >
              <Plus size={12} /> Koreksi
            </button>
          </div>
        )}

        {/* Student Remedial CTA Banner — Mobile-optimized */}
        {isStudent && myStudentRecord && needsRemedial && canStartRemedial && (
          <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-rose-600/90 via-rose-500/80 to-orange-500/70 p-5 shadow-xl shadow-rose-600/20">
              {/* Background decoration */}
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/5 rounded-full blur-xl" />
              <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-lg" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                    <AlertCircle size={16} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Remedial Tersedia</span>
                </div>
                
                <h3 className="text-white font-headline font-extrabold text-lg leading-tight mb-1">
                  Nilai Anda: {myStudentRecord.finalScore} <span className="text-white/60 text-sm font-bold">(KKM {kkm})</span>
                </h3>
                <p className="text-white/70 text-xs font-medium mb-4 leading-relaxed">
                  Anda belum mencapai KKM. Ikuti remedial untuk memperbaiki nilai Anda.
                </p>
                
                <button
                  onClick={() => onStudentRemedial!(currentStudentName)}
                  className="w-full py-3.5 bg-white text-rose-600 font-black text-sm uppercase tracking-widest rounded-2xl active:scale-[0.97] transition-all duration-200 shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'wght' 700" }}>edit_note</span>
                  Mulai Remedial Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Score Highlight — when student is logged in */}
        {isStudent && myStudentRecord && !needsRemedial && (
          <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-emerald-600/90 via-emerald-500/80 to-teal-500/70 p-5 shadow-xl shadow-emerald-600/20">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/5 rounded-full blur-xl" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">Nilai Anda</span>
                  <h3 className="text-white font-headline font-extrabold text-2xl leading-none mt-1">{myStudentRecord.finalScore}</h3>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <CheckCircle2 size={28} className="text-white" />
                </div>
              </div>
              <p className="relative z-10 text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2">Selamat! Anda lulus KKM {kkm}</p>
            </div>
          </div>
        )}

        {/* Header Section */}
        <header className="mb-8 flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
              <span>{studentClass}</span>
              <span>•</span>
              <span>{subject}</span>
            </div>
            <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-primary tracking-tight leading-none mb-2 uppercase">{sessionName || "HASIL ANALISIS NILAI"}</h1>
            <p className="text-on-surface-variant font-medium text-sm max-w-[100%] md:max-w-[80%]">Analisis Performa Siswa & Statistik Ujian Terpadu</p>
          </div>
          
          {isAdmin && onOpenRemedialDashboard && (
            <button
              onClick={onOpenRemedialDashboard}
              className="shrink-0 px-3 md:px-4 py-2.5 bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-tertiary hover:text-on-tertiary transition-all flex items-center gap-2 shadow-lg shadow-tertiary/5 active:scale-95"
            >
              <Target size={16} />
              <span className="hidden sm:inline">Siapkan Remedial</span>
              <span className="sm:hidden">Remedial</span>
            </button>
          )}
        </header>

        {/* Bento Statistics Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <div className="bg-surface-container-high rounded-2xl p-4 flex flex-col items-center justify-center gap-1 border border-outline-variant relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-tertiary/5 rounded-bl-full group-hover:bg-tertiary/10 transition-all"></div>
            <TrendingUp size={20} className="text-tertiary mb-1" />
            <span className="font-headline font-extrabold text-2xl text-primary">{analytics.avgScore}</span>
            <span className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Rata-rata</span>
          </div>
          <div className="bg-surface-container-high rounded-2xl p-4 flex flex-col items-center justify-center gap-1 border border-outline-variant relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-primary-container/5 rounded-bl-full group-hover:bg-primary-container/10 transition-all"></div>
            <Target size={20} className="text-primary-container mb-1" />
            <span className="font-headline font-extrabold text-2xl text-primary">{passRate}%</span>
            <span className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Lulus (KKM {kkm})</span>
          </div>
          <div className="bg-surface-container-high rounded-2xl p-4 flex flex-col items-center justify-center gap-1 border border-outline-variant relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-outline/5 rounded-bl-full group-hover:bg-outline/10 transition-all"></div>
            <Trophy size={20} className="text-outline mb-1" />
            <span className="font-headline font-extrabold text-2xl text-primary">{analytics.highestScore}</span>
            <span className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Tertinggi</span>
          </div>
          <div className="bg-surface-container-high rounded-2xl p-4 flex flex-col items-center justify-center gap-1 border border-outline-variant relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-error/5 rounded-bl-full group-hover:bg-error/10 transition-all"></div>
            <XCircle size={20} className="text-error mb-1" />
            <span className="font-headline font-extrabold text-2xl text-primary">{analytics.lowestScore}</span>
            <span className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Terendah</span>
          </div>
        </section>

        {/* Tab Navigation Chips */}
        <section className="mb-8 -mx-6">
          <div className="flex overflow-x-auto no-scrollbar px-6 gap-3">
            {[
              { id: 'ikhtisar', label: 'Ikhtisar', icon: <ClipboardList size={16} /> },
              { id: 'analisis', label: 'Analisis Visual', icon: <BarChart3 size={16} /> },
              { id: 'laporan', label: 'Laporan', icon: <FileText size={16} /> },
            ].map((t) => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex-none px-6 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === t.id 
                  ? 'bg-tertiary text-on-tertiary shadow-[0_0_15px_rgba(155,255,206,0.3)]' 
                  : 'bg-surface-container text-on-surface-variant hover:text-primary border border-outline-variant'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Tab Content: Ikhtisar */}
        {activeTab === 'ikhtisar' && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-4 px-1">
              <h3 className="font-headline font-bold text-lg text-primary">Daftar Hasil Siswa</h3>
              <span className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{gradedStudents.length} Siswa</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gradedStudents.map((s) => {
                const isPassing = s.finalScore >= kkm;
                const behavior = behaviorMap[s.name.toLowerCase()];
                return (
                  <div key={s.id} className="bg-surface-container-high p-4 rounded-[1.5rem] flex items-center justify-between group border border-outline-variant hover:border-outline-variant transition-all">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface-container-highest flex items-center justify-center text-primary font-bold border border-outline-variant">
                        {behavior?.avatar_url ? (
                          <img src={behavior.avatar_url} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg opacity-40">{s.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-headline font-bold text-primary truncate leading-tight mb-0.5">{s.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${isPassing ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'}`}>
                            {isPassing ? 'LULUS' : 'REMEDIAL'}
                          </span>
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-50">• PG: {s.mcqScore}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right">
                        <span className={`text-2xl font-black font-headline ${isPassing ? 'text-primary' : 'text-error'}`}>{s.finalScore}</span>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleEditScore(s.id, s.finalScore)} className="p-2 bg-surface-bright rounded-xl text-on-surface-variant hover:text-primary transition-all active:scale-90">
                           <MoreVertical size={18} />
                        </button>
                      )}
                      {/* Student Remedial Button — on their own card */}
                      {isStudent && !isPassing && canStartRemedial && currentStudentName && 
                       normalizeName(s.name) === normalizeName(currentStudentName) && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onStudentRemedial!(s.name); }}
                          className="px-3 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-rose-500/20 flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-sm">edit_note</span>
                          Remedial
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tab Content: Analisis Visual */}
        {activeTab === 'analisis' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-surface-container-high p-6 rounded-[2rem] border border-outline-variant">
                <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <TrendingUp size={14} className="text-tertiary" /> Distribusi Nilai Siswa
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#adaaad', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#adaaad', fontSize: 10, fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{backgroundColor: '#19191c', borderRadius: '12px', border: '1px solid #ffffff10', fontSize: '12px'}} />
                      <Bar dataKey="count" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9bffce" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#9bffce" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container-high p-6 rounded-[2rem] border border-outline-variant flex flex-col items-center">
                   <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 self-start">Tingkat Ketuntasan</h3>
                   <div className="h-[180px] w-full max-w-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Lulus', value: passCount },
                              { name: 'Remedial', value: remCount }
                            ]}
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill="#9bffce" />
                            <Cell fill="#3a3a3c" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="flex gap-4 mt-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-tertiary"><div className="w-2 h-2 rounded-full bg-tertiary" /> LULUS</div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-on-surface-variant"><div className="w-2 h-2 rounded-full bg-[#3a3a3c]" /> REMEDIAL</div>
                   </div>
                </div>

                <div className="bg-surface-container-high p-6 rounded-[2rem] border border-outline-variant">
                   <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-6">Metrik Performa</h3>
                   <div className="space-y-5">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">CSI Index</span>
                         <span className="text-sm font-black text-primary p-2 bg-surface-variant rounded-lg">{analytics.avgCsi.toFixed(1)} / 4.0</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">LPS Ratio</span>
                         <span className="text-sm font-black text-primary p-2 bg-surface-variant rounded-lg">{analytics.avgLps.toFixed(2)}</span>
                      </div>
                      <div className="mt-4 p-3 bg-tertiary/5 rounded-2xl border border-tertiary/10">
                         <p className="text-[9px] font-medium text-tertiary leading-relaxed text-center italic">CSI & LPS menunjukkan tingkat konsistensi dan efektivitas pemahaman siswa dalam sesi ini.</p>
                      </div>
                   </div>
                </div>
             </div>
          </section>
        )}

        {/* Tab Content: Laporan */}
        {activeTab === 'laporan' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-surface-container p-6 rounded-[2rem] border border-outline-variant">
                <div className="flex items-center gap-4 mb-6">
                   <div className="p-3 bg-outline/10 rounded-2xl text-outline border border-outline/20">
                      <ShieldCheck size={24} />
                   </div>
                   <div>
                      <h3 className="font-headline font-bold text-lg text-primary">Keamanan & Integritas</h3>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Laporan potensi kecurangan & audit data</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <button onClick={handleExportXML} className="flex items-center justify-between p-5 bg-surface-bright rounded-2xl border border-outline-variant hover:border-primary/20 transition-all group active:scale-95">
                      <div className="flex items-center gap-3">
                         <DownloadCloud size={20} className="text-primary group-hover:animate-bounce" />
                         <span className="text-xs font-black uppercase tracking-widest">Export SPSS/XML</span>
                      </div>
                      <ChevronRight size={16} className="text-on-surface-variant" />
                   </button>
                   <button className="flex items-center justify-between p-5 bg-surface-bright rounded-2xl border border-outline-variant hover:border-primary/20 transition-all group opacity-50 grayscale active:scale-95">
                      <div className="flex items-center gap-3">
                         <FileText size={20} className="text-primary" />
                         <span className="text-xs font-black uppercase tracking-widest">PDF Report Full</span>
                      </div>
                      <ChevronRight size={16} className="text-on-surface-variant" />
                   </button>
                </div>
                
                <div className="mt-6">
                   <InsightPanel insights={analytics.insights} />
                </div>
             </div>
          </section>
        )}
      </main>

      {/* Floating Action Button for Admin — positioned above global bottom nav */}
      {isAdmin && (
        <button 
          onClick={onGradeStudent}
          className="hidden md:flex fixed bottom-8 right-8 w-16 h-16 bg-tertiary text-on-tertiary rounded-2xl items-center justify-center z-[1000] active:scale-90 transition-transform shadow-[0_10px_30px_rgba(40,230,150,0.4)]"
          title="Input Nilai Baru"
        >
          <div className="relative">
             <Plus size={32} />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping opacity-50"></div>
          </div>
        </button>
      )}
    </div>
  );
}
