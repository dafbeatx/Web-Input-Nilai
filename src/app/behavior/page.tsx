'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, PlusCircle, ShieldCheck, 
  Settings, LayoutGrid, List, Filter
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
  const { studentClass, academicYear, isAdmin, setToast } = useGradeMaster();
  
  // State
  const [students, setStudents] = useState<BehaviorStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<BehaviorStudent | null>(null);
  const [studentLogs, setStudentLogs] = useState<BehaviorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Behavior Settings (Default or from API)
  const [behaviorReasons, setBehaviorReasons] = useState({
    good: ["Membantu Teman", "Aktif Berdiskusi", "Piket Mandiri", "Jujur/Integritas", "Ketua Kelas Aktif"],
    bad: ["Bolos PBM", "Berbicara Kasar", "Merokok/Vaping", "Membantah Guru", "Terlambat Parah"]
  });

  // Initial Fetch
  useEffect(() => {
    if (studentClass && academicYear) {
      loadData();
      fetchSettings();
    }
  }, [studentClass, academicYear]);

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
  }, [selectedStudent]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(studentClass)}&year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      if (res.ok) setStudents(data.students || []);
    } catch (err) {
      setToast({ message: "Gagal memuat data siswa", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQuietly = async () => {
    const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(studentClass)}&year=${encodeURIComponent(academicYear)}`);
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

  return (
    <div className="flex flex-col min-h-full">
      <TopAppBar 
        title="Disiplin & Perilaku" 
        actions={
          <button className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-400 active:scale-90 border border-white/5">
             <Settings size={20} />
          </button>
        }
      />
      
      <div className="p-4 md:p-8 space-y-6">
        {/* Search & Statistics */}
        <section className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama siswa..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/40 border border-white/5 focus:border-primary/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-white outline-none backdrop-blur-xl transition-all"
            />
          </div>
          
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Menampilkan</p>
              <h2 className="text-xl font-black text-white font-outfit uppercase tracking-tighter mt-1">{studentClass || 'Semua Kelas'}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Total Siswa</p>
              <p className="text-xl font-black text-primary font-outfit mt-1">{filteredStudents.length}</p>
            </div>
          </div>
        </section>

        {/* Student List */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-900/20 border border-white/5 rounded-[2rem] animate-pulse" />
            ))
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
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
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-[3rem] border border-white/5 border-dashed">
               <Users size={48} className="mx-auto text-slate-700 mb-4" />
               <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Data Siswa Tidak Ditemukan</p>
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
