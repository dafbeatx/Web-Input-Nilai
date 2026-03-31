import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Search, PlusCircle, MinusCircle, AlertCircle, Save, Loader2, UserPlus, FileText, LayoutGrid, Trash2, Pencil, ShieldCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ToastType, GradedStudent } from '@/lib/grademaster/types';

interface BehaviorStudent {
  id: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  total_points: number;
  behavior_logs: any[];
}

interface BehaviorLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  isAdmin?: boolean;
  activeClass?: string;
  activeYear?: string;
  gradedStudents?: GradedStudent[];
}

export default function BehaviorLayer({ 
  onBack, 
  setToast, 
  isAdmin = false, 
  activeClass = '', 
  activeYear = '2025/2026',
  gradedStudents = []
}: BehaviorLayerProps) {
  const [className, setClassName] = useState(activeClass || '');
  const [academicYear, setAcademicYear] = useState(activeYear || '2025/2026');
  const [students, setStudents] = useState<BehaviorStudent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'MANAGEMENT' | 'REPORT'>('REPORT');
  
  // For new class creation
  const [studentInput, setStudentInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState<BehaviorStudent | null>(null);
  const [isManagingReasons, setIsManagingReasons] = useState(false);
  const [behaviorReasons, setBehaviorReasons] = useState<{ good: string[], bad: string[] }>({
    good: ["Membantu Teman", "Aktif Berdiskusi", "Piket Mandiri", "Jujur/Integritas", "Ketua Kelas Aktif"],
    bad: ["Bolos PBM", "Berbicara Kasar", "Merokok/Vaping", "Membantah Guru", "Terlambat Parah"]
  });
  const [newReasonInput, setNewReasonInput] = useState('');
  const [newReasonType, setNewReasonType] = useState<'good' | 'bad'>('good');

  // Individual Edit
  const [newStudentName, setNewStudentName] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  // Class Overview
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  useEffect(() => {
    if (activeClass && activeYear) {
      loadClassDirectly(activeClass, activeYear);
    } else {
      fetchAvailableClasses();
    }
    fetchBehaviorSettings();
  }, [activeClass, activeYear, academicYear, className]);

  const fetchBehaviorSettings = async () => {
    try {
      const res = await fetch(`/api/grademaster/behaviors/settings?year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (res.ok && data.settings) {
        setBehaviorReasons(data.settings.reasons);
      }
    } catch (err) {
      console.error("Failed to load behavior settings", err);
    }
  };

  const saveBehaviorSettings = async (updatedReasons: { good: string[], bad: string[] }) => {
    try {
      const res = await fetch('/api/grademaster/behaviors/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYear, reasons: updatedReasons })
      });
      if (!res.ok) throw new Error("Gagal menyimpan pengaturan");
      setBehaviorReasons(updatedReasons);
      setToast({ message: "Kategori poin global berhasil diperbarui", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const fetchAvailableClasses = async () => {
    setIsLoadingClasses(true);
    try {
      const res = await fetch(`/api/grademaster/behaviors?year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (res.ok) setAvailableClasses(data.classes || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const getBehaviorSummary = (logs: any[]) => {
    const good = logs.filter(l => l.points > 0).map(l => l.reason);
    const bad = logs.filter(l => l.points < 0).map(l => l.reason);
    return { good: [...new Set(good)], bad: [...new Set(bad)] };
  };

  const loadClassDirectly = async (targetClass: string, targetYear: string) => {
    if (!targetClass.trim() || !targetYear.trim()) return;
    setClassName(targetClass);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(targetClass)}&year=${encodeURIComponent(targetYear)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStudents(data.students || []);
      setIsLoaded(true);
    } catch (err: any) {
      setToast({ message: err.message || "Gagal mengambil data", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = () => loadClassDirectly(className, academicYear);

  const updatePoints = async (type: 'GOOD' | 'BAD', pointsDelta: number, reason: string) => {
    if (!selectedStudent || isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    try {
      const res = await fetch('/api/grademaster/behaviors/points', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStudent.id, type, pointsDelta, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStudents((prev: BehaviorStudent[]) => prev.map((s: BehaviorStudent) => s.id === selectedStudent.id ? data.student : s));
      setSelectedStudent(null);
      setToast({ message: `Poin berhasil diupdate untuk ${selectedStudent.student_name}`, type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Gagal mengupdate poin", type: "error" });
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto animate-in pt-16 pb-24 md:pb-8">
      <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all mb-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:border-primary/20">
            <ArrowLeft size={14} /> Beranda
          </button>
          <h1 className="text-xl md:text-4xl font-black text-white tracking-tight flex items-center gap-2 md:gap-3 font-outfit uppercase">
            Rapor Kedisiplinan & Perilaku
          </h1>
          <p className="text-[10px] md:text-sm text-slate-500 font-bold mt-1 md:mt-2 uppercase tracking-widest">Transparansi Catatan Sikap & Poin Keseharian Siswa</p>
        </div>

        {isAdmin && isLoaded && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsManagingReasons(true)}
              className="px-4 py-2 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:border-primary/30 hover:text-primary transition-all flex items-center gap-2"
            >
              <Pencil size={12} /> Kelola Kategori
            </button>
            <div className="bg-slate-900/40 p-1.5 rounded-2xl border border-white/10 flex gap-1">
              <button 
                onClick={() => setViewMode('REPORT')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'REPORT' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Mode Rapor
              </button>
              <button 
                onClick={() => setViewMode('MANAGEMENT')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'MANAGEMENT' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Mode Kelola
              </button>
            </div>
          </div>
        )}
      </header>

      {(!isLoaded || isAdmin) && (
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-2xl border border-white/10 flex flex-col md:flex-row gap-4 items-end mb-6 md:mb-8 relative z-10">
          <div className="w-full md:w-1/3">
            <label className="block text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 md:mb-2">Pilih Kelas</label>
            <input type="text" placeholder="Contoh: 12-IPA-1" value={className} onChange={(e: any) => setClassName(e.target.value.toUpperCase())} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 md:p-4 text-xs md:text-sm font-black text-white outline-none focus:border-primary transition-all uppercase" />
          </div>
          <div className="w-full md:w-1/3">
            <label className="block text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 md:mb-2">Tahun Ajaran</label>
            <input type="text" value={academicYear} onChange={(e: any) => setAcademicYear(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 md:p-4 text-xs md:text-sm font-black text-white outline-none focus:border-primary transition-all" />
          </div>
          <button onClick={fetchStudents} disabled={isLoading} className="w-full md:w-auto px-8 md:px-10 py-3 md:py-4 bg-primary text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3">
             {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Muat Data
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Menyinkronkan Data...</p>
        </div>
      ) : isLoaded ? (
        viewMode === 'REPORT' ? (
          /* ── REPORT VIEW (Requested Card Grid) ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 pb-10">
            {students.length > 0 ? (
              students.map((s: BehaviorStudent) => {
                const summary = getBehaviorSummary(s.behavior_logs || []);
                return (
                  <div key={s.id} className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 border border-white/10 shadow-2xl relative overflow-hidden group hover:border-primary/30 transition-all">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-all duration-500" />
                    
                    <div className="flex items-center justify-between mb-4 md:mb-8 border-b border-white/5 pb-4 md:pb-6">
                      <div>
                        <h4 className="font-black text-sm md:text-lg text-white uppercase tracking-tight font-outfit mb-0.5 md:mb-1">{s.student_name}</h4>
                        <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kelas {className}</p>
                      </div>
                      <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-sm md:text-xl font-black border shadow-lg ${
                        s.total_points >= 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/20' :
                        s.total_points >= 70 ? 'bg-primary/10 text-primary border-primary/20 shadow-primary/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/20'
                      }`}>
                        {s.total_points}
                      </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                      {summary.good.length > 0 && (
                        <div className="flex items-start gap-2 md:gap-3">
                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20">
                            <ThumbsUp size={12} className="md:w-3.5 md:h-3.5" />
                          </div>
                          <p className="text-[10px] md:text-xs font-bold text-emerald-400/80 leading-relaxed capitalize">{summary.good.join(', ')}</p>
                        </div>
                      )}
                      {summary.bad.length > 0 && (
                        <div className="flex items-start gap-2 md:gap-3">
                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0 border border-rose-500/20">
                            <ThumbsDown size={12} className="md:w-3.5 md:h-3.5" />
                          </div>
                          <p className="text-[10px] md:text-xs font-bold text-rose-400/80 leading-relaxed capitalize">{summary.bad.join(', ')}</p>
                        </div>
                      )}
                      {summary.good.length === 0 && summary.bad.length === 0 && (
                        <div className="text-center py-4 md:py-6 bg-slate-950/50 rounded-2xl md:rounded-3xl border border-white/5">
                          <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                            Belum ada catatan khusus.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {isAdmin && (
                       <button 
                        onClick={() => { setSelectedStudent(s); setViewMode('MANAGEMENT'); }}
                        className="w-full mt-6 md:mt-8 py-3 md:py-4 bg-white/5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] rounded-xl border border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                       >
                         Kelola Poin
                       </button>
                    )}
                  </div>
                );
              })
            ) : (
               <div className="col-span-full text-center py-20 bg-slate-900/40 rounded-[3rem] border border-white/10 border-dashed">
                 <Users size={48} className="text-slate-700 mx-auto mb-4" />
                 <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Siswa tidak ditemukan</p>
               </div>
            )}
          </div>
        ) : (
          /* ── MANAGEMENT VIEW (For Admins) ── */
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden mb-10 animate-in slide-in-from-bottom-5">
            {/* Same table as before but styled with the new theme */}
             <div className="p-8 border-b border-white/10 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="font-black text-white text-xl uppercase font-outfit">Siswa Terdaftar</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{students.length} Total Partisipan di Kelas {className}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="text" placeholder="Cari nama siswa..." value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="bg-slate-950/50 border border-white/10 rounded-xl px-5 py-3 text-sm font-black text-white outline-none focus:border-primary transition-all w-full md:w-72" />
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center w-20">No</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Nama Lengkap</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Poin Akhir</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-white">
                    {students.map((s: BehaviorStudent, idx: number) => (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                         <td className="p-6 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                         <td className="p-6 font-outfit uppercase tracking-tight">{s.student_name}</td>
                         <td className="p-6 text-center">
                            <span className={`px-4 py-1.5 rounded-lg text-xs font-black border ${
                              s.total_points >= 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-primary/10 text-primary border-primary/20'
                            }`}>{s.total_points}</span>
                         </td>
                         <td className="p-6 flex items-center justify-center gap-2">
                            <button onClick={() => setSelectedStudent(s)} className="px-5 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20">Kelola</button>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )
      ) : (
         /* ── CLASSES GRID (Initial Load) ── */
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-10">
           {availableClasses.map((cls: string) => (
             <button key={cls} onClick={() => loadClassDirectly(cls, academicYear)} className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] hover:border-primary/50 hover:bg-primary/5 transition-all text-center relative group overflow-hidden shadow-2xl">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20 group-hover:bg-primary transition-all" />
               <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                 <ShieldCheck size={40} />
               </div>
               <h3 className="font-black text-white text-xl font-outfit uppercase tracking-tight">Kelas {cls}</h3>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{academicYear}</p>
             </button>
           ))}
         </div>
      )}

      {/* STUDENT MODAL (For Points Management) */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900/50 border border-white/10 max-w-2xl w-full rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
             <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-10 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white font-outfit uppercase tracking-tight">{selectedStudent.student_name}</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">Daftar Poin Kedisiplinan • Kelas {className}</p>
                </div>
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2rem] border border-primary/20 flex flex-col items-center justify-center shadow-2xl shadow-primary/20">
                  <span className="text-2xl font-black">{selectedStudent.total_points}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Poin</span>
                </div>
             </div>
             
             <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <ThumbsDown size={14} /> Tindakan Buruk (-10)
                  </h3>
                  {behaviorReasons.bad.map(r => (
                    <button key={r} onClick={() => updatePoints('BAD', 10, r)} className="w-full p-4 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/30 rounded-2xl text-left text-xs font-black text-rose-400 uppercase tracking-widest transition-all">
                      {r}
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <ThumbsUp size={14} /> Tindakan Terpuji (+10)
                  </h3>
                  {behaviorReasons.good.map(r => (
                    <button key={r} onClick={() => updatePoints('GOOD', 10, r)} className="w-full p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 rounded-2xl text-left text-xs font-black text-emerald-400 uppercase tracking-widest transition-all">
                      {r}
                    </button>
                  ))}
                </div>
             </div>

             <div className="p-8 bg-slate-950/50 border-t border-white/10 flex justify-end">
                <button onClick={() => setSelectedStudent(null)} className="px-10 py-4 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 hover:text-white transition-all">Tutup</button>
             </div>
          </div>
        </div>
      )}
      {/* REASONS MANAGEMENT MODAL */}
      {isManagingReasons && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-4">
          <div className="bg-slate-900/50 border border-white/10 max-w-2xl w-full rounded-[3rem] overflow-hidden shadow-2xl">
             <div className="p-8 border-b border-white/10 bg-white/5">
                <h2 className="text-xl font-black text-white uppercase font-outfit">Kelola Kategori GLOBAL</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Atur daftar tindakan terpuji & pelanggaran untuk SELURUH KELAS</p>
             </div>
             
             <div className="p-8 space-y-8">
                <div className="flex gap-3">
                   <select 
                    value={newReasonType} 
                    onChange={(e: any) => setNewReasonType(e.target.value)}
                    className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-primary transition-all"
                   >
                     <option value="good">TERPUJI (+)</option>
                     <option value="bad">PELANGGARAN (-)</option>
                   </select>
                   <input 
                    type="text" 
                    placeholder="Tambah kategori baru..." 
                    value={newReasonInput}
                    onChange={(e) => setNewReasonInput(e.target.value)}
                    className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-5 py-3 text-sm font-black text-white outline-none focus:border-primary transition-all"
                   />
                   <button 
                    onClick={() => {
                      if (!newReasonInput.trim()) return;
                      const updated = { ...behaviorReasons };
                      updated[newReasonType].push(newReasonInput.trim());
                      saveBehaviorSettings(updated);
                      setNewReasonInput('');
                    }}
                    className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                   >
                     <PlusCircle size={20} />
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                        <ThumbsUp size={12} /> Terpuji
                      </h4>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                         {behaviorReasons.good.map((r, i) => (
                           <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                              <span className="text-[10px] font-bold text-slate-300">{r}</span>
                              <button 
                                onClick={() => {
                                  const updated = { ...behaviorReasons };
                                  updated.good = updated.good.filter((_, idx) => idx !== i);
                                  saveBehaviorSettings(updated);
                                }}
                                className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
                              </button>
                           </div>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                        <ThumbsDown size={12} /> Pelanggaran
                      </h4>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                         {behaviorReasons.bad.map((r, i) => (
                           <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                              <span className="text-[10px] font-bold text-slate-300">{r}</span>
                              <button 
                                onClick={() => {
                                  const updated = { ...behaviorReasons };
                                  updated.bad = updated.bad.filter((_, idx) => idx !== i);
                                  saveBehaviorSettings(updated);
                                }}
                                className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
                              </button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-8 bg-slate-950/50 border-t border-white/10 flex justify-end">
                <button onClick={() => setIsManagingReasons(false)} className="px-10 py-4 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 hover:text-white transition-all">Selesai</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
