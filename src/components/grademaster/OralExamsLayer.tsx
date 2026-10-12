"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Search, CheckCircle2, 
  Download, Printer, Plus, 
  Trash2, AlertCircle, Save, BookOpen, 
  Layers, CheckSquare, Square,
  X, ChevronRight, Check, Loader2
} from 'lucide-react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { 
  OralExamRecord, 
  OralExamTemplate, 
  calculateOralPredicate, 
  calculateChecklistScore, 
  ToastType 
} from '@/lib/grademaster/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface OralExamsLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  initialClass?: string;
}

interface StudentMaster {
  id: string;
  name: string;
  class_name: string;
  academic_year?: string;
  nisn?: string | null;
}

const AVAILABLE_CLASSES = ['7', '8A', '8B', '9A', '9B', '10', '11', '12'];
const ROOM_OPTIONS = ['Ruang 01', 'Ruang 02', 'Ruang 03', 'Ruang 04', 'Ruang 05', 'Ruang 06'];

export default function OralExamsLayer({ onBack, setToast, initialClass }: OralExamsLayerProps) {
  const { adminUser, academicYear: contextAcademicYear } = useGradeMaster();

  // Active Session Config
  const [selectedClass, setSelectedClass] = useState<string>(initialClass || '7');
  const [templateType, setTemplateType] = useState<OralExamTemplate>('BTQ_HAFALAN');
  const [sessionTitle, setSessionTitle] = useState<string>('Ujian Lisan Semester Ganjil 2026/2027');
  const [academicYear, setAcademicYear] = useState<string>(contextAcademicYear || '2026/2027');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [examinerName, setExaminerName] = useState<string>(adminUser || 'Ustadz / Ustadzah Penguji');
  const [roomNumber, setRoomNumber] = useState<string>('Ruang 01');
  const [examDate, setExamDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Derived Session ID
  const sessionId = useMemo(() => {
    const cleanClass = selectedClass.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanYear = academicYear.replace(/[^0-9]/g, '');
    const cleanSem = semester.toLowerCase();
    const cleanType = templateType === 'BTQ_HAFALAN' ? 'btq' : 'bahasa';
    return `oral_${cleanType}_${cleanClass}_${cleanYear}_${cleanSem}`;
  }, [selectedClass, academicYear, semester, templateType]);

  // Data States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [examRecords, setExamRecords] = useState<Record<string, OralExamRecord>>({});
  const [students, setStudents] = useState<StudentMaster[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GRADED' | 'UNGRADED'>('ALL');

  // Modal State for 15-Checklist Sheet (Template 2)
  const [checklistModal, setChecklistModal] = useState<{
    isOpen: boolean;
    studentId: string;
    studentName: string;
    subject: 'ENGLISH' | 'ARABIC';
    checklist: boolean[];
  } | null>(null);

  // Modal State for New Session Setup
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState<boolean>(false);

  // Load Students and Existing Scores for Selected Class and Session
  const loadClassData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Students of Selected Class from Accounts
      const studentsRes = await fetch(`/api/grademaster/student-accounts?class=${encodeURIComponent(selectedClass)}&year=${encodeURIComponent(academicYear)}`, { cache: 'no-store' });
      let studentList: StudentMaster[] = [];
      if (studentsRes.ok) {
        const studentData = await studentsRes.json();
        const rawAccounts = studentData.accounts || studentData.data || [];
        studentList = rawAccounts.map((a: { id: string; student_name: string; class_name: string; academic_year?: string; nisn?: string }) => ({
          id: a.id || a.student_name,
          name: a.student_name,
          class_name: a.class_name,
          academic_year: a.academic_year,
          nisn: a.nisn || null
        }));
      }

      // Fallback: If no accounts in student-accounts, try data-center
      if (studentList.length === 0) {
        const fallbackRes = await fetch('/api/grademaster/data-center/students', { cache: 'no-store' });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const filtered = (fallbackData.students || []).filter((s: { className: string }) => s.className === selectedClass);
          studentList = filtered.map((s: { id: string; name: string; className: string; academicYear: string }) => ({
            id: s.id,
            name: s.name,
            class_name: s.className,
            academic_year: s.academicYear
          }));
        }
      }

      // Sort students alphabetically
      studentList.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      setStudents(studentList);

      // 2. Fetch Existing Oral Exam Records for this Session
      const examsRes = await fetch(`/api/grademaster/oral-exams?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
      const recordMap: Record<string, OralExamRecord> = {};

      if (examsRes.ok) {
        const examsJson = await examsRes.json();
        const existingData: OralExamRecord[] = examsJson.data || [];
        for (const item of existingData) {
          recordMap[item.student_id] = item;
        }
      }

      // Initialize blanks for students who do not have a record yet
      for (const s of studentList) {
        if (!recordMap[s.id]) {
          recordMap[s.id] = {
            session_id: sessionId,
            template_type: templateType,
            title: sessionTitle,
            academic_year: academicYear,
            semester: semester,
            examiner_name: examinerName,
            room_number: roomNumber,
            class_name: selectedClass,
            exam_date: examDate,
            student_id: s.id,
            student_name: s.name,
            nisn: s.nisn || null,
            btq_score: null,
            btq_predicate: null,
            hafalan_score: null,
            hafalan_predicate: null,
            english_checklist: Array(15).fill(false),
            english_correct_count: 0,
            english_score: null,
            english_predicate: null,
            arabic_checklist: Array(15).fill(false),
            arabic_correct_count: 0,
            arabic_score: null,
            arabic_predicate: null,
            notes: null
          };
        }
      }

      setExamRecords(recordMap);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('[OralExams] Error loading class data:', err);
      setToast({ message: 'Gagal memuat data siswa kelas ' + selectedClass, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, academicYear, sessionId, templateType, sessionTitle, semester, examinerName, roomNumber, examDate, setToast]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  // Update Score Handler for Template 1 (BTQ & Hafalan)
  const handleScoreChange = (studentId: string, field: 'btq_score' | 'hafalan_score', value: string) => {
    const num = value === '' ? null : Math.min(100, Math.max(0, Number(value)));
    const predicateField = field === 'btq_score' ? 'btq_predicate' : 'hafalan_predicate';
    const pred = num !== null ? calculateOralPredicate(num) : null;

    setExamRecords(prev => {
      const current = prev[studentId];
      if (!current) return prev;
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: num,
          [predicateField]: pred
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  // Update Notes Handler
  const handleNotesChange = (studentId: string, notes: string) => {
    setExamRecords(prev => {
      const current = prev[studentId];
      if (!current) return prev;
      return {
        ...prev,
        [studentId]: {
          ...current,
          notes: notes || null
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  // Save Checklist from Modal for Template 2 (Bahasa Inggris & Bahasa Arab)
  const handleSaveChecklist = (studentId: string, subject: 'ENGLISH' | 'ARABIC', checklist: boolean[]) => {
    const count = checklist.filter(Boolean).length;
    const score = calculateChecklistScore(count);
    const predicate = calculateOralPredicate(score);

    setExamRecords(prev => {
      const current = prev[studentId];
      if (!current) return prev;
      if (subject === 'ENGLISH') {
        return {
          ...prev,
          [studentId]: {
            ...current,
            english_checklist: checklist,
            english_correct_count: count,
            english_score: score,
            english_predicate: predicate
          }
        };
      } else {
        return {
          ...prev,
          [studentId]: {
            ...current,
            arabic_checklist: checklist,
            arabic_correct_count: count,
            arabic_score: score,
            arabic_predicate: predicate
          }
        };
      }
    });
    setHasUnsavedChanges(true);
    setChecklistModal(null);
  };

  // Batch Save to Server
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const recordsToSave = Object.values(examRecords).map(r => ({
        ...r,
        session_id: sessionId,
        template_type: templateType,
        title: sessionTitle,
        academic_year: academicYear,
        semester: semester,
        examiner_name: examinerName,
        room_number: roomNumber,
        class_name: selectedClass,
        exam_date: examDate
      }));

      const res = await fetch('/api/grademaster/oral-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recordsToSave })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan nilai ujian lisan');
      }

      setHasUnsavedChanges(false);
      setToast({ message: `Berhasil menyimpan nilai ujian lisan Kelas ${selectedClass}!`, type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Statistics Calculation
  const stats = useMemo(() => {
    const list = Object.values(examRecords);
    const total = list.length;
    let graded = 0;
    let totalScoreSum = 0;
    let totalScoresCount = 0;
    const predicateCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

    for (const r of list) {
      if (templateType === 'BTQ_HAFALAN') {
        const hasBtq = r.btq_score !== null && r.btq_score !== undefined;
        const hasHafalan = r.hafalan_score !== null && r.hafalan_score !== undefined;
        if (hasBtq || hasHafalan) graded += 1;

        if (hasBtq) {
          totalScoreSum += Number(r.btq_score);
          totalScoresCount += 1;
          if (r.btq_predicate) predicateCounts[r.btq_predicate] = (predicateCounts[r.btq_predicate] || 0) + 1;
        }
        if (hasHafalan) {
          totalScoreSum += Number(r.hafalan_score);
          totalScoresCount += 1;
          if (r.hafalan_predicate) predicateCounts[r.hafalan_predicate] = (predicateCounts[r.hafalan_predicate] || 0) + 1;
        }
      } else {
        const hasEng = r.english_score !== null && r.english_score !== undefined;
        const hasAr = r.arabic_score !== null && r.arabic_score !== undefined;
        if (hasEng || hasAr) graded += 1;

        if (hasEng) {
          totalScoreSum += Number(r.english_score);
          totalScoresCount += 1;
          if (r.english_predicate) predicateCounts[r.english_predicate] = (predicateCounts[r.english_predicate] || 0) + 1;
        }
        if (hasAr) {
          totalScoreSum += Number(r.arabic_score);
          totalScoresCount += 1;
          if (r.arabic_predicate) predicateCounts[r.arabic_predicate] = (predicateCounts[r.arabic_predicate] || 0) + 1;
        }
      }
    }

    const averageScore = totalScoresCount > 0 ? (totalScoreSum / totalScoresCount).toFixed(1) : '0';
    return {
      total,
      graded,
      ungraded: total - graded,
      averageScore,
      predicateCounts
    };
  }, [examRecords, templateType]);

  // Filtered Student List
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const r = examRecords[s.id];
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const isGraded = templateType === 'BTQ_HAFALAN'
        ? (r?.btq_score !== null && r?.btq_score !== undefined) || (r?.hafalan_score !== null && r?.hafalan_score !== undefined)
        : (r?.english_score !== null && r?.english_score !== undefined) || (r?.arabic_score !== null && r?.arabic_score !== undefined);

      if (statusFilter === 'GRADED') return isGraded;
      if (statusFilter === 'UNGRADED') return !isGraded;
      return true;
    });
  }, [students, examRecords, searchQuery, statusFilter, templateType]);

  // Export Official PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Header Kop Sekolah
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('SMP TERPADU AL-ITTIHADIYAH', 105, 16, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('Helvetica', 'normal');
      doc.text('LEMBAR PENILAIAN RESMI UJIAN LISAN SANTRI / SISWA', 105, 22, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`${sessionTitle.toUpperCase()} - TAHUN AJARAN ${academicYear}`, 105, 27, { align: 'center' });

      // Garis Pembatas Kop
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.6);
      doc.line(14, 30, 196, 30);
      doc.setLineWidth(0.2);
      doc.line(14, 31, 196, 31);

      // Metadata Info Box
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Kelas / Ruang: Kelas ${selectedClass} / ${roomNumber}`, 14, 38);
      doc.text(`Format Template: ${templateType === 'BTQ_HAFALAN' ? 'BTQ & Tahfidz (Hafalan)' : 'Bahasa Inggris & Bahasa Arab'}`, 14, 43);
      doc.text(`Semester / Tanggal: ${semester} / ${examDate}`, 125, 38);
      doc.text(`Penguji: ${examinerName}`, 125, 43);

      // Build Table Data
      if (templateType === 'BTQ_HAFALAN') {
        const headers = [['No', 'Nama Siswa', 'BTQ', 'Pred', 'Hafalan', 'Pred', 'Rata-rata', 'Catatan Penguji']];
        const rows = students.map((s, idx) => {
          const r = examRecords[s.id];
          const btq = r?.btq_score !== null && r?.btq_score !== undefined ? Number(r.btq_score).toFixed(0) : '-';
          const btqPred = r?.btq_predicate || '-';
          const haf = r?.hafalan_score !== null && r?.hafalan_score !== undefined ? Number(r.hafalan_score).toFixed(0) : '-';
          const hafPred = r?.hafalan_predicate || '-';
          
          let avg = '-';
          if (r?.btq_score !== null && r?.hafalan_score !== null && r?.btq_score !== undefined && r?.hafalan_score !== undefined) {
            avg = ((Number(r.btq_score) + Number(r.hafalan_score)) / 2).toFixed(1);
          } else if (r?.btq_score !== null && r?.btq_score !== undefined) {
            avg = Number(r.btq_score).toFixed(0);
          } else if (r?.hafalan_score !== null && r?.hafalan_score !== undefined) {
            avg = Number(r.hafalan_score).toFixed(0);
          }

          return [
            idx + 1,
            s.name,
            btq,
            btqPred,
            haf,
            hafPred,
            avg,
            r?.notes || '-'
          ];
        });

        autoTable(doc, {
          startY: 48,
          head: headers,
          body: rows,
          theme: 'grid',
          styles: { font: 'Helvetica', fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 14 },
            3: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
            4: { halign: 'center', cellWidth: 16 },
            5: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
            6: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
            7: { halign: 'left', cellWidth: 42 }
          }
        });
      } else {
        const headers = [['No', 'Nama Siswa', 'B. Inggris (15)', 'Nilai', 'Pred', 'B. Arab (15)', 'Nilai', 'Pred', 'Rata-rata', 'Catatan']];
        const rows = students.map((s, idx) => {
          const r = examRecords[s.id];
          const engCount = r?.english_correct_count ?? 0;
          const engScore = r?.english_score !== null && r?.english_score !== undefined ? Number(r.english_score).toFixed(0) : '-';
          const engPred = r?.english_predicate || '-';
          
          const arCount = r?.arabic_correct_count ?? 0;
          const arScore = r?.arabic_score !== null && r?.arabic_score !== undefined ? Number(r.arabic_score).toFixed(0) : '-';
          const arPred = r?.arabic_predicate || '-';

          let avg = '-';
          if (r?.english_score !== null && r?.arabic_score !== null && r?.english_score !== undefined && r?.arabic_score !== undefined) {
            avg = ((Number(r.english_score) + Number(r.arabic_score)) / 2).toFixed(1);
          } else if (r?.english_score !== null && r?.english_score !== undefined) {
            avg = Number(r.english_score).toFixed(0);
          } else if (r?.arabic_score !== null && r?.arabic_score !== undefined) {
            avg = Number(r.arabic_score).toFixed(0);
          }

          return [
            idx + 1,
            s.name,
            `${engCount}/15`,
            engScore,
            engPred,
            `${arCount}/15`,
            arScore,
            arPred,
            avg,
            r?.notes || '-'
          ];
        });

        autoTable(doc, {
          startY: 48,
          head: headers,
          body: rows,
          theme: 'grid',
          styles: { font: 'Helvetica', fontSize: 7.5, cellPadding: 2 },
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 18 },
            3: { halign: 'center', cellWidth: 12 },
            4: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
            5: { halign: 'center', cellWidth: 18 },
            6: { halign: 'center', cellWidth: 12 },
            7: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
            8: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
            9: { halign: 'left', cellWidth: 32 }
          }
        });
      }

      // Lembar Tanda Tangan Penguji di Bagian Bawah
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      const signatureY = finalY > 240 ? 250 : finalY;

      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`Mengetahui,`, 140, signatureY);
      doc.text(`Penguji Ujian Lisan`, 140, signatureY + 5);
      doc.text(`(...................................................)`, 140, signatureY + 24);
      doc.text(`NIP / Nama: ${examinerName}`, 140, signatureY + 29);

      doc.save(`Ujian_Lisan_Kelas_${selectedClass}_${academicYear.replace('/', '_')}.pdf`);
      setToast({ message: 'Berhasil mengunduh dokumen resmi PDF', type: 'success' });
    } catch (err) {
      console.error('[Export PDF error]:', err);
      setToast({ message: 'Gagal mencetak dokumen PDF', type: 'error' });
    }
  };

  // Export Excel Spreadsheet
  const handleExportExcel = () => {
    try {
      const excelRows = students.map((s, idx) => {
        const r = examRecords[s.id];
        if (templateType === 'BTQ_HAFALAN') {
          return {
            No: idx + 1,
            'Nama Siswa': s.name,
            'Kelas': selectedClass,
            'Tahun Ajaran': academicYear,
            'Semester': semester,
            'Nilai BTQ': r?.btq_score ?? '',
            'Predikat BTQ': r?.btq_predicate ?? '',
            'Nilai Hafalan': r?.hafalan_score ?? '',
            'Predikat Hafalan': r?.hafalan_predicate ?? '',
            'Catatan Penguji': r?.notes ?? '',
            'Penguji': examinerName,
            'Tanggal': examDate
          };
        } else {
          return {
            No: idx + 1,
            'Nama Siswa': s.name,
            'Kelas': selectedClass,
            'Tahun Ajaran': academicYear,
            'Semester': semester,
            'Inggris Benar (0-15)': r?.english_correct_count ?? 0,
            'Nilai B. Inggris': r?.english_score ?? '',
            'Predikat Inggris': r?.english_predicate ?? '',
            'Arab Benar (0-15)': r?.arabic_correct_count ?? 0,
            'Nilai B. Arab': r?.arabic_score ?? '',
            'Predikat Arab': r?.arabic_predicate ?? '',
            'Catatan Penguji': r?.notes ?? '',
            'Penguji': examinerName,
            'Tanggal': examDate
          };
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Ujian Lisan ${selectedClass}`);
      XLSX.writeFile(workbook, `Rekap_Ujian_Lisan_${selectedClass}_${academicYear.replace('/', '_')}.xlsx`);
      setToast({ message: 'Berhasil mengekspor rekapitulasi Excel', type: 'success' });
    } catch (err) {
      console.error('[Export Excel error]:', err);
      setToast({ message: 'Gagal mengekspor berkas Excel', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
              title="Kembali ke Beranda"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                  SMP Terpadu Al-Ittihadiyah
                </span>
                <span className="text-xs text-slate-400 font-semibold">•</span>
                <span className="text-xs font-semibold text-slate-600">
                  {academicYear} ({semester})
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-outfit">
                Penilaian Ujian Lisan: {templateType === 'BTQ_HAFALAN' ? 'BTQ & Hafalan (Tahfidz)' : 'Bahasa Inggris & Bahasa Arab'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewSessionModalOpen(true)}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 min-h-[44px] cursor-pointer"
            >
              <Plus size={16} />
              <span>Ganti / Buat Sesi</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 min-h-[44px] cursor-pointer"
              title="Cetak Berita Acara PDF Resmi"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Cetak PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="py-2.5 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 min-h-[44px] cursor-pointer"
              title="Ekspor Rekap Excel"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-2 min-h-[44px] shadow-sm cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin text-slate-300" /> : <Save size={16} />}
              <span>{isSaving ? 'Menyimpan...' : hasUnsavedChanges ? 'Simpan Perubahan' : 'Tersimpan'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Class and Session Metadata Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Kelas:</span>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_CLASSES.map(cls => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      if (hasUnsavedChanges && !window.confirm('Ada perubahan nilai yang belum disimpan. Pindah kelas?')) return;
                      setSelectedClass(cls);
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all min-h-[38px] ${
                      selectedClass === cls
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedChanges && !window.confirm('Ada perubahan nilai yang belum disimpan. Ganti template?')) return;
                  setTemplateType('BTQ_HAFALAN');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 min-h-[38px] ${
                  templateType === 'BTQ_HAFALAN'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen size={14} />
                <span>BTQ & Hafalan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedChanges && !window.confirm('Ada perubahan nilai yang belum disimpan. Ganti template?')) return;
                  setTemplateType('BAHASA_INGGRIS_ARAB');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 min-h-[38px] ${
                  templateType === 'BAHASA_INGGRIS_ARAB'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers size={14} />
                <span>B. Inggris & Arab</span>
              </button>
            </div>
          </div>

          <div className="text-left md:text-right text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">Penguji:</span> {examinerName} ({roomNumber}) • <span className="font-bold text-slate-800">Tanggal:</span> {examDate}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Santri</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-outfit">{stats.total}</span>
              <span className="text-xs text-slate-500 font-medium">Siswa</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Sudah Dinilai</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 font-outfit">{stats.graded}</span>
              <span className="text-xs text-slate-400 font-medium">/ {stats.total}</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">Rata-rata Skor</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-700 font-outfit">{stats.averageScore}</span>
              <span className="text-xs text-slate-400 font-medium">skala 100</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Distribusi Predikat</span>
            <div className="flex items-center gap-1.5 text-xs font-bold pt-1">
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">A: {stats.predicateCounts.A || 0}</span>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">B: {stats.predicateCounts.B || 0}</span>
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">C: {stats.predicateCounts.C || 0}</span>
              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded">D: {stats.predicateCounts.D || 0}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama santri/siswa..."
              className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('UNGRADED')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                statusFilter === 'UNGRADED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Belum ({stats.ungraded})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('GRADED')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                statusFilter === 'GRADED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Selesai ({stats.graded})
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Memuat Data Siswa Kelas {selectedClass}...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <AlertCircle size={32} className="text-slate-400" />
              <p className="text-sm font-bold text-slate-700">Tidak ada santri/siswa yang cocok</p>
              <p className="text-xs text-slate-400">Pastikan akun siswa kelas {selectedClass} sudah terdaftar di database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-4 min-w-[160px]">Nama Siswa</th>
                    {templateType === 'BTQ_HAFALAN' ? (
                      <>
                        <th className="py-3 px-3 text-center w-28">Nilai BTQ</th>
                        <th className="py-3 px-3 text-center w-20">Predikat</th>
                        <th className="py-3 px-3 text-center w-28">Nilai Hafalan</th>
                        <th className="py-3 px-3 text-center w-20">Predikat</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-3 text-center min-w-[140px]">B. Inggris (15 Butir)</th>
                        <th className="py-3 px-3 text-center w-20">Predikat</th>
                        <th className="py-3 px-3 text-center min-w-[140px]">B. Arab (15 Butir)</th>
                        <th className="py-3 px-3 text-center w-20">Predikat</th>
                      </>
                    )}
                    <th className="py-3 px-4 min-w-[200px]">Catatan Penguji</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredStudents.map((s, idx) => {
                    const r = examRecords[s.id] || {};
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 leading-tight">{s.name}</p>
                          {s.nisn && <p className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn}</p>}
                        </td>

                        {templateType === 'BTQ_HAFALAN' ? (
                          <>
                            {/* Input Nilai BTQ */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={r.btq_score !== null && r.btq_score !== undefined ? r.btq_score : ''}
                                onChange={(e) => handleScoreChange(s.id, 'btq_score', e.target.value)}
                                placeholder="0-100"
                                className="w-20 mx-auto px-2 py-1.5 text-center font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 min-h-[36px]"
                              />
                            </td>
                            {/* Predikat BTQ */}
                            <td className="py-2.5 px-3 text-center">
                              {r.btq_predicate ? (
                                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-black ${
                                  r.btq_predicate === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                  r.btq_predicate === 'B' ? 'bg-blue-100 text-blue-800' :
                                  r.btq_predicate === 'C' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {r.btq_predicate}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            {/* Input Nilai Hafalan */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={r.hafalan_score !== null && r.hafalan_score !== undefined ? r.hafalan_score : ''}
                                onChange={(e) => handleScoreChange(s.id, 'hafalan_score', e.target.value)}
                                placeholder="0-100"
                                className="w-20 mx-auto px-2 py-1.5 text-center font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 min-h-[36px]"
                              />
                            </td>
                            {/* Predikat Hafalan */}
                            <td className="py-2.5 px-3 text-center">
                              {r.hafalan_predicate ? (
                                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-black ${
                                  r.hafalan_predicate === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                  r.hafalan_predicate === 'B' ? 'bg-blue-100 text-blue-800' :
                                  r.hafalan_predicate === 'C' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {r.hafalan_predicate}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Checklist Bahasa Inggris */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setChecklistModal({
                                    isOpen: true,
                                    studentId: s.id,
                                    studentName: s.name,
                                    subject: 'ENGLISH',
                                    checklist: Array.isArray(r.english_checklist) && r.english_checklist.length === 15 
                                      ? [...r.english_checklist] 
                                      : Array(15).fill(false)
                                  });
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 rounded-lg border border-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 mx-auto min-h-[36px] cursor-pointer"
                              >
                                <CheckSquare size={14} className="text-indigo-600" />
                                <span>{r.english_correct_count ?? 0}/15 ({r.english_score !== null && r.english_score !== undefined ? r.english_score : '-'})</span>
                              </button>
                            </td>
                            {/* Predikat Inggris */}
                            <td className="py-2.5 px-3 text-center">
                              {r.english_predicate ? (
                                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-black ${
                                  r.english_predicate === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                  r.english_predicate === 'B' ? 'bg-blue-100 text-blue-800' :
                                  r.english_predicate === 'C' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {r.english_predicate}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Checklist Bahasa Arab */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setChecklistModal({
                                    isOpen: true,
                                    studentId: s.id,
                                    studentName: s.name,
                                    subject: 'ARABIC',
                                    checklist: Array.isArray(r.arabic_checklist) && r.arabic_checklist.length === 15 
                                      ? [...r.arabic_checklist] 
                                      : Array(15).fill(false)
                                  });
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-800 rounded-lg border border-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 mx-auto min-h-[36px] cursor-pointer"
                              >
                                <CheckSquare size={14} className="text-emerald-600" />
                                <span>{r.arabic_correct_count ?? 0}/15 ({r.arabic_score !== null && r.arabic_score !== undefined ? r.arabic_score : '-'})</span>
                              </button>
                            </td>
                            {/* Predikat Arab */}
                            <td className="py-2.5 px-3 text-center">
                              {r.arabic_predicate ? (
                                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-black ${
                                  r.arabic_predicate === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                  r.arabic_predicate === 'B' ? 'bg-blue-100 text-blue-800' :
                                  r.arabic_predicate === 'C' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {r.arabic_predicate}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </>
                        )}

                        {/* Catatan / Catatan Penguji */}
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={r.notes || ''}
                            onChange={(e) => handleNotesChange(s.id, e.target.value)}
                            placeholder="Catatan kelancaran, makhraj, tajwid..."
                            className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-600 min-h-[36px]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Checklist 15 Butir Soal Lisan (Template 2) */}
      {checklistModal && checklistModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  checklistModal.subject === 'ENGLISH' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {checklistModal.subject === 'ENGLISH' ? 'Bahasa Inggris' : 'Bahasa Arab'} • 15 Butir Lisan
                </span>
                <h3 className="text-base font-black text-slate-900 font-outfit mt-1">
                  {checklistModal.studentName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setChecklistModal(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors min-h-[36px] min-w-[36px] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Skor Realtime Counter */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Jawaban Benar</p>
                <p className="text-xl font-black text-slate-900 font-outfit">
                  {checklistModal.checklist.filter(Boolean).length} <span className="text-xs text-slate-400 font-medium">/ 15 Soal</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Nilai Akhir</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-indigo-700 font-outfit">
                    {calculateChecklistScore(checklistModal.checklist.filter(Boolean).length)}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-black bg-indigo-100 text-indigo-800">
                    Predikat {calculateOralPredicate(calculateChecklistScore(checklistModal.checklist.filter(Boolean).length))}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setChecklistModal(prev => prev ? { ...prev, checklist: Array(15).fill(true) } : null);
                }}
                className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 min-h-[38px] cursor-pointer"
              >
                <Check size={14} />
                <span>Pilih Semua (15)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setChecklistModal(prev => prev ? { ...prev, checklist: Array(15).fill(false) } : null);
                }}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 min-h-[38px] cursor-pointer"
              >
                <X size={14} />
                <span>Batal Semua (0)</span>
              </button>
            </div>

            {/* 15 Checklist Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1 border border-slate-100 rounded-xl">
              {checklistModal.checklist.map((isChecked, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setChecklistModal(prev => {
                      if (!prev) return null;
                      const nextArr = [...prev.checklist];
                      nextArr[i] = !nextArr[i];
                      return { ...prev, checklist: nextArr };
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 min-h-[52px] cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider">Butir</span>
                  <span className="text-sm font-black">{i + 1}</span>
                </button>
              ))}
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setChecklistModal(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl min-h-[44px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveChecklist(checklistModal.studentId, checklistModal.subject, checklistModal.checklist)}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl min-h-[44px] shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Simpan Nilai Lembar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ganti atau Buat Sesi Ujian Lisan */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-5 sm:p-6 space-y-4 animate-in fade-in duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 font-outfit">
                Pengaturan Sesi Pengujian Lisan
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors min-h-[36px] min-w-[36px] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Sesi Ujian</label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 min-h-[44px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Guru Penguji</label>
                <input
                  type="text"
                  value={examinerName}
                  onChange={(e) => setExaminerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ruang Ujian</label>
                  <select
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 min-h-[44px]"
                  >
                    {ROOM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Ujian</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 min-h-[44px]"
                  >
                  </input>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value as 'Ganjil' | 'Genap')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 min-h-[44px]"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl min-h-[44px] cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNewSessionModalOpen(false);
                  loadClassData();
                }}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl min-h-[44px] shadow-sm cursor-pointer"
              >
                Terapkan Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
