import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Users, Search, PlusCircle, MinusCircle, AlertCircle, Save, Loader2, UserPlus, FileText, LayoutGrid, Trash2, Pencil, ShieldCheck, ThumbsUp, ThumbsDown, X, Clock, Calendar, ChevronRight, BarChart3, Activity, ListChecks, History, Download, DownloadCloud, Check } from 'lucide-react';
import { ToastType, GradedStudent } from '@/lib/grademaster/types';
import { 
  addBehaviorAction, 
  updateBehaviorAction, 
  deleteBehaviorAction, 
  getBehaviorLogsAction 
} from '@/lib/actions/behavior';
import { supabase } from '@/lib/supabase/client';
import { useGradeMaster } from '@/context/GradeMasterContext';
import Image from 'next/image';

interface BehaviorLog {
  id: string;
  student_id: string;
  category_id?: string;
  points_delta: number;
  reason: string;
  teacher_id?: string;
  notes?: string;
  violation_date: string;
  created_at: string;
}

interface BehaviorStudent {
  id: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  total_points: number;
  avatar_url?: string | null;
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
  const { setLayer, adminUser, studentData } = useGradeMaster();
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
  const [editForm, setEditForm] = useState({ reason: '', points: 0, date: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeModalTab, setActiveModalTab] = useState<'HISTORY' | 'MANAGE' | 'AKADEMIK' | 'DOKUMEN'>('HISTORY');
  const [studentSummary, setStudentSummary] = useState<{ attendance: any, academicHistory: any[], documents: any[] } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Avatar Upload State
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [targetedAvatarStudent, setTargetedAvatarStudent] = useState<string | null>(null);

  // Settings State
  const [isManagingReasons, setIsManagingReasons] = useState(false);
  const [behaviorReasons, setBehaviorReasons] = useState<{ text: string, weight: number }[]>([
    { text: "Bolos PBM", weight: 20 },
    { text: "Berbicara Kasar", weight: 15 },
    { text: "Merokok/Vaping", weight: 50 },
    { text: "Membantah Guru", weight: 25 },
    { text: "Terlambat Parah", weight: 10 }
  ]);
  const [newReasonInput, setNewReasonInput] = useState('');
  const [newReasonWeight, setNewReasonWeight] = useState(10);

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

  // Load history & summary when a student is selected
  useEffect(() => {
    if (selectedStudent) {
      fetchStudentLogs(selectedStudent.id);
      fetchStudentSummary(selectedStudent.student_name);
      setActiveModalTab('HISTORY'); // Default to history when opening modal
      document.body.classList.add('hide-mobile-header');
    } else {
      setStudentLogs([]);
      setStudentSummary(null);
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
        // Handle migration gracefully if previous structure `{ good, bad }` or flat strings exist.
        if (Array.isArray(data.settings.reasons) && typeof data.settings.reasons[0] === 'object') {
           setBehaviorReasons(data.settings.reasons);
        } else {
           // Skip applying old schema, stick to new default.
           console.log("Old behavior schema detected, using default until saved.");
        }
      }
    } catch (err) {
      console.error("Failed to load behavior settings", err);
    }
  };

  const fetchStudentSummary = async (name: string) => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`/api/grademaster/students/summary?name=${encodeURIComponent(name)}&year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (res.ok) {
        setStudentSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch student summary", err);
    } finally {
      setIsLoadingSummary(false);
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
      if (res.ok) {
        const sortedClasses = (data.classes || []).sort((a: string, b: string) => 
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
        setAvailableClasses(sortedClasses);
      }
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

  const handleAddBehavior = async (pointsDelta: number, reason: string, date?: string) => {
    if (!selectedStudent || isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    
    // Use provided date or fallback to selectedDate state
    const violationDate = date || selectedDate;
    
    // Optimistic Update (Total Points on card) -> Demerit system (Accumulate)
    const pointsToAdd = Math.abs(pointsDelta);
    
    const result = await addBehaviorAction({
      studentId: selectedStudent.id,
      pointsDelta: pointsToAdd,
      reason,
      violationDate
    });

    if (result.success) {
      setToast({ message: `Catatan "${reason}" ditambahkan`, type: "success" });
      // Update local state for total points in the list
      const newPts = result.data?.new_total ?? 0;
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, total_points: newPts } : s));
      // Update the selected student's total point in the modal header
      setSelectedStudent(prev => prev ? { ...prev, total_points: newPts } : null);
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
      studentId: selectedStudent.id,
      violationDate: editForm.date
    });

    if (result.success) {
      setToast({ message: "Catatan berhasil diperbarui", type: "success" });
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, total_points: result.newTotal ?? 0 } : s));
      setSelectedStudent(prev => prev ? { ...prev, total_points: result.newTotal ?? 0 } : null);
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
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, total_points: result.newTotal ?? 0 } : s));
      setSelectedStudent(prev => prev ? { ...prev, total_points: result.newTotal ?? 0 } : null);
      fetchStudentLogs(selectedStudent.id);
    } else {
      setToast({ message: result.error || "Gagal menghapus", type: "error" });
    }
    setIsUpdatingPoints(false);
  };

  const saveBehaviorSettings = async (updatedReasons: { text: string, weight: number }[]) => {
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

  const handleAvatarUpload = async (studentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Validasi Ukuran (Max 20MB untuk foto resolusi tinggi modern)
    if (file.size > 20 * 1024 * 1024) {
      setToast({ message: "Ukuran foto terlalu besar (Maksimal 20MB)", type: "error" });
      return;
    }

    setUploadingAvatarId(studentId);
    setToast({ message: "Sedang memproses & mengoptimalkan gambar...", type: "success" });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('studentId', studentId);

      const res = await fetch('/api/grademaster/behaviors/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto");

      setToast({ message: "Foto profil berhasil diperbarui!", type: "success" });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, avatar_url: data.avatar_url } : s));
      
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(prev => prev ? { ...prev, avatar_url: data.avatar_url } : null);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setToast({ message: err.message || "Gagal mengunggah. Coba gunakan format JPG/PNG.", type: "error" });
    } finally {
      setUploadingAvatarId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric'
    });
  };

  const formatStudentName = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return name;

    let firstName = parts[0];
    const lowerFirst = firstName.toLowerCase();
    // Specific rule for Muhamad/Muhammad
    if (lowerFirst === 'muhammad' || lowerFirst === 'muhamad') {
      firstName = "M.";
    } else if (firstName.length > 10) {
      firstName = firstName[0].toUpperCase() + ".";
    }

    if (parts.length === 2) {
      return `${firstName} ${parts[1]}`;
    }

    // 3+ parts: [First] [Middle] [Rest...]
    // Keep first (shortened if long), keep middle, abbreviate the rest
    const middleName = parts[1];
    const rest = parts.slice(2).map(p => p[0].toUpperCase() + ".").join(" ");
    return `${firstName} ${middleName} ${rest}`;
  };

  return (
    <>
    
    <div className="bg-surface-container-lowest text-on-surface antialiased min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="bg-white/80 backdrop-blur-lg fixed top-0 z-[60] w-full flex justify-between items-center px-6 py-4 shadow-[0_10px_40px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <div className="bg-primary-container p-1.5 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <span className="text-sm font-bold tracking-[0.05em] uppercase text-slate-950 font-outfit">GRADEMASTER OS</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="hover:opacity-70 transition-opacity text-slate-400 hidden sm:block">
            <span className="material-symbols-outlined shrink-0">notifications</span>
          </button>
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-bold text-on-surface-variant overflow-hidden border-2 border-surface-container shadow-sm object-cover">
             {isAdmin ? (
                adminUser?.[0] || 'A'
             ) : (
                studentData?.photo_url ? <img src={studentData.photo_url} alt="Profile" className="w-full h-full object-cover" /> : (studentData?.name?.[0] || 'S')
             )}
          </div>
        </div>
      </header>

      <main className="pt-24 max-w-5xl mx-auto px-6">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-8 mb-12 border-b border-surface-container overflow-x-auto no-scrollbar hidden md:flex">
          <button onClick={onBack} className="pb-4 text-xs font-bold uppercase tracking-[0.05em] text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">Beranda</button>
          <button className="pb-4 text-xs font-bold uppercase tracking-[0.05em] text-on-primary-fixed border-b-2 border-on-primary-fixed whitespace-nowrap">Sikap</button>
          <button onClick={() => setLayer('attendance')} className="pb-4 text-xs font-bold uppercase tracking-[0.05em] text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">Kehadiran</button>
        </nav>

        {/* Info Banner */}
        {!isAdmin && isLoaded && (
          <div className="bg-[#EBF5FF] p-5 rounded-xl mb-10 flex items-start gap-4 shadow-sm border border-blue-100">
            <span className="material-symbols-outlined text-[#0061FF] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            <p className="text-[13px] font-bold text-[#0061FF] leading-relaxed tracking-tight">
              TRANSPARANSI: LAPORAN PERILAKU INI DAPAT DIPANTAU OLEH WALI MURID.
            </p>
          </div>
        )}

        {/* Title Section */}
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2 block">TAHUN AJARAN {academicYear}</span>
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="w-10 h-10 shrink-0 rounded-full border border-surface-container flex items-center justify-center hover:bg-surface-container transition-colors active:scale-95">
                <span className="material-symbols-outlined text-on-surface shrink-0">arrow_back</span>
              </button>
              <h1 className="text-3xl sm:text-4xl font-headline font-semibold tracking-[-0.04em] text-on-primary-fixed">Kedisiplinan</h1>
            </div>
          </div>
          {isAdmin && (
             <button onClick={() => setIsManagingReasons(true)} className="px-5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-sm font-bold text-on-surface transition-all hover:bg-surface-container shadow-sm flex items-center gap-2 shrink-0 active:scale-95">
               <span className="material-symbols-outlined text-[18px] shrink-0">settings</span> Kelola Poin
             </button>
          )}
        </div>

        {/* Horizontal Filter Pills */}
        <div className="mb-8 overflow-x-auto no-scrollbar flex items-center gap-3 py-2 -mx-6 px-6 sm:mx-0 sm:px-0">
          {['Semua Kelas', ...availableClasses].map((cls) => {
            const isActive = className === cls;
            return (
              <button
                key={cls}
                onClick={() => loadClassDirectly(cls, academicYear)}
                disabled={isLoading}
                className={"px-6 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap outline-none flex-shrink-0 " + (isActive ? 'bg-on-primary-fixed text-white shadow-lg shadow-on-primary-fixed/20' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container')}
              >
                {cls}
              </button>
            )
          })}
        </div>

        {/* Desktop Admin Search - Adapted for light theme */}
        {isAdmin && (
          <div className="mb-8 flex items-center bg-white border border-surface-container-high rounded-full px-5 py-3 transition-colors focus-within:border-primary/50 shadow-sm max-w-md">
            <Search size={16} className="text-on-surface-variant shrink-0 mr-3" />
            <input 
              type="text" 
              placeholder="Cari spesifik siswa..." 
              value={newStudentName} 
              onChange={(e) => setNewStudentName(e.target.value)} 
              className="w-full bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/50" 
            />
          </div>
        )}

        {/* Discipline List */}
        <div className="grid grid-cols-1 gap-6">
          {isLoading ? (
             <div className="py-24 flex flex-col items-center justify-center gap-4">
                <Loader2 size={32} className="animate-spin text-primary" />
                <span className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Memuat data...</span>
             </div>
          ) : students.length === 0 ? (
             <div className="text-center py-24 bg-white rounded-[16px] border border-surface-container flex flex-col items-center justify-center px-6 shadow-sm">
               <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 font-light">group_off</span>
               <h3 className="text-lg font-bold text-on-primary-fixed mb-2 tracking-tight">Belum Memiliki Catatan Kedisiplinan</h3>
               <p className="text-sm text-on-surface-variant leading-relaxed max-w-sm">Siswa tidak ditemukan di data observasi untuk filter atau pencarian terkait.</p>
             </div>
          ) : (
            students.filter(s => s.student_name.toLowerCase().includes(newStudentName.toLowerCase())).map((student) => {
              const hasViolations = student.total_points > 0;
              return (
                <div key={student.id} className="group bg-white rounded-[16px] p-6 sm:p-8 shadow-[0_10px_40px_rgba(15,23,42,0.04)] border border-transparent hover:border-surface-container transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full sm:w-auto">
                    <div 
                      className={"w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-lg tracking-wider relative overflow-hidden ring-4 ring-white shadow-sm " + (student.avatar_url ? 'bg-surface-container' : 'bg-on-primary-fixed') + (isAdmin ? ' cursor-pointer hover:opacity-80' : '')}
                      onClick={() => {
                        if (isAdmin) {
                           setTargetedAvatarStudent(student.id);
                           fileInputRef.current?.click();
                        }
                      }}
                    >
                      {student.avatar_url ? (
                         <img src={student.avatar_url} alt={student.student_name} className="w-full h-full object-cover" />
                      ) : student.student_name.slice(0, 2).toUpperCase()}
                      {uploadingAvatarId === student.id && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm"><Loader2 size={16} className="animate-spin text-white" /></div>
                      )}
                    </div>
                    <div className="min-w-0 pr-4 flex-1">
                      <h3 className="text-lg sm:text-xl font-headline font-bold tracking-tight text-on-primary-fixed mb-1 uppercase truncate w-full" title={formatStudentName(student.student_name)}>{formatStudentName(student.student_name)}</h3>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.05em] text-on-surface-variant whitespace-nowrap">KELAS {student.class_name}</span>
                        <span className="w-1 h-1 rounded-full bg-surface-container shrink-0"></span>
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.05em] text-on-surface-variant whitespace-nowrap">Skor: {student.total_points}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-4 sm:pt-0 border-t border-surface-container sm:border-transparent">
                    <div className={"px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.05em] whitespace-nowrap " + (hasViolations ? 'bg-[#FFF9E6] text-[#B45309]' : 'bg-[#E6F4EF] text-[#006C49]')}>
                       {hasViolations ? 'PERINGATAN' : 'BERSIH'}
                    </div>
                    <button 
                      onClick={() => setSelectedStudent(student)}
                      className="text-[11px] sm:text-[12px] font-bold text-on-primary-fixed/60 hover:text-on-primary-fixed transition-colors flex items-center gap-1 group/link outline-none"
                    >
                       Riwayat Poin <span className="material-symbols-outlined text-[16px] group-hover/link:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* BottomNavBar */}
      <nav id="mobile-bottom-nav" className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 sm:px-8 pb-8 pt-4 bg-white/90 backdrop-blur-xl border-t border-surface-container shadow-[0_-10px_40px_rgba(15,23,42,0.04)] z-50 md:hidden">
        <button onClick={onBack} className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-900 transition-colors w-16">
          <span className="material-symbols-outlined">home</span>
          <span className="font-['Inter'] text-[9px] font-bold uppercase tracking-[0.05em] mt-1">Beranda</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-950 scale-110 transition-transform w-16">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star_rate</span>
          <span className="font-['Inter'] text-[9px] font-bold uppercase tracking-[0.05em] mt-1 text-primary">Sikap</span>
        </button>
        <button onClick={() => setLayer('attendance')} className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-900 transition-colors w-16">
          <span className="material-symbols-outlined">event_available</span>
          <span className="font-['Inter'] text-[9px] font-bold uppercase tracking-[0.05em] mt-1">Kehadiran</span>
        </button>
      </nav>
    </div>

    {/* COMPACT & TABBED DETAIL MODAL (CENTERED OPSI B) — rendered via Portal */}
    {selectedStudent && createPortal(
        <div className="fixed inset-0 bg-surface/95 backdrop-blur-2xl z-[1000] flex flex-col animate-in fade-in duration-300 overflow-y-auto no-scrollbar">
          {/* Top Navigation Bar */}
          <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-4 h-16 max-w-md mx-auto left-1/2 -translate-x-1/2 border-b border-outline-variant">
            <button 
              onClick={() => setSelectedStudent(null)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#19191c] active:scale-95 transition-all duration-200"
            >
              <ArrowLeft className="text-primary" size={24} />
            </button>
            <h1 className="font-headline font-semibold text-lg text-primary">Student Profile</h1>
            <div className="w-10 h-10"></div> {/* Empty for spacing */}
          </header>

          <main className="pt-20 pb-44 px-5 max-w-md mx-auto min-h-dvh flex flex-col space-y-6 w-full">
            {/* Hero Section: Student Identity */}
            <section className="relative mt-4">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  {/* Profile Frame */}
                  <div className="w-32 h-32 rounded-3xl overflow-hidden ring-4 ring-white/5 relative z-10 bg-surface-container-high">
                    {selectedStudent.avatar_url ? (
                      <Image 
                        src={selectedStudent.avatar_url} 
                        alt={selectedStudent.student_name} 
                        fill 
                        className="object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-black text-on-surface-variant bg-surface-container">
                        {selectedStudent.student_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Decorative Glow Behind Image */}
                  <div className="absolute inset-0 bg-tertiary/10 blur-3xl -z-10 rounded-full"></div>
                </div>
                <h2 className="font-headline font-extrabold text-3xl tracking-tight text-primary leading-tight mb-1 uppercase">
                  {selectedStudent.student_name}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-3 py-1 bg-surface-container rounded-full text-on-surface-variant font-label text-xs tracking-wider font-medium uppercase">
                    Kelas {selectedStudent.class_name}
                  </span>
                  <span className="px-3 py-1 bg-surface-container rounded-full text-on-surface-variant font-label text-xs tracking-wider font-medium uppercase">
                    {academicYear}
                  </span>
                </div>
              </div>
            </section>

            {/* Key Metrics Bento Layout */}
            <section className="grid grid-cols-2 gap-4">
              {/* Points Badge */}
              <div className="bg-[#19191c]/70 backdrop-blur-xl rounded-xl p-5 flex flex-col items-center justify-center border border-outline-variant shadow-[0_0_25px_rgba(155,255,206,0.1)]">
                <div className="relative mb-2">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle className="text-on-surface/5" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" strokeWidth="4"></circle>
                    <circle 
                      className={selectedStudent.total_points > 0 ? 'text-error' : 'text-tertiary'} 
                      cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" 
                      strokeDasharray="175.9" 
                      strokeDashoffset={175.9 - (Math.min(selectedStudent.total_points, 100) / 100) * 175.9} 
                      strokeWidth="4"
                      strokeLinecap="round"
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-headline font-bold text-2xl ${selectedStudent.total_points > 0 ? 'text-error' : 'text-tertiary'}`}>
                      {selectedStudent.total_points}
                    </span>
                  </div>
                </div>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">Poin Demerit</span>
              </div>
              
