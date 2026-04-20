import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, Users, Calendar, Search, Save, Loader2, CheckCircle2, 
  XCircle, AlertCircle, Clock, BookOpen, ChevronLeft, ChevronRight,
  MoreVertical, Check, Info, HeartPulse, LogOut, LayoutGrid, Menu
} from 'lucide-react';
import Image from 'next/image';
import { ToastType } from '@/lib/grademaster/types';
import { useGradeMaster } from '@/context/GradeMasterContext';

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
  { id: 'Hadir', label: 'H', icon: CheckCircle2, color: 'text-emerald-400', bgActive: 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/30', bgIdle: 'bg-surface-variant border-outline-variant', dotColor: 'bg-emerald-400' },
  { id: 'Izin', label: 'I', icon: Info, color: 'text-sky-400', bgActive: 'bg-sky-500/20 border-sky-500/50 ring-1 ring-sky-500/30', bgIdle: 'bg-surface-variant border-outline-variant', dotColor: 'bg-sky-400' },
  { id: 'Sakit', label: 'S', icon: HeartPulse, color: 'text-amber-400', bgActive: 'bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-500/30', bgIdle: 'bg-surface-variant border-outline-variant', dotColor: 'bg-amber-400' },
  { id: 'Alpa', label: 'A', icon: XCircle, color: 'text-rose-400', bgActive: 'bg-rose-500/20 border-rose-500/50 ring-1 ring-rose-500/30', bgIdle: 'bg-surface-variant border-outline-variant', dotColor: 'bg-rose-400' },
] as const;

