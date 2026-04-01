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
  const [filterStatus, setFilterStatus] = useState('Semua');

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
      
      const studentNames = dataStudents.students.map((s: any) => s.student_name);
      setStudents(studentNames);
      
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
        .filter(name => attendanceMap[name])
        .map(name => ({
          student_name: name,
          class_name: className,
          subject,
          academic_year: academicYear,
          status: attendanceMap[name],
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
    belum_ada: students.filter(s => !attendanceMap[s]).length,
    hadir: Object.values(attendanceMap).filter(s => s === 'Hadir').length,
    izin: Object.values(attendanceMap).filter(s => s === 'Izin').length,
    sakit: Object.values(attendanceMap).filter(s => s === 'Sakit').length,
    alpa: Object.values(attendanceMap).filter(s => s === 'Alpa').length,
  };

  const filteredStudents = students.filter(name => {
    if (filterStatus === 'Semua') return true;
    if (filterStatus === 'Belum Diset') return !attendanceMap[name];
    return attendanceMap[name] === filterStatus;
  });

  return (
    <div className="min-h-screen bg-transparent p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto animate-in pt-16 pb-24 md:pb-8">
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
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 items-end mb-6 relative z-10">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Kelas</label>
          <select 
            value={className} 
            onChange={(e) => setClassName(e.target.value)} 
            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm font-black text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
          >
            <option value="">-- Pilih Kelas --</option>
            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest mb-2 px-1">
            <Clock size={12} /> Tanggal
          </label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm font-black text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer" 
          />
        </div>
      </div>

      {/* SUBJECT SELECTOR (Chips instead of Dropdown) */}
      <div className="mb-8 overflow-hidden">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Pilih Mata Pelajaran</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-right">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                subject === s 
                ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105' 
                : 'bg-slate-900/40 border-white/10 text-slate-400 hover:border-primary/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Memproses Data Presensi...</p>
        </div>
      ) : isLoaded ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* STATS SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Hadir', count: stats.hadir, color: 'emerald', icon: <CheckCircle2 size={16} /> },
              { label: 'Izin', count: stats.izin, color: 'sky', icon: <Clock size={16} /> },
              { label: 'Sakit', count: stats.sakit, color: 'amber', icon: <AlertCircle size={16} /> },
              { label: 'Alpa', count: stats.alpa, color: 'rose', icon: <XCircle size={16} /> },
            ].map((s) => (
              <div key={s.label} className={`bg-slate-900/40 border border-${s.color}-500/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 shadow-lg shadow-black/20`}>
                <div className={`p-2 rounded-xl bg-${s.color}-500/10 text-${s.color}-500 mb-1`}>
                  {s.icon}
                </div>
                <span className="text-2xl font-black text-white">{s.count}</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                  <Users className="text-primary" size={18} />
                </div>
                <div>
                  <h3 className="font-black text-white text-base md:text-lg uppercase font-outfit truncate">{subject} - {className}</h3>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">{filteredStudents.length} Siswa Terdaftar</p>
                </div>
              </div>
              
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button onClick={() => {
                    const map = { ...attendanceMap };
                    students.forEach(s => { if (!map[s]) map[s] = 'Hadir'; });
                    setAttendanceMap(map);
                  }} className="w-full sm:w-auto px-6 py-3 bg-sky-500/10 text-sky-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-sky-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 size={12} /> Tandai Semua Hadir
                  </button>
                  <button onClick={saveAttendance} disabled={isSaving} className="w-full sm:w-auto px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Simpan Absensi
                  </button>
                </div>
              )}
            </div>

            {/* STATUS SELECTOR / FILTER */}
            <div className="px-5 py-3 border-b border-white/5 bg-white/2 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mr-2 whitespace-nowrap">Filter:</span>
              {['Semua', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Belum Diset'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                    filterStatus === status 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="p-4 md:p-6 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pb-10">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((name, idx) => (
                  <div key={name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-950/50 flex items-center justify-center text-xs font-black text-slate-500 border border-white/5 group-hover:border-primary/20 group-hover:text-primary transition-all">
                        {idx + 1}
                      </div>
                      <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-tight font-outfit">{name}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end mt-3 sm:mt-0">
                      {isAdmin ? (
                        ['Hadir', 'Izin', 'Sakit', 'Alpa'].map((status) => {
                          const currentStatus = attendanceMap[name];
                          const active = currentStatus === status;
                          
                          const colors = {
                            'Hadir': 'bg-emerald-500 border-emerald-500/20 text-white',
                            'Izin': 'bg-amber-500 border-amber-500/20 text-white',
                            'Sakit': 'bg-sky-500 border-sky-500/20 text-white',
                            'Alpa': 'bg-rose-500 border-rose-500/20 text-white'
                          };
                          const inactiveColors = {
                            'Hadir': 'hover:text-emerald-500 hover:border-emerald-500/20',
                            'Izin': 'hover:text-amber-500 hover:border-amber-500/20',
                            'Sakit': 'hover:text-sky-500 hover:border-sky-500/20',
                            'Alpa': 'hover:text-rose-500 hover:border-rose-500/20'
                          };

                          return (
                            <button 
                              key={status}
                              onClick={() => handleStatusChange(name, status)}
                              className={`
                                flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border
                                ${active 
                                  ? `${colors[status as keyof typeof colors]} shadow-lg shadow-black/20 text-white` 
                                  : `bg-slate-950/50 text-slate-500 border-white/5 ${inactiveColors[status as keyof typeof inactiveColors]}`}
                              `}
                            >
                              {status[0]}<span className="hidden sm:inline">{status.slice(1)}</span>
                            </button>
                          );
                        })
                      ) : (
                        attendanceMap[name] ? (
                          <div 
                            className={`
                              px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-default shadow-lg shadow-black/20
                              ${attendanceMap[name] === 'Hadir' ? 'bg-emerald-500 border-emerald-500/20 text-white' : ''}
                              ${attendanceMap[name] === 'Izin' ? 'bg-amber-500 border-amber-500/20 text-white' : ''}
                              ${attendanceMap[name] === 'Sakit' ? 'bg-sky-500 border-sky-500/20 text-white' : ''}
                              ${attendanceMap[name] === 'Alpa' ? 'bg-rose-500 border-rose-500/20 text-white' : ''}
                            `}
                          >
                            {attendanceMap[name]}
                          </div>
                        ) : (
                          <div className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 bg-slate-900 text-slate-500 cursor-default">
                            Belum Ada Data
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <div className="w-16 h-16 bg-slate-900 border border-white/5 border-dashed rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-slate-700" size={24} />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tidak ada data untuk filter ini</p>
                </div>
              )}
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
