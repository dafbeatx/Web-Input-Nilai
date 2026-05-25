"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, Search, CheckCircle2, AlertTriangle, AlertCircle, 
  Clock, ShieldAlert, Check, RotateCcw, X, Save, Wand2, 
  MapPin, FileText, ChevronDown, ChevronUp, User, LayoutGrid
} from 'lucide-react';
import { GradedStudent, ScoringConfig, SessionMeta } from '@/lib/grademaster/types';
import { useGradeMaster } from '@/context/GradeMasterContext';

interface RemedialDashboardLayerProps {
  gradedStudents: GradedStudent[];
  kkm: number;
  scoringConfig: ScoringConfig;
  examType?: string;
  academicYear?: string;
  studentClass?: string;
  subject?: string;
  schoolLevel?: string;
  semester?: string;
  onBack: () => void;
  onUpdateRemedial?: (questions: string[], keys: string[], timer: number, deadline?: string) => void;
  remedialQuestionsInput?: string;
  onRemedialInputChange?: (v: string) => void;
  remedialAnswerKeysInput?: string;
  onAnswerKeysInputChange?: (v: string) => void;
  remedialTimer?: number;
  isSaving?: boolean;
  sessions?: SessionMeta[];
  activeSessionId?: string;
  onSessionSelect?: (session: SessionMeta) => void;
  onRefresh?: () => void;
}

