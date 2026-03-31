"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Search, PlusCircle, MinusCircle, AlertCircle, Save, Loader2, UserPlus, FileText, LayoutGrid, Trash2, Pencil } from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';

interface BehaviorStudent {
  id: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  total_points: number;
  behavior_logs: any[];
}

interface BehaviorLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
}

export default function BehaviorLayer({ onBack, setToast }: BehaviorLayerProps) {
  const [className, setClassName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [students, setStudents] = useState<BehaviorStudent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // For new class creation
  const [studentInput, setStudentInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState<BehaviorStudent | null>(null);

  // Individual Edit
  const [newStudentName, setNewStudentName] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  // Class Overview
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

  const handleDeleteClass = async (cls: string) => {
    if (!window.confirm(`Yakin ingin menghapus SELURUH kelas "${cls}" beserta semua data siswa dan poin di tahun ajaran ${academicYear}? Tindakan ini TIDAK BISA dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(cls)}&year=${encodeURIComponent(academicYear)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAvailableClasses(prev => prev.filter(c => c !== cls));
      setToast({ message: `Kelas ${cls} berhasil dihapus`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Gagal menghapus kelas', type: 'error' });
    }
  };

  const handleRenameClass = async (oldName: string) => {
    const newName = window.prompt(`Ubah nama kelas "${oldName}" menjadi:`, oldName);
    if (!newName || newName.trim() === oldName) return;
    try {
      const res = await fetch('/api/grademaster/behaviors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldClassName: oldName, newClassName: newName.trim(), academicYear })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAvailableClasses(prev => prev.map(c => c === oldName ? newName.trim() : c));
      if (className === oldName) setClassName(newName.trim());
      setToast({ message: data.message, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Gagal mengubah nama kelas', type: 'error' });
    }
  };

  const loadClassDirectly = async (targetClass: string, targetYear: string) => {
    if (!targetClass.trim() || !targetYear.trim()) {
      setToast({ message: "Kelas dan Tahun Ajaran wajib diisi", type: "error" });
      return;
    }
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

  const handleCreateNewClass = async () => {
    if (!studentInput.trim()) {
      setToast({ message: "Daftar siswa wajib diisi", type: "error" });
      return;
    }
    setIsCreating(true);
    
    // Clean and split student list just like setup layer
    const parsedStudents = studentInput
      .split(/\r?\n/)
      .map(s => s.trim().replace(/^[\d.\-*]+\s*/, ''))
      .filter(s => s.length > 2);

    try {
      const res = await fetch('/api/grademaster/behaviors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className, academicYear, students: parsedStudents })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStudents(data.students || []);
      if (!availableClasses.includes(className)) {
        setAvailableClasses(prev => [...prev, className]);
      }
      setToast({ message: "Siswa berhasil ditambahkan dan poin di-reset ke 100", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Gagal menyimpan data siswa", type: "error" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddSingleStudent = async () => {
    if (!newStudentName.trim()) return;
    setIsAddingStudent(true);
    try {
      const res = await fetch('/api/grademaster/behaviors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className, academicYear, students: [newStudentName] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStudents(data.students || []);
      setNewStudentName('');
      setToast({ message: "Siswa berhasil ditambahkan", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Gagal menambah siswa", type: "error" });
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus ${name} dari kelas ${className}? Semua rekam jejak poin akan hilang permanen.`)) return;
    try {
      const res = await fetch(`/api/grademaster/behaviors?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStudents(prev => prev.filter(s => s.id !== id));
      setToast({ message: "Siswa berhasil dihapus", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Gagal menghapus siswa", type: "error" });
    }
  };

  const updatePoints = async (type: 'GOOD' | 'BAD', pointsDelta: number, reason: string) => {
    if (!selectedStudent || isUpdatingPoints) return;
    setIsUpdatingPoints(true);
    try {
      const res = await fetch('/api/grademaster/behaviors/points', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStudent.id, type, pointsDelta, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local state smoothly
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? data.student : s));
      setSelectedStudent(null); // Close modal automatically for better UX
      setToast({ message: `Poin ${type === 'GOOD' ? 'ditambahkan' : 'dikurangi'} untuk ${selectedStudent.student_name}`, type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Gagal mengupdate poin", type: "error" });
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto animate-in pt-16">
      <header className="mb-6 md:mb-10">
        <button type="button" onClick={(e) => { e.preventDefault(); onBack(); }} className="flex items-center gap-1.5 md:gap-2 text-slate-500 hover:text-primary font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors mb-4 border border-transparent hover:border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary/10">
          <ArrowLeft size={12} className="md:w-[14px] md:h-[14px]" /> Kembali ke Dashboard Ujian
        </button>
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
          Sistem Keseharian & Kehadiran
        </h1>
        <p className="text-sm md:text-base text-slate-400 font-bold mt-1 md:mt-2">Kelola poin kedisiplinan dan perilaku harian siswa.</p>
      </header>

      {/* FILTER SECTION */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-2xl border border-white/10 flex flex-col md:flex-row gap-4 items-end mb-8 relative z-10">
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kelas</label>
          <input type="text" placeholder="Contoh: SMA atau 9A" value={className} onChange={(e) => setClassName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-primary placeholder:text-slate-700 transition-all" />
        </div>
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tahun Ajaran</label>
          <input type="text" placeholder="2025/2026" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-primary placeholder:text-slate-700 transition-all" />
        </div>
        <div className="w-full md:w-auto">
          <button onClick={fetchStudents} disabled={isLoading} className="w-full px-6 py-3.5 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-center flex justify-center items-center gap-2">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Muat Data
          </button>
        </div>
      </div>

      {/* CLASS OVERVIEW SECTION (Only visible when no specific class is loaded) */}
      {!isLoaded && (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={16} /> Daftar Kelas Tersedia</h2>
            <div className="h-px bg-slate-200 flex-1 ml-4" />
          </div>
          
          {isLoadingClasses ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : availableClasses.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {availableClasses.map(cls => (
                <div
                  key={cls}
                  className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all text-center group flex flex-col items-center justify-center relative shadow-2xl"
                >
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRenameClass(cls); }}
                      className="w-7 h-7 flex items-center justify-center bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                      title="Ubah Nama Kelas"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls); }}
                      className="w-7 h-7 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 transition-colors border border-rose-500/20"
                      title="Hapus Kelas"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => loadClassDirectly(cls, academicYear)}
                    className="w-full flex flex-col items-center justify-center outline-none"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 text-slate-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors border border-white/10">
                      <Users size={20} className="md:w-6 md:h-6" />
                    </div>
                    <h3 className="font-black text-white text-base md:text-lg">{cls}</h3>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
              <p className="text-slate-400 font-bold text-sm">Belum ada kelas terdaftar di tahun ajaran ini.</p>
              <p className="text-slate-500 text-xs mt-1">Silakan ketikkan nama Kelas di atas lalu klik Muat Data untuk membuat referensi kelas baru.</p>
            </div>
          )}
        </div>
      )}

      {/* CONTENT SECTION */}
      {isLoaded && students.length === 0 && (
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-10 shadow-2xl border border-white/10 text-center max-w-2xl mx-auto mb-10">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <UserPlus size={32} />
          </div>
          <h3 className="text-lg font-black text-white mb-2">Kelas Belum Terdaftar</h3>
          <p className="text-sm text-slate-400 font-bold mb-6">Salin (Copy-Paste) daftar nama siswa di kelas {className} untuk membuat database poin keseharian (Setiap siswa memulai dengan 100 Poin).</p>
          
          <textarea
            value={studentInput}
            onChange={(e) => setStudentInput(e.target.value)}
            className="w-full h-40 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 resize-none mb-4"
            placeholder="1. Ahmad Dani&#10;2. Budi Santoso&#10;3. Citra Kirana..."
          />
          
          <button onClick={handleCreateNewClass} disabled={isCreating} className="w-full py-4 bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
            {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Daftar Siswa
          </button>
        </div>
      )}

      {isLoaded && students.length > 0 && (
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden mb-10">
          <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5">
            <div>
              <h3 className="font-black text-white text-lg">Daftar Kelas {className}</h3>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">{students.length} Siswa Terdaftar</p>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Nama Siswa Baru..." 
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSingleStudent()}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs md:text-sm font-bold text-slate-200 outline-none focus:border-primary w-full md:w-56 transition-all"
              />
              <button 
                onClick={handleAddSingleStudent}
                disabled={isAddingStudent || !newStudentName.trim()}
                className="bg-primary text-white rounded-xl px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 disabled:opacity-50 transition-all flex items-center justify-center shrink-0"
              >
                {isAddingStudent ? <Loader2 size={16} className="animate-spin" /> : <><PlusCircle size={14} className="mr-1.5 hidden md:block" /> Tambah</>}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="p-4 font-black text-[10px] md:text-xs text-slate-500 uppercase tracking-widest w-16 text-center">No</th>
                  <th className="p-4 font-black text-[10px] md:text-xs text-slate-500 uppercase tracking-widest">Nama Siswa</th>
                  <th className="p-4 font-black text-[10px] md:text-xs text-slate-500 uppercase tracking-widest text-center">Total Poin</th>
                  <th className="p-4 font-black text-[10px] md:text-xs text-slate-500 uppercase tracking-widest text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold">
                {students.map((s, i) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-slate-500 text-center">{i + 1}</td>
                    <td className="p-4 text-slate-200">{s.student_name}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-black border
                        ${s.total_points >= 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          s.total_points >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {s.total_points}
                      </span>
                    </td>
                    <td className="p-4 flex items-center justify-center gap-2">
                      <button onClick={() => setSelectedStudent(s)} className="px-4 py-2 bg-white/5 text-slate-300 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/10">
                        Kelola
                      </button>
                      <button onClick={() => handleDeleteStudent(s.id, s.student_name)} className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 transition-colors shrink-0 border border-rose-500/20" title="Hapus Siswa">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENT MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10">
            <div className="bg-white/5 p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">{selectedStudent.student_name}</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Kelas {selectedStudent.class_name} • Poin Saat Ini: {selectedStudent.total_points}</p>
              </div>
              <span className={`px-4 py-2 rounded-xl text-2xl font-black border
                ${selectedStudent.total_points >= 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  selectedStudent.total_points >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {selectedStudent.total_points}
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bad Behaviors */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5"><MinusCircle size={14}/> Pelanggaran (-10)</h3>
                {[
                  "Sering Bolos PBM",
                  "Berbicara Saat Guru Menjelaskan",
                  "Membantah Perintah Guru",
                  "Berkata Kotor/Kasar",
                  "Membuang Sampah Sembarangan",
                  "Tidak Mengerjakan Tugas"
                ].map((reason, i) => (
                  <button type="button" disabled={isUpdatingPoints} key={i} onClick={(e) => { e.preventDefault(); updatePoints('BAD', -10, reason); }} className={`w-full p-3 border border-rose-500/10 rounded-xl text-left transition-all ${isUpdatingPoints ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/5 hover:bg-rose-500/20 group hover:border-rose-500/30'}`}>
                    <p className="text-sm font-bold text-rose-400 md:group-hover:text-rose-300 leading-tight flex justify-between items-center">
                       <span>{reason}</span>
                       {isUpdatingPoints && <Loader2 size={12} className="animate-spin text-rose-400" />}
                    </p>
                  </button>
                ))}
              </div>

              {/* Good Behaviors */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5"><PlusCircle size={14}/> Apresiasi (+10)</h3>
                {[
                  "Aktif Menjawab di Kelas",
                  "Membantu Guru/Teman",
                  "Membersihkan Kelas/Lingkungan",
                  "Mengerjakan Tugas Ekstra",
                  "Disiplin Tingkat Tinggi"
                ].map((reason, i) => (
                  <button type="button" disabled={isUpdatingPoints} key={i} onClick={(e) => { e.preventDefault(); updatePoints('GOOD', 10, reason); }} className={`w-full p-3 border border-emerald-500/10 rounded-xl text-left transition-all ${isUpdatingPoints ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/5 hover:bg-emerald-500/20 group hover:border-emerald-500/30'}`}>
                    <p className="text-sm font-bold text-emerald-400 md:group-hover:text-emerald-300 leading-tight flex justify-between items-center">
                       <span>{reason}</span>
                       {isUpdatingPoints && <Loader2 size={12} className="animate-spin text-emerald-400" />}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedStudent.behavior_logs?.length > 0 && (
              <div className="bg-white/5 border-t border-white/10 p-6 max-h-48 overflow-y-auto">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><FileText size={12}/> Riwayat Terbaru</h3>
                <div className="space-y-2">
                  {selectedStudent.behavior_logs.slice(0, 5).map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400 truncate mr-4">{log.reason}</span>
                      <span className={log.points > 0 ? "text-emerald-400" : "text-rose-400"}>
                        {log.points > 0 ? "+" : ""}{log.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-white/10 bg-slate-900">
              <button type="button" disabled={isUpdatingPoints} onClick={(e) => { e.preventDefault(); setSelectedStudent(null); }} className="w-full py-3 bg-white/5 text-slate-400 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 border border-white/10 hover:text-white">
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
