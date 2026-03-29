"use client";

import React, { useState } from 'react';
import { 
  ArrowLeft, RefreshCcw, User, MapPin, Clock, Eye, CheckCircle2, AlertTriangle, FileText, Search, ChevronDown, ChevronUp, Plus, Trash2, Save, Settings2, ShieldAlert, Check, RotateCcw
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
    completed: remedialStudents.filter(s => s.remedialStatus === 'COMPLETED').length,
    active: remedialStudents.filter(s => s.remedialStatus === 'ACTIVE' || s.remedialStatus === 'INITIATED').length,
    cheated: remedialStudents.filter(s => s.remedialStatus === 'CHEATED').length,
    timeout: remedialStudents.filter(s => s.remedialStatus === 'TIMEOUT').length,
    waitingReview: remedialStudents.filter(s => s.remedialStatus === 'REMEDIAL' && !s.teacherReviewed).length
  };

  const getStatusBadge = (status: string, teacherReviewed?: boolean) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10}/> FINAL (SELESAI)</span>;
      case 'ACTIVE':
      case 'INITIATED':
        return <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> PROSES</span>;
      case 'CHEATED':
        return <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><ShieldAlert size={10}/> CURANG</span>;
      case 'COMPLETED':
        // If completed but was flagged by system, show a hybrid badge or just the normal badge?
        // Let's handle this in the render loop for the student card.
        return <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10}/> FINAL (SELESAI)</span>;
      case 'TIMEOUT':
        return <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> WAKTU HABIS</span>;
      case 'REMEDIAL':
        if (teacherReviewed) {
           return <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Check size={10}/> SUDAH DIKOREKSI</span>;
        } else {
           return <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> BELUM DIKOREKSI</span>;
        }
      default:
        return <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-black uppercase tracking-wider">{status}</span>;
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
    <div className="p-3 sm:p-5 lg:p-8 w-full max-w-5xl mx-auto px-4 md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-indigo-100">
            <RefreshCcw size={12} /> Management Remedial
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight font-outfit uppercase">
            Pusat Data Remedial <span className="text-indigo-600">{examType}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
             <Badge color="emerald">Kelas {studentClass} ({schoolLevel})</Badge>
             <Badge color="amber">{academicYear}</Badge>
             <Badge color="indigo">Semester {semester}</Badge>
             <Badge color="slate">{subject}</Badge>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border ${
              isEditing ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <Settings2 size={16} /> {isEditing ? 'Tutup' : 'Atur Soal'}
          </button>

          <div className="flex flex-1 items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
             <div className="flex flex-col items-center px-4 py-2 border-r border-slate-50 min-w-fit">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Total</span>
                <span className="text-lg font-black text-slate-700">{stats.total}</span>
             </div>
             <div className="flex flex-col items-center px-4 py-2 border-r border-slate-50 min-w-fit">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter leading-none mb-1">Antrean</span>
                <span className="text-lg font-black text-orange-600">{stats.waitingReview}</span>
             </div>
             <div className="flex flex-col items-center px-4 py-2 min-w-fit">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-tighter leading-none mb-1">Isu</span>
                <span className="text-lg font-black text-rose-600">{stats.cheated + stats.timeout}</span>
             </div>
          </div>
        </div>
      </header>

      {/* Question Editor Section */}
      {isEditing && (
        <div className="mb-8 p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
           <div className="flex items-center justify-between mb-6">
              <div>
                 <h2 className="text-white font-black text-lg tracking-tight">Pengaturan Soal Remedial</h2>
                 <p className="text-slate-400 text-xs font-bold">Daftar pertanyaan essay yang akan dijawab siswa saat melakukan remedial.</p>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={resetEditing} className="px-4 py-2 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">Batal</button>
                 <button 
                   onClick={handleSaveQuestions}
                   disabled={isSaving}
                   className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-900/20"
                 >
                   {isSaving ? 'Menyimpan...' : <><Save size={14}/> Simpan Soal</>}
                 </button>
              </div>
           </div>

            {parseEssayQuestions(remedialQuestionsInput).length === 0 && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <p className="text-xs font-bold text-amber-500">Peringatan: Anda belum memasukkan soal. Siswa tidak akan bisa mengerjakan remedial jika soal kosong.</p>
              </div>
            )}

            <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bagian Kiri: List Pertanyaan */}
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Ketik Soal (Format: 1. Soal A 2. Soal B)</label>
                        <textarea 
                           className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm font-medium text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-y"
                           rows={6}
                           placeholder="1. Jelaskan pengertian... 2. Sebutkan contoh..."
                           value={remedialQuestionsInput}
                           onChange={(e) => onRemedialInputChange?.(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Preview Deteksi Soal ({parseEssayQuestions(remedialQuestionsInput).length})</label>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 max-h-[220px] overflow-y-auto space-y-2">
                           {parseEssayQuestions(remedialQuestionsInput).map((q, idx) => (
                              <div key={idx} className="flex gap-3 text-[11px] text-slate-300">
                                 <span className="font-black text-indigo-400">{idx + 1}.</span>
                                 <span className="italic leading-relaxed">"{q}"</span>
                              </div>
                           ))}
                           {parseEssayQuestions(remedialQuestionsInput).length === 0 && <p className="text-[10px] text-slate-600 font-bold italic">Belum ada soal terdeteksi.</p>}
                        </div>
                     </div>
                  </div>

                  {/* Bagian Kanan: List Kunci Jawaban */}
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 mb-2 block">Ketik Kunci Jawaban (Format: 1. Kunci A 2. Kunci B)</label>
                        <textarea 
                           className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm font-medium text-emerald-100 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-y"
                           rows={6}
                           placeholder="1. Jawaban dari soal 1 adalah... 2. Jawaban soal 2 adalah..."
                           value={remedialAnswerKeysInput}
                           onChange={(e) => onAnswerKeysInputChange?.(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 mb-2 block">Preview Deteksi Kunci ({parseEssayQuestions(remedialAnswerKeysInput).length})</label>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 max-h-[220px] overflow-y-auto space-y-2">
                           {parseEssayQuestions(remedialAnswerKeysInput).map((ak, idx) => (
                              <div key={idx} className="flex gap-3 text-[11px] text-emerald-200/60">
                                 <span className="font-black text-emerald-500">{idx + 1}.</span>
                                 <span className="italic leading-relaxed">"{ak}"</span>
                              </div>
                           ))}
                           {parseEssayQuestions(remedialAnswerKeysInput).length === 0 && <p className="text-[10px] text-slate-600 font-bold italic">Belum ada kunci jawaban terdeteksi.</p>}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
       )}

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Cari nama siswa..."
          className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {remedialStudents.length === 0 ? (
        <div className="bg-slate-50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
            <RefreshCcw size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">Belum Ada Data Remedial</h3>
          <p className="text-sm text-slate-500 font-bold max-w-sm mx-auto">Siswa yang melakukan pengerjaan ulang akan otomatis muncul di sini beserta jawaban dan lokasinya.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {remedialStudents.map((student) => (
            <div 
              key={student.id} 
              className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                selectedStudentId === student.id ? 'border-indigo-500 ring-4 ring-indigo-500/5 bg-indigo-50/10' : 'border-slate-100'
              }`}
            >
              <div 
                className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setSelectedStudentId(selectedStudentId === student.id ? null : student.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border-2 ${
                    student.remedialStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                    student.remedialStatus === 'CHEATED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    {student.remedialPhoto ? (
                      <img src={student.remedialPhoto} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base md:text-lg">{student.name}</h3>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] md:text-xs font-bold">
                        <MapPin size={12} /> {student.remedialLocation || 'Lokasi tidak diketahui'}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] md:text-xs font-bold">
                        <FileText size={12} /> {scoringConfig.remedialQuestions?.length || 0} Soal Essay
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-50">
                  <div className="flex items-center gap-3 md:gap-4 text-right flex-1 md:flex-none justify-end">
                    <div className="flex flex-col shrink-0">
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Awal</span>
                       <span className="text-sm font-black text-slate-700">{student.originalScore || student.finalScore}</span>
                    </div>
                    {student.remedialStatus === 'COMPLETED' && (
                      <div className="flex flex-col border-l border-slate-100 pl-3 md:pl-4 shrink-0">
                         <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Rem</span>
                         <span className="text-sm font-black text-indigo-700">{student.remedialScore}</span>
                      </div>
                    )}
                    <div className="flex flex-col border-l border-slate-200 pl-3 md:pl-4 items-end shrink-0">
                      <div className="mb-1 md:mb-2 text-right">
                        {student.remedialStatus === 'COMPLETED' && student.isCheated ? (
                           <div className="flex flex-col items-end gap-1">
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={9}/> DITANDAI SISTEM</span>
                              {getStatusBadge('COMPLETED')}
                           </div>
                        ) : getStatusBadge(student.remedialStatus || '', student.teacherReviewed)}
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Akhir: <span className="text-indigo-600">{student.finalScoreLocked || student.finalScore}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => handleResetRemedial(e, student.id, student.name)}
                      disabled={isDeleting === student.id}
                      className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 hover:bg-amber-100 hover:text-amber-600 transition-colors"
                      title="Reset Remedial"
                    >
                      {isDeleting === student.id ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> : <RotateCcw size={16} />}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      {selectedStudentId === student.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>
              </div>

              {selectedStudentId === student.id && (
                <div className="px-4 pb-6 md:px-6 md:pb-8 border-t border-slate-100 bg-slate-50/50">
                  <div className="mt-6 space-y-6">
                    {/* Cheating Alerts */}
                    {student.isCheated && student.cheatingFlags && student.cheatingFlags.length > 0 && (
                      <div className={`p-4 border rounded-2xl flex gap-3 ${student.remedialStatus === 'CHEATED' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                         <ShieldAlert className={student.remedialStatus === 'CHEATED' ? 'text-rose-600 shrink-0' : 'text-amber-600 shrink-0'} size={20} />
                         <div>
                           <h4 className={`text-sm font-black tracking-tight ${student.remedialStatus === 'CHEATED' ? 'text-rose-800' : 'text-amber-800'}`}>
                             {student.remedialStatus === 'CHEATED' ? 'Sistem Memblokir Sesi (Curang)' : 'Aktivitas Tidak Biasa Terdeteksi'}
                           </h4>
                           <ul className={`mt-2 list-disc list-inside text-xs font-bold space-y-1 ${student.remedialStatus === 'CHEATED' ? 'text-rose-700' : 'text-amber-700'}`}>
                             {student.cheatingFlags.map((flag, idx) => <li key={idx}>{flag}</li>)}
                           </ul>
                           <p className={`mt-2 text-xs font-medium ${student.remedialStatus === 'CHEATED' ? 'text-rose-600' : 'text-amber-600'}`}>
                             {student.remedialStatus === 'CHEATED' 
                               ? 'Siswa ini telah diblokir secara permanen dari sesi ini dan nilai otomatis menjadi 0.' 
                               : 'Siswa tetap dapat mengerjakan, namun sistem menandai adanya indikasi aktivitas tidak biasa untuk ditinjau oleh pengawas.'}
                           </p>
                         </div>
                      </div>
                    )}

                    {/* Teacher Action Panel */}
                    {(student.remedialStatus === 'REMEDIAL' || student.remedialStatus === 'COMPLETED') && !student.isCheated && (
                      <div className="p-5 bg-white border border-indigo-100 rounded-2xl shadow-sm">
                         <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
                           Evaluasi Guru
                         </h4>
                         
                         <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full">
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Input Nilai Remedial (0 - 100)</label>
                               <input 
                                 type="number" 
                                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-700" 
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
                                  className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
                                >
                                  Simpan Koreksi
                                </button>
                                {student.teacherReviewed && (
                                  <button 
                                    onClick={() => submitReview(student.id, 'finalize')}
                                    disabled={isSubmitting}
                                    className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20"
                                  >
                                    Finalisasi Nilai
                                  </button>
                                )}
                              </div>
                            )}
                         </div>
                         {student.teacherReviewed && student.remedialStatus !== 'COMPLETED' && (
                           <p className="mt-3 text-xs text-indigo-500 font-bold italic">* KOREKSI PERTAMA DISIMPAN! Klik Finalisasi Nilai untuk merekap ke nilai akhir (maksimal sesuai KKM {kkm}).</p>
                         )}
                      </div>
                    )}

                    {/* Remedial Answers with Auto-Scoring */}
                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                        <FileText size={14} /> Jawaban Essay Remedial
                        {student.essayScoreAuto !== undefined && (
                          <span className="ml-auto text-indigo-600 normal-case tracking-normal">
                            Skor Otomatis: <strong>{student.essayScoreAuto}</strong>
                            {student.essayScoreManual !== undefined && (
                              <span className="text-emerald-600 ml-2">| Override Guru: <strong>{student.essayScoreManual}</strong></span>
                            )}
                          </span>
                        )}
                      </h4>
                      <div className="space-y-4">
                        {scoringConfig.remedialQuestions?.map((q, idx) => {
                           const detail = student.essayAutoDetails?.[idx];
                           const ansKey = scoringConfig.remedialAnswerKeys?.[idx];
                           return (
                            <div key={idx} className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Soal {idx + 1}</div>
                                {detail && (
                                  <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                                      detail.similarity >= 0.85 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      detail.similarity >= 0.70 ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                      detail.similarity >= 0.50 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                      'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}>
                                      Similarity: {Math.round(detail.similarity * 100)}%
                                    </span>
                                    <span className="text-[10px] font-black text-slate-500">Skor: {detail.score}</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm font-black text-slate-800 mb-3">{q}</p>
                              
                              {ansKey && (
                                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-xs font-bold text-emerald-700 leading-relaxed mb-2">
                                  <span className="text-[9px] uppercase tracking-widest text-emerald-500 block mb-1">Kunci Jawaban:</span>
                                  {ansKey}
                                </div>
                              )}

                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-bold text-slate-600 leading-relaxed italic">
                                <span className="text-[9px] uppercase tracking-widest text-slate-400 block mb-1 not-italic">Jawaban Siswa:</span>
                                &quot;{student.remedialAnswers?.[idx] || '(Tidak ada jawaban)'}&quot;
                              </div>
                            </div>
                           );
                        })}
                      </div>
                    </div>

                    {/* Note */}
                    {student.remedialNote && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm font-bold text-amber-900 italic">
                        Catatan Siswa: &quot;{student.remedialNote}&quot;
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
          className="py-3 px-8 text-slate-500 bg-white shadow-sm border border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 hover:bg-slate-50 transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={16} /> Kembali ke Menu Utama
        </button>
      </div>
    </div>
  );
}

function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };
  return (
    <span className={`px-3 py-1 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-tight border shadow-sm ${colors[color]}`}>
      {children}
    </span>
  );
}