export default function RemedialDashboardLayer({
  gradedStudents,
  kkm,
  scoringConfig,
  examType = "UTS",
  academicYear = "2025/2026",
  studentClass,
  subject = "Matematika",
  schoolLevel = "SMA",
  semester = "Ganjil",
  onBack,
  onUpdateRemedial,
  remedialQuestionsInput = "",
  onRemedialInputChange,
  remedialAnswerKeysInput = "",
  onAnswerKeysInputChange,
  remedialTimer = 15,
  isSaving = false,
  sessions = [],
  activeSessionId,
  onSessionSelect,
  onRefresh
}: RemedialDashboardLayerProps) {
  const { isAdmin, studentClass: contextClass, studentData } = useGradeMaster();
  const displayClass = studentClass || contextClass || (studentData && studentData.class_name) || "N/A";
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localTimer, setLocalTimer] = useState<number>(remedialTimer);
  const [localDeadline, setLocalDeadline] = useState<string>(scoringConfig.remedialDeadline || "");
  const [reviewScore, setReviewScore] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isExtending, setIsExtending] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateAndCopyPendingList = () => {
    const pendingList = gradedStudents.filter(s => 
      (s.finalScoreLocked || s.finalScore) < kkm && 
      (s.remedialStatus === 'NONE' || !s.remedialStatus || s.remedialStatus === 'FAILED' || s.remedialStatus === 'FAILED_EFFORT' || s.remedialStatus === 'CHEATED' || s.remedialStatus === 'TIME_UP')
    ).sort((a, b) => a.name.localeCompare(b.name));

    if (pendingList.length === 0) {
      alert('Tidak ada siswa yang tertunggak remedial pada sesi ini.');
      return;
    }

    const text = `*DAFTAR TUNGGAKAN REMEDIAL*\n` +
      `Mata Pelajaran: ${subject}\n` +
      `Kelas: ${displayClass}\n` +
      `KKM: ${kkm}\n\n` +
      `Berikut adalah daftar siswa yang belum menyelesaikan atau belum lulus remedial:\n\n` +
      pendingList.map((s, i) => `${i + 1}. ${s.name} (Nilai: ${s.originalScore || s.finalScore})`).join('\n') +
      `\n\nHarap segera mengakses tautan remedial dan menyelesaikannya. Jika dibiarkan, nilai asli akan terkunci permanen secara otomatis.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(err => {
      alert('Gagal menyalin teks. Browser Anda mungkin tidak mendukung fitur Clipboard.');
    });
  };

  // Keep track of the latest onRefresh to avoid infinite loops when parent re-renders
  const onRefreshRef = React.useRef(onRefresh);
  React.useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Auto-refresh mechanism
  React.useEffect(() => {
    if (!activeSessionId) return;
    
    // Initial fetch
    if (onRefreshRef.current) {
      onRefreshRef.current();
    }
    
    const interval = setInterval(() => {
      if (onRefreshRef.current) {
        onRefreshRef.current();
      }
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [activeSessionId]);

  // Stats Logic
  const remedialStudents = useMemo(() => {
    return gradedStudents.filter(s => 
      s.remedialStatus && s.remedialStatus !== 'NONE' && !deletedIds.includes(s.id)
    ).filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [gradedStudents, deletedIds, searchQuery]);

  const stats = useMemo(() => ({
    total: remedialStudents.length,
    waitingReview: remedialStudents.filter(s => s.remedialStatus === 'REMEDIAL' && !s.teacherReviewed).length,
    issue: remedialStudents.filter(s => s.remedialStatus === 'CHEATED' || s.remedialStatus === 'TIME_UP' || s.remedialStatus === 'TIMEOUT').length
  }), [remedialStudents]);

  // Actions
  const handleSaveQuestions = () => {
    onUpdateRemedial?.(
      parseEssayQuestions(remedialQuestionsInput),
      parseEssayQuestions(remedialAnswerKeysInput),
      localTimer,
      localDeadline
    );
    setIsEditing(false);
  };

  function parseEssayQuestions(input: string): string[] {
    return input.split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  }

  const handleAutoFormatList = (input: string) => {
    const lines = input.split('\n');
    let counter = 1;
    return lines.map(line => {
      // If it's an empty line, preserve the line break but don't number it
      if (!line.trim()) return line;
      // Remove existing number prefixes to avoid "1. 1. Soal"
      const cleanLine = line.replace(/^\d+[\.\)]\s*/, '');
      return `${counter++}. ${cleanLine}`;
    }).join('\n');
  };

  const handleResetRemedial = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Yakin ingin mereset data remedial siswa "${name}"?\nNilai siswa akan dikembalikan ke nilai utama.`)) return;
    
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/grademaster/students/remedial?studentId=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Gagal mereset');
      setDeletedIds(prev => [...prev, id]);
    } catch (err) {
      alert('Gagal mereset data remedial. Silakan coba lagi.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExtendTimePrompt = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const minutesStr = window.prompt(`Masukkan jumlah waktu tambahan (menit) untuk "${name}":`, "10");
    if (minutesStr === null) return;
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(minutes) || minutes <= 0) {
      alert('Jumlah menit tidak valid');
      return;
    }
    
    setIsExtending(id);
    try {
      const res = await fetch('/api/grademaster/students/remedial/extend-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, minutes })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menambahkan waktu');
      }
      alert(`Berhasil menambahkan ${minutes} menit untuk "${name}".`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan waktu. Silakan coba lagi.');
    } finally {
      setIsExtending(null);
    }
  };

  const submitReview = async (studentId: string, action: 'review' | 'finalize') => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/grademaster/students/remedial/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action,
          remedialScore: Number(reviewScore),
          sessionKkm: kkm
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan evaluasi');
      alert(`Berhasil: ${data.message}`);
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, teacherReviewed?: boolean) => {
    const config: Record<string, { label: string, color: string, icon: string }> = {
      'INITIATED': { label: 'MENUNGGU', color: 'text-blue-400 bg-blue-400/10', icon: 'hourglass_empty' },
      'SUBMITTED': { label: 'SELESAI', color: 'text-tertiary bg-tertiary/10', icon: 'check_circle' },
      'COMPLETED': { label: 'SELESAI', color: 'text-tertiary bg-tertiary/10', icon: 'check_circle' },
      'ACTIVE': { label: 'MENGERJAKAN', color: 'text-amber-400 bg-amber-400/10 animate-pulse', icon: 'clock_loader_40' },
      'IN_PROGRESS': { label: 'PROSES', color: 'text-amber-400 bg-amber-400/10', icon: 'clock_loader_40' },
      'CHEATED': { label: 'CURANG', color: 'text-error bg-error/10', icon: 'security_update_warning' },
      'FAILED_EFFORT': { label: 'TIDAK VALID', color: 'text-error bg-error/10', icon: 'report' },
      'TIME_UP': { label: 'TIMEOUT', color: 'text-on-surface-variant bg-surface-variant', icon: 'timer_off' },
      'REMEDIAL': { 
        label: teacherReviewed ? 'DIKOREKSI' : 'ANTREAN', 
        color: teacherReviewed ? 'text-tertiary bg-tertiary/10' : 'text-amber-400 bg-amber-400/10',
        icon: teacherReviewed ? 'done_all' : 'pending_actions'
      }
    };

    const s = config[status] || { label: status, color: 'text-on-surface-variant bg-surface-variant', icon: 'info' };
    
    return (
      <div className={`px-2 py-1 rounded-lg border border-outline-variant flex items-center gap-1.5 ${s.color}`}>
        <span className="material-symbols-outlined text-[12px] font-bold">{s.icon}</span>
        <span className="text-[9px] font-black uppercase tracking-widest leading-none">{s.label}</span>
      </div>
    );
  };

  return (
    <div className="font-body text-on-surface selection:bg-tertiary/30 min-h-dvh flex flex-col bg-surface relative overflow-x-hidden">
      
      {/* Editorial TopBar */}
      <header className="fixed top-0 w-full z-50 bg-surface-container/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-surface-variant rounded-lg transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline font-bold text-lg tracking-tight text-primary uppercase">Remedial Center</h1>
        </div>
        <div className="h-8 w-8 rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-bright flex items-center justify-center">
            <User size={18} className="text-on-surface-variant" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-20 pb-32 px-4 sm:px-6 lg:px-10 flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Editorial Header & Session Picker */}
        <section className="flex flex-col gap-4">
          <div className="space-y-3">
            <span className="font-label text-[10px] uppercase tracking-[0.15em] text-tertiary-dim font-black">Data Management</span>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <h2 className="font-headline text-2xl font-black tracking-tight leading-tight uppercase">
                PUSAT DATA REMEDIAL
              </h2>
              
              {/* Dropdown Pemilihan Sesi */}
              <div className="relative min-w-[260px] w-full sm:w-auto z-20">
                <select 
                  className="w-full bg-surface-container border border-outline-variant/30 text-primary font-bold text-xs py-3.5 px-4 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer transition-all hover:bg-surface-container-high"
                  onChange={(e) => {
                    const selected = sessions.find(s => s.id === e.target.value);
                    if (selected && onSessionSelect) {
                       // Reset searchQuery and local states if needed
                       setSearchQuery('');
                       onSessionSelect(selected);
                    }
                  }}
                  value={activeSessionId || ""}
                  disabled={!isAdmin}
                >
                  <option value="" disabled>-- Pilih Kelas & Sesi --</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      Kelas {s.class_name || 'Umum'} - {s.session_name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>
          
          {/* Advanced Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
            {[
              { label: 'Kelas', value: displayClass },
              { label: 'Tahun', value: academicYear.replace('20', '') },
              { label: 'Semester', value: semester },
              { label: 'Subjek', value: subject },
            ].map(f => (
              <div key={f.label} className="bg-surface-container-low p-3 rounded-2xl flex flex-col gap-1 items-start border border-white/[0.03]">
                <span className="font-label text-[9px] text-on-surface-variant uppercase font-black tracking-widest leading-none">{f.label}</span>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-primary truncate pr-1">{f.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dynamic Stats Cards */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-primary' },
            { label: 'Antrean', value: stats.waitingReview, color: 'text-tertiary-dim' },
            { label: 'Isu', value: stats.issue, color: 'text-error' },
          ].map(st => (
            <div key={st.label} className="bg-surface-container p-4 rounded-3xl flex flex-col gap-1 items-center border border-white/[0.03] shadow-sm">
              <span className={`text-3xl font-headline font-black ${st.color}`}>{st.value}</span>
              <span className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60 font-black">{st.label}</span>
            </div>
          ))}
        </section>

        {/* Editorial Search Bar */}
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-tertiary transition-colors">search</span>
          <input 
            type="text"
            placeholder="Cari nama siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!isAdmin}
            className="w-full bg-surface-container-low border-none rounded-2xl py-4.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-tertiary/20 transition-all shadow-sm outline-none disabled:opacity-50" 
          />
        </div>

        {/* Student List Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {!activeSessionId ? (
            <div className="lg:col-span-2 flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-outline-variant/30 rounded-3xl bg-surface-container-lowest">
               <div className="w-16 h-16 rounded-3xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-6">
                 <span className="material-symbols-outlined text-4xl">inventory_2</span>
               </div>
               <h3 className="font-headline text-lg font-bold text-on-surface mb-2 uppercase tracking-tight">Pilih Sesi Ujian</h3>
               <p className="text-on-surface-variant/70 text-[11px] font-bold max-w-[250px] leading-relaxed uppercase tracking-widest">
                 Pilih kelas dan sesi ujian dari dropdown di atas untuk mengelola data remedial.
               </p>
            </div>
          ) : remedialStudents.length === 0 ? (
            <div className="lg:col-span-2 flex flex-col items-center justify-center py-16 text-center">
               <div className="relative mb-6">
                <div className="absolute inset-0 bg-tertiary/5 blur-[60px] rounded-full scale-150"></div>
                <div className="relative h-20 w-20 bg-surface-container-high rounded-full flex items-center justify-center border border-outline-variant/10">
                  <span className="material-symbols-outlined text-4xl text-tertiary/30 animate-pulse">radar</span>
                </div>
              </div>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-1 uppercase tracking-tight">Data Kosong</h3>
              <p className="text-on-surface-variant/50 text-[11px] font-bold max-w-[200px] leading-relaxed uppercase tracking-widest">
                Belum ada records untuk filter yang aktif.
              </p>
            </div>
          ) : (
            remedialStudents.map((student) => {
              const isSelected = selectedStudentId === student.id;
              return (
                <div 
                  key={student.id}
                  className={`bg-surface-container rounded-3xl border transition-all duration-300 overflow-hidden ${
                    isSelected ? 'ring-1 ring-tertiary/20 border-tertiary/10 bg-surface-container-high' : 'border-white/[0.03] active:bg-surface-container-low'
                  }`}
                >
                   {/* Card Basic Info */}
                   <div 
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => setSelectedStudentId(isSelected ? null : student.id)}
                   >
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border ${
                            student.remedialStatus === 'CHEATED' ? 'border-error/30' : 'border-outline-variant/20'
                          }`}>
                             {student.remedialPhoto ? (
                               <img src={student.remedialPhoto} alt={student.name} className="w-full h-full object-cover" />
                             ) : (
                               <User size={20} className="text-on-surface-variant/40" />
                             )}
                          </div>
                          {student.isCheated && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-on-surface rounded-full flex items-center justify-center border-2 border-surface shadow-lg">
                               <span className="material-symbols-outlined text-[10px] font-black">gpp_maybe</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-headline font-bold text-sm text-primary uppercase tracking-tight truncate max-w-[150px]">{student.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                             {getStatusBadge(student.remedialStatus || '', student.teacherReviewed)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                         <div className="text-right flex flex-col items-end">
                            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Final Score</span>
                            <span className="text-lg font-headline font-black text-primary leading-none">
                              {student.finalScoreLocked || student.finalScore}
                            </span>
                         </div>
                          {(student.remedialStatus === 'TIMEOUT' || student.remedialStatus === 'TIME_UP' || student.remedialStatus === 'ACTIVE') && (
                            <button 
                             onClick={(e) => handleExtendTimePrompt(e, student.id, student.name)}
                             disabled={!isAdmin || isExtending === student.id}
                             className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-1.5 text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-30 active:scale-95"
                             title="Tambah waktu remedial siswa"
                            >
                               {isExtending === student.id ? <Clock size={12} className="animate-spin" /> : <Clock size={12} />}
                               <span className="text-[9px] font-black uppercase tracking-widest leading-none">Tambah Waktu</span>
                            </button>
                          )}

                          <button 
                           onClick={(e) => handleResetRemedial(e, student.id, student.name)}
                           disabled={!isAdmin || isDeleting === student.id}
                           className="px-3 py-1.5 rounded-xl bg-error/10 border border-error/20 flex items-center gap-1.5 text-error hover:bg-error hover:text-on-error transition-all disabled:opacity-30 active:scale-95"
                           title="Berikan kesempatan ulang kepada siswa ini"
                          >
                             {isDeleting === student.id ? <Clock size={12} className="animate-spin" /> : <RotateCcw size={12} strokeWidth={3} />}
                             <span className="text-[9px] font-black uppercase tracking-widest leading-none">Set Ulang</span>
                          </button>
                      </div>
                   </div>

                   {/* Card Expanded Details */}
                   {isSelected && (
                     <div className="px-4 pb-6 pt-2 border-t border-white/[0.05] animate-in slide-in-from-top-2 duration-300">
                        
                        {/* Cheating Alerts */}
                        {student.isCheated && student.cheatingFlags && student.cheatingFlags.length > 0 && (
                          <div className="mb-6 p-4 bg-error/5 border border-error/10 rounded-2xl flex gap-3">
                             <span className="material-symbols-outlined text-error text-xl shrink-0">security_update_warning</span>
                             <div>
                               <h5 className="text-[10px] font-black uppercase tracking-widest text-error mb-1.5">Indikasi Pelanggaran</h5>
                               <ul className="space-y-1">
                                 {student.cheatingFlags.map((flag, idx) => (
                                   <li key={idx} className="text-[10px] font-bold text-error/70 flex items-center gap-1.5 lowercase">
                                      <div className="w-1 h-1 rounded-full bg-error/40" /> {flag}
                                   </li>
                                 ))}
                               </ul>
                             </div>
                          </div>
                        )}

                        {/* Location / Meta */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                           <div className="bg-surface-container-low p-3 rounded-2xl flex items-center gap-3">
                              <span className="material-symbols-outlined text-tertiary/60 text-lg">location_on</span>
                              <div className="min-w-0">
                                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 leading-none mb-1">Location</p>
                                <p className="text-[10px] font-bold text-on-surface-variant truncate">{student.remedialLocation || 'N/A'}</p>
                              </div>
                           </div>
                           <div className="bg-surface-container-low p-3 rounded-2xl flex items-center gap-3">
                              <span className="material-symbols-outlined text-tertiary/60 text-lg">description</span>
                              <div className="min-w-0">
                                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 leading-none mb-1">Soal Essay</p>
                                <p className="text-[10px] font-bold text-on-surface-variant">{scoringConfig.remedialQuestions?.length || 0} Records</p>
                              </div>
                           </div>
                        </div>

                        {/* Evaluasi Guru Section */}
                        {(student.remedialStatus === 'REMEDIAL' || student.remedialStatus === 'COMPLETED') && !student.isCheated && (
                          <section className="mb-6">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">edit_note</span> Evaluasi Akademik
                            </h5>
                            <div className="bg-surface-container-low p-4 rounded-3xl border border-white/[0.03]">
                               <div className="flex flex-col gap-4">
                                  <div className="w-full">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-2 block pl-1">Input Nilai Remedial (0-100)</label>
                                     <input 
                                       type="number"
                                       className="w-full bg-surface-container-lowest border-none rounded-2xl p-4 text-sm font-black text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-tertiary/30 outline-none disabled:opacity-50"
                                       placeholder="Murni..."
                                       value={reviewScore || (student.remedialScore || '')}
                                       onChange={(e) => setReviewScore(e.target.value)}
                                       disabled={!isAdmin || student.remedialStatus === 'COMPLETED' || isSubmitting}
                                     />
                                  </div>
                                  {student.remedialStatus === 'REMEDIAL' && (
                                    <div className="flex gap-2">
                                       <button 
                                         onClick={() => submitReview(student.id, 'review')}
                                         disabled={!isAdmin || isSubmitting || !reviewScore}
                                         className="flex-1 py-3 bg-surface-bright text-primary text-[10px] font-black uppercase tracking-widest rounded-2xl disabled:opacity-30 border border-outline-variant active:scale-95 transition-transform"
                                       >
                                         Update
                                       </button>
                                       {student.teacherReviewed && (
                                         <button 
                                           onClick={() => submitReview(student.id, 'finalize')}
                                           disabled={!isAdmin || isSubmitting}
                                           className="flex-1 py-3 bg-tertiary text-on-tertiary text-[10px] font-black uppercase tracking-widest rounded-2xl disabled:opacity-30 active:scale-95 transition-transform shadow-[0_0_20px_rgba(155,255,206,0.15)]"
                                         >
                                           Finalisasi
                                         </button>
                                       )}
                                    </div>
                                  )}
                               </div>
                               {student.teacherReviewed && student.remedialStatus !== 'COMPLETED' && (
                                 <p className="mt-3 text-[9px] text-tertiary/70 font-bold tracking-tight text-center italic leading-tight">
                                   Status: Koreksi tersimpan. Klik Finalisasi untuk memasukkan ke KKM ({kkm}).
                                 </p>
                               )}
                            </div>
                          </section>
                        )}

                        {/* Answers List */}
                        <section className="space-y-4">
                           <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 flex justify-between items-center">
                              <span>Jawaban Siswa</span>
                              <span className="text-tertiary-dim lowercase">Auto Score: {student.essayScoreAuto || 0}</span>
                           </h5>
                           {student.remedialAnswers?.map((ans, idx) => {
                             const detail = student.essayAutoDetails?.[idx];
                             return (
                               <div key={idx} className="bg-surface-container-lowest p-4 rounded-3xl border border-white/[0.03]">
                                  <div className="flex justify-between items-center mb-3">
                                     <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/30">Soal {idx + 1}</span>
                                     {detail && (
                                       <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                         detail.similarity > 0.7 ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'
                                       }`}>
                                          Matches: {Math.round(detail.similarity * 100)}%
                                       </div>
                                     )}
                                  </div>
                                  <p className="text-[11px] font-bold text-on-surface-variant/60 leading-relaxed mb-3">"{scoringConfig.remedialQuestions?.[idx]}"</p>
                                  <div className="bg-surface-container-high/40 p-3 rounded-2xl text-[11px] font-medium text-primary italic leading-relaxed border-l-2 border-tertiary/40">
                                     "{ans || 'Kosong'}"
                                  </div>
                               </div>
                             );
                           })}
                        </section>
                     </div>
                   )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 w-full z-40 px-6 pb-6 pt-4 bg-gradient-to-t from-surface via-surface/90 to-transparent pointer-events-none">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex flex-col md:flex-row gap-3 pointer-events-auto items-center">
            <div className="flex gap-3 w-full md:w-auto flex-1">
              <button 
                onClick={() => setIsEditing(true)}
                disabled={!activeSessionId}
                className="flex-1 h-14 bg-gradient-to-br from-[#f9f9f9] to-[#a0a1a1] text-on-primary-container rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 premium-shadow active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
              >
                <span className="material-symbols-outlined">auto_fix_high</span>
                Atur Soal
              </button>
              <button 
                onClick={generateAndCopyPendingList}
                disabled={!activeSessionId || isEditing}
                className={`flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 premium-shadow ${
                  copied 
                    ? 'bg-tertiary text-on-tertiary' 
                    : 'bg-surface-container border-2 border-error/40 text-error hover:bg-error/10'
                }`}
              >
                <span className="material-symbols-outlined">{copied ? 'check_circle' : 'content_copy'}</span>
                {copied ? 'Tersalin' : 'Tagih Siswa'}
              </button>
            </div>
            <button 
              onClick={onBack}
              className="w-full md:w-auto px-6 py-4 text-on-surface-variant/70 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high rounded-2xl"
            >
               <span className="material-symbols-outlined text-sm">arrow_back</span>
               Menu Utama
            </button>
         </div>
      </div>

      {/* Premium Slide-Up Sheet for Editor */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
           
           {/* Sheet Content */}
           <div className="absolute bottom-0 w-full max-w-xl left-1/2 -translate-x-1/2 bg-surface-container-highest rounded-t-3xl p-6 premium-shadow animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] overflow-y-auto flex flex-col gap-6 custom-scrollbar">
              
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-outline/20 rounded-full mx-auto mb-2 shrink-0" />

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-headline font-black text-xl text-primary uppercase tracking-tight">Atur Soal Remedial</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">Konfigurasi Essay System</p>
                </div>
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              {/* Editor Fields */}
              <div className="flex flex-col gap-6">
                 {/* Timer Config */}
                 <div className="flex flex-col gap-2 relative">
                    <label className="font-label text-[10px] text-tertiary-dim uppercase font-black tracking-widest pl-1">
                      <Clock size={12} className="inline mr-1" /> Durasi Remedial (Menit)
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="180" 
                      value={localTimer} 
                      onChange={(e) => setLocalTimer(Number(e.target.value))} 
                      disabled={!isAdmin}
                      className="w-full bg-surface-container-lowest border-none rounded-2xl p-5 text-sm font-medium text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-tertiary/40 transition-all outline-none disabled:opacity-50"
                    />
                 </div>

                 {/* Deadline Config */}
                 <div className="flex flex-col gap-2 relative">
                    <label className="font-label text-[10px] text-error uppercase font-black tracking-widest pl-1">
                      Tenggat Waktu / Auto-Lock (Opsional)
                    </label>
                    <input 
                      type="datetime-local" 
                      value={localDeadline} 
                      onChange={(e) => setLocalDeadline(e.target.value)} 
                      disabled={!isAdmin}
                      className="w-full bg-surface-container-lowest border-none rounded-2xl p-5 text-sm font-medium text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-error/40 transition-all outline-none disabled:opacity-50"
                    />
                    <p className="text-[10px] text-on-surface-variant/50 px-2 font-medium">Jika diisi, siswa akan otomatis terkunci dan dianggap tidak tuntas jika melewati waktu ini.</p>
                 </div>

                 {/* Questions */}
                  <div className="flex flex-col gap-2 relative">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-[10px] text-tertiary-dim uppercase font-black tracking-widest pl-1">Pertanyaan Essay (Format: 1. Soal)</label>
                      <button 
                        onClick={() => onRemedialInputChange?.(handleAutoFormatList(remedialQuestionsInput))}
                        className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-tertiary transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[12px]">format_list_numbered</span>
                        Auto Format
                      </button>
                    </div>
                    <textarea 
                      className="w-full bg-surface-container-lowest border-none rounded-3xl p-5 text-sm font-medium text-primary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-tertiary/40 transition-all outline-none resize-none min-h-[160px] disabled:opacity-50"
                      placeholder="Tekan enter untuk soal baru. Nomor akan dibuat otomatis..."
                      value={remedialQuestionsInput}
                      onChange={(e) => onRemedialInputChange?.(e.target.value)}
                      onBlur={(e) => onRemedialInputChange?.(handleAutoFormatList(e.target.value))}
                      disabled={!isAdmin}
                    />
                 </div>
                 
                 {/* Answer Keys */}
                 <div className="flex flex-col gap-2 relative">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-[10px] text-tertiary uppercase font-black tracking-widest pl-1">Kunci Jawaban (Similarity Matcher)</label>
                      <button 
                        onClick={() => onAnswerKeysInputChange?.(handleAutoFormatList(remedialAnswerKeysInput))}
                        className="text-[9px] font-black uppercase tracking-widest text-tertiary hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[12px]">format_list_numbered</span>
                        Auto Format
                      </button>
                    </div>
                    <textarea 
                      className="w-full bg-surface-container-lowest border-none rounded-3xl p-5 text-sm font-medium text-tertiary placeholder:text-on-surface-variant/20 focus:ring-1 focus:ring-tertiary/40 transition-all outline-none resize-none min-h-[160px] disabled:opacity-50"
                      placeholder="Tekan enter untuk jawaban baru..."
                      value={remedialAnswerKeysInput}
                      onChange={(e) => onAnswerKeysInputChange?.(e.target.value)}
                      onBlur={(e) => onAnswerKeysInputChange?.(handleAutoFormatList(e.target.value))}
                      disabled={!isAdmin}
                    />
                 </div>

                 {/* Alerts */}
                 {parseEssayQuestions(remedialQuestionsInput).length === 0 && (
                   <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3">
                      <span className="material-symbols-outlined text-error">warning</span>
                      <p className="text-[9px] font-black text-error uppercase tracking-widest">Satu atau lebih soal wajib diisi agar sistem aktif.</p>
                   </div>
                 )}
              </div>

              {/* Footer Save */}
              <div className="pt-4 sticky bottom-0 bg-surface-container-highest pb-2">
                <button 
                  onClick={handleSaveQuestions}
                  disabled={!isAdmin || isSaving}
                  className="w-full h-14 bg-tertiary text-on-tertiary rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSaving ? <Clock size={18} className="animate-spin" /> : <Save size={18} />}
                  Simpan Konfigurasi
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Bottom OLED Safe Area Padding */}
      <div className="h-safe bg-surface-container shrink-0" />
      


      {/* Dynamic Styling for Custom Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        
        .shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          transform: translate3d(0, 0, 0);
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>

    </div>
  );
}
