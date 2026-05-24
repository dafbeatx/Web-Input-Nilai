"use client";

import React, { useState, useEffect } from 'react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { Loader2, Search, Plus, Trash2, Download, Database, BookOpen, AlertCircle, Edit2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DataCenterLayerProps {
  onBack: () => void;
}

interface StudentData {
  id: string;
  name: string;
  className: string;
  academicYear: string;
  scores: { subject: string; type: string; score: number; id: string }[];
  behaviorPoints: number;
  avatarUrl?: string | null;
  behaviorLogs?: { reason: string; points: number; date: string }[];
  isLinked: boolean; // true if exists in gm_student_accounts
}

export default function DataCenterLayer({ onBack }: DataCenterLayerProps) {
  const { adminUser, setToast } = useGradeMaster();
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', className: '', academicYear: '2025/2026' });

  const [isManualScore, setIsManualScore] = useState(false);
  const [manualData, setManualData] = useState({ name: '', className: '', subject: '', score: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/grademaster/data-center/students');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStudents(data.students);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/grademaster/data-center/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: data.message, type: 'success' });
      setIsAddingStudent(false);
      setNewStudent({ name: '', className: '', academicYear: '2025/2026' });
      fetchStudents();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualScore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/grademaster/data-center/manual-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           name: manualData.name,
           className: manualData.className,
           subject: manualData.subject,
           score: Number(manualData.score)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: data.message, type: 'success' });
      setIsManualScore(false);
      setManualData({ name: '', className: '', subject: '', score: '' });
      fetchStudents();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (name: string, className: string) => {
    if (!window.confirm(`Hapus ${name} dari sistem?\nOpsi ini akan menyembunyikan nilai dari dashboard (Soft Delete).`)) return;
    try {
      const res = await fetch('/api/grademaster/data-center/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, className, action: 'soft_delete' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: data.message, type: 'success' });
      fetchStudents();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  };

  const generatePdfReport = async (student: StudentData) => {
    const doc = new jsPDF();
    
    // Draw photo if available
    if (student.avatarUrl) {
      try {
        const img = await loadImage(student.avatarUrl);
        // Draw avatar photo on the top right
        doc.addImage(img, 'JPEG', 165, 20, 30, 30);
      } catch (err) {
        console.error("Failed to load student avatar for PDF:", err);
      }
    }

    // Header
    doc.setFontSize(20);
    doc.text('Laporan Hasil Belajar & Perilaku', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Nama: ${student.name}`, 14, 30);
    doc.text(`Kelas: ${student.className}`, 14, 36);
    doc.text(`Tahun Ajaran: ${student.academicYear}`, 14, 42);
    doc.setTextColor(0, 0, 0);

    // Score Table
    doc.setFontSize(13);
    doc.text('Rincian Nilai Akademik', 14, 55);
    
    const scoreData = student.scores.map((s, idx) => [
      idx + 1,
      s.subject,
      s.type,
      s.score
    ]);

    let finalY = 60;
    if (scoreData.length > 0) {
      autoTable(doc, {
        startY: 60,
        head: [['No', 'Mata Pelajaran', 'Tipe Ujian', 'Nilai Akhir']],
        body: scoreData,
        theme: 'striped',
        headStyles: { fillColor: [40, 230, 150] } // Tertiary color approx
      });
      finalY = (doc as any).lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(10);
      doc.text('Belum ada nilai terdaftar.', 14, 62);
      finalY = 75;
    }

    // Behavior Summary Header
    doc.setFontSize(13);
    doc.text('Laporan Perilaku (Poin Keaktifan)', 14, finalY);
    
    doc.setFontSize(11);
    doc.text(`Total Poin Sikap: ${student.behaviorPoints}`, 14, finalY + 8);
    
    // Render detailed behavior logs if they exist
    const behaviorData = (student.behaviorLogs || []).map((log, idx) => [
      idx + 1,
      log.reason,
      `+${log.points} Poin`,
      new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    ]);

    if (behaviorData.length > 0) {
      autoTable(doc, {
        startY: finalY + 14,
        head: [['No', 'Kategori Pelanggaran / Perilaku', 'Poin', 'Tanggal']],
        body: behaviorData,
        theme: 'striped',
        headStyles: { fillColor: [225, 29, 72] } // Rose-600 color for demerit table
      });
      finalY = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Bersih — Belum ada catatan perilaku atau pelanggaran.', 14, finalY + 14);
      doc.setTextColor(0, 0, 0);
      finalY = finalY + 25;
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Dokumen ini dicetak otomatis oleh GradeMaster OS pada ${new Date().toLocaleDateString('id-ID')}`, 105, 280, { align: 'center' });

    doc.save(`Rapor_${student.name.replace(/ /g, '_')}_${student.className}.pdf`);
  };

  const uniqueClasses = ['Semua', ...Array.from(new Set(students.map(s => s.className))).sort()];

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.className.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'Semua' || s.className === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="font-body text-on-surface selection:bg-tertiary/30 min-h-dvh flex flex-col bg-surface relative overflow-x-hidden">
      <header className="fixed top-0 w-full z-50 bg-surface-container/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-surface-variant rounded-lg transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline font-bold text-lg tracking-tight text-primary uppercase flex items-center gap-2">
             <Database size={18} /> Pusat Data Terpadu
          </h1>
        </div>
      </header>

      <main className="flex-1 pt-24 pb-32 px-4 sm:px-6 flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Controls */}
        <section className="flex flex-col md:flex-row justify-between gap-4">
           <div className="relative flex-1 max-w-md">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
             <input 
                type="text"
                placeholder="Cari nama atau kelas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-primary placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-tertiary/40 transition-all outline-none"
             />
           </div>
           <div className="flex gap-2">
              <button 
                onClick={() => setIsManualScore(true)}
                className="px-4 py-3 bg-amber-500/10 text-amber-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2 border border-amber-500/20 active:scale-95"
              >
                 <Edit2 size={16} /> Input Manual
              </button>
              <button 
                onClick={() => setIsAddingStudent(true)}
                className="px-4 py-3 bg-primary text-surface-container-lowest rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                 <Plus size={16} strokeWidth={3} /> Tambah Siswa
              </button>
           </div>
        </section>

        {/* Class Filter Buttons */}
        {students.length > 0 && (
          <section className="flex flex-wrap gap-2">
            {uniqueClasses.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  selectedClass === cls
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant hover:text-primary'
                }`}
              >
                {cls === 'Semua' ? 'Semua Kelas' : `Kelas ${cls}`}
              </button>
            ))}
          </section>
        )}

        {/* Data List */}
        <section className="bg-surface-container-low rounded-3xl border border-outline-variant/20 overflow-hidden shadow-sm">
          {isLoading ? (
             <div className="py-20 flex flex-col items-center justify-center gap-3">
               <Loader2 className="animate-spin text-tertiary" size={32} />
               <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Sinkronisasi Database...</p>
             </div>
          ) : filteredStudents.length === 0 ? (
             <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant/50">
               <Database size={48} />
               <p className="text-sm font-bold uppercase tracking-widest">Tidak ada data ditemukan</p>
             </div>
          ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-surface-container text-on-surface-variant text-[10px] font-black uppercase tracking-widest">
                     <th className="p-4 border-b border-outline-variant/10">Nama Siswa</th>
                     <th className="p-4 border-b border-outline-variant/10">Kelas</th>
                     <th className="p-4 border-b border-outline-variant/10">Statistik</th>
                     <th className="p-4 border-b border-outline-variant/10 text-right">Aksi</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredStudents.map(s => (
                     <tr key={s.id} className="border-b border-outline-variant/5 hover:bg-surface-container-lowest/50 transition-colors group">
                       <td className="p-4">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                             {s.name[0]?.toUpperCase()}
                           </div>
                           <div>
                             <p className="font-bold text-primary text-sm">{s.name}</p>
                             {!s.isLinked && <span className="text-[9px] text-amber-500 font-bold flex items-center gap-1"><AlertCircle size={10} /> Belum Aktivasi Web</span>}
                           </div>
                         </div>
                       </td>
                       <td className="p-4">
                         <span className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded-md uppercase tracking-wider">{s.className}</span>
                       </td>
                       <td className="p-4">
                         <div className="flex items-center gap-4">
                           <div className="flex flex-col">
                             <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-0.5">Mata Pelajaran</span>
                             <span className="font-bold text-sm text-primary flex items-center gap-1"><BookOpen size={14} className="text-tertiary" /> {s.scores.length}</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-0.5">Poin Sikap</span>
                             <span className={`font-bold text-sm flex items-center gap-1 ${s.behaviorPoints < 0 ? 'text-error' : 'text-primary'}`}><ShieldCheck size={14} className={s.behaviorPoints < 0 ? 'text-error' : 'text-emerald-500'} /> {s.behaviorPoints}</span>
                           </div>
                         </div>
                       </td>
                       <td className="p-4">
                         <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => generatePdfReport(s)}
                             className="p-2 bg-tertiary/10 text-tertiary hover:bg-tertiary hover:text-on-tertiary rounded-lg transition-colors active:scale-90"
                             title="Download PDF Rapor"
                           >
                             <Download size={18} />
                           </button>
                           <button 
                             onClick={() => handleDeleteStudent(s.name, s.className)}
                             className="p-2 bg-error/10 text-error hover:bg-error hover:text-white rounded-lg transition-colors active:scale-90"
                             title="Hapus Siswa (Keluar/Pindah)"
                           >
                             <Trash2 size={18} />
                           </button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          )}
        </section>
      </main>

      {/* Add Student Modal */}
      {isAddingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsAddingStudent(false)} />
          <div className="bg-surface rounded-3xl p-6 w-full max-w-sm relative z-10 border border-outline-variant/20 shadow-2xl animate-in zoom-in-95 duration-200">
             <h3 className="text-lg font-headline font-bold text-primary mb-4 flex items-center gap-2"><Plus size={20} className="text-tertiary" /> Tambah Siswa Baru</h3>
             <form onSubmit={handleAddStudent} className="space-y-4">
               <div>
                 <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">Nama Lengkap</label>
                 <input required type="text" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:ring-1 focus:ring-tertiary/40 outline-none" placeholder="Masukkan nama siswa..." />
               </div>
               <div>
                 <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">Kelas</label>
                 <input required type="text" value={newStudent.className} onChange={e => setNewStudent({...newStudent, className: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:ring-1 focus:ring-tertiary/40 outline-none" placeholder="Contoh: 10 IPA 1" />
               </div>
               <div className="flex gap-3 pt-2">
                 <button type="button" onClick={() => setIsAddingStudent(false)} className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl text-xs font-bold uppercase tracking-widest">Batal</button>
                 <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center">
                   {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Simpan'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Manual Score Modal */}
      {isManualScore && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsManualScore(false)} />
          <div className="bg-surface rounded-3xl p-6 w-full max-w-sm relative z-10 border border-outline-variant/20 shadow-2xl animate-in zoom-in-95 duration-200">
             <h3 className="text-lg font-headline font-bold text-primary mb-4 flex items-center gap-2"><Edit2 size={20} className="text-amber-500" /> Input Nilai Manual</h3>
             <form onSubmit={handleManualScore} className="space-y-4">
               <div>
                 <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">Nama Siswa</label>
                 <input required type="text" value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:ring-1 focus:ring-tertiary/40 outline-none" placeholder="Masukkan nama (harus sama persis)" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">Kelas</label>
                   <input required type="text" value={manualData.className} onChange={e => setManualData({...manualData, className: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:ring-1 focus:ring-tertiary/40 outline-none" placeholder="Misal: 10 IPA 1" />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">Nilai</label>
                   <input required type="number" min="0" max="100" value={manualData.score} onChange={e => setManualData({...manualData, score: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:ring-1 focus:ring-tertiary/40 outline-none" placeholder="0-100" />
                 </div>
               </div>
               <div>
                 <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">Mata Pelajaran</label>
                 <input required type="text" value={manualData.subject} onChange={e => setManualData({...manualData, subject: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:ring-1 focus:ring-tertiary/40 outline-none" placeholder="Contoh: Matematika" />
               </div>
               
               <div className="flex gap-3 pt-2">
                 <button type="button" onClick={() => setIsManualScore(false)} className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl text-xs font-bold uppercase tracking-widest">Batal</button>
                 <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center">
                   {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Inject Nilai'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
