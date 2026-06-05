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
    <div className="min-h-screen bg-slate-50/50 text-slate-800 antialiased font-outfit pb-24">
      {/* TopAppBar */}
      <header className="hidden md:flex bg-white/80 backdrop-blur-lg fixed top-0 z-[60] w-full justify-between items-center px-6 py-4 shadow-sm border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-1.5 rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-white text-xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <span className="text-sm font-bold tracking-[0.05em] uppercase text-slate-900 font-outfit">GradeMaster OS</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="hover:opacity-70 transition-opacity text-slate-400 hidden sm:block">
            <span className="material-symbols-outlined shrink-0">notifications</span>
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 overflow-hidden border border-slate-200 shadow-sm object-cover">
             {isAdmin ? (
                adminUser?.[0] || 'A'
             ) : (
                studentData?.photo_url ? <img src={studentData.photo_url} alt="Profile" className="w-full h-full object-cover" /> : (studentData?.name?.[0] || 'S')
             )}
          </div>
        </div>
      </header>

      <main className="page-pt md:pt-24 max-w-7xl mx-auto px-4 md:px-6">
        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-8 mb-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
          <button onClick={onBack} className="pb-4 text-xs font-bold uppercase tracking-[0.05em] text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">Beranda</button>
          <button onClick={() => setLayer('behavior')} className="pb-4 text-xs font-bold uppercase tracking-[0.05em] text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">Sikap</button>
          <button className="pb-4 text-xs font-bold uppercase tracking-[0.05em] text-emerald-600 border-b-2 border-emerald-600 whitespace-nowrap">Kehadiran</button>
        </nav>

        {/* Info Banner */}
        {!isAdmin && isLoaded && (
          <div className="bg-blue-50/50 p-4 rounded-xl mb-6 flex items-start gap-3 border border-blue-100 shadow-sm">
            <span className="material-symbols-outlined text-blue-500 mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            <p className="text-xs font-bold text-blue-600 leading-relaxed tracking-tight">
              Transparansi: Daftar kehadiran ini dapat dipantau oleh wali murid.
            </p>
          </div>
        )}

        {/* Title Section */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1 block">Tahun Ajaran {academicYear}</span>
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="w-9 h-9 shrink-0 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors active:scale-95">
                <span className="material-symbols-outlined text-slate-600 shrink-0">arrow_back</span>
              </button>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Kehadiran</h1>
            </div>
          </div>
          <div className="hidden sm:flex bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
             <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none text-slate-700 focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all text-center w-[150px]" />
          </div>
        </div>

        {/* Compact Filters for Mobile */}
        <div className="grid grid-cols-3 gap-2 mb-6 md:hidden">
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full h-11 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
          >
            <option value="">Kelas...</option>
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-11 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
          >
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-full h-11 bg-white border border-slate-200 rounded-xl px-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-center min-h-[44px]" 
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:block space-y-4 mb-6">
          <div className="overflow-x-auto no-scrollbar flex items-center gap-2 py-1">
            <div className="bg-slate-100 px-3 py-1.5 rounded-full text-[10px] font-black text-slate-500 shrink-0 border border-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={12} /> Kelas
            </div>
            {availableClasses.map((cls) => {
              const isActive = className === cls;
              return (
                <button
                  key={cls}
                  onClick={() => setClassName(cls)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap outline-none ${
                    isActive ? 'bg-[#0F172A] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cls}
                </button>
              )
            })}
          </div>

          <div className="overflow-x-auto no-scrollbar flex items-center gap-2 py-1">
            <div className="bg-slate-100 px-3 py-1.5 rounded-full text-[10px] font-black text-slate-500 shrink-0 border border-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen size={12} /> Mapel
            </div>
            {subjects.map((s) => (
              <button 
                key={s}
                onClick={() => setSubject(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap outline-none ${
                  subject === s ? 'bg-slate-200 text-slate-800 font-bold' : 'bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Stats and Batch Action */}
        {!isLoading && isLoaded && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-100 mb-6 gap-4 shadow-sm">
             <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
               {[
                 { label: 'Hadir', count: stats.hadir, color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-100' },
                 { label: 'Izin', count: stats.izin, color: 'text-blue-700', bg: 'bg-blue-50 border border-blue-100' },
                 { label: 'Sakit', count: stats.sakit, color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-100' },
                 { label: 'Alpa', count: stats.alpa, color: 'text-rose-700', bg: 'bg-rose-50 border border-rose-100' }
               ].map(st => (
                 <div key={st.label} className={"flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg " + st.bg}>
                   <span className={"text-xs font-black " + st.color}>{st.count}</span>
                   <span className="text-[10px] font-bold text-slate-500">{st.label}</span>
                 </div>
               ))}
               {stats.belum > 0 && (
                 <div className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
                   <span className="text-xs font-black text-slate-600">{stats.belum}</span>
                   <span className="text-[10px] font-bold text-slate-500">Belum Set</span>
                 </div>
               )}
             </div>
             {isAdmin && stats.belum > 0 && (
               <button onClick={setAllHadir} className="px-4 py-2.5 w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex justify-center items-center gap-2 min-h-[44px] sm:min-h-0">
                 <CheckCircle2 size={15} /> Tandai Semua Hadir
               </button>
             )}
          </div>
        )}

        {/* Student Cards List */}
        <section className="grid grid-cols-1 gap-3">
          {isLoading ? (
             <div className="py-24 flex flex-col items-center justify-center gap-3">
                <Loader2 size={28} className="animate-spin text-emerald-500" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memuat Presensi...</span>
             </div>
          ) : !isLoaded ? (
             <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center px-4 shadow-sm">
               <LayoutGrid size={40} className="text-slate-300 mb-3" />
               <h3 className="text-base font-black text-slate-800 mb-1">Belum Ada Presensi Aktif</h3>
               <p className="text-xs text-slate-400 max-w-xs leading-relaxed">Pilih Kelas, Mapel, dan Tanggal untuk memuat daftar absensi.</p>
             </div>
          ) : (
            students.map((s) => {
              const currentStatus = attendanceMap[s.student_name];
              const isSavingThis = savingStudents[s.student_name];
              const safeColors: Record<string, { id: string; label: string; text: string; bg: string; }> = {
                 Hadir: { id: 'Hadir', label: 'Hadir', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                 Izin: { id: 'Izin', label: 'Izin', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                 Sakit: { id: 'Sakit', label: 'Sakit', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                 Alpa: { id: 'Alpa', label: 'Alpa', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' }
              };

              return (
                <div key={s.id} className="group bg-white rounded-xl p-3 md:p-5 border border-slate-100 hover:border-slate-200 transition-all flex flex-row items-center justify-between gap-3 md:gap-6 shadow-sm">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-lg tracking-wider relative overflow-hidden bg-slate-900 border border-slate-100 shadow-sm">
                      {s.avatar_url ? (
                         <img src={s.avatar_url} alt={s.student_name} className="w-full h-full object-cover" />
                      ) : s.student_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm md:text-base font-bold text-slate-900 leading-tight truncate w-full" title={formatStudentName(s.student_name)}>
                         {formatStudentName(s.student_name)}
                      </h3>
                      <p className="text-[10px] md:text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5">
                        {isSavingThis ? <Loader2 size={12} className="animate-spin text-emerald-500" /> : <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>}
                        Status: {currentStatus || 'Belum Diset'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Toggles */}
                  <div className="flex flex-row items-center gap-1.5 shrink-0">
                    {isAdmin ? (
                      ['Hadir', 'Izin', 'Sakit', 'Alpa'].map(opt => {
                        const styleInfo = safeColors[opt];
                        const isActive = currentStatus === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleStatusChange(s.student_name, opt)}
                            disabled={isSavingThis}
                            className={`h-11 w-11 md:h-9 md:w-16 rounded-lg text-xs font-bold transition-all outline-none border flex items-center justify-center min-h-[44px] sm:min-h-0 ${
                              isActive 
                                ? styleInfo.bg + ' ' + styleInfo.text
                                : 'bg-transparent border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <span className="md:hidden">{opt.slice(0, 1)}</span>
                            <span className="hidden md:inline">{opt}</span>
                          </button>
                        );
                      })
                    ) : (
                      currentStatus ? (
                         <div className={"px-3.5 py-1.5 rounded-lg text-xs font-bold border " + safeColors[currentStatus].bg + ' ' + safeColors[currentStatus].text}>
                           {currentStatus}
                         </div>
                      ) : (
                         <div className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-400 border border-slate-100">
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
    </div>
  );
}
