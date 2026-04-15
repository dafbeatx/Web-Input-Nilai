import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, Users, Calendar, Search, Save, Loader2, CheckCircle2, 
  XCircle, AlertCircle, Clock, BookOpen, ChevronLeft, ChevronRight,
  MoreVertical, Check, Info, HeartPulse, LogOut, LayoutGrid, Menu
} from 'lucide-react';
import Image from 'next/image';
import { ToastType } from '@/lib/grademaster/types';

interface AttendanceRecord {
  id?: string;
  student_name: string;
  class_name: string;
  subject: string;
  academic_year: string;
  status: string; // Hadir, Izin, Sakit, Alpa
  date: string;
}

interface Student {
  id: string;
  student_name: string;
  avatar_url?: string;
}

interface AttendanceLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  isAdmin?: boolean;
  activeClass?: string;
  activeYear?: string;
}

// Status configuration
const STATUS_CONFIG = [
  { id: 'Hadir', label: 'H', icon: CheckCircle2, color: 'text-emerald-400', bgActive: 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/30', bgIdle: 'bg-white/[0.03] border-white/[0.06]', dotColor: 'bg-emerald-400' },
  { id: 'Izin', label: 'I', icon: Info, color: 'text-sky-400', bgActive: 'bg-sky-500/20 border-sky-500/50 ring-1 ring-sky-500/30', bgIdle: 'bg-white/[0.03] border-white/[0.06]', dotColor: 'bg-sky-400' },
  { id: 'Sakit', label: 'S', icon: HeartPulse, color: 'text-amber-400', bgActive: 'bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-500/30', bgIdle: 'bg-white/[0.03] border-white/[0.06]', dotColor: 'bg-amber-400' },
  { id: 'Alpa', label: 'A', icon: XCircle, color: 'text-rose-400', bgActive: 'bg-rose-500/20 border-rose-500/50 ring-1 ring-rose-500/30', bgIdle: 'bg-white/[0.03] border-white/[0.06]', dotColor: 'bg-rose-400' },
] as const;

export default function AttendanceLayer({ 
  onBack, 
  setToast, 
  isAdmin = false, 
  activeClass = '', 
  activeYear = '2025/2026' 
}: AttendanceLayerProps) {
  const [className, setClassName] = useState(activeClass || '');
  const [academicYear, setAcademicYear] = useState(activeYear || '2025/2026');
  const [subject, setSubject] = useState('Informatika');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  // Track which students are currently being saved
  const [savingStudents, setSavingStudents] = useState<Record<string, boolean>>({});

  // Debounce ref for auto-save
  const saveTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  const subjects = ["Informatika", "Matematika", "IPA", "IPS", "Bahasa Indonesia", "Bahasa Inggris", "PAI", "PJOK", "Seni Budaya", "PKn"];

  useEffect(() => {
    fetchAvailableClasses();
  }, [academicYear]);

  // Automatic loading when filters change
  useEffect(() => {
    if (className && subject && selectedDate) {
      loadAttendance(className, subject, selectedDate);
    }
  }, [className, subject, selectedDate]);

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

  const loadAttendance = async (targetClass: string, targetSubject: string, targetDate: string) => {
    if (!targetClass.trim() || !targetSubject.trim() || !targetDate.trim()) return;
    
    setIsLoading(true);
    try {
      // 1. Load students first
      const resStudents = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(targetClass)}&year=${encodeURIComponent(academicYear)}`);
      const dataStudents = await resStudents.json();
      if (!resStudents.ok) throw new Error(dataStudents.error);
      
      setStudents(dataStudents.students || []);
      
      // 2. Load attendance records
      const resAttendance = await fetch(`/api/grademaster/attendance?class=${encodeURIComponent(targetClass)}&year=${encodeURIComponent(academicYear)}&subject=${encodeURIComponent(targetSubject)}&date=${targetDate}`);
      const dataAttendance = await resAttendance.json();
      
      const map: Record<string, string> = {};
      
      dataAttendance.attendance?.forEach((rec: AttendanceRecord) => {
        map[rec.student_name] = rec.status;
      });
      
      setAttendanceMap(map);
      setIsLoaded(true);
    } catch (err: any) {
      setToast({ message: err.message || "Gagal mengambil data", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save single student attendance
  const autoSaveStudent = useCallback(async (studentName: string, status: string) => {
    setSavingStudents(prev => ({ ...prev, [studentName]: true }));
    
    try {
      const record = {
        student_name: studentName,
        class_name: className,
        subject,
        academic_year: academicYear,
        status,
        date: selectedDate
      };
      
      const res = await fetch('/api/grademaster/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [record] })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      
      // Subtle success — no toast per student, just visual feedback via the button state
    } catch (err: any) {
      setToast({ message: `Gagal menyimpan: ${studentName}`, type: "error" });
      // Revert on failure
      setAttendanceMap(prev => {
        const copy = { ...prev };
        delete copy[studentName];
        return copy;
      });
    } finally {
      setSavingStudents(prev => ({ ...prev, [studentName]: false }));
    }
  }, [className, subject, academicYear, selectedDate, setToast]);

  const handleStatusChange = useCallback((studentName: string, status: string) => {
    // Optimistic update
    setAttendanceMap(prev => ({ ...prev, [studentName]: status }));
    
    // Clear any pending save for this student
    if (saveTimerRef.current[studentName]) {
      clearTimeout(saveTimerRef.current[studentName]);
    }
    
    // Debounced auto-save (150ms to handle rapid taps)
    saveTimerRef.current[studentName] = setTimeout(() => {
      autoSaveStudent(studentName, status);
    }, 150);
  }, [autoSaveStudent]);

  const stats = {
    total: students.length,
    hadir: Object.values(attendanceMap).filter(s => s === 'Hadir').length,
    izin: Object.values(attendanceMap).filter(s => s === 'Izin').length,
    sakit: Object.values(attendanceMap).filter(s => s === 'Sakit').length,
    alpa: Object.values(attendanceMap).filter(s => s === 'Alpa').length,
    belum: 0,
  };
  stats.belum = stats.total - stats.hadir - stats.izin - stats.sakit - stats.alpa;

  // Bulk action: Set all unset students to Hadir
  const setAllHadir = useCallback(() => {
    const unsetStudents = students.filter(s => !attendanceMap[s.student_name]);
    if (unsetStudents.length === 0) return;
    
    const newMap = { ...attendanceMap };
    unsetStudents.forEach(s => {
      newMap[s.student_name] = 'Hadir';
    });
    setAttendanceMap(newMap);
    
    // Batch save all
    const records = unsetStudents.map(s => ({
      student_name: s.student_name,
      class_name: className,
      subject,
      academic_year: academicYear,
      status: 'Hadir',
      date: selectedDate,
    }));
    
    fetch('/api/grademaster/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    }).then(res => {
      if (!res.ok) throw new Error('Batch save failed');
      setToast({ message: `${unsetStudents.length} siswa ditandai Hadir`, type: 'success' });
    }).catch(() => {
      setToast({ message: 'Gagal menyimpan batch absensi', type: 'error' });
    });
  }, [students, attendanceMap, className, subject, academicYear, selectedDate, setToast]);

  // Format student name for mobile readability
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
    <div className="font-body text-on-surface min-h-dvh flex flex-col bg-[#0e0e10]">
      {/* Top Navigation — Compact */}
      <nav className="fixed top-0 w-full z-40 bg-[#0e0e10]/80 backdrop-blur-xl flex justify-between items-center px-4 sm:px-6 h-14 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="p-1.5 bg-white/5 rounded-lg border border-white/10 active:scale-90 transition-all">
            <ArrowLeft className="text-primary" size={18} />
          </button>
          <span className="text-lg font-black text-primary tracking-tighter font-headline">KEHADIRAN</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 mt-14 px-4 sm:px-6 pt-4 pb-32 overflow-x-hidden max-w-2xl mx-auto w-full">
        
        {/* Controls — Compact 2-col */}
        <section className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="flex flex-col gap-1">
            <label className="font-label text-[9px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/60 pl-1">Kelas</label>
            <div className="relative">
              <select 
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-primary text-sm font-semibold appearance-none outline-none focus:border-primary/40 transition-colors"
              >
                <option value="">Pilih</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="text-on-surface-variant/40 rotate-90" size={14} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label text-[9px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/60 pl-1">Tanggal</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-primary text-sm font-semibold outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </section>

        {/* Subject Tabs — Horizontal scroll */}
        <section className="mb-5 -mx-4 sm:-mx-6">
          <div className="flex overflow-x-auto no-scrollbar px-4 sm:px-6 gap-2">
            {subjects.map((s) => (
              <button 
                key={s}
                onClick={() => setSubject(s)}
                className={`flex-none px-4 py-2 rounded-full font-bold text-xs transition-all whitespace-nowrap ${
                  subject === s 
                  ? 'bg-tertiary text-on-tertiary shadow-[0_0_12px_rgba(155,255,206,0.25)]' 
                  : 'bg-white/[0.04] text-on-surface-variant/60 hover:text-primary border border-white/[0.06]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Summary Stats — Tight pills */}
        {!isLoading && isLoaded && (
          <section className="flex gap-2 mb-5 overflow-x-auto no-scrollbar -mx-4 sm:-mx-6 px-4 sm:px-6">
            {[
              { label: 'Hadir', count: stats.hadir, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Izin', count: stats.izin, color: 'text-sky-400', bg: 'bg-sky-500/10' },
              { label: 'Sakit', count: stats.sakit, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Alpa', count: stats.alpa, color: 'text-rose-400', bg: 'bg-rose-500/10' },
              { label: 'Belum', count: stats.belum, color: 'text-on-surface-variant/50', bg: 'bg-white/[0.04]' },
            ].map(st => (
              <div key={st.label} className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full ${st.bg} border border-white/[0.06]`}>
                <span className={`text-xs font-extrabold ${st.color}`}>{st.count}</span>
                <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider">{st.label}</span>
              </div>
            ))}
          </section>
        )}

        {/* Student List Header */}
        {!isLoading && isLoaded && (
          <div className="flex justify-between items-center mb-3 px-0.5">
            <h3 className="font-headline font-bold text-sm text-primary">Daftar Siswa</h3>
            <div className="flex items-center gap-2">
              {isAdmin && stats.belum > 0 && (
                <button
                  onClick={setAllHadir}
                  className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-wider active:scale-95 transition-all hover:bg-emerald-500/20"
                >
                  Semua Hadir
                </button>
              )}
              <span className="font-label text-[9px] text-on-surface-variant/40 font-bold uppercase tracking-widest">{students.length} Siswa</span>
            </div>
          </div>
        )}

        {/* Student Cards */}
        <section className="space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
               <Loader2 className="w-8 h-8 text-tertiary animate-spin mb-3" />
               <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em]">Memuat Presensi...</p>
            </div>
          ) : !isLoaded ? (
            <div className="py-16 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08]">
               <LayoutGrid className="w-10 h-10 text-on-surface-variant/15 mx-auto mb-3" />
               <p className="text-xs font-medium text-on-surface-variant/40 px-8">Pilih Kelas & Mapel untuk memuat data absensi.</p>
            </div>
          ) : (
            students.map((s, idx) => {
              const currentStatus = attendanceMap[s.student_name];
              const isSavingThis = savingStudents[s.student_name];

              return (
                <div 
                  key={s.id} 
                  className="bg-white/[0.025] rounded-2xl border border-white/[0.06] overflow-hidden transition-all"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* Student Info Row */}
                  <div className="flex items-center gap-3 px-3.5 pt-3 pb-2">
                    {/* Avatar */}
                    <div className="relative flex-none">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/[0.05] flex items-center justify-center text-primary text-xs font-bold border border-white/[0.08]">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.student_name} className="w-full h-full object-cover" />
                        ) : (
                          s.student_name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      {/* Status dot indicator */}
                      {currentStatus && (
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0e0e10] ${
                          STATUS_CONFIG.find(c => c.id === currentStatus)?.dotColor || 'bg-gray-400'
                        }`} />
                      )}
                    </div>

                    {/* Name + status text */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-headline font-bold text-[13px] text-primary/90 truncate leading-tight" title={s.student_name}>
                        {formatStudentName(s.student_name)}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {currentStatus ? (
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider ${
                            STATUS_CONFIG.find(c => c.id === currentStatus)?.color || 'text-on-surface-variant'
                          }`}>
                            {currentStatus}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/30">
                            Belum diset
                          </span>
                        )}
                        {isSavingThis && (
                          <Loader2 size={8} className="animate-spin text-tertiary" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline Status Buttons — Always visible for Admin */}
                  {isAdmin ? (
                    <div className="flex gap-1.5 px-3.5 pb-3 pt-1">
                      {STATUS_CONFIG.map(opt => {
                        const isActive = currentStatus === opt.id;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleStatusChange(s.student_name, opt.id)}
                            disabled={isSavingThis}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-center transition-all duration-200 active:scale-[0.96] ${
                              isActive ? opt.bgActive : opt.bgIdle
                            } ${isActive ? opt.color : 'text-on-surface-variant/30'} ${
                              isSavingThis ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            <Icon size={13} strokeWidth={isActive ? 2.5 : 1.5} />
                            <span className={`text-[10px] font-extrabold uppercase tracking-wide ${isActive ? '' : 'hidden sm:inline'}`}>
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    currentStatus && (
                      <div className="px-3.5 pb-3 pt-0.5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                          STATUS_CONFIG.find(c => c.id === currentStatus)?.bgActive || ''
                        }`}>
                          {(() => {
                            const cfg = STATUS_CONFIG.find(c => c.id === currentStatus);
                            const Icon = cfg?.icon || Info;
                            return <Icon size={12} className={cfg?.color} />;
                          })()}
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                            STATUS_CONFIG.find(c => c.id === currentStatus)?.color || ''
                          }`}>
                            {currentStatus}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
