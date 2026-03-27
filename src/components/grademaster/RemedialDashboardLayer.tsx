"use client";

import React, { useState } from 'react';
import { 
  ArrowLeft, RefreshCcw, User, MapPin, Clock, Eye, CheckCircle2, AlertTriangle, FileText, Search, ChevronDown, ChevronUp, Plus, Trash2, Save, Settings2, ShieldAlert, Check
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
  onUpdateQuestions?: (questions: string[]) => void;
  remedialQuestionsInput?: string;
  onRemedialInputChange?: (v: string) => void;
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
  onUpdateQuestions,
  remedialQuestionsInput = "",
  onRemedialInputChange,
  isSaving = false
}: RemedialDashboardLayerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [reviewScore, setReviewScore] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveQuestions = () => {
    onUpdateQuestions?.(scoringConfig.remedialQuestions || []);
    setIsEditing(false);
  };

  const resetEditing = () => {
    setIsEditing(false);
  };

  const remedialStudents = gradedStudents.filter(s => 
    s.remedialStatus && s.remedialStatus !== 'NONE'
  ).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: remedialStudents.length,
    completed: remedialStudents.filter(s => s.remedialStatus === 'COMPLETED').length,
    inProgress: remedialStudents.filter(s => s.remedialStatus === 'IN_PROGRESS').length,
    cheated: remedialStudents.filter(s => s.remedialStatus === 'CHEATED').length,
    timeout: remedialStudents.filter(s => s.remedialStatus === 'TIMEOUT').length,
    waitingReview: remedialStudents.filter(s => s.remedialStatus === 'REMEDIAL' && !s.teacherReviewed).length
  };

  const getStatusBadge = (status: string, teacherReviewed?: boolean) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10}/> FINAL (SELESAI)</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> PROSES</span>;
      case 'CHEATED':
        return <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10}/> CURANG</span>;
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border ${
              isEditing ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <Settings2 size={16} /> {isEditing ? 'Tutup Pengaturan' : 'Atur Soal Remedial'}
          </button>

          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
             <div className="flex flex-col items-center px-4 py-2 border-r border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Total</span>
                <span className="text-lg font-black text-slate-700">{stats.total}</span>
             </div>
             <div className="flex flex-col items-center px-4 py-2 border-r border-slate-50">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter leading-none mb-1">Antrean</span>
                <span className="text-lg font-black text-orange-600">{stats.waitingReview}</span>
             </div>
             <div className="flex flex-col items-center px-4 py-2">
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

            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Ketik Soal (Format: 1. Soal A 2. Soal B)</label>
                  <textarea 
                     className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm font-medium text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-y"
                     rows={6}
                     value={remedialQuestionsInput}
                     onChange={(e) => onRemedialInputChange?.(e.target.value)}
                     placeholder="Contoh: 1. Jelaskan apa itu AI... 2. Sebutkan komponen PC..."
                  />
               </div>

               {scoringConfig.remedialQuestions && scoringConfig.remedialQuestions.length > 0 && (
                 <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Preview Deteksi Soal ({scoringConfig.remedialQuestions.length})</p>
                    <div className="space-y-3">
                       {scoringConfig.remedialQuestions.map((q: string, idx: number) => (
                          <div key={idx} className="flex gap-3 text-xs">
                             <span className="font-black text-indigo-400 shrink-0">{idx + 1}.</span>
                             <span className="text-slate-300 font-medium line-clamp-2 italic">"{q}"</span>
                          </div>
                       ))}
                    </div>
                 </div>
               )}
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
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    student.remedialStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 
                    student.remedialStatus === 'CHEATED' ? 'bg-rose-50 text-rose-600' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    <User size={24} />
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

                <div className="flex items-center justify-between md:justify-end gap-4 min-w-[300px]">
                  <div className="flex items-center gap-4 text-right">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nilai Awal</span>
                       <span className="text-sm font-black text-slate-700">{student.originalScore || student.finalScore}</span>
                    </div>
                    {student.remedialStatus === 'COMPLETED' && (
                      <div className="flex flex-col border-l border-slate-100 pl-4">
                         <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Remedial</span>
                         <span className="text-sm font-black text-indigo-700">{student.remedialScore}</span>
                      </div>
                    )}
                    <div className="flex flex-col border-l border-slate-200 pl-4 items-end">
                      <div className="mb-2">{getStatusBadge(student.remedialStatus || '', student.teacherReviewed)}</div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nilai Akhir: <span className="text-indigo-600">{student.finalScoreLocked || student.finalScore}</span>
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    {selectedStudentId === student.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {selectedStudentId === student.id && (
                <div className="px-4 pb-6 md:px-6 md:pb-8 border-t border-slate-100 bg-slate-50/50">
                  <div className="mt-6 space-y-6">
                    {/* Cheating Alerts */}
                    {student.isCheated && student.cheatingFlags && student.cheatingFlags.length > 0 && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex gap-3">
                         <ShieldAlert className="text-rose-600 shrink-0" size={20} />
                         <div>
                           <h4 className="text-sm font-black tracking-tight text-rose-800">Sistem Deteksi Kecurangan Terpicu</h4>
                           <ul className="mt-2 list-disc list-inside text-xs font-bold text-rose-700 space-y-1">
                             {student.cheatingFlags.map((flag, idx) => <li key={idx}>{flag}</li>)}
                           </ul>
                           <p className="mt-2 text-xs text-rose-600 font-medium">Nilai siswa otomatis menjadi 0 menurut algoritma penalti deteksi kecurangan.</p>
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

                    {/* Remedial Answers */}
                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                        <FileText size={14} /> Jawaban Essay Remedial
                      </h4>
                      <div className="space-y-4">
                        {scoringConfig.remedialQuestions?.map((q, idx) => (
                           <div key={idx} className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
                             <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Soal {idx + 1}</div>
                             <p className="text-sm font-black text-slate-800 mb-3">{q}</p>
                             <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-bold text-slate-600 leading-relaxed italic">
                                "{student.remedialAnswers?.[idx] || '(Tidak ada jawaban)'}"
                             </div>
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Note */}
                    {student.remedialNote && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm font-bold text-amber-900 italic">
                        Catatan Siswa: "{student.remedialNote}"
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
