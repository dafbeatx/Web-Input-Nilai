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
  const [isDownloadingClassAcademicPdf, setIsDownloadingClassAcademicPdf] = useState(false);
  const [isDownloadingClassBehaviorPdf, setIsDownloadingClassBehaviorPdf] = useState(false);
  const [downloadingAcademicId, setDownloadingAcademicId] = useState<string | null>(null);
  const [downloadingBehaviorId, setDownloadingBehaviorId] = useState<string | null>(null);

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

  const generateAcademicPdfReport = async (student: StudentData) => {
    setDownloadingAcademicId(student.id);
    try {
      const doc = new jsPDF();
      
      // Draw photo if available (placed in student meta block on the right)
      if (student.avatarUrl) {
        try {
          const img = await loadImage(student.avatarUrl);
          // Draw avatar photo on the right of the meta block, below the header double-line
          doc.addImage(img, 'JPEG', 160, 45, 26, 33);
        } catch (err) {
          console.error("Failed to load student avatar for PDF:", err);
        }
      }

      // Border and Header Design
      doc.setDrawColor(44, 62, 80); // Slate blue border color
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277); // Outer page border

      // Formal School Header (Only School Name, Centered, No Yayasan, No Address)
      doc.setFont("Times", "bold");
      doc.setFontSize(16);
      doc.text('SMP TERPADU AL-ITTIHADIYAH', 105, 20, { align: 'center' });
      
      // Double header lines shifted up to Y=24/25.5
      doc.setLineWidth(1);
      doc.line(14, 24, 196, 24);
      doc.setLineWidth(0.5);
      doc.line(14, 25.5, 196, 25.5);

      // Document Title
      doc.setFont("Times", "bold");
      doc.setFontSize(14);
      doc.text('LAPORAN HASIL BELAJAR SISWA (RAPOR AKADEMIK)', 105, 36, { align: 'center' });

      // Student Meta Block
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      
      doc.text('Nama Siswa', 15, 46);
      doc.text(`:  ${student.name}`, 45, 46);
      doc.text('Kelas', 15, 52);
      doc.text(`:  ${student.className}`, 45, 52);
      doc.text('Tahun Ajaran', 15, 58);
      doc.text(`:  ${student.academicYear}`, 45, 58);

      doc.text('NISN / ID', 115, 46);
      doc.text(`:  ${student.id.startsWith('behavior_') ? '-' : student.id.slice(0, 8).toUpperCase()}`, 138, 46);
      doc.text('Semester', 115, 52);
      doc.text(':  Genap (2)', 138, 52);

      // Draw Academic Scores Table
      const scoreData = student.scores.map((s, idx) => {
        const kkm = 70;
        let predikat = 'D';
        if (s.score >= 90) predikat = 'A';
        else if (s.score >= 80) predikat = 'B';
        else if (s.score >= 70) predikat = 'C';
        
        const keterangan = s.score >= kkm ? 'TUNTAS' : 'REMEDIAL';
        return [
          idx + 1,
          s.subject,
          s.type,
          kkm,
          s.score,
          predikat,
          keterangan
        ];
      });

      let finalY = 82;
      if (scoreData.length > 0) {
        autoTable(doc, {
          startY: 80,
          head: [['No', 'Mata Pelajaran', 'Tipe Ujian', 'KKM', 'Nilai Akhir', 'Predikat', 'Keterangan']],
          body: scoreData,
          theme: 'grid',
          styles: { font: 'Helvetica', fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 18 },
            6: { halign: 'center', cellWidth: 25 }
          }
        });
        finalY = (doc as any).lastAutoTable.finalY + 12;
      } else {
        doc.setFontSize(10);
        doc.text('Belum ada nilai akademik terdaftar.', 15, 85);
        finalY = 100;
      }

      // Footnote
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Catatan: Rapor ini dicetak secara otomatis dan sah menggunakan enkripsi GradeMaster OS.', 15, finalY);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Dicetak oleh GradeMaster OS pada ${new Date().toLocaleString('id-ID')}`, 105, 280, { align: 'center' });

      doc.save(`Rapor_Akademik_${student.name.replace(/ /g, '_')}_${student.className}.pdf`);
      setToast({ message: `Berhasil mengunduh Rapor Akademik untuk ${student.name}`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Gagal membuat Rapor Akademik: ${err.message}`, type: 'error' });
    } finally {
      setDownloadingAcademicId(null);
    }
  };

  const generateBehaviorPdfReport = async (student: StudentData) => {
    setDownloadingBehaviorId(student.id);
    try {
      const doc = new jsPDF();
      
      // Draw photo if available (placed in student meta block on the right)
      if (student.avatarUrl) {
        try {
          const img = await loadImage(student.avatarUrl);
          // Draw avatar photo on the right of the meta block, below the header double-line
          doc.addImage(img, 'JPEG', 160, 45, 26, 33);
        } catch (err) {
          console.error("Failed to load student avatar for PDF:", err);
        }
      }

      // Outer border
      doc.setDrawColor(190, 24, 74); // Rose-700 / crimson border color for disciplinary report
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277);

      // School Header (Only School Name, Centered, No Yayasan, No Address)
      doc.setFont("Times", "bold");
      doc.setFontSize(16);
      doc.text('SMP TERPADU AL-ITTIHADIYAH', 105, 20, { align: 'center' });
      
      // Double header lines shifted up to Y=24/25.5
      doc.setLineWidth(1);
      doc.line(14, 24, 196, 24);
      doc.setLineWidth(0.5);
      doc.line(14, 25.5, 196, 25.5);

      // Title
      doc.setFont("Times", "bold");
      doc.setFontSize(14);
      doc.text('LAPORAN KEDISIPLINAN & KEPATUHAN PERILAKU SISWA', 105, 36, { align: 'center' });

      // Student Meta Block
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      
      doc.text('Nama Siswa', 15, 46);
      doc.text(`:  ${student.name}`, 45, 46);
      doc.text('Kelas', 15, 52);
      doc.text(`:  ${student.className}`, 45, 52);
      doc.text('Tahun Ajaran', 15, 58);
      doc.text(`:  ${student.academicYear}`, 45, 58);

      doc.text('Sisa Poin Sikap', 110, 46);
      doc.text(`:  ${student.behaviorPoints} / 100 Poin`, 142, 46);
      // Predikat Perilaku removed for clean style without behavior predicate

      // 1. Behavior logs table (Harian)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Catatan Perilaku Harian (Poin Keaktifan & Disiplin)', 15, 80);
      
      const behaviorData = (student.behaviorLogs || []).map((log, idx) => [
        idx + 1,
        log.reason,
        log.points > 0 ? `+${log.points}` : `${log.points}`,
        new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        log.points > 0 ? 'Pujian' : 'Pelanggaran'
      ]);

      let behaviorTableEndY = 85;
      if (behaviorData.length > 0) {
        autoTable(doc, {
          startY: 84,
          head: [['No', 'Uraian Perilaku / Pelanggaran', 'Dampak Poin', 'Tanggal', 'Jenis']],
          body: behaviorData,
          theme: 'grid',
          styles: { font: 'Helvetica', fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [190, 24, 74], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 28 },
            4: { halign: 'center', cellWidth: 25 }
          }
        });
        behaviorTableEndY = (doc as any).lastAutoTable.finalY + 12;
      } else {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Catatan perilaku bersih — Tidak ada pelanggaran kedisiplinan tercatat.', 15, 87);
        doc.setTextColor(0, 0, 0);
        behaviorTableEndY = 97;
      }

      // Fetch proctoring violations & snapshots from DB
      let proctoringViolations: any[] = [];
      try {
        const res = await fetch(`/api/grademaster/data-center/student-violations?name=${encodeURIComponent(student.name)}`);
        if (res.ok) {
          const data = await res.json();
          proctoringViolations = data.violations || [];
        }
      } catch (err) {
        console.error("Failed to fetch proctoring snapshots:", err);
      }

      // 2. Exam Proctoring Violations Table
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Detail Pelanggaran Ujian Online (AI Proctoring)', 15, behaviorTableEndY);

      let proctoringTableEndY = behaviorTableEndY + 5;
      if (proctoringViolations.length > 0) {
        const tableBody = proctoringViolations.map((v, idx) => [
          idx + 1,
          v.subject,
          v.violationType,
          new Date(v.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          v.imageData ? 'Ada Bukti Foto' : 'Log Aktivitas'
        ]);

        autoTable(doc, {
          startY: behaviorTableEndY + 4,
          head: [['No', 'Mata Pelajaran', 'Indikasi Pelanggaran', 'Waktu Kejadian', 'Bukti']],
          body: tableBody,
          theme: 'grid',
          styles: { font: 'Helvetica', fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left' },
            2: { halign: 'left' },
            3: { halign: 'center', cellWidth: 40 },
            4: { halign: 'center', cellWidth: 35 }
          }
        });
        proctoringTableEndY = (doc as any).lastAutoTable.finalY + 12;
      } else {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Tidak ditemukan indikasi pelanggaran selama ujian remedial berlangsung.', 15, behaviorTableEndY + 7);
        doc.setTextColor(0, 0, 0);
        proctoringTableEndY = behaviorTableEndY + 18;
      }

      // 3. Proctoring Evidence Photos (if any)
      const photosWithData = proctoringViolations.filter(v => v.imageData);
      if (photosWithData.length > 0) {
        // Add a new page for evidence photos
        doc.addPage();
        // Draw border on the second page
        doc.setDrawColor(190, 24, 74);
        doc.setLineWidth(0.5);
        doc.rect(10, 10, 190, 277);

        doc.setFont("Times", "bold");
        doc.setFontSize(14);
        doc.setTextColor(190, 24, 74);
        doc.text('LAMPIRAN BUKTI VISUAL PELANGGARAN PROCTORING AI', 105, 20, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(14, 25, 196, 25);
        doc.setTextColor(0, 0, 0);

        // Draw photos in grid
        let startX = 20;
        let startY = 32;
        let col = 0;

        for (const photo of photosWithData.slice(0, 6)) { // limit to 6 photos to avoid too many pages
          try {
            // Draw thumbnail card
            doc.setDrawColor(200, 200, 200);
            doc.rect(startX, startY, 78, 62);
            doc.addImage(photo.imageData, 'JPEG', startX + 2, startY + 2, 74, 48);

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(8);
            doc.text(`${photo.violationType}`, startX + 4, startY + 54);
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(7);
            doc.text(`Mapel: ${photo.subject}`, startX + 4, startY + 57);
            doc.text(`Waktu: ${new Date(photo.createdAt).toLocaleString('id-ID')}`, startX + 4, startY + 60);

            col++;
            if (col % 2 === 0) {
              startX = 20;
              startY += 70;
            } else {
              startX = 112;
            }

            // check if overflow page
            if (startY > 230 && col < photosWithData.length) {
              doc.addPage();
              doc.rect(10, 10, 190, 277);
              doc.setFont("Times", "bold");
              doc.setFontSize(14);
              doc.setTextColor(190, 24, 74);
              doc.text('LAMPIRAN BUKTI VISUAL PELANGGARAN PROCTORING AI (LANJUTAN)', 105, 20, { align: 'center' });
              doc.line(14, 25, 196, 25);
              doc.setTextColor(0, 0, 0);
              startX = 20;
              startY = 32;
              col = 0;
            }
          } catch (err) {
            console.error("Failed to add violation image to PDF:", err);
          }
        }
        proctoringTableEndY = startY + 75;
      }

      // Check if we are close to bottom on page 1 (if no second page was added)
      if (proctoringTableEndY > 265 && photosWithData.length === 0) {
        doc.addPage();
        doc.rect(10, 10, 190, 277);
        proctoringTableEndY = 30;
      }

      // Footnote source label
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Sumber dari OSIS SMP Terpadu Al-Ittihadiyah Masa Bakti 2025/2026', 15, proctoringTableEndY);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Dokumen ini dicetak otomatis oleh GradeMaster OS pada ${new Date().toLocaleDateString('id-ID')}`, 105, 280, { align: 'center' });

      doc.save(`Laporan_Pelanggaran_${student.name.replace(/ /g, '_')}_${student.className}.pdf`);
      setToast({ message: `Berhasil mengunduh Laporan Kedisiplinan untuk ${student.name}`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Gagal membuat Laporan Kedisiplinan: ${err.message}`, type: 'error' });
    } finally {
      setDownloadingBehaviorId(null);
    }
  };

  const generateClassAcademicPdfReport = async (classStudents: StudentData[], className: string) => {
    try {
      setIsDownloadingClassAcademicPdf(true);
      const doc = new jsPDF();
      let isFirst = true;

      for (const student of classStudents) {
        if (!isFirst) {
          doc.addPage();
        }
        isFirst = false;

        // Draw photo if available (placed in student meta block on the right)
        if (student.avatarUrl) {
          try {
            const img = await loadImage(student.avatarUrl);
            doc.addImage(img, 'JPEG', 160, 45, 26, 33);
          } catch (err) {
            console.error("Failed to load student avatar for PDF:", err);
          }
        }

        // Border and Header Design
        doc.setDrawColor(44, 62, 80);
        doc.setLineWidth(0.5);
        doc.rect(10, 10, 190, 277);

        // Formal School Header (Only School Name, Centered, No Yayasan, No Address)
        doc.setFont("Times", "bold");
        doc.setFontSize(16);
        doc.text('SMP TERPADU AL-ITTIHADIYAH', 105, 20, { align: 'center' });
        
        // Double header lines shifted up to Y=24/25.5
        doc.setLineWidth(1);
        doc.line(14, 24, 196, 24);
        doc.setLineWidth(0.5);
        doc.line(14, 25.5, 196, 25.5);

        // Document Title
        doc.setFont("Times", "bold");
        doc.setFontSize(14);
        doc.text('LAPORAN HASIL BELAJAR SISWA (RAPOR AKADEMIK)', 105, 36, { align: 'center' });

        // Student Meta Block
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        doc.text('Nama Siswa', 15, 46);
        doc.text(`:  ${student.name}`, 45, 46);
        doc.text('Kelas', 15, 52);
        doc.text(`:  ${student.className}`, 45, 52);
        doc.text('Tahun Ajaran', 15, 58);
        doc.text(`:  ${student.academicYear}`, 45, 58);

        doc.text('NISN / ID', 115, 46);
        doc.text(`:  ${student.id.startsWith('behavior_') ? '-' : student.id.slice(0, 8).toUpperCase()}`, 138, 46);
        doc.text('Semester', 115, 52);
        doc.text(':  Genap (2)', 138, 52);

        // Draw Academic Scores Table
        const scoreData = student.scores.map((s, idx) => {
          const kkm = 70;
          let predikat = 'D';
          if (s.score >= 90) predikat = 'A';
          else if (s.score >= 80) predikat = 'B';
          else if (s.score >= 70) predikat = 'C';
          
          const keterangan = s.score >= kkm ? 'TUNTAS' : 'REMEDIAL';
          return [
            idx + 1,
            s.subject,
            s.type,
            kkm,
            s.score,
            predikat,
            keterangan
          ];
        });

        let finalY = 82;
        if (scoreData.length > 0) {
          autoTable(doc, {
            startY: 80,
            head: [['No', 'Mata Pelajaran', 'Tipe Ujian', 'KKM', 'Nilai Akhir', 'Predikat', 'Keterangan']],
            body: scoreData,
            theme: 'grid',
            styles: { font: 'Helvetica', fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
              0: { halign: 'center', cellWidth: 10 },
              1: { halign: 'left' },
              2: { halign: 'center', cellWidth: 25 },
              3: { halign: 'center', cellWidth: 15 },
              4: { halign: 'center', cellWidth: 20 },
              5: { halign: 'center', cellWidth: 18 },
              6: { halign: 'center', cellWidth: 25 }
            }
          });
          finalY = (doc as any).lastAutoTable.finalY + 12;
        } else {
          doc.setFontSize(10);
          doc.text('Belum ada nilai akademik terdaftar.', 15, 85);
          finalY = 100;
        }

        // Footnote
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Catatan: Rapor ini dicetak secara otomatis dan sah menggunakan enkripsi GradeMaster OS.', 15, finalY);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Dicetak oleh GradeMaster OS pada ${new Date().toLocaleString('id-ID')}`, 105, 280, { align: 'center' });
      }

      doc.save(`Rapor_Akademik_Kelas_${className}.pdf`);
      setToast({ message: `Berhasil mengunduh Rapor Akademik kelas ${className}!`, type: 'success' });
    } catch (err: any) {
      setToast({ message: `Gagal membuat PDF kelas: ${err.message}`, type: 'error' });
    } finally {
      setIsDownloadingClassAcademicPdf(false);
    }
  };

  const generateClassBehaviorPdfReport = async (classStudents: StudentData[], className: string) => {
    try {
      setIsDownloadingClassBehaviorPdf(true);
      const doc = new jsPDF();
      let isFirst = true;

      for (const student of classStudents) {
        if (!isFirst) {
          doc.addPage();
        }
        isFirst = false;

        // Draw photo if available (placed in student meta block on the right)
        if (student.avatarUrl) {
          try {
            const img = await loadImage(student.avatarUrl);
            doc.addImage(img, 'JPEG', 160, 45, 26, 33);
          } catch (err) {
            console.error("Failed to load student avatar for PDF:", err);
          }
        }

        // Outer border
        doc.setDrawColor(190, 24, 74);
        doc.setLineWidth(0.5);
        doc.rect(10, 10, 190, 277);

        // School Header (Only School Name, Centered, No Yayasan, No Address)
        doc.setFont("Times", "bold");
        doc.setFontSize(16);
        doc.text('SMP TERPADU AL-ITTIHADIYAH', 105, 20, { align: 'center' });
        
        // Double header lines shifted up to Y=24/25.5
        doc.setLineWidth(1);
        doc.line(14, 24, 196, 24);
        doc.setLineWidth(0.5);
        doc.line(14, 25.5, 196, 25.5);

        // Title
        doc.setFont("Times", "bold");
        doc.setFontSize(14);
        doc.text('LAPORAN KEDISIPLINAN & KEPATUHAN PERILAKU SISWA', 105, 36, { align: 'center' });

        // Student Meta Block
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        doc.text('Nama Siswa', 15, 46);
        doc.text(`:  ${student.name}`, 45, 46);
        doc.text('Kelas', 15, 52);
        doc.text(`:  ${student.className}`, 45, 52);
        doc.text('Tahun Ajaran', 15, 58);
        doc.text(`:  ${student.academicYear}`, 45, 58);

        doc.text('Sisa Poin Sikap', 110, 46);
        doc.text(`:  ${student.behaviorPoints} / 100 Poin`, 142, 46);
        // Predikat Perilaku removed for clean style without behavior predicate

        // 1. Behavior logs table (Harian)
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Catatan Perilaku Harian (Poin Keaktifan & Disiplin)', 15, 80);
        
        const behaviorData = (student.behaviorLogs || []).map((log, idx) => [
          idx + 1,
          log.reason,
          log.points > 0 ? `+${log.points}` : `${log.points}`,
          new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          log.points > 0 ? 'Pujian' : 'Pelanggaran'
        ]);

        let behaviorTableEndY = 85;
        if (behaviorData.length > 0) {
          autoTable(doc, {
            startY: 84,
            head: [['No', 'Uraian Perilaku / Pelanggaran', 'Dampak Poin', 'Tanggal', 'Jenis']],
            body: behaviorData,
            theme: 'grid',
            styles: { font: 'Helvetica', fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [190, 24, 74], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
              0: { halign: 'center', cellWidth: 10 },
              1: { halign: 'left' },
              2: { halign: 'center', cellWidth: 25 },
              3: { halign: 'center', cellWidth: 28 },
              4: { halign: 'center', cellWidth: 25 }
            }
          });
          behaviorTableEndY = (doc as any).lastAutoTable.finalY + 12;
        } else {
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text('Catatan perilaku bersih — Tidak ada pelanggaran kedisiplinan tercatat.', 15, 87);
          doc.setTextColor(0, 0, 0);
          behaviorTableEndY = 97;
        }

        // Fetch proctoring violations & snapshots
        let proctoringViolations: any[] = [];
        try {
          const res = await fetch(`/api/grademaster/data-center/student-violations?name=${encodeURIComponent(student.name)}`);
          if (res.ok) {
            const data = await res.json();
            proctoringViolations = data.violations || [];
          }
        } catch (err) {
          console.error("Failed to fetch proctoring snapshots:", err);
        }

        // 2. Exam Proctoring Violations Table
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Detail Pelanggaran Ujian Online (AI Proctoring)', 15, behaviorTableEndY);

        let proctoringTableEndY = behaviorTableEndY + 5;
        if (proctoringViolations.length > 0) {
          const tableBody = proctoringViolations.map((v, idx) => [
            idx + 1,
            v.subject,
            v.violationType,
            new Date(v.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            v.imageData ? 'Ada Bukti Foto' : 'Log Aktivitas'
          ]);

          autoTable(doc, {
            startY: behaviorTableEndY + 4,
            head: [['No', 'Mata Pelajaran', 'Indikasi Pelanggaran', 'Waktu Kejadian', 'Bukti']],
            body: tableBody,
            theme: 'grid',
            styles: { font: 'Helvetica', fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
              0: { halign: 'center', cellWidth: 10 },
              1: { halign: 'left' },
              2: { halign: 'left' },
              3: { halign: 'center', cellWidth: 40 },
              4: { halign: 'center', cellWidth: 35 }
            }
          });
          proctoringTableEndY = (doc as any).lastAutoTable.finalY + 12;
        } else {
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text('Tidak ditemukan indikasi pelanggaran selama ujian remedial berlangsung.', 15, behaviorTableEndY + 7);
          doc.setTextColor(0, 0, 0);
          proctoringTableEndY = behaviorTableEndY + 18;
        }

        // 3. Proctoring Evidence Photos (if any)
        const photosWithData = proctoringViolations.filter(v => v.imageData);
        if (photosWithData.length > 0) {
          doc.addPage();
          doc.setDrawColor(190, 24, 74);
          doc.setLineWidth(0.5);
          doc.rect(10, 10, 190, 277);

          doc.setFont("Times", "bold");
          doc.setFontSize(14);
          doc.setTextColor(190, 24, 74);
          doc.text('LAMPIRAN BUKTI VISUAL PELANGGARAN PROCTORING AI', 105, 20, { align: 'center' });
          
          doc.setLineWidth(0.5);
          doc.line(14, 25, 196, 25);
          doc.setTextColor(0, 0, 0);

          let startX = 20;
          let startY = 32;
          let col = 0;

          for (const photo of photosWithData.slice(0, 4)) { // limit to 4 photos per student in bulk
            try {
              doc.setDrawColor(200, 200, 200);
              doc.rect(startX, startY, 78, 62);
              doc.addImage(photo.imageData, 'JPEG', startX + 2, startY + 2, 74, 48);

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(8);
              doc.text(`${photo.violationType}`, startX + 4, startY + 54);
              doc.setFont("Helvetica", "normal");
              doc.setFontSize(7);
              doc.text(`Mapel: ${photo.subject}`, startX + 4, startY + 57);
              doc.text(`Waktu: ${new Date(photo.createdAt).toLocaleString('id-ID')}`, startX + 4, startY + 60);

              col++;
              if (col % 2 === 0) {
                startX = 20;
                startY += 70;
              } else {
                startX = 112;
              }
            } catch (err) {
              console.error("Failed to add violation image to PDF:", err);
            }
          }
          proctoringTableEndY = startY + 75;
        }

        if (proctoringTableEndY > 265 && photosWithData.length === 0) {
          doc.addPage();
          doc.rect(10, 10, 190, 277);
          proctoringTableEndY = 30;
        }

        doc.setFont("Helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Sumber dari OSIS SMP Terpadu Al-Ittihadiyah Masa Bakti 2025/2026', 15, proctoringTableEndY);

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Dokumen ini dicetak otomatis oleh GradeMaster OS pada ${new Date().toLocaleDateString('id-ID')}`, 105, 280, { align: 'center' });
      }

      doc.save(`Laporan_Pelanggaran_Kelas_${className}.pdf`);
      setToast({ message: `Berhasil mengunduh Laporan Pelanggaran kelas ${className}!`, type: 'success' });
    } catch (err: any) {
      setToast({ message: `Gagal membuat PDF kelas: ${err.message}`, type: 'error' });
    } finally {
      setIsDownloadingClassBehaviorPdf(false);
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
                 <>
                   <button 
                     onClick={() => generateClassAcademicPdfReport(filteredStudents, selectedClass)}
                     disabled={isDownloadingClassAcademicPdf}
                     className="px-4 py-3 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 border border-emerald-500/20 active:scale-95 disabled:opacity-50"
                     title="Unduh seluruh Rapor Akademik kelas ini"
                   >
                      {isDownloadingClassAcademicPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} 
                      Rapor Akademik {selectedClass}
                   </button>
                   <button 
                     onClick={() => generateClassBehaviorPdfReport(filteredStudents, selectedClass)}
                     disabled={isDownloadingClassBehaviorPdf}
                     className="px-4 py-3 bg-rose-500/10 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 border border-rose-500/20 active:scale-95 disabled:opacity-50"
                     title="Unduh seluruh Laporan Pelanggaran kelas ini"
                   >
                      {isDownloadingClassBehaviorPdf ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />} 
                      Laporan Pelanggaran {selectedClass}
                   </button>
                 </>
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
                              onClick={() => generateAcademicPdfReport(s)}
                              disabled={downloadingAcademicId === s.id}
                              className="p-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors active:scale-90 disabled:opacity-50"
                              title="Unduh Rapor Akademik"
                            >
                              {downloadingAcademicId === s.id ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                            </button>
                            <button 
                              onClick={() => generateBehaviorPdfReport(s)}
                              disabled={downloadingBehaviorId === s.id}
                              className="p-2 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors active:scale-90 disabled:opacity-50"
                              title="Unduh Laporan Pelanggaran Lengkap"
                            >
                              {downloadingBehaviorId === s.id ? <Loader2 size={18} className="animate-spin" /> : <AlertTriangle size={18} />}
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
