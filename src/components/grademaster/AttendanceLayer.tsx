import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, Calendar, Search, Save, Loader2, CheckCircle2, 
  XCircle, AlertCircle, Clock, BookOpen, ChevronLeft, ChevronRight 
} from 'lucide-react';
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
  
  const [students, setStudents] = useState<string[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  useEffect(() => {
    fetchAvailableClasses();
  }, [academicYear]);

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
      
      const studentNames = dataStudents.students.map((s: any) => s.student_name);
      setStudents(studentNames);
      
      // 2. Load attendance records
      const resAttendance = await fetch(`/api/grademaster/attendance?class=${encodeURIComponent(targetClass)}&year=${encodeURIComponent(academicYear)}&subject=${encodeURIComponent(targetSubject)}&date=${targetDate}`);
      const dataAttendance = await resAttendance.json();
      
      const map: Record<string, string> = {};
      // Default to "Hadir" for all if admin
      if (isAdmin) {
        studentNames.forEach((n: string) => map[n] = 'Hadir');
      }
      
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
      const records = students.map(name => ({
        student_name: name,
        class_name: className,
        subject,
        academic_year: academicYear,
        status: attendanceMap[name] || 'Hadir',
        date: selectedDate
      }));
      
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

  return (
    <div className="min-h-screen bg-slate-950 p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto animate-in pt-16 pb-24 md:pb-8">
      <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all mb-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:border-primary/20">
            <ArrowLeft size={14} /> Beranda
          </button>
          <h1 className="text-xl md:text-4xl font-black text-white tracking-tight flex items-center gap-2 md:gap-3 font-outfit uppercase">
            <Calendar className="text-primary" size={24} /> Kehadiran Siswa
          </h1>
          <p className="text-[10px] md:text-sm text-slate-500 font-bold mt-1 md:mt-2 uppercase tracking-widest">Manajemen & Monitoring Presensi Permata Pelajaran</p>
        </div>
      </header>

      {/* FILTER BOX */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-2xl border border-white/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6 md:mb-8 relative z-10">
        <div>
          <label className="block text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 md:mb-2">Kelas</label>
          <select value={className} onChange={(e) => setClassName(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 md:p-4 text-xs md:text-sm font-black text-white outline-none focus:border-primary transition-all">
            <option value="">-- Pilih Kelas --</option>
            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 md:mb-2">Mata Pelajaran</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 md:p-4 text-xs md:text-sm font-black text-white outline-none focus:border-primary transition-all">
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 md:mb-2">
            <Clock size={12} /> Tanggal
          </label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 md:p-4 text-xs md:text-sm font-black text-white outline-none focus:border-primary transition-all" />
        </div>
        <button onClick={() => loadAttendance(className, subject, selectedDate)} disabled={isLoading || !className} className="w-full px-8 md:px-10 py-3 md:py-4 bg-primary text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3">
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Lihat Kehadiran
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Memproses Data Presensi...</p>
        </div>
      ) : isLoaded ? (
        <div className="animate-in fade-in duration-500">
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/10 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-white text-lg md:text-xl uppercase font-outfit">{subject} - {className}</h3>
                <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Sesi Tanggal: {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              {isAdmin && (
                <button onClick={saveAttendance} disabled={isSaving} className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Absensi
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="p-4 md:p-6 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 text-center">No</th>
                    <th className="p-4 md:p-6 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Siswa</th>
                    <th className="p-4 md:p-6 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs md:text-sm font-bold text-white">
                  {students.map((name, idx) => (
                    <tr key={name} className="border-b border-white/5 hover:bg-white/5 transition-all">
                      <td className="p-4 md:p-6 text-center text-slate-500 font-mono text-[10px] md:text-xs">{idx + 1}</td>
                      <td className="p-4 md:p-6 font-outfit uppercase tracking-tight text-xs md:text-sm">{name}</td>
                      <td className="p-4 md:p-6">
                        <div className="flex justify-center items-center gap-1.5 md:gap-3">
                          {['Hadir', 'Izin', 'Sakit', 'Alpa'].map((status) => {
                            const active = attendanceMap[name] === status;
                            const colors = {
                              'Hadir': 'bg-emerald-500',
                              'Izin': 'bg-sky-500',
                              'Sakit': 'bg-amber-500',
                              'Alpa': 'bg-rose-500'
                            };
                            return (
                              <button 
                                key={status}
                                disabled={!isAdmin}
                                onClick={() => handleStatusChange(name, status)}
                                className={`
                                  px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all
                                  ${active 
                                    ? `${colors[status as keyof typeof colors]} text-white shadow-lg` 
                                    : 'bg-white/5 text-slate-500 border border-white/5 hover:border-white/20'}
                                  ${!isAdmin && 'cursor-default opacity-80'}
                                `}
                              >
                                {status[0]} <span className="hidden md:inline">{status.slice(1)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 border-dashed p-12 text-center">
          <Calendar size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="text-white font-black text-lg uppercase font-outfit">Pilih Parameter</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Silakan pilih kelas dan mata pelajaran untuk memuat data absensi.</p>
        </div>
      )}
    </div>
  );
}
