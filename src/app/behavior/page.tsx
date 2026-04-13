'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Settings, Award, AlertCircle, ShieldCheck
} from 'lucide-react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { supabase } from '@/lib/supabase/client';
import { 
  addBehaviorAction, 
  updateBehaviorAction, 
  deleteBehaviorAction, 
  getBehaviorLogsAction 
} from '@/lib/actions/behavior';

// Components
import TopAppBar from '@/components/grademaster/behavior/TopAppBar';
import StudentCard from '@/components/grademaster/behavior/StudentCard';
import StudentDetailSheet from '@/components/grademaster/behavior/StudentDetailSheet';

interface BehaviorLog {
  id: string;
  student_id: string;
  points_delta: number;
  reason: string;
  created_at: string;
}

interface BehaviorStudent {
  id: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  total_points: number;
}

export default function BehaviorPage() {
  const { academicYear, isAdmin, setToast } = useGradeMaster();
  
  // State
  const [students, setStudents] = useState<BehaviorStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<BehaviorStudent | null>(null);
  const [studentLogs, setStudentLogs] = useState<BehaviorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Class Filter
  const [availableClasses, setAvailableClasses] = useState<string[]>(['Semua Kelas']);
  const [selectedClass, setSelectedClass] = useState<string>('Semua Kelas');
  
  // Behavior Settings
  const [behaviorReasons, setBehaviorReasons] = useState({
    good: ["Membantu Teman", "Aktif Berdiskusi", "Piket Mandiri", "Jujur/Integritas", "Ketua Kelas Aktif"],
    bad: ["Bolos PBM", "Berbicara Kasar", "Merokok/Vaping", "Membantah Guru", "Terlambat Parah"]
  });

  // Fetch Classes on Mount
  useEffect(() => {
    if (academicYear) {
      fetchClasses();
      fetchSettings();
    }
  }, [academicYear]);

  // Fetch Students when Class changes
  useEffect(() => {
    if (academicYear) {
      loadData(selectedClass);
    }
  }, [selectedClass, academicYear]);

  // Real-time Subscription
  useEffect(() => {
    const channel = supabase
      .channel('behavior_realtime_page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gm_behavior_logs' },
        (payload) => {
          const changedId = (payload.new as any)?.student_id || (payload.old as any)?.student_id;
          if (selectedStudent && selectedStudent.id === changedId) {
            fetchLogs(changedId);
          }
          refreshQuietly();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStudent, selectedClass, academicYear]);

  const fetchClasses = async () => {
    try {
      const res = await fetch(`/api/grademaster/behaviors?year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (data.classes && data.classes.length > 0) {
        setAvailableClasses(['Semua Kelas', ...data.classes]);
      }
    } catch(err) { /* silent fail */ }
  };

  const loadData = async (cls: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(cls)}&year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (res.ok) setStudents(data.students || []);
    } catch (err) {
      setToast({ message: "Gagal memuat data siswa", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQuietly = async () => {
    const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(selectedClass)}&year=${encodeURIComponent(academicYear)}`);
    const data = await res.json();
    if (res.ok) setStudents(data.students || []);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/grademaster/behaviors/settings?year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (res.ok && data.settings) setBehaviorReasons(data.settings.reasons);
    } catch (err) { /* silent fail */ }
  };

  const fetchLogs = async (studentId: string) => {
    setIsLoadingLogs(true);
    const result = await getBehaviorLogsAction(studentId);
    if (result.success) setStudentLogs(result.logs || []);
    setIsLoadingLogs(false);
  };

  // Actions
  const handleAddLog = async (type: 'GOOD' | 'BAD', points: number, reason: string) => {
    if (!selectedStudent || isUpdating) return;
    setIsUpdating(true);
    
    const delta = type === 'BAD' ? -Math.abs(points) : Math.abs(points);
    const result = await addBehaviorAction({
      studentId: selectedStudent.id,
      pointsDelta: delta,
      reason
    });

    if (result.success) {
      setToast({ message: `Catatan "${reason}" berhasil ditambahkan`, type: "success" });
      setSelectedStudent(prev => prev ? { ...prev, total_points: result.data.new_total } : null);
      fetchLogs(selectedStudent.id);
    } else {
      setToast({ message: "Gagal menyimpan", type: "error" });
    }
    setIsUpdating(false);
  };

  const handleUpdateLog = async (id: string, points: number, reason: string) => {
    if (!selectedStudent || isUpdating) return;
    setIsUpdating(true);
    const result = await updateBehaviorAction(id, {
      pointsDelta: points,
      reason,
      studentId: selectedStudent.id
    });
    if (result.success) {
      setToast({ message: "Catatan diedit", type: "success" });
      setSelectedStudent(prev => prev ? { ...prev, total_points: result.newTotal } : null);
      fetchLogs(selectedStudent.id);
    }
    setIsUpdating(false);
  };

  const handleDeleteLog = async (id: string) => {
    if (!selectedStudent || isUpdating) return;
    if (!confirm("Hapus catatan? Poin akan dikembalikan.")) return;
    setIsUpdating(true);
    const result = await deleteBehaviorAction(id, selectedStudent.id);
    if (result.success) {
      setToast({ message: "Catatan dihapus", type: "success" });
      setSelectedStudent(prev => prev ? { ...prev, total_points: result.newTotal } : null);
      fetchLogs(selectedStudent.id);
    }
    setIsUpdating(false);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => s.student_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [students, searchQuery]);

  // Derived Stats
  const excellentCount = students.filter(s => s.total_points >= 90).length;
  const criticalCount = students.filter(s => s.total_points < 70).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#111113]">
      <TopAppBar 
        title="Disiplin & Perilaku" 
        actions={
          <button className="w-10 h-10 bg-white/5 hover:bg-white/10 transition-colors rounded-full flex items-center justify-center text-slate-400 active:scale-90 border border-white/5">
             <Settings size={20} />
          </button>
        }
      />
      
      <div className="p-4 md:px-8 md:py-8 space-y-8 flex-1 max-w-5xl mx-auto w-full">
        {/* Modern Dashboard Header */}
        <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[#1c1c1f] via-[#1a1a1d] to-[#121214] border border-white/5 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -ml-10 -mb-10"></div>
          
          <div className="relative z-10">
            <h2 className="font-headline font-extrabold text-3xl md:text-5xl tracking-tight text-white mb-2">
              Behavior Overview
            </h2>
            <p className="text-on-surface-variant text-sm md:text-base font-medium max-w-xl">
              Memantau kedisiplinan dan integritas siswa melalui pencatatan perilaku komprehensif.
            </p>
            
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/10 transition-all group">
                <Users className="w-6 h-6 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#a1a1aa]">Total Siswa</p>
                  <p className="text-2xl sm:text-3xl font-headline font-black text-white mt-1">{students.length}</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/10 transition-all group">
                <ShieldCheck className="w-6 h-6 text-tertiary mb-4 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#a1a1aa]">Sangat Baik</p>
                  <p className="text-2xl sm:text-3xl font-headline font-black text-tertiary mt-1">{excellentCount}</p>
                </div>
              </div>

              <div className="bg-error/10 backdrop-blur-xl border border-error/20 rounded-2xl p-5 flex flex-col justify-between hover:bg-error/20 transition-all group md:col-span-2">
                <AlertCircle className="w-6 h-6 text-error mb-4 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-error/80">Perlu Perhatian Khusus</p>
                  <p className="text-2xl sm:text-3xl font-headline font-black text-error mt-1">{criticalCount} <span className="text-sm font-medium opacity-80">Siswa</span></p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Horizontal Class Filter */}
        <section>
          <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {availableClasses.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`flex-shrink-0 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                  selectedClass === cls 
                    ? 'bg-primary text-on-primary shadow-[0_0_20px_rgba(40,112,234,0.3)] scale-105' 
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright border border-white/5'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </section>

        {/* Directory Controls */}
        <section className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 w-5 h-5 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder={`Cari nama siswa di ${selectedClass}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c1c1f] border border-white/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl py-4 pl-12 pr-4 text-[15px] font-medium text-white outline-none transition-all placeholder:text-on-surface-variant/50"
            />
          </div>
          <button className="hidden sm:flex items-center gap-2 px-6 py-4 bg-[#1c1c1f] hover:bg-[#25252a] text-white font-medium rounded-2xl border border-white/10 transition-colors shrink-0">
             <Filter size={18} />
             Filter
          </button>
        </section>

        {/* Student List */}
        <section className="pb-32">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[#1c1c1f] rounded-2xl p-5 animate-pulse flex items-center justify-between border border-white/5">
                   <div className="flex items-center gap-5">
                     <div className="w-14 h-14 bg-white/5 rounded-xl" />
                     <div className="space-y-3">
                       <div className="h-5 bg-white/10 rounded-md w-32" />
                       <div className="h-3 bg-white/5 rounded-md w-20" />
                     </div>
                   </div>
                </div>
              ))}
            </div>
          ) : filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => (
                <StudentCard 
                  key={student.id}
                  name={student.student_name}
                  className={student.class_name}
                  points={student.total_points}
                  onClick={() => {
                    setSelectedStudent(student);
                    fetchLogs(student.id);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center flex flex-col items-center justify-center bg-[#1c1c1f] rounded-3xl border border-white/5 border-dashed">
               <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                 <Search size={32} className="text-on-surface-variant/50" />
               </div>
               <h3 className="text-lg font-bold text-white mb-2">Tidak Ada Data Siswa</h3>
               <p className="text-sm font-medium text-on-surface-variant max-w-sm">
                 Belum ada data siswa ditemukan untuk filter pencarian atau kelas yang dipilih.
               </p>
            </div>
          )}
        </section>
      </div>

      {/* Detail Sheet */}
      {selectedStudent && (
        <StudentDetailSheet 
          student={selectedStudent}
          logs={studentLogs}
          isLoadingLogs={isLoadingLogs}
          onClose={() => setSelectedStudent(null)}
          onAddLog={handleAddLog}
          onUpdateLog={handleUpdateLog}
          onDeleteLog={handleDeleteLog}
          isUpdating={isUpdating}
          isAdmin={isAdmin}
          reasons={behaviorReasons}
        />
      )}
    </div>
  );
}