              {/* Attendance Mini Card */}
              <div className="bg-[#19191c]/70 backdrop-blur-xl rounded-xl p-5 flex flex-col items-center justify-center border border-outline-variant shadow-lg">
                <div className="w-10 h-10 mb-2 flex items-center justify-center">
                   {isLoadingSummary ? <Loader2 className="animate-spin text-tertiary" size={24} /> : <Activity className="text-primary" size={28} />}
                </div>
                <span className="font-headline font-bold text-xl text-primary">
                  {studentSummary?.attendance?.percentage !== null && studentSummary?.attendance?.percentage !== undefined
                    ? `${studentSummary.attendance.percentage}%`
                    : "—"
                  }
                </span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">
                  {studentSummary?.attendance?.percentage !== null ? "Kehadiran" : "Belum Ada Data"}
                </span>
              </div>
            </section>

            {/* Tab Controls */}
            <nav className="flex space-x-2 p-1 bg-[#131315] rounded-2xl overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveModalTab('HISTORY')}
                className={`flex-none px-5 py-2.5 rounded-xl font-label text-sm font-semibold transition-all ${
                  activeModalTab === 'HISTORY' ? 'bg-[#2c2c2f] text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Ringkasan
              </button>
              <button 
                onClick={() => setActiveModalTab('AKADEMIK')}
                className={`flex-none px-5 py-2.5 rounded-xl font-label text-sm font-semibold transition-all ${
                  activeModalTab === 'AKADEMIK' ? 'bg-[#2c2c2f] text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Akademik
              </button>
              <button 
                onClick={() => setActiveModalTab('DOKUMEN')}
                className={`flex-none px-5 py-2.5 rounded-xl font-label text-sm font-semibold transition-all ${
                  activeModalTab === 'DOKUMEN' ? 'bg-[#2c2c2f] text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Dokumen
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setActiveModalTab('MANAGE')}
                  className={`flex-none px-5 py-2.5 rounded-xl font-label text-sm font-semibold transition-all ${
                    activeModalTab === 'MANAGE' ? 'bg-[#2c2c2f] text-primary' : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Manajemen
                </button>
              )}
            </nav>

            {/* Content Sections */}
            {activeModalTab === 'HISTORY' && (
              <section className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-headline font-bold text-lg text-primary">Riwayat Transparansi</h3>
                  <div className="px-3 py-1 bg-surface-variant rounded-lg text-[9px] font-bold text-on-surface-variant uppercase tracking-widest group">
                    {studentLogs.length} Entri terpantau
                  </div>
                </div>

                {isLoadingLogs ? (
                   <div className="bg-[#19191c]/70 backdrop-blur-xl rounded-xl border border-outline-variant p-12 flex flex-col items-center justify-center text-center space-y-4">
                      <Loader2 size={32} className="animate-spin text-tertiary" />
                      <p className="font-headline font-semibold text-primary">Sinkronisasi Data...</p>
                   </div>
                ) : studentLogs.length === 0 ? (
                  <div className="bg-[#19191c]/70 backdrop-blur-xl rounded-xl border border-outline-variant p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                    <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-2">
                       <History className="text-on-surface-variant" size={40} />
                    </div>
                    <div>
                      <p className="font-headline font-semibold text-primary">Belum Ada Riwayat Perilaku</p>
                      <p className="font-body text-sm text-on-surface-variant mt-1 max-w-[200px]">Semua aktivitas perilaku dan log harian akan muncul di sini secara transparan.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentLogs.map((log) => (
                      <div key={log.id} className="bg-[#19191c]/70 backdrop-blur-xl rounded-2xl p-5 border border-outline-variant hover:border-primary/20 transition-all group shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                           <div className="flex items-start gap-4 flex-1">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                                log.points_delta > 0 ? 'bg-error/10 text-error border-error/20' : 'bg-tertiary/10 text-tertiary border-tertiary/20'
                              }`}>
                                 {log.points_delta > 0 ? <MinusCircle size={20} /> : <ThumbsUp size={20} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className={`text-base font-black ${log.points_delta > 0 ? 'text-error' : 'text-tertiary'}`}>
                                       {log.points_delta > 0 ? '+' : ''}{log.points_delta} Poin
                                    </span>
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-variant px-2 py-0.5 rounded-full">
                                       {formatDate(log.violation_date || log.created_at)}
                                    </span>
                                 </div>
                                 <h4 className="text-on-surface font-bold text-sm leading-relaxed">{log.reason}</h4>
                              </div>
                           </div>

                           {isAdmin && (
                             <div className="flex flex-col gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingLogId(log.id);
                                    setEditForm({ 
                                      reason: log.reason, 
                                      points: log.points_delta,
                                      date: (log.violation_date || log.created_at).split('T')[0]
                                    });
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-surface-variant text-on-surface-variant hover:text-primary rounded-lg transition-colors"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteLog(log.id)}
                                  className="w-8 h-8 flex items-center justify-center bg-surface-variant text-on-surface-variant hover:text-error rounded-lg transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                             </div>
                           )}
                        </div>

                        {/* Inline Edit UI */}
                        {isAdmin && editingLogId === log.id && (
                          <div className="mt-4 pt-4 border-t border-outline-variant space-y-4 animate-in slide-in-from-top-2">
                             <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-on-surface-variant uppercase ml-1">Tanggal</label>
                                  <input 
                                    type="date" 
                                    value={editForm.date} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs font-bold text-on-surface outline-none focus:border-primary"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-on-surface-variant uppercase ml-1">Keterangan</label>
                                  <input 
                                    type="text" 
                                    value={editForm.reason} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs font-bold text-on-surface outline-none focus:border-primary"
                                  />
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleUpdateLog(log.id)} className="flex-1 py-2.5 bg-primary text-[#0e0e10] rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">Simpan</button>
                                <button onClick={() => setEditingLogId(null)} className="px-5 py-2.5 bg-surface-variant text-on-surface-variant rounded-xl text-xs font-black uppercase tracking-widest">Batal</button>
                             </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeModalTab === 'AKADEMIK' && (
              <section className="flex flex-col space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-headline font-bold text-lg text-primary">Rekam Jejak Akademik</h3>
                  <div className="px-2 py-0.5 bg-tertiary/10 rounded-md text-[9px] font-black text-tertiary uppercase tracking-widest border border-tertiary/20">
                    Live Data
                  </div>
                </div>

                {isLoadingSummary ? (
                   <div className="bg-[#19191c]/70 backdrop-blur-xl rounded-xl border border-outline-variant p-12 flex flex-col items-center justify-center text-center space-y-4">
                      <Loader2 size={32} className="animate-spin text-tertiary" />
                      <p className="font-headline font-semibold text-primary">Menarik Data Nilai...</p>
                   </div>
                ) : !studentSummary?.academicHistory || studentSummary.academicHistory.length === 0 ? (
                  <div className="bg-[#19191c]/70 backdrop-blur-xl rounded-xl border border-outline-variant p-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-2">
                       <BarChart3 className="text-on-surface-variant" size={40} />
                    </div>
                    <div>
                      <p className="font-headline font-semibold text-primary">Belum Ada Riwayat Nilai</p>
                      <p className="font-body text-sm text-on-surface-variant mt-1">Data nilai akan muncul secara otomatis setelah ujian dikoreksi oleh admin.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentSummary.academicHistory.map((grade: any, idx: number) => (
                      <div key={idx} className="bg-[#19191c]/70 backdrop-blur-xl rounded-2xl p-5 border border-outline-variant flex items-center justify-between group shadow-sm">
                        <div className="flex flex-col gap-1 overflow-hidden">
                           <h4 className="text-on-surface font-bold text-sm uppercase tracking-tight truncate leading-tight">{grade.sessionName}</h4>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{grade.subject}</span>
                              <span className="text-[10px] font-bold text-on-surface-variant/40">•</span>
                              <span className="text-[10px] font-bold text-on-surface-variant/70 italic uppercase">{formatDate(grade.date)}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                           <div className="text-right">
                              <span className={`text-2xl font-black font-headline ${grade.isPassing ? 'text-tertiary' : 'text-error'}`}>{grade.score}</span>
                              <div className={`text-[8px] font-black uppercase tracking-tighter ${grade.isPassing ? 'text-tertiary/60' : 'text-error/60'}`}>
                                 KKM: {grade.kkm}
                              </div>
                           </div>
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-on-surface ${grade.isPassing ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'}`}>
                              {grade.isPassing ? <Check size={16} /> : <X size={16} />}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeModalTab === 'DOKUMEN' && (
              <section className="flex flex-col space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-headline font-bold text-lg text-primary">Pusat Dokumen</h3>
                  <div className="px-2 py-0.5 bg-primary/10 rounded-md text-[9px] font-black text-primary-container uppercase tracking-widest border border-primary/20">
                    Siap Unduh
                  </div>
                </div>

                {isLoadingSummary ? (
                   <div className="bg-[#19191c]/70 backdrop-blur-xl rounded-xl border border-outline-variant p-12 flex flex-col items-center justify-center text-center space-y-4">
                      <Loader2 size={32} className="animate-spin text-tertiary" />
                      <p className="font-headline font-semibold text-primary">Menyiapkan Dokumen...</p>
                   </div>
                ) : (
                  <div className="space-y-3">
                    {studentSummary?.documents?.map((doc: any) => (
                      <div key={doc.id} className={`bg-[#19191c]/70 backdrop-blur-xl rounded-2xl p-5 border border-outline-variant flex items-center justify-between group shadow-sm ${!doc.ready ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                               <FileText size={24} />
                            </div>
                            <div className="flex flex-col">
                               <h4 className="text-on-surface font-bold text-sm leading-tight">{doc.name}</h4>
                               <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">{doc.type} • {doc.size}</p>
                            </div>
                         </div>
                         <button className="w-10 h-10 bg-primary/10 text-primary-container rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-95 shadow-lg border border-primary/20">
                            <DownloadCloud size={18} />
                         </button>
                      </div>
                    ))}
                    <div className="p-6 bg-surface-container rounded-3xl border border-outline-variant flex flex-col items-center gap-2 text-center mt-4">
                       <ShieldCheck className="text-on-surface-variant opacity-20" size={40} />
                       <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-relaxed">Seluruh dokumen telah ditanda tangani secara digital oleh GradeMaster Trust Verification.</p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeModalTab === 'MANAGE' && (
              <section className="flex flex-col space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                 <div className="p-5 bg-[#19191c]/70 backdrop-blur-xl border border-outline-variant rounded-2xl space-y-3">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase flex items-center gap-2 px-1 tracking-widest">
                       <Calendar size={12} className="text-tertiary" /> Tanggal Peristiwa
                    </label>
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm font-bold text-on-surface outline-none focus:border-tertiary transition-all"
                    />
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-error uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                       <MinusCircle size={14} className="opacity-70" /> Daftar Pelanggaran
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                       {behaviorReasons.map(r => (
                         <button 
                           key={r.text} 
                           disabled={isUpdatingPoints}
                           onClick={() => handleAddBehavior(r.weight, r.text)} 
                           className="p-5 bg-error/5 hover:bg-error/10 border border-error/10 hover:border-error/30 rounded-2xl text-left transition-all active:scale-95 flex items-center justify-between group shadow-sm"
                         >
                            <div className="flex flex-col gap-1">
                               <span className="text-[11px] font-black text-on-surface uppercase tracking-wider">{r.text}</span>
                               <span className="text-[9px] text-on-surface-variant font-bold">Resiko: Akumulatif Demerit</span>
                            </div>
                            <span className="text-xs font-black text-error bg-error/10 px-3 py-1 rounded-lg border border-error/20">
                               + {r.weight} Pts
                            </span>
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Information Banner */}
                 <div className="p-6 bg-surface rounded-3xl border border-outline-variant relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <ShieldCheck size={80} className="text-primary" />
                    </div>
                    <h4 className="text-xs font-black text-on-surface uppercase tracking-tight mb-1">Integritas Riwayat</h4>
                    <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed uppercase tracking-wider">Laporan ini bersifat transparan dan dapat dipantau langsung oleh wali murid melalui dashboard siswa.</p>
                 </div>
              </section>
            )}

            {/* Bottom Action CTA for Admin (Quick Scroll to Management) */}
            {isAdmin && activeModalTab === 'HISTORY' && (
              <section className="pt-4">
                <button 
                  onClick={() => setActiveModalTab('MANAGE')}
                  className="w-full py-4 bg-gradient-to-r from-primary to-[#a0a1a1] rounded-xl text-[#0e0e10] font-headline font-extrabold text-sm tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-white/5"
                >
                  <PlusCircle size={20} />
                  TAMBAH CATATAN
                </button>
              </section>
            )}
          </main>
        </div>
      , document.body)}

    {/* REASONS MANAGEMENT MODAL — rendered via Portal */}
    {isManagingReasons && createPortal(
      <div className="fixed inset-0 bg-surface/90 backdrop-blur-xl z-[2000] flex items-center justify-center p-0 md:p-4">
          <div className="bg-slate-900 border border-outline-variant max-w-2xl w-full h-full md:h-[80vh] md:rounded-[3rem] overflow-hidden premium-shadow flex flex-col animate-in fade-in zoom-in-95">
              <div className="p-6 md:p-8 border-b border-outline-variant bg-surface-variant shrink-0 relative flex items-start justify-between" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
                <div>
                  <h2 className="text-xl font-black text-on-surface uppercase font-outfit">Setelan Poin Global</h2>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Kustomisasi alasan poin standar untuk seluruh kelas</p>
                </div>
                <button onClick={() => setIsManagingReasons(false)} className="w-10 h-10 bg-surface-variant rounded-full flex items-center justify-center text-on-surface-variant border border-outline-variant hover:bg-rose-500 hover:text-white transition-all premium-shadow">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex flex-1 gap-2 border border-outline-variant rounded-xl bg-surface/80 shadow-sm overflow-hidden focus-within:border-primary transition-all">
                      <input 
                        type="text" 
                        placeholder="Kategori pelanggaran baru..." 
                        value={newReasonInput}
                        onChange={(e) => setNewReasonInput(e.target.value)}
                        className="flex-1 bg-transparent px-5 py-3 text-sm font-bold text-on-surface outline-none placeholder:text-on-surface-variant"
                      />
                      <div className="flex items-center bg-surface-variant border-l border-outline-variant px-3">
                        <span className="text-[10px] font-black text-rose-500 mr-2 uppercase">+ Poin</span>
                        <input 
                          type="number" 
                          min="1"
                          max="100"
                          value={newReasonWeight}
                          onChange={(e) => setNewReasonWeight(parseInt(e.target.value) || 0)}
                          className="w-16 bg-transparent text-sm font-bold text-rose-400 outline-none placeholder:text-on-surface-variant"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (!newReasonInput.trim() || newReasonWeight <= 0) {
                          setToast({ message: "Alasan wajib diisi & poin harus > 0", type: "error" });
                          return;
                        }
                        const updated = [...behaviorReasons, { text: newReasonInput.trim(), weight: newReasonWeight }];
                        saveBehaviorSettings(updated);
                        setNewReasonInput('');
                        setNewReasonWeight(10);
                      }}
                      className="px-6 py-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all outline-none font-bold text-xs uppercase"
                    >
                      TAMBAHKAN
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-outline-variant">
                        <AlertCircle size={14} /> Master Pelanggaran (Demerit Lists)
                      </h4>
                      <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {behaviorReasons.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3.5 bg-surface-variant rounded-xl border border-outline-variant group hover:border-rose-500/30 transition-colors shadow-sm">
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-on-surface-variant">{r.text}</span>
                                <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">+{r.weight} Pts</span>
                              </div>
                              <button 
                                onClick={() => {
                                  const updated = behaviorReasons.filter((_, idx) => idx !== i);
                                  saveBehaviorSettings(updated);
                                }}
                                className="text-slate-600 hover:text-rose-500 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 p-1"
                                title="Hapus kriteria ini"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                </div>
              </div>
        </div>
      </div>
    , document.body)}
    </>
  );
}
