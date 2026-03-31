"use client";

import React, { useState } from 'react';
import { 
  ArrowLeft, RefreshCcw, User, MapPin, Clock, Eye, CheckCircle2, AlertTriangle, AlertCircle, FileText, Search, ChevronDown, ChevronUp, Plus, Trash2, Save, Settings2, ShieldAlert, Check, RotateCcw
} from 'lucide-react';
import { GradedStudent, ScoringConfig } from '@/lib/grademaster/types';

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
  onUpdateRemedial?: (questions: string[], keys: string[]) => void;
  remedialQuestionsInput?: string;
  onRemedialInputChange?: (v: string) => void;
  remedialAnswerKeysInput?: string;
  onAnswerKeysInputChange?: (v: string) => void;
  isSaving?: boolean;
}

export default function RemedialDashboardLayer({
  gradedStudents,
  kkm,
  scoringConfig,
  examType = "UTS",
  academicYear = "2025/2026",
  studentClass = "10A",
  subject = "Matematika",
  schoolLevel = "SMA",
  semester = "Ganjil",
  onBack,
  onUpdateRemedial,
  remedialQuestionsInput = "",
  onRemedialInputChange,
  remedialAnswerKeysInput = "",
  onAnswerKeysInputChange,
  isSaving = false
}: RemedialDashboardLayerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [reviewScore, setReviewScore] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleSaveQuestions = () => {
    onUpdateRemedial?.(
      parseEssayQuestions(remedialQuestionsInput),
      parseEssayQuestions(remedialAnswerKeysInput)
    );
    setIsEditing(false);
  };

  function parseEssayQuestions(input: string): string[] {
    const questions = input.split(/\d+\./).map(s => s.trim()).filter(Boolean);
    return questions;
  }

  const resetEditing = () => {
    setIsEditing(false);
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

  const remedialStudents = gradedStudents.filter(s => 
    s.remedialStatus && s.remedialStatus !== 'NONE' && !deletedIds.includes(s.id)
  ).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: remedialStudents.length,
    completed: remedialStudents.filter(s => s.remedialStatus === 'SUBMITTED' || s.remedialStatus === 'COMPLETED').length,
    failed: remedialStudents.filter(s => s.remedialStatus === 'FAILED_EFFORT').length,
    cheated: remedialStudents.filter(s => s.remedialStatus === 'CHEATED').length,
    timeout: remedialStudents.filter(s => s.remedialStatus === 'TIME_UP' || s.remedialStatus === 'TIMEOUT').length,
    waitingReview: remedialStudents.filter(s => s.remedialStatus === 'REMEDIAL' && !s.teacherReviewed).length
  };

  const getStatusBadge = (status: string, teacherReviewed?: boolean) => {
    switch (status) {
      case 'SUBMITTED':
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.1)]"><CheckCircle2 size={10}/> SELESAI (VALID)</span>;
      case 'ACTIVE':
      case 'INITIATED':
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.1)]"><Clock size={10}/> PROSES</span>;
      case 'CHEATED':
        return <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(244,63,94,0.1)]"><ShieldAlert size={10}/> CURANG</span>;
      case 'FAILED_EFFORT':
      case 'FAILED':
        return <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(244,63,94,0.1)]"><AlertTriangle size={10}/> TIDAK VALID</span>;
      case 'TIME_UP':
      case 'TIMEOUT':
        return <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> WAKTU HABIS</span>;
      case 'REMEDIAL':
        if (teacherReviewed) {
           return <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(14,165,233,0.1)]"><Check size={10}/> SUDAH DIKOREKSI</span>;
        } else {
           return <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(249,115,22,0.1)]"><Clock size={10}/> BELUM DIKOREKSI</span>;
        }
      default:
        return <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10 text-[10px] font-black uppercase tracking-wider">{status}</span>;
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

  return (
    <div className="bg-slate-950 min-h-screen text-white p-3 sm:p-5 lg:p-8 w-full max-w-5xl mx-auto px-4 md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-primary/20">
            <RefreshCcw size={12} /> Management Remedial
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-outfit uppercase">
            Pusat Data Remedial <span className="text-primary">{examType}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
             <DarkBadge color="emerald">Kelas {studentClass} ({schoolLevel})</DarkBadge>
             <DarkBadge color="amber">{academicYear}</DarkBadge>
             <DarkBadge color="indigo">Semester {semester}</DarkBadge>
             <DarkBadge color="slate">{subject}</DarkBadge>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border ${
              isEditing ? 'bg-primary text-white border-primary/20 shadow-xl shadow-primary/20' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Settings2 size={16} /> {isEditing ? 'Tutup' : 'Atur Soal'}
          </button>

          <div className="flex flex-1 items-center gap-2 bg-slate-900/40 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-xl overflow-x-auto">
             <div className="flex flex-col items-center px-4 py-2 border-r border-white/5 min-w-fit">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-1">Total</span>
                <span className="text-lg font-black text-white">{stats.total}</span>
             </div>
             <div className="flex flex-col items-center px-4 py-2 border-r border-white/5 min-w-fit">
                <span className="text-[10px] font-black text-orange-400/60 uppercase tracking-tighter leading-none mb-1">Antrean</span>
                <span className="text-lg font-black text-orange-400">{stats.waitingReview}</span>
             </div>
             <div className="flex flex-col items-center px-4 py-2 min-w-fit">
                <span className="text-[10px] font-black text-rose-400/60 uppercase tracking-tighter leading-none mb-1">Isu</span>
                <span className="text-lg font-black text-rose-400">{stats.cheated + stats.timeout}</span>
             </div>
          </div>
        </div>
      </header>

      {/* Question Editor Section */}
      {isEditing && (
        <div className="mb-8 p-6 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
           <div className="flex items-center justify-between mb-6">
              <div>
                 <h2 className="text-white font-black text-lg tracking-tight uppercase">Pengaturan Soal Remedial</h2>
                 <p className="text-slate-400 text-xs font-bold leading-relaxed">Daftar pertanyaan essay yang akan dijawab siswa saat melakukan remedial.</p>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={resetEditing} className="px-4 py-2 text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">Batal</button>
                 <button 
                   onClick={handleSaveQuestions}
                   disabled={isSaving}
                   className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                 >
                   {isSaving ? 'Menyimpan...' : <><Save size={14}/> Simpan Soal</>}
                 </button>
              </div>
           </div>

            {parseEssayQuestions(remedialQuestionsInput).length === 0 && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
                <AlertCircle className="text-amber-400 shrink-0" size={20} />
                <p className="text-[11px] font-black text-amber-400 uppercase tracking-tight">Perhatian: Anda belum memasukkan soal. Siswa tidak akan bisa mengerjakan remedial jika soal kosong.</p>
              </div>
            )}

            <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bagian Kiri: List Pertanyaan */}
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Ketik Soal (Format: 1. Soal A 2. Soal B)</label>
                        <textarea 
                           className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-y placeholder:text-slate-700"
                           rows={6}
                           placeholder="1. Jelaskan pengertian... 2. Sebutkan contoh..."
                           value={remedialQuestionsInput}
                           onChange={(e) => onRemedialInputChange?.(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Preview Deteksi Soal ({parseEssayQuestions(remedialQuestionsInput).length})</label>
                        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 max-h-[220px] overflow-y-auto space-y-2 custom-scrollbar">
                           {parseEssayQuestions(remedialQuestionsInput).map((q, idx) => (
                              <div key={idx} className="flex gap-3 text-[11px] text-slate-400">
                                 <span className="font-black text-primary">{idx + 1}.</span>
                                 <span className="leading-relaxed">"{q}"</span>
                              </div>
                           ))}
                           {parseEssayQuestions(remedialQuestionsInput).length === 0 && <p className="text-[10px] text-slate-700 font-bold italic">Belum ada soal terdeteksi.</p>}
                        </div>
                     </div>
                  </div>

                  {/* Bagian Kanan: List Kunci Jawaban */}
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 mb-2 block ml-1">Ketik Kunci Jawaban (Format: 1. Kunci A 2. Kunci B)</label>
                        <textarea 
                           className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-sm font-medium text-emerald-100/80 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-y placeholder:text-emerald-900/50"
                           rows={6}
                           placeholder="1. Jawaban dari soal 1 adalah... 2. Jawaban soal 2 adalah..."
                           value={remedialAnswerKeysInput}
                           onChange={(e) => onAnswerKeysInputChange?.(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 mb-2 block ml-1">Preview Deteksi Kunci ({parseEssayQuestions(remedialAnswerKeysInput).length})</label>
                        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 max-h-[220px] overflow-y-auto space-y-2 custom-scrollbar">
                           {parseEssayQuestions(remedialAnswerKeysInput).map((ak, idx) => (
                              <div key={idx} className="flex gap-3 text-[11px] text-emerald-400/50">
                                 <span className="font-black text-emerald-500">{idx + 1}.</span>
                                 <span className="leading-relaxed">"{ak}"</span>
                              </div>
                           ))}
                           {parseEssayQuestions(remedialAnswerKeysInput).length === 0 && <p className="text-[10px] text-emerald-900/30 font-bold italic">Belum ada kunci jawaban terdeteksi.</p>}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
       )}

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
        <input 
          type="text"
          placeholder="Cari nama siswa..."
          className="w-full bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-xl placeholder:text-slate-600"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {remedialStudents.length === 0 ? (
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-12 text-center border-2 border-dashed border-white/10">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-xl">
            <RefreshCcw size={32} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Belum Ada Data Remedial</h3>
          <p className="text-sm text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">Siswa yang melakukan pengerjaan ulang akan otomatis muncul di sini beserta jawaban dan lokasinya.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {remedialStudents.map((student) => (
            <div 
              key={student.id} 
              className={`bg-slate-900/40 backdrop-blur-xl rounded-3xl border transition-all overflow-hidden relative group ${
                selectedStudentId === student.id ? 'border-primary ring-4 ring-primary/10' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div 
                className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setSelectedStudentId(selectedStudentId === student.id ? null : student.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border-2 ${
                    student.remedialStatus === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    student.remedialStatus === 'CHEATED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-white/5 text-slate-500 border-white/10'
                  }`}>
                    {student.remedialPhoto ? (
                      <img src={student.remedialPhoto} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base md:text-lg uppercase tracking-tight group-hover:text-primary transition-colors">{student.name}</h3>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] md:text-xs font-bold">
                        <MapPin size={12} className="text-primary/50" /> {student.remedialLocation || 'Lokasi tidak diketahui'}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] md:text-xs font-bold">
                        <FileText size={12} className="text-primary/50" /> {scoringConfig.remedialQuestions?.length || 0} Soal Essay
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                  <div className="flex items-center gap-3 md:gap-4 text-right flex-1 md:flex-none justify-end">
                    <div className="flex flex-col shrink-0">
                       <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Awal</span>
                       <span className="text-sm font-black text-slate-300">{student.originalScore || student.finalScore}</span>
                    </div>
                    {student.remedialStatus === 'COMPLETED' && (
                      <div className="flex flex-col border-l border-white/10 pl-3 md:pl-4 shrink-0">
                         <span className="text-[10px] text-primary/60 font-bold uppercase tracking-widest leading-none mb-1">Rem</span>
                         <span className="text-sm font-black text-primary">{student.remedialScore}</span>
                      </div>
                    )}
                    <div className="flex flex-col border-l border-white/10 pl-3 md:pl-4 items-end shrink-0">
                      <div className="mb-2 text-right">
                        {student.remedialStatus === 'COMPLETED' && student.isCheated ? (
                           <div className="flex flex-col items-end gap-1">
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={9}/> DITANDAI SISTEM</span>
                              {getStatusBadge('COMPLETED')}
                           </div>
                        ) : getStatusBadge(student.remedialStatus || '', student.teacherReviewed)}
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Akhir: <span className="text-primary">{student.finalScoreLocked || student.finalScore}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => handleResetRemedial(e, student.id, student.name)}
                      disabled={isDeleting === student.id}
                      className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20"
                      title="Reset Remedial"
                    >
                      {isDeleting === student.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RotateCcw size={16} />}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-primary/20 group-hover:text-primary transition-colors border border-white/10">
                      {selectedStudentId === student.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>
              </div>

              {selectedStudentId === student.id && (
                <div className="px-4 pb-6 md:px-6 md:pb-8 border-t border-white/5 bg-slate-950/20 animate-in slide-in-from-top-4">
                  <div className="mt-6 space-y-6">
                    {/* Cheating Alerts */}
                    {student.isCheated && student.cheatingFlags && student.cheatingFlags.length > 0 && (
                      <div className={`p-4 border rounded-2xl flex gap-3 shadow-xl ${student.remedialStatus === 'CHEATED' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                         <ShieldAlert className={student.remedialStatus === 'CHEATED' ? 'text-rose-500 shrink-0' : 'text-amber-500 shrink-0'} size={20} />
                         <div>
                           <h4 className={`text-sm font-black tracking-tight uppercase ${student.remedialStatus === 'CHEATED' ? 'text-rose-400' : 'text-amber-400'}`}>
                             {student.remedialStatus === 'CHEATED' ? 'Sistem Memblokir Sesi (Curang)' : 'Aktivitas Tidak Biasa Terdeteksi'}
                           </h4>
                           <ul className={`mt-2 list-disc list-inside text-xs font-bold space-y-1 ${student.remedialStatus === 'CHEATED' ? 'text-rose-400/70' : 'text-amber-400/70'}`}>
                             {student.cheatingFlags.map((flag, idx) => <li key={idx}>{flag}</li>)}
                           </ul>
                           <p className={`mt-2 text-[10px] font-black uppercase tracking-tight ${student.remedialStatus === 'CHEATED' ? 'text-rose-500/50' : 'text-amber-500/50'}`}>
                             {student.remedialStatus === 'CHEATED' 
                               ? 'Siswa ini telah diblokir secara permanen dari sesi ini dan nilai otomatis menjadi 0.' 
                               : 'Siswa tetap dapat mengerjakan, namun sistem menandai adanya indikasi aktivitas tidak biasa untuk ditinjau oleh guru.'}
                           </p>
                         </div>
                      </div>
                    )}

                    {/* Teacher Action Panel */}
                    {(student.remedialStatus === 'REMEDIAL' || student.remedialStatus === 'COMPLETED') && !student.isCheated && (
                      <div className="p-5 bg-slate-900/40 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-2xl">
                         <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                           Evaluasi Guru
                         </h4>
                         
                         <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full">
                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Input Nilai Remedial (0 - 100)</label>
                               <input 
                                 type="number" 
                                 className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-black text-white outline-none focus:border-primary transition-all" 
                                 placeholder="Masukkan nilai murni remedial..."
                                 value={reviewScore || (student.remedialScore || '')}
                                 onChange={(e) => setReviewScore(e.target.value)}
                                 disabled={student.remedialStatus === 'COMPLETED' || isSubmitting}
                               />
                            </div>
                            
                            {student.remedialStatus === 'REMEDIAL' && (
                              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                                <button 
                                  onClick={() => submitReview(student.id, 'review')}
                                  disabled={isSubmitting || !reviewScore}
                                  className="flex-1 md:flex-none px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-all shadow-xl shadow-primary/20 active:scale-95"
                                >
                                  Simpan Koreksi
                                </button>
                                {student.teacherReviewed && (
                                  <button 
                                    onClick={() => submitReview(student.id, 'finalize')}
                                    disabled={isSubmitting}
                                    className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                                  >
                                    Finalisasi Nilai
                                  </button>
                                )}
                              </div>
                            )}
                         </div>
                         {student.teacherReviewed && student.remedialStatus !== 'COMPLETED' && (
                           <p className="mt-3 text-[10px] text-primary font-black uppercase tracking-tight italic">* KOREKSI PERTAMA DISIMPAN! Klik Finalisasi Nilai untuk merekap ke nilai akhir (maksimal sesuai KKM {kkm}).</p>
                         )}
                      </div>
                    )}

                    {/* Remedial Answers with Auto-Scoring */}
                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-4">
                        <FileText size={14} className="text-primary/60" /> Jawaban Essay Remedial
                        {student.essayScoreAuto !== undefined && (
                          <span className="ml-auto text-primary normal-case tracking-normal">
                            Skor Otomatis: <strong className="text-white">{student.essayScoreAuto}</strong>
                            {student.essayScoreManual !== undefined && (
                              <span className="text-emerald-400 ml-3">| Override Guru: <strong className="text-white">{student.essayScoreManual}</strong></span>
                            )}
                          </span>
                        )}
                      </h4>
                      <div className="space-y-4">
                        {scoringConfig.remedialQuestions?.map((q, idx) => {
                           const detail = student.essayAutoDetails?.[idx];
                           const ansKey = scoringConfig.remedialAnswerKeys?.[idx];
                           return (
                            <div key={idx} className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 md:p-5 border border-white/10 shadow-xl group/q">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Soal {idx + 1}</div>
                                {detail && (
                                  <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                                      detail.similarity >= 0.85 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                      detail.similarity >= 0.70 ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                      detail.similarity >= 0.50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                      Similarity: {Math.round(detail.similarity * 100)}%
                                    </span>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Skor: <span className="text-white ml-1">{detail.score}</span></span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm font-black text-white mb-4 leading-relaxed group-hover/q:text-primary transition-colors">{q}</p>
                              
                              <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 text-xs font-bold text-emerald-400/80 leading-relaxed mb-3">
                                <span className="text-[9px] uppercase tracking-widest text-emerald-500/40 block mb-1">Kunci Jawaban:</span>
                                {ansKey}
                              </div>

                              <div className="bg-slate-900 border border-white/5 rounded-xl p-3 text-xs font-bold text-slate-400 leading-relaxed italic">
                                <span className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1 not-italic font-black">Jawaban Siswa:</span>
                                &quot;{student.remedialAnswers?.[idx] || '(Tidak ada jawaban)'}&quot;
                              </div>
                            </div>
                           );
                        })}
                      </div>
                    </div>

                    {/* Note */}
                    {student.remedialNote && (
                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-sm font-bold text-primary italic shadow-xl">
                        Catatan Siswa: <span className="text-white not-italic">&quot;{student.remedialNote}&quot;</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center pb-20">
        <button 
          onClick={onBack}
          className="py-3 px-8 text-slate-500 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 hover:bg-white/10 hover:text-primary transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={16} /> Kembali ke Menu Utama
        </button>
      </div>
    </div>
  );
}

function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' }) {
  return <DarkBadge color={color}>{children}</DarkBadge>;
}

function DarkBadge({ children, color = 'indigo' }: { children: React.ReactNode; color?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' }) {
  const colors = {
    indigo: 'bg-primary/10 text-primary border-primary/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    slate: 'bg-white/5 text-slate-300 border-white/10',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };
  return (
    <span className={`px-2 md:px-3 py-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-tight border ${colors[color]}`}>
      {children}
    </span>
  );
}
