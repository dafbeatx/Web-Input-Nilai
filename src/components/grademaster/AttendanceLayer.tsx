import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, Calendar, Search, Save, Loader2, CheckCircle2, 
  XCircle, AlertCircle, Clock, BookOpen, ChevronLeft, ChevronRight,
  MoreVertical, Check, Info, HeartPulse, LogOut, LayoutGrid, Menu
} from 'lucide-react';
import Image from 'next/image';
import { ToastType } from '@/lib/grademaster/types';
import { createPortal } from 'react-dom';

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
  const [isSaving, setIsSaving] = useState(false);
  
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Semua');

  // Local state for status selection modal
  const [targetedStudent, setTargetedStudent] = useState<Student | null>(null);

  const statusOptions = [
    { id: 'Hadir', icon: <CheckCircle2 size={18} />, color: 'text-tertiary', bgColor: 'bg-tertiary/10' },
    { id: 'Izin', icon: <Info size={18} />, color: 'text-primary-container', bgColor: 'bg-primary-container/10' },
    { id: 'Sakit', icon: <HeartPulse size={18} />, color: 'text-outline', bgColor: 'bg-outline/10' },
    { id: 'Alpa', icon: <XCircle size={18} />, color: 'text-error', bgColor: 'bg-error/10' },
  ];

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

  const saveAttendance = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const records = students
        .filter(s => attendanceMap[s.student_name])
        .map(s => ({
          student_name: s.student_name,
          class_name: className,
          subject,
          academic_year: academicYear,
          status: attendanceMap[s.student_name],
          date: selectedDate
        }));
        
      if (records.length === 0) {
        setToast({ message: "Pilih setidaknya satu absensi sebelum menyimpan", type: "error" });
        setIsSaving(false);
        return;
      }
      
      const res = await fetch('/api/grademaster/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      
      setToast({ message: `Absensi ${subject} - ${className} berhasil disimpan!`, type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Gagal menyimpan absensi", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = (student: string, status: string) => {
    setAttendanceMap(prev => ({ ...prev, [student]: status }));
  };

  const subjects = ["Informatika", "Matematika", "IPA", "IPS", "Bahasa Indonesia", "Bahasa Inggris", "PAI", "PJOK", "Seni Budaya", "PKn"];

  const stats = {
    total: students.length,
    belum_ada: students.filter(s => !attendanceMap[s.student_name]).length,
    hadir: Object.values(attendanceMap).filter(s => s === 'Hadir').length,
    izin: Object.values(attendanceMap).filter(s => s === 'Izin').length,
    sakit: Object.values(attendanceMap).filter(s => s === 'Sakit').length,
    alpa: Object.values(attendanceMap).filter(s => s === 'Alpa').length,
  };

  const filteredStudents = students.filter(s => {
    if (filterStatus === 'Semua') return true;
    if (filterStatus === 'Belum Diset') return !attendanceMap[s.student_name];
    return attendanceMap[s.student_name] === filterStatus;
  });

  return (
    <div className="font-body text-on-surface min-h-dvh flex flex-col pb-44 bg-[#0e0e10]">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-40 bg-[#0e0e10]/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 px-2 bg-white/5 rounded-lg border border-white/10 active:scale-90 transition-all">
            <ArrowLeft className="text-primary" size={20} />
          </button>
          <span className="text-xl font-black text-primary tracking-tighter font-headline">GradeMaster OS</span>
        </div>
        <div className="flex items-center gap-4">
           {isAdmin && (
             <button 
              onClick={saveAttendance}
              disabled={isSaving}
              className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(155,255,206,0.3)]"
             >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                <span className="hidden sm:inline">Simpan</span>
             </button>
           )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 mt-16 px-6 pt-6 pb-40 overflow-x-hidden max-w-2xl mx-auto w-full">
        {/* Header Section */}
        <header className="mb-8">
          <h1 className="font-headline font-extrabold text-3xl text-primary tracking-tight leading-none mb-2 uppercase">KEHADIRAN SISWA</h1>
          <p className="text-on-surface-variant font-medium text-sm max-w-[80%] uppercase tracking-widest text-[10px]">Monitoring Kehadiran Kelas • {academicYear}</p>
        </header>

        {/* Dynamic Controls Grid */}
        <section className="grid grid-cols-2 gap-3 mb-8">
          <div className="flex flex-col gap-2">
            <label className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-variant pl-1">Pilih Kelas</label>
            <div className="relative">
              <select 
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3.5 text-primary font-semibold appearance-none outline-none focus:border-primary/50"
              >
                <option value="">Pilih</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="text-tertiary rotate-90" size={18} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-variant pl-1">Tanggal</label>
            <div className="relative">
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3.5 text-primary font-semibold outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </section>

        {/* Subject Tabs */}
        <section className="mb-8 -mx-6">
          <div className="flex overflow-x-auto no-scrollbar px-6 gap-3">
            {subjects.map((s) => (
              <button 
                key={s}
                onClick={() => setSubject(s)}
                className={`flex-none px-6 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                  subject === s 
                  ? 'bg-tertiary text-on-tertiary shadow-[0_0_15px_rgba(155,255,206,0.3)]' 
                  : 'bg-surface-container text-on-surface-variant hover:text-primary border border-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Summary Statistics (Bento Style) */}
        {!isLoading && isLoaded && (
          <section className="grid grid-cols-4 gap-3 mb-10">
            <div className="bg-surface-container-high rounded-xl p-4 flex flex-col items-center justify-center gap-1 border border-white/5">
              <CheckCircle2 size={20} className="text-tertiary" />
              <span className="font-headline font-extrabold text-lg text-primary">{stats.hadir}</span>
              <span className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">HADIR</span>
            </div>
            <div className="bg-surface-container-high rounded-xl p-4 flex flex-col items-center justify-center gap-1 border border-white/5">
              <Info size={20} className="text-primary-container" />
              <span className="font-headline font-extrabold text-lg text-primary">{stats.izin}</span>
              <span className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">IZIN</span>
            </div>
            <div className="bg-surface-container-high rounded-xl p-4 flex flex-col items-center justify-center gap-1 border border-white/5">
              <HeartPulse size={20} className="text-outline" />
              <span className="font-headline font-extrabold text-lg text-primary">{stats.sakit}</span>
              <span className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">SAKIT</span>
            </div>
            <div className="bg-surface-container-high rounded-xl p-4 flex flex-col items-center justify-center gap-1 border border-white/5">
              <XCircle size={20} className="text-error" />
              <span className="font-headline font-extrabold text-lg text-primary">{stats.alpa}</span>
              <span className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">ALPA</span>
            </div>
          </section>
        )}

        {/* Student List */}
        <section className="space-y-3">
          <div className="flex justify-between items-end mb-4 px-1">
            <h3 className="font-headline font-bold text-lg text-primary">Daftar Siswa</h3>
            <span className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Total: {students.length} Siswa</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
               <Loader2 className="w-10 h-10 text-tertiary animate-spin mb-4" />
               <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">Memuat Presensi...</p>
            </div>
          ) : !isLoaded ? (
            <div className="py-20 text-center bg-surface-container rounded-3xl border border-dashed border-outline-variant/20">
               <LayoutGrid className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
               <p className="text-sm font-medium text-on-surface-variant px-10">Pilih Kelas & Mapel untuk memuat data absensi.</p>
            </div>
          ) : (
            filteredStudents.map((s) => {
              const status = attendanceMap[s.student_name];
              const statusDisplay = status || "BELUM ADA DATA";
              const isPresent = status === 'Hadir';
              const isAbsent = status === 'Alpa';
              const isPermitted = status === 'Izin' || status === 'Sakit';

              return (
                <div key={s.id} className="bg-surface-container p-4 rounded-2xl flex items-center justify-between group border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container-highest flex items-center justify-center text-primary font-bold border border-white/5">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.student_name} className="w-full h-full object-cover" />
                        ) : (
                          s.student_name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      {isPresent && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-tertiary rounded-full border-2 border-surface-container flex items-center justify-center shadow-lg">
                          <Check size={10} className="text-on-tertiary font-bold" />
                        </div>
                      )}
                      {isPermitted && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-container rounded-full border-2 border-surface-container flex items-center justify-center shadow-lg">
                          <span className="text-[10px] text-white font-bold">!</span>
                        </div>
                      )}
                      {isAbsent && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-error rounded-full border-2 border-surface-container flex items-center justify-center shadow-lg text-white">
                          <XCircle size={10} />
                        </div>
                      )}
                    </div>
                    <div className="max-w-[150px] overflow-hidden">
                      <h4 className={`font-headline font-bold text-sm truncate ${isPresent ? 'text-primary' : (isAbsent ? 'text-error' : 'text-primary/70')}`}>
                        {s.student_name}
                      </h4>
                      <p className={`font-label text-[10px] font-bold uppercase tracking-wider ${isPresent ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                        {statusDisplay}
                      </p>
                    </div>
                  </div>
                  
                  {isAdmin ? (
                    <button 
                      onClick={() => setTargetedStudent(s)}
                      className="bg-surface-bright p-2.5 rounded-xl text-tertiary hover:bg-tertiary hover:text-on-tertiary active:scale-90 transition-all border border-white/5"
                    >
                      {status ? <MoreVertical size={18} /> : <span className="text-[10px] font-black px-1 uppercase">Set</span>}
                    </button>
                  ) : (
                    status && (
                      <div className={`p-2 rounded-lg ${isPresent ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                         {isPresent ? <CheckCircle2 size={18} /> : <Info size={18} />}
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* Admin Status Selection Overlay */}
      {isAdmin && targetedStudent && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setTargetedStudent(null)}></div>
          <div className="relative bg-surface-container-high rounded-[2.5rem] w-full max-w-sm overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="p-8 text-center border-b border-white/5 bg-white/5">
                <div className="w-20 h-20 rounded-3xl bg-surface-bright mx-auto mb-6 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {targetedStudent.avatar_url ? (
                    <img src={targetedStudent.avatar_url} alt={targetedStudent.student_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-primary">{targetedStudent.student_name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h3 className="text-xl font-headline font-bold text-primary truncate px-4">{targetedStudent.student_name}</h3>
                <p className="text-xs font-bold text-on-surface-variant mt-1 uppercase tracking-[0.2em]">Pilih Status Kehadiran</p>
             </div>
             
             <div className="p-6 grid grid-cols-2 gap-3 bg-[#0e0e10]/30">
                {statusOptions.map(opt => (
                  <button 
                    key={opt.id}
                    onClick={() => {
                      handleStatusChange(targetedStudent.student_name, opt.id);
                      setTargetedStudent(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border border-white/5 transition-all active:scale-95 ${opt.bgColor} ${opt.color} hover:border-white/20`}
                  >
                    {opt.icon}
                    <span className="text-[11px] font-black uppercase tracking-widest">{opt.id}</span>
                  </button>
                ))}
             </div>
             
             <button 
              onClick={() => setTargetedStudent(null)}
              className="w-full py-6 text-[11px] font-black text-on-surface-variant uppercase tracking-[0.3em] hover:text-primary transition-colors border-t border-white/5 active:bg-white/5"
             >
               Batal
             </button>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Action Button for Admin */}
      {isAdmin && isLoaded && !isLoading && (
        <button 
          onClick={saveAttendance}
          disabled={isSaving}
          className="fixed bottom-10 right-8 w-16 h-16 bg-tertiary text-on-tertiary rounded-2xl flex items-center justify-center z-40 active:scale-90 transition-transform shadow-[0_10px_30px_rgba(40,230,150,0.4)]"
          title="Simpan Absensi"
        >
          {isSaving ? <Loader2 size={30} className="animate-spin" /> : <Save size={30} />}
        </button>
      )}
    </div>
  );
}
