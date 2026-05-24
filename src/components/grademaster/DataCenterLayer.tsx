"use client";

import React, { useState, useEffect } from 'react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { Loader2, Search, Plus, Trash2, Download, Database, BookOpen, AlertCircle, Edit2, ShieldCheck, CheckCircle2, AlertTriangle, FileText, Check, ChevronRight, Info, Upload } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

  // Excel Import states
  const [isExcelImport, setIsExcelImport] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Upload & Meta, 2: Sheet Mapping, 3: Match Students, 4: Summary
  const [importMeta, setImportMeta] = useState({ subject: '', examType: 'UTS', academicYear: '2025/2026' });
  const [workbookData, setWorkbookData] = useState<{
    filename: string;
    sheets: { name: string; rows: any[][] }[];
  } | null>(null);

  interface SheetMapping {
    sheetName: string;
    dbClassName: string;
    headerRow: number;
    nameCol: number;
    scoreCol: number;
    enabled: boolean;
  }
  const [sheetMappings, setSheetMappings] = useState<SheetMapping[]>([]);

  interface MatchedRecord {
    id: string;
    excelName: string;
    score: number;
    sheetName: string;
    className: string;
    matchedName: string;
    action: 'match' | 'create_new' | 'skip';
    similarity: number;
    status: 'perfect' | 'fuzzy' | 'unmatched';
  }
  const [matchedRecords, setMatchedRecords] = useState<MatchedRecord[]>([]);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [matchFilterStatus, setMatchFilterStatus] = useState<'all' | 'perfect' | 'fuzzy' | 'unmatched'>('all');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingClassPdf, setIsDownloadingClassPdf] = useState(false);

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

  // Heuristic column detection
  const detectColumns = (rows: any[][]) => {
    let headerRowIndex = 0;
    let nameColIndex = -1;
    let scoreColIndex = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim().toLowerCase();
        if (cell.match(/nama|siswa|student|name|peserta/i) && nameColIndex === -1) {
          nameColIndex = j;
          headerRowIndex = i;
        }
        if (cell.match(/nilai|score|uts|uas|pat|pas|akhir|angka|grade/i) && scoreColIndex === -1) {
          scoreColIndex = j;
          headerRowIndex = i;
        }
      }
      if (nameColIndex !== -1 && scoreColIndex !== -1) {
        break;
      }
    }

    if (nameColIndex === -1) nameColIndex = 0;
    if (scoreColIndex === -1) scoreColIndex = 1;

    return { headerRowIndex, nameColIndex, scoreColIndex };
  };

  // Dice's Coefficient String Similarity
  const getStringSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.replace(/\s+/g, '').toLowerCase().trim();
    const s2 = str2.replace(/\s+/g, '').toLowerCase().trim();
    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    const getBigrams = (str: string) => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.slice(i, i + 2));
      }
      return bigrams;
    };

    const b1 = getBigrams(s1);
    const b2 = getBigrams(s2);
    
    let intersection = 0;
    b1.forEach(b => {
      if (b2.has(b)) intersection++;
    });

    return (2 * intersection) / (b1.size + b2.size);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const parsedSheets = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          return { name, rows };
        });

        setWorkbookData({ filename: file.name, sheets: parsedSheets });
        setWizardStep(2);
      } catch (error: any) {
        setToast({ message: `Gagal membaca file Excel: ${error.message}`, type: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Auto-map sheet names to database classes when workbook data changes
  useEffect(() => {
    if (!workbookData) return;

    const uniqueDbClasses = Array.from(new Set(students.map(s => s.className).filter(c => c && c !== 'Unknown'))).sort();

    const initialMappings: SheetMapping[] = workbookData.sheets.map(sheet => {
      const normalizedSheetName = sheet.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      let bestClassMatch = uniqueDbClasses[0] || '';
      let bestSimilarity = 0;

      for (const dbClass of uniqueDbClasses) {
        const normalizedDb = dbClass.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (normalizedDb === normalizedSheetName) {
          bestClassMatch = dbClass;
          bestSimilarity = 1.0;
          break;
        }
        const sim = getStringSimilarity(normalizedDb, normalizedSheetName);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestClassMatch = dbClass;
        }
      }

      const { headerRowIndex, nameColIndex, scoreColIndex } = detectColumns(sheet.rows);

      return {
        sheetName: sheet.name,
        dbClassName: bestClassMatch,
        headerRow: headerRowIndex,
        nameCol: nameColIndex,
        scoreCol: scoreColIndex,
        enabled: true
      };
    });

    setSheetMappings(initialMappings);
  }, [workbookData, students]);

  const generateStudentMatches = () => {
    if (!workbookData) return;

    const records: MatchedRecord[] = [];

    sheetMappings.forEach(mapping => {
      if (!mapping.enabled) return;

      const sheet = workbookData.sheets.find(s => s.name === mapping.sheetName);
      if (!sheet) return;

      const classStudents = students.filter(s => s.className === mapping.dbClassName);

      for (let i = mapping.headerRow + 1; i < sheet.rows.length; i++) {
        const row = sheet.rows[i];
        if (!row || row.length === 0) continue;

        const rawName = String(row[mapping.nameCol] || '').trim();
        if (!rawName || rawName === 'undefined') continue;

        const rawScoreVal = row[mapping.scoreCol];
        let score = 0;
        if (typeof rawScoreVal === 'number') {
          score = rawScoreVal;
        } else {
          score = parseFloat(String(rawScoreVal || '').trim()) || 0;
        }
        score = Math.max(0, Math.min(100, score));

        let bestMatchName = '';
        let maxSim = 0;

        classStudents.forEach(dbStudent => {
          const sim = getStringSimilarity(rawName, dbStudent.name);
          if (sim > maxSim) {
            maxSim = sim;
            bestMatchName = dbStudent.name;
          }
        });

        let status: 'perfect' | 'fuzzy' | 'unmatched' = 'unmatched';
        let action: 'match' | 'create_new' | 'skip' = 'create_new';
        let matchedName = '';

        if (maxSim === 1.0 || rawName.toLowerCase() === bestMatchName.toLowerCase()) {
          status = 'perfect';
          action = 'match';
          matchedName = bestMatchName;
        } else if (maxSim >= 0.70) {
          status = 'fuzzy';
          action = 'match';
          matchedName = bestMatchName;
        } else {
          status = 'unmatched';
          action = 'create_new';
          matchedName = '';
        }

        records.push({
          id: `${mapping.sheetName}_${i}_${rawName}`,
          excelName: rawName,
          score,
          sheetName: mapping.sheetName,
          className: mapping.dbClassName,
          matchedName,
          action,
          similarity: maxSim,
          status
        });
      }
    });

    if (records.length === 0) {
      setToast({ message: 'Tidak ada data siswa yang ditemukan untuk diimport.', type: 'error' });
      return;
    }

    setMatchedRecords(records);
    setWizardStep(3);
  };

  const handleSaveImport = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        subject: importMeta.subject,
        examType: importMeta.examType,
        academicYear: importMeta.academicYear,
        records: matchedRecords.map(r => ({
          name: r.excelName,
          matchedName: r.action === 'match' ? r.matchedName : '',
          className: r.className,
          score: r.score,
          action: r.action
        }))
      };

      const res = await fetch('/api/grademaster/data-center/import-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data import');

      setToast({ message: data.message, type: 'success' });
      setIsExcelImport(false);
      setWorkbookData(null);
      setWizardStep(1);
      setMatchedRecords([]);
      setSheetMappings([]);
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
    doc.setFont("Helvetica", "bold");
    doc.text('Laporan Hasil Belajar & Perilaku', 14, 20);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Nama: ${student.name}`, 14, 30);
    doc.text(`Kelas: ${student.className}`, 14, 36);
    doc.text(`Tahun Ajaran: ${student.academicYear}`, 14, 42);
    doc.setTextColor(0, 0, 0);

    // Score Table
    doc.setFontSize(13);
    doc.setFont("Helvetica", "bold");
    doc.text('Rincian Nilai Akademik', 14, 55);
    doc.setFont("Helvetica", "normal");
    
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
    doc.setFont("Helvetica", "bold");
    doc.text('Laporan Perilaku (Poin Keaktifan)', 14, finalY);
    doc.setFont("Helvetica", "normal");
    
    doc.setFontSize(11);
    doc.text(`Total Poin Sikap: ${student.behaviorPoints}`, 14, finalY + 8);
    
    // Render detailed behavior logs if they exist
    const behaviorData = (student.behaviorLogs || []).map((log, idx) => [
      idx + 1,
      log.reason,
      `+${log.points} Poin`,
      new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    ]);

    let behaviorTableEndY = finalY + 14;
    if (behaviorData.length > 0) {
      autoTable(doc, {
        startY: finalY + 14,
        head: [['No', 'Kategori Pelanggaran / Perilaku', 'Poin', 'Tanggal']],
        body: behaviorData,
        theme: 'striped',
        headStyles: { fillColor: [225, 29, 72] } // Rose-600 color for demerit table
      });
      behaviorTableEndY = (doc as any).lastAutoTable.finalY;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Bersih — Belum ada catatan perilaku atau pelanggaran.', 14, finalY + 14);
      doc.setTextColor(0, 0, 0);
      behaviorTableEndY = finalY + 20;
    }

    // Footnote source label
    doc.setFontSize(8);
    doc.setFont("Helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text('Sumber dari OSIS SMP Terpadu Al-Ittihadiyah Masa Bakti 2025/2026', 14, behaviorTableEndY + 8);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Dokumen ini dicetak otomatis oleh GradeMaster OS pada ${new Date().toLocaleDateString('id-ID')}`, 105, 280, { align: 'center' });

    doc.save(`Rapor_${student.name.replace(/ /g, '_')}_${student.className}.pdf`);
  };

  const generateClassPdfReport = async (classStudents: StudentData[], className: string) => {
    try {
      setIsDownloadingClassPdf(true);
      const doc = new jsPDF();
      let isFirst = true;

      for (const student of classStudents) {
        if (!isFirst) {
          doc.addPage();
        }
        isFirst = false;

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
        doc.setFont("Helvetica", "bold");
        doc.text('Laporan Hasil Belajar & Perilaku', 14, 20);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text(`Nama: ${student.name}`, 14, 30);
        doc.text(`Kelas: ${student.className}`, 14, 36);
        doc.text(`Tahun Ajaran: ${student.academicYear}`, 14, 42);
        doc.setTextColor(0, 0, 0);

        // Score Table
        doc.setFontSize(13);
        doc.setFont("Helvetica", "bold");
        doc.text('Rincian Nilai Akademik', 14, 55);
        doc.setFont("Helvetica", "normal");
        
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
        doc.setFont("Helvetica", "bold");
        doc.text('Laporan Perilaku (Poin Keaktifan)', 14, finalY);
        doc.setFont("Helvetica", "normal");
        
        doc.setFontSize(11);
        doc.text(`Total Poin Sikap: ${student.behaviorPoints}`, 14, finalY + 8);
        
        // Render detailed behavior logs if they exist
        const behaviorData = (student.behaviorLogs || []).map((log, idx) => [
          idx + 1,
          log.reason,
          `+${log.points} Poin`,
          new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        ]);

        let behaviorTableEndY = finalY + 14;
        if (behaviorData.length > 0) {
          autoTable(doc, {
            startY: finalY + 14,
            head: [['No', 'Kategori Pelanggaran / Perilaku', 'Poin', 'Tanggal']],
            body: behaviorData,
            theme: 'striped',
            headStyles: { fillColor: [225, 29, 72] } // Rose-600 color for demerit table
          });
          behaviorTableEndY = (doc as any).lastAutoTable.finalY;
        } else {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text('Bersih — Belum ada catatan perilaku atau pelanggaran.', 14, finalY + 14);
          doc.setTextColor(0, 0, 0);
          behaviorTableEndY = finalY + 20;
        }

        // Footnote source label
        doc.setFontSize(8);
        doc.setFont("Helvetica", "italic");
        doc.setTextColor(120, 120, 120);
        doc.text('Sumber dari OSIS SMP Terpadu Al-Ittihadiyah Masa Bakti 2025/2026', 14, behaviorTableEndY + 8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(0, 0, 0);

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Dokumen ini dicetak otomatis oleh GradeMaster OS pada ${new Date().toLocaleDateString('id-ID')}`, 105, 280, { align: 'center' });
      }

      doc.save(`Rapor_Lengkap_Kelas_${className}.pdf`);
      setToast({ message: `Berhasil mengunduh rapor kelas ${className}!`, type: 'success' });
    } catch (err: any) {
      setToast({ message: `Gagal membuat PDF kelas: ${err.message}`, type: 'error' });
    } finally {
      setIsDownloadingClassPdf(false);
    }
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
               {selectedClass !== 'Semua' && filteredStudents.length > 0 && (
                  <button 
                    onClick={() => generateClassPdfReport(filteredStudents, selectedClass)}
                    disabled={isDownloadingClassPdf}
                    className="px-4 py-3 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 border border-emerald-500/20 active:scale-95 disabled:opacity-50"
                  >
                     {isDownloadingClassPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                     Unduh Rapor {selectedClass}
                  </button>
               )}
               <button 
                  onClick={() => {
                    setIsExcelImport(true);
                    setWizardStep(1);
                  }}
                  className="px-4 py-3 bg-amber-500/10 text-amber-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2 border border-amber-500/20 active:scale-95"
                >
                   <Edit2 size={16} /> Import Excel
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

      {/* Excel Score Import Modal Wizard */}
      {isExcelImport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && wizardStep === 1 && setIsExcelImport(false)} />
          <div className={`bg-surface rounded-3xl p-6 w-full relative z-10 border border-outline-variant/20 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] transition-all duration-300 ${
            wizardStep === 3 ? 'max-w-4xl' : wizardStep === 2 ? 'max-w-2xl' : 'max-w-md'
          }`}>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant/10">
              <div>
                <h3 className="text-lg font-headline font-bold text-primary flex items-center gap-2">
                  <Database size={20} className="text-amber-500" /> Import Nilai Excel
                </h3>
                <p className="text-xs text-on-surface-variant/70 mt-0.5">
                  {wizardStep === 1 && 'Langkah 1: Upload File & Metadata'}
                  {wizardStep === 2 && 'Langkah 2: Pemetaan Kelas & Kolom'}
                  {wizardStep === 3 && 'Langkah 3: Pencocokan Data Siswa'}
                  {wizardStep === 4 && 'Langkah 4: Ringkasan & Konfirmasi'}
                </p>
              </div>
              <button 
                onClick={() => !isSubmitting && setIsExcelImport(false)}
                className="p-1.5 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"
                disabled={isSubmitting}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto pr-1">
              
              {/* STEP 1: UPLOAD & META */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">Mata Pelajaran</label>
                    <input 
                      required 
                      type="text" 
                      value={importMeta.subject} 
                      onChange={e => setImportMeta({...importMeta, subject: e.target.value})} 
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:ring-1 focus:ring-amber-500/40 outline-none" 
                      placeholder="Contoh: Matematika, Fisika..." 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">Jenis Ujian</label>
                      <select 
                        value={importMeta.examType} 
                        onChange={e => setImportMeta({...importMeta, examType: e.target.value})} 
                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:ring-1 focus:ring-amber-500/40 outline-none"
                      >
                        <option value="UTS">UTS</option>
                        <option value="UAS">UAS</option>
                        <option value="PAS">PAS</option>
                        <option value="PAT">PAT</option>
                        <option value="QUIZ">Kuis</option>
                        <option value="MANUAL">Tugas Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">Tahun Ajaran</label>
                      <input 
                        required 
                        type="text" 
                        value={importMeta.academicYear} 
                        onChange={e => setImportMeta({...importMeta, academicYear: e.target.value})} 
                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:ring-1 focus:ring-amber-500/40 outline-none" 
                        placeholder="2025/2026" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block">File Excel</label>
                    <div className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 text-center bg-surface-container-lowest hover:border-amber-500/50 transition-colors relative group">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        disabled={!importMeta.subject}
                      />
                      <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <Upload size={32} className="text-on-surface-variant/40 group-hover:text-amber-500 transition-colors" />
                        <p className="text-xs font-bold text-primary">Pilih file atau seret kemari</p>
                        <p className="text-[10px] text-on-surface-variant/60">Mendukung format .xlsx, .xls, .csv</p>
                      </div>
                    </div>
                    {!importMeta.subject && (
                      <p className="text-[10px] text-amber-500 mt-1 pl-1 font-medium flex items-center gap-1">
                        <Info size={10} /> Isi nama mata pelajaran terlebih dahulu untuk membuka upload file.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: SHEET & COLUMN MAPPING */}
              {wizardStep === 2 && workbookData && (
                <div className="space-y-6">
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 text-amber-600">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">Pemetaan Lembar Kerja (Sheet)</h4>
                      <p className="text-[10px] leading-relaxed mt-0.5 text-on-surface-variant/80">
                        Setiap sheet akan mewakili satu kelas. Tentukan kelas database dan kolom mana yang berisi nama siswa serta nilai.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                    {sheetMappings.map((mapping, idx) => {
                      const sheet = workbookData.sheets.find(s => s.name === mapping.sheetName);
                      const columns = sheet && sheet.rows[mapping.headerRow] 
                        ? sheet.rows[mapping.headerRow].map((col, cIdx) => ({ label: String(col || `Kolom ${cIdx + 1}`), val: cIdx }))
                        : [];
                      
                      const uniqueDbClasses = Array.from(new Set(students.map(s => s.className).filter(c => c && c !== 'Unknown'))).sort();

                      return (
                        <div key={mapping.sheetName} className={`p-4 rounded-2xl border transition-all ${
                          mapping.enabled 
                            ? 'bg-surface-container border-outline-variant/30 shadow-sm' 
                            : 'bg-surface-container/30 border-outline-variant/10 opacity-60'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={mapping.enabled} 
                                onChange={e => {
                                  const updated = [...sheetMappings];
                                  updated[idx].enabled = e.target.checked;
                                  setSheetMappings(updated);
                                }}
                                className="rounded text-amber-500 focus:ring-amber-500"
                              />
                              <span className="font-bold text-sm text-primary">Sheet: {mapping.sheetName}</span>
                            </label>
                          </div>

                          {mapping.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Kelas Database</label>
                                <select 
                                  value={mapping.dbClassName} 
                                  onChange={e => {
                                    const updated = [...sheetMappings];
                                    updated[idx].dbClassName = e.target.value;
                                    setSheetMappings(updated);
                                  }}
                                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2.5 text-xs text-primary focus:ring-1 focus:ring-amber-500/40 outline-none"
                                >
                                  {uniqueDbClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Kolom Nama</label>
                                <select 
                                  value={mapping.nameCol} 
                                  onChange={e => {
                                    const updated = [...sheetMappings];
                                    updated[idx].nameCol = Number(e.target.value);
                                    setSheetMappings(updated);
                                  }}
                                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2.5 text-xs text-primary focus:ring-1 focus:ring-amber-500/40 outline-none"
                                >
                                  {columns.map(col => <option key={col.val} value={col.val}>{col.label}</option>)}
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Kolom Nilai</label>
                                <select 
                                  value={mapping.scoreCol} 
                                  onChange={e => {
                                    const updated = [...sheetMappings];
                                    updated[idx].scoreCol = Number(e.target.value);
                                    setSheetMappings(updated);
                                  }}
                                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2.5 text-xs text-primary focus:ring-1 focus:ring-amber-500/40 outline-none"
                                >
                                  {columns.map(col => <option key={col.val} value={col.val}>{col.label}</option>)}
                                </select>
                              </div>
                            </div>
                          )}

                          {mapping.enabled && sheet && sheet.rows.length > mapping.headerRow + 1 && (
                            <div className="mt-3 bg-surface-container-lowest rounded-xl p-2.5 border border-outline-variant/10">
                              <span className="text-[8px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-1.5">Pratinjau Data (Baris Pertama)</span>
                              <div className="space-y-1">
                                {sheet.rows.slice(mapping.headerRow + 1, mapping.headerRow + 4).map((row, rIdx) => (
                                  <div key={rIdx} className="flex justify-between items-center text-[10px] text-on-surface-variant">
                                    <span className="font-semibold">{String(row[mapping.nameCol] || '-')}</span>
                                    <span className="font-bold text-amber-500">{String(row[mapping.scoreCol] || '0')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: MATCH STUDENTS */}
              {wizardStep === 3 && (
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex flex-col md:flex-row justify-between gap-3 bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/10">
                    <div className="flex flex-wrap gap-1.5">
                      <button 
                        onClick={() => setMatchFilterStatus('all')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          matchFilterStatus === 'all' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        Semua ({matchedRecords.length})
                      </button>
                      <button 
                        onClick={() => setMatchFilterStatus('perfect')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          matchFilterStatus === 'perfect' ? 'bg-emerald-500 text-white' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        Sesuai ({matchedRecords.filter(r => r.status === 'perfect').length})
                      </button>
                      <button 
                        onClick={() => setMatchFilterStatus('fuzzy')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          matchFilterStatus === 'fuzzy' ? 'bg-amber-500 text-white' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        Saran ({matchedRecords.filter(r => r.status === 'fuzzy').length})
                      </button>
                      <button 
                        onClick={() => setMatchFilterStatus('unmatched')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          matchFilterStatus === 'unmatched' ? 'bg-rose-500 text-white' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        Tidak Cocok ({matchedRecords.filter(r => r.status === 'unmatched').length})
                      </button>
                    </div>

                    <div className="relative w-full md:w-60">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                      <input 
                        type="text" 
                        placeholder="Cari nama..." 
                        value={matchSearchQuery}
                        onChange={e => setMatchSearchQuery(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-primary focus:ring-1 focus:ring-amber-500/40 outline-none"
                      />
                    </div>
                  </div>

                  <div className="border border-outline-variant/20 rounded-2xl overflow-hidden max-h-[40vh] overflow-y-auto shadow-inner bg-surface-container-lowest">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container text-on-surface-variant text-[9px] font-black uppercase tracking-widest sticky top-0 z-10 border-b border-outline-variant/10">
                          <th className="p-3">Nama di Excel</th>
                          <th className="p-3">Nilai</th>
                          <th className="p-3">Kelas</th>
                          <th className="p-3">Status Pencocokan</th>
                          <th className="p-3 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchedRecords
                          .filter(r => {
                            const matchSearch = r.excelName.toLowerCase().includes(matchSearchQuery.toLowerCase());
                            const matchStatus = matchFilterStatus === 'all' || r.status === matchFilterStatus;
                            return matchSearch && matchStatus;
                          })
                          .map((record, rIdx) => {
                            const classDbStudents = students.filter(s => s.className === record.className);
                            return (
                              <tr key={record.id} className="border-b border-outline-variant/5 hover:bg-surface-container/30 transition-colors text-xs text-on-surface-variant">
                                <td className="p-3 font-semibold text-primary">{record.excelName}</td>
                                <td className="p-3 font-bold text-amber-500">{record.score}</td>
                                <td className="p-3">
                                  <span className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant text-[9px] font-bold rounded uppercase tracking-wider">{record.className}</span>
                                </td>
                                <td className="p-3">
                                  {record.status === 'perfect' && (
                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 w-max">
                                      <Check size={10} strokeWidth={3} /> Sesuai Otomatis
                                    </span>
                                  )}
                                  {record.status === 'fuzzy' && (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="px-2 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 w-max">
                                        <AlertTriangle size={10} /> Saran Cocok ({Math.round(record.similarity * 100)}%)
                                      </span>
                                      <span className="text-[9px] text-on-surface-variant/60">Fuzzy: "{record.matchedName}"</span>
                                    </div>
                                  )}
                                  {record.status === 'unmatched' && (
                                    <span className="px-2 py-1 bg-rose-500/10 text-rose-600 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 w-max">
                                      <AlertCircle size={10} /> Tidak Cocok
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <select
                                      value={record.action}
                                      onChange={e => {
                                        const actionVal = e.target.value as any;
                                        const updated = [...matchedRecords];
                                        const idx = updated.findIndex(r => r.id === record.id);
                                        updated[idx].action = actionVal;
                                        if (actionVal === 'match') {
                                          updated[idx].matchedName = record.matchedName || (classDbStudents[0]?.name || '');
                                        } else {
                                          updated[idx].matchedName = '';
                                        }
                                        setMatchedRecords(updated);
                                      }}
                                      className="bg-surface-container border border-outline-variant/30 rounded-lg px-2 py-1 text-[10px] text-primary focus:ring-1 focus:ring-amber-500/40 outline-none cursor-pointer"
                                    >
                                      {record.status !== 'unmatched' && <option value="match">Hubungkan</option>}
                                      {record.status === 'unmatched' && classDbStudents.length > 0 && <option value="match">Hubungkan manual</option>}
                                      <option value="create_new">Buat Akun Baru</option>
                                      <option value="skip">Lewati</option>
                                    </select>

                                    {record.action === 'match' && (
                                      <select
                                        value={record.matchedName}
                                        onChange={e => {
                                          const updated = [...matchedRecords];
                                          const idx = updated.findIndex(r => r.id === record.id);
                                          updated[idx].matchedName = e.target.value;
                                          setMatchedRecords(updated);
                                        }}
                                        className="bg-surface-container border border-outline-variant/30 rounded-lg px-2 py-1 text-[10px] text-primary focus:ring-1 focus:ring-amber-500/40 outline-none max-w-[150px] cursor-pointer"
                                      >
                                        {classDbStudents.map(student => (
                                          <option key={student.id} value={student.name}>{student.name}</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 4: SUMMARY & CONFIRM */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex gap-3 text-emerald-600">
                    <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">Semua data siap diimport!</h4>
                      <p className="text-xs text-on-surface-variant/80 mt-0.5">
                        Konfirmasi ringkasan data di bawah ini sebelum menyimpan ke dalam database.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10 text-center">
                      <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest block font-bold">Mata Pelajaran</span>
                      <span className="text-base font-bold text-primary mt-1 block">{importMeta.subject}</span>
                      <span className="px-2 py-0.5 bg-amber-500/15 text-amber-600 rounded text-[9px] font-bold uppercase tracking-wider mt-1.5 inline-block">{importMeta.examType}</span>
                    </div>

                    <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10 text-center">
                      <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest block font-bold">Tahun Ajaran</span>
                      <span className="text-base font-bold text-primary mt-1 block">{importMeta.academicYear}</span>
                    </div>
                  </div>

                  <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden divide-y divide-outline-variant/10">
                    <div className="flex justify-between items-center p-3.5">
                      <span className="text-xs text-on-surface-variant font-medium">Total Nilai Diimport</span>
                      <span className="text-xs font-bold text-emerald-500">{matchedRecords.filter(r => r.action === 'match').length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3.5">
                      <span className="text-xs text-on-surface-variant font-medium">Akun Siswa Baru Dibuat</span>
                      <span className="text-xs font-bold text-amber-500">{matchedRecords.filter(r => r.action === 'create_new').length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3.5">
                      <span className="text-xs text-on-surface-variant font-medium">Diabaikan (Skip)</span>
                      <span className="text-xs font-bold text-on-surface-variant/50">{matchedRecords.filter(r => r.action === 'skip').length}</span>
                    </div>
                  </div>

                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 flex gap-3 text-rose-600">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider">Pemberitahuan Database</h5>
                      <p className="text-[10px] leading-relaxed mt-0.5 text-on-surface-variant/80">
                        Proses ini akan meng-upsert nilai siswa. Jika nilai siswa di subjek dan ujian tersebut sudah ada di database, nilai lama akan langsung tertimpa.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-outline-variant/10">
              {wizardStep > 1 && (
                <button 
                  type="button" 
                  onClick={() => setWizardStep(wizardStep - 1)} 
                  className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all border border-outline-variant/10"
                  disabled={isSubmitting}
                >
                  Kembali
                </button>
              )}
              {wizardStep === 1 && (
                <button 
                  type="button" 
                  onClick={() => setIsExcelImport(false)} 
                  className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all border border-outline-variant/10"
                >
                  Batal
                </button>
              )}
              
              {wizardStep === 2 && (
                <button 
                  type="button" 
                  onClick={generateStudentMatches} 
                  className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 hover:bg-amber-600 transition-all flex justify-center items-center gap-1"
                >
                  Lanjut Cocokkan <ChevronRight size={14} />
                </button>
              )}
              {wizardStep === 3 && (
                <button 
                  type="button" 
                  onClick={() => setWizardStep(4)} 
                  className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 hover:bg-amber-600 transition-all flex justify-center items-center gap-1"
                >
                  Lanjut Tinjauan <ChevronRight size={14} />
                </button>
              )}
              {wizardStep === 4 && (
                <button 
                  type="button" 
                  onClick={handleSaveImport}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 hover:bg-emerald-600 transition-all flex justify-center items-center"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Simpan & Terapkan'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
