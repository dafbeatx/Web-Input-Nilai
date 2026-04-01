import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Users, Search, PlusCircle, MinusCircle, AlertCircle, Save, Loader2, UserPlus, FileText, LayoutGrid, Trash2, Pencil, ShieldCheck, ThumbsUp, ThumbsDown, X, Clock, Calendar, ChevronRight } from 'lucide-react';
import { ToastType, GradedStudent } from '@/lib/grademaster/types';
import { 
  addBehaviorAction, 
  updateBehaviorAction, 
  deleteBehaviorAction, 
  getBehaviorLogsAction 
} from '@/lib/actions/behavior';

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
    if (activeClass && activeYear) {
      loadClassDirectly(activeClass, activeYear);
    } else {
      fetchAvailableClasses();
    }
    fetchBehaviorSettings();
  }, [activeClass, activeYear, academicYear, className]);

  // Load history when a student is selected
  useEffect(() => {
    if (selectedStudent) {
      fetchStudentLogs(selectedStudent.id);
    } else {
      setStudentLogs([]);
      setEditingLogId(null);
    }
  }, [selectedStudent]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 pb-10">
            {students.length > 0 ? (
              students.map((s: BehaviorStudent) => (
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

                  <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Poin Terpuji</span>
                        </div>
                        <span className="text-xs font-black text-emerald-400">AKTIF</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic opacity-60">Sistem atomik GradeMaster menjamin sinkronisasi poin secara real-time di rapor siswa.</p>
                  </div>
                  
                  {isAdmin && (
                      <button 
                      onClick={() => setSelectedStudent(s)}
                      className="w-full mt-6 md:mt-8 py-3 md:py-4 bg-primary/10 text-[9px] md:text-[10px] font-black text-primary uppercase tracking-[0.2em] rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-primary/20"
                      >
                        KELOLA POIN & RIWAYAT
                      </button>
                  )}
                </div>
              ))
            ) : (
                <div className="col-span-full text-center py-20 bg-slate-900/40 rounded-[3rem] border border-white/10 border-dashed">
                  <Users size={48} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Siswa tidak ditemukan</p>
                </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden mb-10 animate-in slide-in-from-bottom-5">
              <div className="p-8 border-b border-white/10 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="font-black text-white text-xl uppercase font-outfit">Manajemen Kedisiplinan</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{students.length} Siswa di Kelas {className}</p>
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
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Poin Saat Ini</th>
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

      {/* DETAILED MANAGEMENT PANEL (Full-Screen Style Modal) */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[1000] flex items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
          <div className="bg-slate-900/50 border border-white/10 w-full h-full md:h-auto max-w-6xl md:rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-10 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-primary/10 text-primary rounded-[2rem] border border-primary/20 flex flex-col items-center justify-center shadow-2xl shadow-primary/20 shrink-0">
                      <span className="text-xl md:text-3xl font-black">{selectedStudent.total_points}</span>
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-60">Poin</span>
                    </div>
                    <div>
                      <h2 className="text-xl md:text-4xl font-black text-white font-outfit uppercase tracking-tighter">{selectedStudent.student_name}</h2>
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                          <span className="px-3 py-1 bg-white/5 rounded-full text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest border border-white/10">Kelas {className}</span>
                          <span className="px-3 py-1 bg-primary/10 rounded-full text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20">{academicYear}</span>
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
              
              {/* Main Content Area */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
                {/* Left: History List */}
                <div className="border-r border-white/10 flex flex-col bg-slate-950/20">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                          <Clock size={14} className="text-primary" /> Riwayat Kedisiplinan
                      </h3>
                      <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-slate-500 uppercase">{studentLogs.length} Catatan</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
                      {isLoadingLogs ? (
                          <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <Loader2 size={24} className="animate-spin mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Memuat database...</p>
                          </div>
                      ) : studentLogs.length > 0 ? (
                        studentLogs.map((log) => (
                            <div key={log.id} className="bg-slate-900/40 border border-white/10 rounded-2xl p-4 md:p-6 hover:border-primary/30 transition-all group relative overflow-hidden">
                              {editingLogId === log.id ? (
                                  <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Poin Delta</label>
                                          <input 
                                            type="number" 
                                            value={editForm.points} 
                                            onChange={(e) => setEditForm(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-black text-white outline-none focus:border-primary"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Kategori/Alasan</label>
                                          <input 
                                            type="text" 
                                            value={editForm.reason} 
                                            onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-black text-white outline-none focus:border-primary"
                                          />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdateLog(log.id)} className="flex-1 py-2 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Simpan</button>
                                        <button onClick={() => setEditingLogId(null)} className="px-4 py-2 bg-white/5 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">Batal</button>
                                    </div>
                                  </div>
                              ) : (
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                          log.points_delta > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      }`}>
                                          {log.points_delta > 0 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-sm font-black ${log.points_delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {log.points_delta > 0 ? '+' : ''}{log.points_delta} Poin
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                                <Calendar size={10} /> {formatDate(log.created_at)}
                                            </span>
                                          </div>
                                          <h4 className="text-white font-black text-sm uppercase tracking-tight">{log.reason}</h4>
                                          {log.notes && <p className="text-[10px] text-slate-500 mt-1 italic">{log.notes}</p>}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => {
                                          setEditingLogId(log.id);
                                          setEditForm({ reason: log.reason, points: log.points_delta });
                                        }}
                                        className="p-2 bg-white/5 text-slate-500 hover:text-primary rounded-lg border border-white/10 transition-colors"
                                      >
                                          <Pencil size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteLog(log.id)}
                                        className="p-2 bg-white/5 text-slate-500 hover:text-rose-500 rounded-lg border border-white/10 transition-colors"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                    </div>
                                </div>
                              )}
                            </div>
                        ))
                      ) : (
                          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                            <FileText size={32} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Belum ada riwayat tercatat</p>
                          </div>
                      )}
                    </div>
                </div>

                {/* Right: Add Form & Templates */}
                <div className="flex flex-col p-6 md:p-10 space-y-10 overflow-y-auto custom-scrollbar">
                    <div>
                      <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                          <PlusCircle size={14} /> Tambah Catatan Baru
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <MinusCircle size={14} /> Pelanggaran (Otomatis Negatif)
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {behaviorReasons.bad.map(r => (
                                  <button 
                                    key={r} 
                                    disabled={isUpdatingPoints}
                                    onClick={() => handleAddBehavior('BAD', 10, r)} 
                                    className="p-4 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/30 rounded-2xl text-left text-[10px] font-black text-rose-400 uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                  >
                                    {r}
                                  </button>
                                ))}
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <PlusCircle size={14} /> Tindakan Terpuji
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {behaviorReasons.good.map(r => (
                                  <button 
                                    key={r} 
                                    disabled={isUpdatingPoints}
                                    onClick={() => handleAddBehavior('GOOD', 10, r)} 
                                    className="p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 rounded-2xl text-left text-[10px] font-black text-emerald-400 uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                  >
                                    {r}
                                  </button>
                                ))}
                            </div>
                          </div>
                      </div>
                    </div>

                    <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                          <ShieldCheck size={120} className="text-primary" />
                      </div>
                      <h4 className="text-xl font-black text-white font-outfit uppercase tracking-tight mb-2">Integritas Data</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-bold max-w-xs">Seluruh perubahan log akan secara otomatis mensinkronkan total poin siswa di database master GradeMaster melalui sistem RPC transaksional.</p>
                    </div>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* REASONS MANAGEMENT MODAL */}
      {isManagingReasons && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[2000] flex items-center justify-center p-4">
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
