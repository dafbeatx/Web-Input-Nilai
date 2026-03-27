"use client";

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  RefreshCcw, 
  User, 
  MapPin, 
  Clock, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  Settings2
} from 'lucide-react';
import { GradedStudent, ScoringConfig } from '@/lib/grademaster/types';

interface RemedialDashboardLayerProps {
  gradedStudents: GradedStudent[];
  kkm: number;
  scoringConfig: ScoringConfig;
  onBack: () => void;
  onUpdateQuestions?: (questions: string[]) => void;
  isSaving?: boolean;
}

export default function RemedialDashboardLayer({
  gradedStudents,
  kkm,
  scoringConfig,
  onBack,
  onUpdateQuestions,
  isSaving = false
}: RemedialDashboardLayerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<string[]>(scoringConfig.remedialQuestions || []);

  const handleAddQuestion = () => {
    setEditedQuestions([...editedQuestions, ""]);
  };

  const handleRemoveQuestion = (index: number) => {
    setEditedQuestions(editedQuestions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...editedQuestions];
    newQuestions[index] = value;
    setEditedQuestions(newQuestions);
  };

  const handleSaveQuestions = () => {
    onUpdateQuestions?.(editedQuestions);
    setIsEditing(false);
  };

  const resetEditing = () => {
    setEditedQuestions(scoringConfig.remedialQuestions || []);
    setIsEditing(false);
  };

  // Filter students who have interacted with remedial
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
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10}/> SELESAI</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> PROSES</span>;
      case 'CHEATED':
        return <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10}/> CURANG</span>;
      case 'TIMEOUT':
        return <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> WAKTU HABIS</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-black uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-indigo-100">
            <RefreshCcw size={12} /> Management Remedial
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight font-outfit">Pusat Data Remedial</h1>
          <p className="text-xs md:text-sm text-slate-500 font-bold mt-1">Pantau hasil pengerjaan ulang dan kejujuran siswa.</p>
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
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter leading-none mb-1">Lulus</span>
                <span className="text-lg font-black text-emerald-600">{stats.completed}</span>
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

           <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {editedQuestions.map((q, idx) => (
                 <div key={idx} className="flex gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-black shrink-0">{idx + 1}</div>
                    <textarea 
                       className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                       rows={2}
                       value={q}
                       onChange={(e) => handleQuestionChange(idx, e.target.value)}
                       placeholder={`Tuliskan soal nomor ${idx + 1}...`}
                    />
                    <button 
                      onClick={() => handleRemoveQuestion(idx)}
                      className="w-10 h-10 rounded-xl bg-slate-800/50 text-slate-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
              ))}
              <button 
                onClick={handleAddQuestion}
                className="w-full py-4 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"
              >
                <Plus size={16} /> Tambah Soal Essay Baru
              </button>
           </div>
        </div>
      )}

      {/* Search Bar */}
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

                <div className="flex items-center justify-between md:justify-end gap-4 min-w-[200px]">
                  <div className="flex flex-col items-end">
                    <div className="mb-2">{getStatusBadge(student.remedialStatus || '')}</div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Nilai Akhir: <span className="text-indigo-600">{student.finalScore}</span>
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    {selectedStudentId === student.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {selectedStudentId === student.id && (
                <div className="px-4 pb-6 md:px-6 md:pb-8 border-t border-slate-100 animate-in slide-in-from-top-2">
                  <div className="mt-6 space-y-6">
                    {/* Remedial Answers */}
                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                        <FileText size={14} /> Jawaban Essay Remedial
                      </h4>
                      <div className="space-y-4">
                        {scoringConfig.remedialQuestions?.map((q, idx) => (
                           <div key={idx} className="bg-slate-50 rounded-2xl p-4 md:p-5 border border-slate-100">
                             <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Soal {idx + 1}</div>
                             <p className="text-sm font-black text-slate-800 mb-3">{q}</p>
                             <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs font-bold text-slate-600 leading-relaxed italic">
                                "{student.remedialAnswers?.[idx] || '(Tidak ada jawaban)'}"
                             </div>
                           </div>
                        ))}
                        {(scoringConfig.remedialQuestions?.length || 0) === 0 && (
                          <div className="text-center py-4 text-slate-400 text-xs font-bold italic">
                            Tidak ada soal essay remedial yang dikonfigurasi.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Student Note */}
                    {student.remedialNote && (
                      <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 text-amber-200">
                           <FileText size={48} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-2 relative z-10">Catatan dari Siswa</h4>
                        <p className="text-sm font-bold text-amber-900 italic leading-relaxed relative z-10">
                          "{student.remedialNote}"
                        </p>
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