export default function AttendanceLayer({ 
  onBack, 
  setToast, 
  isAdmin = false, 
  activeClass = '', 
  activeYear = '2025/2026' 
}: AttendanceLayerProps) {
  const { setLayer, adminUser, studentData } = useGradeMaster();
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
        <nav className="hidden md:flex items-center gap-8 mb-12 border-b border-surface-container overflow-x-auto no-scrollbar">
          <button onClick={onBack} className="pb-4 text-xs font-bold uppercase tracking-[0.05em] text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">Beranda</button>
          <button onClick={() => setLayer('behavior')} className="pb-4 text-xs font-bold uppercase tracking-[0.05em] text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">Sikap</button>
          <button className="pb-4 text-xs font-bold uppercase tracking-[0.05em] text-on-primary-fixed border-b-2 border-on-primary-fixed whitespace-nowrap">Kehadiran</button>
        </nav>

        {/* Info Banner */}
        {!isAdmin && isLoaded && (
          <div className="bg-[#EBF5FF] p-5 rounded-xl mb-10 flex items-start gap-4 shadow-sm border border-blue-100">
            <span className="material-symbols-outlined text-[#0061FF] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            <p className="text-[13px] font-bold text-[#0061FF] leading-relaxed tracking-tight">
              TRANSPARANSI: DAFTAR KEHADIRAN INI DAPAT DIPANTAU OLEH WALI MURID.
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
              <h1 className="text-3xl sm:text-4xl font-headline font-semibold tracking-[-0.04em] text-on-primary-fixed">Kehadiran</h1>
            </div>
          </div>
          <div className="flex bg-surface-container-highest rounded-2xl p-1 gap-1">
             <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none text-on-surface focus:ring-2 focus:ring-primary/20 shadow-sm transition-all text-center w-[160px]" />
          </div>
        </div>

        {/* Horizontal Filters (Classes & Subjects) */}
        <div className="space-y-4 mb-8 -mx-6 px-6 sm:mx-0 sm:px-0">
          <div className="overflow-x-auto no-scrollbar flex items-center gap-3 py-2">
            <div className="bg-surface-container-high px-4 py-2.5 rounded-full text-xs font-bold text-on-surface-variant shrink-0 border border-outline-variant/30 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} /> Kelas {'>'}
            </div>
            {availableClasses.map((cls) => {
              const isActive = className === cls;
              return (
                <button
                  key={cls}
                  onClick={() => setClassName(cls)}
                  className={"px-6 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap outline-none flex-shrink-0 " + (isActive ? 'bg-on-primary-fixed text-white shadow-lg shadow-on-primary-fixed/20' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container')}
                >
                  {cls}
                </button>
              )
            })}
          </div>

          <div className="overflow-x-auto no-scrollbar flex items-center gap-3 py-1">
            <div className="bg-surface-container-high px-4 py-2.5 rounded-full text-xs font-bold text-on-surface-variant shrink-0 border border-outline-variant/30 uppercase tracking-widest flex items-center gap-2">
              <BookOpen size={14} /> Mapel {'>'}
            </div>
            {subjects.map((s) => (
              <button 
                key={s}
                onClick={() => setSubject(s)}
                className={"px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap outline-none flex-shrink-0 " + (subject === s ? 'bg-surface-variant border border-surface-container-highest text-on-surface shadow-sm font-bold' : 'bg-transparent text-on-surface-variant hover:bg-surface-container-low')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Stats and Batch Action */}
        {!isLoading && isLoaded && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-surface-container mb-6 gap-4">
             <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
               {[
                 { label: 'Hadir', count: stats.hadir, color: 'text-[#006C49]', bg: 'bg-[#E6F4EF]' },
                 { label: 'Izin', count: stats.izin, color: 'text-[#0061FF]', bg: 'bg-[#EBF5FF]' },
                 { label: 'Sakit', count: stats.sakit, color: 'text-[#B45309]', bg: 'bg-[#FFF9E6]' },
                 { label: 'Alpa', count: stats.alpa, color: 'text-[#93000A]', bg: 'bg-[#FFDAD6]' }
               ].map(st => (
                 <div key={st.label} className={"flex-none flex items-center gap-2 px-4 py-1.5 rounded-full " + st.bg}>
                   <span className={"text-sm font-black " + st.color}>{st.count}</span>
                   <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider">{st.label}</span>
                 </div>
               ))}
               {stats.belum > 0 && (
                 <div className="flex-none flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low">
                   <span className="text-sm font-black text-on-surface-variant">{stats.belum}</span>
                   <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Belum Set</span>
                 </div>
               )}
             </div>
             {isAdmin && stats.belum > 0 && (
               <button onClick={setAllHadir} className="px-5 py-2.5 w-full sm:w-auto shrink-0 bg-[#006C49] hover:bg-[#005236] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#006C49]/20 transition-all flex justify-center items-center gap-2">
                 <CheckCircle2 size={16} /> Tandai Semua Hadir
               </button>
             )}
          </div>
        )}

        {/* Student Cards List */}
        <section className="grid grid-cols-1 gap-4">
          {isLoading ? (
             <div className="py-24 flex flex-col items-center justify-center gap-4">
                <Loader2 size={32} className="animate-spin text-primary" />
                <span className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Memuat Presensi...</span>
             </div>
          ) : !isLoaded ? (
             <div className="text-center py-24 bg-white rounded-[16px] border border-surface-container flex flex-col items-center justify-center px-6 shadow-sm">
               <LayoutGrid size={48} className="text-on-surface-variant/30 mb-4" />
               <h3 className="text-lg font-bold text-on-primary-fixed mb-2 tracking-tight">Belum Ada Presensi Aktif</h3>
               <p className="text-sm text-on-surface-variant leading-relaxed max-w-sm">Pilih Kelas, Mapel, dan Tanggal untuk memuat daftar absensi.</p>
             </div>
          ) : (
            students.map((s) => {
              const currentStatus = attendanceMap[s.student_name];
              const isSavingThis = savingStudents[s.student_name];
              const safeColors: Record<string, { id: string; label: string; text: string; bg: string; }> = {
                 Hadir: { id: 'Hadir', label: 'Hadir', text: 'text-[#006C49]', bg: 'bg-[#E6F4EF]' },
                 Izin: { id: 'Izin', label: 'Izin', text: 'text-[#0061FF]', bg: 'bg-[#EBF5FF]' },
                 Sakit: { id: 'Sakit', label: 'Sakit', text: 'text-[#B45309]', bg: 'bg-[#FFF9E6]' },
                 Alpa: { id: 'Alpa', label: 'Alpa', text: 'text-[#93000A]', bg: 'bg-[#FFDAD6]' }
              };

              return (
                <div key={s.id} className="group bg-white rounded-[16px] p-5 sm:p-6 shadow-[0_10px_40px_rgba(15,23,42,0.04)] border border-transparent hover:border-surface-container transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                    <div className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-lg tracking-wider relative overflow-hidden bg-on-primary-fixed ring-2 ring-surface-bright shadow-sm">
                      {s.avatar_url ? (
                         <img src={s.avatar_url} alt={s.student_name} className="w-full h-full object-cover" />
                      ) : s.student_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 pr-4 flex-1">
                      <h3 className="text-base sm:text-lg font-headline font-bold tracking-tight text-on-primary-fixed mb-1 uppercase truncate w-full" title={formatStudentName(s.student_name)}>
                         {formatStudentName(s.student_name)}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.05em] text-on-surface-variant flex items-center gap-2">
                        {isSavingThis ? <Loader2 size={12} className="animate-spin text-primary" /> : <span className="w-1.5 h-1.5 bg-surface-container-highest rounded-full"></span>}
                        Status: {currentStatus || 'BELUM DISET'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Toggles */}
                  <div className="flex flex-row items-center w-full sm:w-auto gap-2">
                    {isAdmin ? (
                      ['Hadir', 'Izin', 'Sakit', 'Alpa'].map(opt => {
                        const styleInfo = safeColors[opt];
                        const isActive = currentStatus === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleStatusChange(s.student_name, opt)}
                            disabled={isSavingThis}
                            className={"flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.05em] transition-all outline-none border flex items-center justify-center min-w-[70px] " + (isActive ? styleInfo.bg + ' ' + styleInfo.text + ' border-transparent shadow-sm' : 'bg-transparent border-surface-container text-on-surface-variant hover:bg-surface-container-lowest hover:border-outline-variant')}
                          >
                            <span className="sm:hidden">{opt.slice(0, 1)}</span>
                            <span className="hidden sm:inline">{opt}</span>
                          </button>
                        );
                      })
                    ) : (
                      currentStatus ? (
                         <div className={"px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.05em] " + safeColors[currentStatus].bg + ' ' + safeColors[currentStatus].text}>
                           {currentStatus}
                         </div>
                      ) : (
                         <div className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.05em] bg-surface-container-highest text-on-surface-variant/50">
                           N/A
                         </div>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* BottomNavBar */}
      <nav id="mobile-bottom-nav" className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 sm:px-8 pb-8 pt-4 bg-white/90 backdrop-blur-xl border-t border-surface-container shadow-[0_-10px_40px_rgba(15,23,42,0.04)] z-50 md:hidden">
        <button onClick={onBack} className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-900 transition-colors w-16">
          <span className="material-symbols-outlined">home</span>
          <span className="font-['Inter'] text-[9px] font-bold uppercase tracking-[0.05em] mt-1">Beranda</span>
        </button>
        <button onClick={() => setLayer('behavior')} className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-900 transition-colors w-16">
          <span className="material-symbols-outlined">star_rate</span>
          <span className="font-['Inter'] text-[9px] font-bold uppercase tracking-[0.05em] mt-1">Sikap</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-950 scale-110 transition-transform w-16">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
          <span className="font-['Inter'] text-[9px] font-bold uppercase tracking-[0.05em] mt-1 text-primary">Kehadiran</span>
        </button>
      </nav>
    </div>
  );
}
