import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Users, Search, PlusCircle, MinusCircle, AlertCircle, Save, Loader2, UserPlus, FileText, LayoutGrid, Trash2, Pencil, ShieldCheck, ThumbsUp, ThumbsDown, X, Clock, Calendar, ChevronRight, BarChart3, Activity, ListChecks, History } from 'lucide-react';
import { ToastType, GradedStudent } from '@/lib/grademaster/types';
import { 
  addBehaviorAction, 
  updateBehaviorAction, 
  deleteBehaviorAction, 
  getBehaviorLogsAction 
} from '@/lib/actions/behavior';
import { supabase } from '@/lib/supabase/client';

interface BehaviorLog {
  id: string;
  student_id: string;
  category_id?: string;
  points_delta: number;
  reason: string;
  teacher_id?: string;
  notes?: string;
  created_at: string;
}

interface BehaviorStudent {
  id: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  total_points: number;
  behavior_logs: BehaviorLog[];
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
  
  // Modal & History State
  const [selectedStudent, setSelectedStudent] = useState<BehaviorStudent | null>(null);
  const [studentLogs, setStudentLogs] = useState<BehaviorLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ reason: '', points: 0 });
  const [activeModalTab, setActiveModalTab] = useState<'HISTORY' | 'MANAGE'>('HISTORY');

  // Settings State
  const [isManagingReasons, setIsManagingReasons] = useState(false);
  const [behaviorReasons, setBehaviorReasons] = useState<{ good: string[], bad: string[] }>({
    good: ["Membantu Teman", "Aktif Berdiskusi", "Piket Mandiri", "Jujur/Integritas", "Ketua Kelas Aktif"],
    bad: ["Bolos PBM", "Berbicara Kasar", "Merokok/Vaping", "Membantah Guru", "Terlambat Parah"]
  });
  const [newReasonInput, setNewReasonInput] = useState('');
  const [newReasonType, setNewReasonType] = useState<'good' | 'bad'>('good');

  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  useEffect(() => {
    fetchBehaviorSettings();
    fetchAvailableClasses().then((classes) => {
      const initialClass = activeClass && activeClass !== "" ? activeClass : 'Semua Kelas';
      setClassName(initialClass);
      loadClassDirectly(initialClass, activeYear || '2025/2026');
    });
  }, [activeClass, activeYear]);

  // Load history when a student is selected
  useEffect(() => {
    if (selectedStudent) {
      fetchStudentLogs(selectedStudent.id);
      setActiveModalTab('HISTORY'); // Default to history when opening modal
      document.body.classList.add('hide-mobile-header');
    } else {
      setStudentLogs([]);
      setEditingLogId(null);
      document.body.classList.remove('hide-mobile-header');
    }
    return () => document.body.classList.remove('hide-mobile-header');
  }, [selectedStudent]);

  // --- REAL-TIME SUBSCRIPTION ---
  useEffect(() => {
    if (!isLoaded) return;

    const channel = supabase
      .channel('behavior_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gm_behavior_logs'
        },
        async (payload) => {
          // If a modal is open for the changed student, refresh their logs
          const changedStudentId = (payload.new as any)?.student_id || (payload.old as any)?.student_id;
          
          if (selectedStudent && selectedStudent.id === changedStudentId) {
            fetchStudentLogs(changedStudentId);
          }
          
          // Always refresh students to update total points across cards
          fetchStudentsQuietly();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded, selectedStudent, className, academicYear]);

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

  const fetchStudentLogs = async (studentId: string) => {
    setIsLoadingLogs(true);
    const result = await getBehaviorLogsAction(studentId);
    if (result.success) {
      setStudentLogs(result.logs || []);
    } else {
      setToast({ message: "Gagal memuat riwayat", type: "error" });
    }
    setIsLoadingLogs(false);
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

  // Silent refresh for real-time
  const fetchStudentsQuietly = async () => {
    try {
      const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(className)}&year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (res.ok) setStudents(data.students || []);
    } catch (err) {
       // Silent fail
    }
  };

  // --- CRUD ACTIONS ---

  const handleAddBehavior = async (type: 'GOOD' | 'BAD', pointsDelta: number, reason: string) => {
    if (!selectedStudent || isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    
    // Optimistic Update (Total Points on card)
    const pointsToAdd = type === 'BAD' ? -Math.abs(pointsDelta) : Math.abs(pointsDelta);
    
    const result = await addBehaviorAction({
      studentId: selectedStudent.id,
      pointsDelta: pointsToAdd,
      reason
    });

    if (result.success) {
      setToast({ message: `Catatan "${reason}" ditambahkan`, type: "success" });
      // Update local state for total points in the list
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, total_points: result.data.new_total } : s));
      // Update the selected student's total point in the modal header
      setSelectedStudent(prev => prev ? { ...prev, total_points: result.data.new_total } : null);
      // Refresh logs
      fetchStudentLogs(selectedStudent.id);
      
      // On mobile, switch to history tab after adding to show the change
      if (window.innerWidth < 1024) setActiveModalTab('HISTORY');
    } else {
      setToast({ message: result.error || "Gagal menambah catatan", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const handleUpdateLog = async (logId: string) => {
    if (!selectedStudent || isUpdatingPoints) return;
    setIsUpdatingPoints(true);

    const result = await updateBehaviorAction(logId, {
      pointsDelta: editForm.points,
      reason: editForm.reason,
      studentId: selectedStudent.id
    });

    if (result.success) {
      setToast({ message: "Catatan berhasil diperbarui", type: "success" });
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, total_points: result.newTotal } : s));
      setSelectedStudent(prev => prev ? { ...prev, total_points: result.newTotal } : null);
      setEditingLogId(null);
      fetchStudentLogs(selectedStudent.id);
    } else {
      setToast({ message: result.error || "Gagal memperbarui", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!selectedStudent || isUpdatingPoints) return;
    if (!confirm("Hapus catatan ini? Poin akan otomatis dikembalikan.")) return;
    
    setIsUpdatingPoints(true);
    const result = await deleteBehaviorAction(logId, selectedStudent.id);

    if (result.success) {
      setToast({ message: "Catatan dihapus", type: "success" });
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, total_points: result.newTotal } : s));
      setSelectedStudent(prev => prev ? { ...prev, total_points: result.newTotal } : null);
      fetchStudentLogs(selectedStudent.id);
    } else {
      setToast({ message: result.error || "Gagal menghapus", type: "error" });
    }
    setIsUpdatingPoints(false);
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

  // Helper to format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-dvh bg-transparent p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto animate-in page-pt md:pt-16 pb-24 md:pb-8">
      {!isAdmin && isLoaded && (
        <div className="mb-4 flex items-center gap-2.5 px-4 py-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl animate-in fade-in duration-500">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Data perilaku ini dapat dilihat oleh umum</span>
        </div>
      )}
      <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-primary font-black text-xs uppercase tracking-widest transition-all mb-4 bg-white/5 px-4 py-2 md:px-5 md:py-3 rounded-xl border border-white/10 hover:border-primary/20">
            <ArrowLeft size={14} /> Beranda
          </button>
          <h1 className="text-xl md:text-4xl font-black text-white tracking-tight flex items-center gap-2 md:gap-3 font-outfit uppercase">
            Rapor Kedisiplinan & Perilaku
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-bold mt-1 md:mt-2 uppercase tracking-widest">Kumpulan Catatan Sikap & Poin Keseharian Siswa</p>
        </div>

        {isLoaded && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => setIsManagingReasons(true)}
                className="px-4 py-2 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:border-primary/30 hover:text-primary transition-all flex items-center gap-2"
              >
                <Pencil size={12} /> Kategori Poin
              </button>
            )}
            <div className="bg-slate-900/40 p-1.5 rounded-2xl border border-white/10 flex gap-1">
              <button 
                onClick={() => setViewMode('REPORT')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'REPORT' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Tabulasi Rapor
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setViewMode('MANAGEMENT')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'MANAGEMENT' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Mode Kelola
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Dynamic Settings & Filter Header */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-2xl border border-white/10 mb-6 md:mb-8 relative z-10 flex flex-col gap-4">
        {isAdmin && (
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-end mb-2">
            <div className="w-full md:w-1/3">
              <label className="flex text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 items-center gap-1"><Calendar size={12}/> Tahun Ajaran</label>
              <input type="text" value={academicYear} onChange={(e: any) => setAcademicYear(e.target.value)} onBlur={() => loadClassDirectly(className, academicYear)} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm font-black text-white outline-none focus:border-primary transition-all" />
            </div>
            <div className="w-full md:w-1/3">
              <label className="flex text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 items-center gap-1"><Search size={12}/> Cari Spesifik</label>
              <input type="text" placeholder="Nama siswa..." value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm font-black text-white outline-none focus:border-primary transition-all" />
            </div>
            <button onClick={fetchStudents} disabled={isLoading} className="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
               {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Refresh
            </button>
          </div>
        )}

        {/* Floating Class Pills Filter */}
        <div className="w-full">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Filter Kelas</label>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
            {['Semua Kelas', ...availableClasses].map((cls) => (
              <button
                key={cls}
                onClick={() => loadClassDirectly(cls, academicYear)}
                disabled={isLoading}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full font-black text-xs transition-all duration-300 border ${
                  className === cls 
                    ? 'bg-primary text-white border-primary shadow-[0_0_20px_rgba(40,112,234,0.3)] shadow-primary/30 scale-105 z-10' 
                    : 'bg-slate-950/50 text-slate-400 hover:bg-slate-800 border-white/5 hover:border-white/20'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Menyinkronkan Data...</p>
        </div>
      ) : isLoaded ? (
        viewMode === 'REPORT' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 pb-10">
            {students.filter(s => s.student_name.toLowerCase().includes(newStudentName.toLowerCase())).length > 0 ? (
              students.filter(s => s.student_name.toLowerCase().includes(newStudentName.toLowerCase())).map((s: BehaviorStudent) => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedStudent(s)}
                  className="bg-slate-900/40 backdrop-blur-2xl rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 border border-white/10 shadow-2xl relative overflow-hidden group hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-all duration-500" />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                      <ChevronRight size={16} className="text-primary" />
                  </div>
                  
                  <div className="flex items-center justify-between mb-3 md:mb-8 border-b border-white/5 pb-3 md:pb-6">
                    <div>
                      <h4 className="font-black text-sm md:text-xl text-white uppercase tracking-tight font-outfit mb-0.5">{s.student_name}</h4>
                      <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-widest">Kelas {s.class_name}</p>
                    </div>
                    <div className={`w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-2xl flex items-center justify-center text-base md:text-2xl font-black border shadow-lg ${
                      s.total_points >= 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/20' :
                      s.total_points >= 70 ? 'bg-primary/10 text-primary border-primary/20 shadow-primary/20' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/20'
                    }`}>
                      {s.total_points}
                    </div>
                  </div>

                  <div className="space-y-3">
                      <div className="flex items-center justify-between p-2.5 md:p-3 bg-white/5 rounded-xl md:rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Peringkat & Poin</span>
                        </div>
                        <span className="text-xs font-black text-emerald-400">AKTIF</span>
                      </div>
                      <div className="py-1 px-1">
                          <button className="w-full py-2.5 md:py-4 bg-white/5 border border-white/5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest group-hover:border-primary/20 group-hover:text-primary transition-all flex items-center justify-center gap-2">
                             <BarChart3 size={12} /> LIHAT RIWAYAT POIN
                          </button>
                      </div>
                  </div>
                </div>
              ))
            ) : (
                <div className="col-span-full text-center py-20 bg-slate-900/40 rounded-[3rem] border border-white/10 border-dashed">
                  <Users size={48} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Siswa tidak ditemukan untuk {className}</p>
                </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden mb-10 animate-in slide-in-from-bottom-5">
              <div className="p-8 border-b border-white/10 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="font-black text-white text-xl uppercase font-outfit">Manajemen Kedisiplinan</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{students.filter(s => s.student_name.toLowerCase().includes(newStudentName.toLowerCase())).length} Siswa tertampil di {className}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center w-20">No</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Nama Lengkap</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Kelas</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Poin Saat Ini</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-white">
                    {students.filter(s => s.student_name.toLowerCase().includes(newStudentName.toLowerCase())).map((s: BehaviorStudent, idx: number) => (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                          <td className="p-6 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                          <td className="p-6 font-outfit uppercase tracking-tight">{s.student_name}</td>
                          <td className="p-6 text-center text-slate-400 font-bold text-[10px] uppercase">{s.class_name}</td>
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
          <div className="col-span-full text-center py-20 bg-slate-900/40 rounded-[3rem] border border-white/10 border-dashed">
            <Users size={48} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Tidak dapat memuat data siswa</p>
          </div>
      )}

      {/* COMPACT & TABBED DETAIL MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[1000] flex flex-col justify-end md:justify-center p-0 md:p-10 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-t md:border border-white/10 w-full max-h-[90dvh] md:max-h-[85vh] md:h-auto max-w-6xl rounded-t-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 flex flex-col">
              {/* Sticky Compact Header - Safe for Mobile */}
              <div 
                className="bg-gradient-to-br from-slate-900 to-slate-950 px-5 pb-5 md:p-10 border-b border-white/10 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xl"
                style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
              >
                <div className="flex items-center gap-4 md:gap-6">
                    <div className={`w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] border flex flex-col items-center justify-center shadow-2xl shrink-0 ${
                       selectedStudent.total_points >= 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/20' : 'bg-primary/10 text-primary border-primary/20 shadow-primary/20'
                    }`}>
                      <span className="text-lg md:text-3xl font-black">{selectedStudent.total_points}</span>
                      <span className="text-[6px] md:text-[8px] font-black uppercase tracking-widest opacity-60 hidden md:inline">Total</span>
                    </div>
                    <div>
                      <h2 className="text-base md:text-3xl font-black text-white font-outfit uppercase tracking-tighter line-clamp-1">{selectedStudent.student_name}</h2>
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-3 mt-1 md:mt-2">
                          <span className="px-2 py-0.5 bg-white/5 rounded-full text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest border border-white/10">{className}</span>
                          <span className="px-2 py-0.5 bg-primary/10 rounded-full text-[7px] md:text-[9px] font-black text-primary uppercase tracking-widest border border-primary/20 flex items-center gap-1">
                             <Activity size={8} className="md:w-3 md:h-3" /> {academicYear}
                          </span>
                      </div>
                    </div>
                </div>
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  className="w-10 h-10 md:w-12 md:h-12 bg-white/5 text-slate-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-white/10 shadow-xl"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Tabs Navigation - Notch Aware */}
              {isAdmin && (
                <div className="flex lg:hidden bg-slate-950/50 backdrop-blur-xl border-b border-white/5 sticky top-[73px] md:top-[85px] z-20 h-16">
                    <button 
                      onClick={() => setActiveModalTab('HISTORY')}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black tracking-[0.2em] transition-all ${activeModalTab === 'HISTORY' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500'}`}
                    >
                      <History size={14} /> RIWAYAT
                    </button>
                    <button 
                      onClick={() => setActiveModalTab('MANAGE')}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black tracking-[0.2em] transition-all ${activeModalTab === 'MANAGE' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500'}`}
                    >
                      <PlusCircle size={14} /> TAMBAH POIN
                    </button>
                </div>
              )}
              
              {/* Content Area */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
                {/* Left Column: History (Always visible on LG, conditional on mobile) */}
                <div className={`bg-slate-950/20 lg:flex lg:flex-col ${activeModalTab === 'HISTORY' ? 'flex flex-col' : 'hidden'}`}>
                    <div className="p-4 md:p-6 border-b border-white/5 hidden md:flex items-center justify-between">
                      <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                          <Clock size={14} className="text-primary" /> Riwayat Transparansi
                      </h3>
                      <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-slate-500 uppercase tracking-widest">{studentLogs.length} LOG</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 custom-scrollbar">
                      {isLoadingLogs ? (
                          <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <Loader2 size={24} className="animate-spin mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sinkronisasi...</p>
                          </div>
                      ) : studentLogs.length > 0 ? (
                        studentLogs.map((log) => (
                            <div key={log.id} className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 md:p-6 hover:border-primary/20 transition-all group relative overflow-hidden">
                              {editingLogId === log.id && isAdmin ? (
                                  <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Poin Delta</label>
                                          <input 
                                            type="number" 
                                            value={editForm.points} 
                                            onChange={(e) => setEditForm(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                                            className="w-full bg-transparent border border-white/10 rounded-lg p-2 text-xs font-black text-white outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Alasan</label>
                                          <input 
                                            type="text" 
                                            value={editForm.reason} 
                                            onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                                            className="w-full bg-transparent border border-white/10 rounded-lg p-2 text-xs font-black text-white outline-none"
                                          />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdateLog(log.id)} className="flex-1 py-2 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Simpan</button>
                                        <button onClick={() => setEditingLogId(null)} className="px-4 py-2 bg-white/5 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">Batal</button>
                                    </div>
                                  </div>
                              ) : (
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                          log.points_delta > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      }`}>
                                          {log.points_delta > 0 ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs md:text-sm font-black ${log.points_delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {log.points_delta > 0 ? '+' : ''}{log.points_delta}
                                            </span>
                                            <span className="text-[8px] md:text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                                                <Calendar size={10} /> {formatDate(log.created_at)}
                                            </span>
                                          </div>
                                          <h4 className="text-white font-black text-[11px] md:text-sm uppercase tracking-tight line-clamp-2 leading-tight">{log.reason}</h4>
                                      </div>
                                    </div>
                                    
                                    {isAdmin && (
                                      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => {
                                            setEditingLogId(log.id);
                                            setEditForm({ reason: log.reason, points: log.points_delta });
                                          }}
                                          className="p-1.5 bg-white/5 text-slate-500 hover:text-primary rounded-lg border border-white/10"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteLog(log.id)}
                                          className="p-1.5 bg-white/5 text-slate-500 hover:text-rose-500 rounded-lg border border-white/10"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                      </div>
                                    )}
                                </div>
                              )}
                            </div>
                        ))
                      ) : (
                          <div className="text-center py-20 opacity-40 animate-pulse">
                            <Activity size={32} className="mx-auto text-primary mb-4" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-10">Menunggu Sinkronisasi Riwayat...</p>
                          </div>
                      )}
                    </div>
                </div>

                {/* Right Column: Management (LG: Always visible, SM: Conditional) */}
                {isAdmin && (
                  <div className={`p-4 md:p-10 space-y-6 md:space-y-10 overflow-y-auto custom-scrollbar border-l border-white/10 bg-slate-900/10 lg:flex lg:flex-col ${activeModalTab === 'MANAGE' ? 'flex flex-col' : 'hidden'}`}>
                      <div>
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 md:mb-8 hidden lg:flex items-center gap-2">
                            <PlusCircle size={14} /> Kelola Poin Baru
                        </h3>
                        
                        <div className="space-y-8">
                            {/* Pelanggaran Section */}
                            <div className="space-y-4">
                              <h4 className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                  <MinusCircle size={14} className="text-rose-500/50" /> Pelanggaran
                              </h4>
                              <div className="grid grid-cols-2 gap-2 md:gap-3">
                                  {behaviorReasons.bad.map(r => (
                                    <button 
                                      key={r} 
                                      disabled={isUpdatingPoints}
                                      onClick={() => handleAddBehavior('BAD', 10, r)} 
                                      className="p-3 md:p-4 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/30 rounded-xl md:rounded-2xl text-left text-[9px] font-black text-rose-300 uppercase tracking-widest transition-all active:scale-95 leading-tight"
                                    >
                                      {r}
                                    </button>
                                  ))}
                              </div>
                            </div>
                            
                            {/* Terpuji Section */}
                            <div className="space-y-4">
                              <h4 className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                  <PlusCircle size={14} className="text-emerald-500/50" /> Tindakan Terpuji
                              </h4>
                              <div className="grid grid-cols-2 gap-2 md:gap-3">
                                  {behaviorReasons.good.map(r => (
                                    <button 
                                      key={r} 
                                      disabled={isUpdatingPoints}
                                      onClick={() => handleAddBehavior('GOOD', 10, r)} 
                                      className="p-3 md:p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 rounded-xl md:rounded-2xl text-left text-[9px] font-black text-emerald-300 uppercase tracking-widest transition-all active:scale-95 leading-tight"
                                    >
                                      {r}
                                    </button>
                                  ))}
                              </div>
                            </div>
                        </div>
                      </div>

                      {/* Integrity box - Always at bottom */}
                      <div className="p-5 md:p-8 bg-slate-950/40 rounded-3xl border border-white/5 relative overflow-hidden group mt-auto">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShieldCheck size={64} className="text-primary" />
                        </div>
                        <h4 className="text-[12px] font-black text-white uppercase tracking-tight mb-1">Integritas Data</h4>
                        <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase tracking-wider">Sinkronisasi otomatis via RPC GradeMaster OS.</p>
                      </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}

      {/* REASONS MANAGEMENT MODAL */}
      {isManagingReasons && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[2000] flex items-center justify-center p-0 md:p-4">
          <div className="bg-slate-900/50 border border-white/10 max-w-2xl w-full h-full md:h-auto md:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
              <div 
                className="p-8 md:pt-8 border-b border-white/10 bg-white/5 shrink-0 relative"
                style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
              >
                <button onClick={() => setIsManagingReasons(false)} className="absolute top-[max(1.5rem,env(safe-area-inset-top))] right-6 md:top-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-500 border border-white/10 hover:bg-rose-500 hover:text-white transition-all">
                  <X size={20} />
                </button>
                <h2 className="text-xl font-black text-white uppercase font-outfit">Setelan Poin Global</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Kustomisasi alasan poin untuk seluruh kelas</p>
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
                    placeholder="Tambah kategori..." 
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
                    className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all outline-none"
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
