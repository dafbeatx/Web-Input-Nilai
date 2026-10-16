"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  DownloadCloud,
  Eye,
  AlertCircle,
  Send,
  Loader2,
  RotateCcw,
  Sparkles,
  Users,
  Search,
  Printer,
  ChevronRight
} from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';
import { CertificateTemplate } from '@/app/api/grademaster/certificates/route';
import {
  generateLdksCertificatePdf,
  generateBatchLdksCertificatesPdf,
  formatCertificateStudentName,
} from '@/lib/grademaster/certificateGenerator';

interface CertificateManagementLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  academicYear?: string;
}

interface StudentRecord {
  id: string;
  name: string;
  className: string;
  academicYear: string;
}

const TARGET_ACADEMIC_YEAR = '2026/2027';

// Filter out SMA classes: only keep SMP classes (e.g. 7, 8, 8A, 8B, 9, 9A, 9B)
const isSmpClass = (cls: string): boolean => {
  const upper = (cls || '').trim().toUpperCase();
  if (!upper) return false;
  if (upper === 'SMA' || upper.startsWith('SMA')) return false;
  if (/^(10|11|12|X|XI|XII)($|[^0-9])/i.test(upper)) return false;
  return true;
};

export default function CertificateManagementLayer({
  onBack,
  setToast,
}: CertificateManagementLayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [downloadingSingleId, setDownloadingSingleId] = useState<string | null>(null);

  // Template state
  const [template, setTemplate] = useState<CertificateTemplate>({
    cert_type: 'LDKS',
    title: 'SERTIFIKAT PENGHARGAAN',
    subtitle: 'Latihan Dasar Kepemimpinan Siswa (LDKS)',
    cert_number_prefix: '042/LDKS-SMP/X/2026',
    citation: 'Diberikan dengan penuh apresiasi kepada:',
    description:
      'Sebagai Peserta Latihan Dasar Kepemimpinan Siswa (LDKS) SMP Terpadu Al-Ittihadiyah Tahun 2026 yang diselenggarakan pada tanggal 14-15 Oktober 2026.',
    city: 'Bogor',
    issue_date: '15 Oktober 2026',
    signer1_role: 'Ketua Pelaksana LDKS',
    signer1_name: 'Septi Nur Aeni, S.E',
    signer2_role: 'Kepala Sekolah',
    signer2_name: 'Farhan Sopian Sahid, S.Pd.I',
    academic_year: TARGET_ACADEMIC_YEAR,
    target_class: 'ALL',
    is_published: false,
  });

  // Students from Pusat Data
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassTab, setSelectedClassTab] = useState<string>('ALL');

  // Currently previewed student
  const [previewStudent, setPreviewStudent] = useState<StudentRecord>({
    id: 'sample',
    name: 'MUHAMMAD RIZKY PRATAMA',
    className: '7',
    academicYear: TARGET_ACADEMIC_YEAR,
  });

  // 1. Load Certificate Template
  useEffect(() => {
    let isMounted = true;
    const fetchTemplate = async () => {
      try {
        const res = await fetch('/api/grademaster/certificates?type=LDKS');
        if (res.ok) {
          const data = await res.json();
          if (data.template && isMounted) {
            setTemplate((prev) => ({
              ...prev,
              ...data.template,
              academic_year: TARGET_ACADEMIC_YEAR,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load certificate template:', err);
      }
    };

    fetchTemplate();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Students from Pusat Data (Academic Year 2026/2027 ONLY, SMP ONLY)
  useEffect(() => {
    let isMounted = true;
    const fetchPusatDataStudents = async () => {
      setIsLoading(true);
      try {
        // Fetch from Data Center API
        const res = await fetch('/api/grademaster/data-center/students');
        let rawList: Array<{ id?: string; name?: string; className?: string; academicYear?: string }> = [];

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.students)) {
            rawList = data.students;
          }
        }

        // Fallback / direct behaviors API if needed
        if (rawList.length === 0) {
          const behRes = await fetch(`/api/grademaster/behaviors?class=Semua Kelas&year=${encodeURIComponent(TARGET_ACADEMIC_YEAR)}`);
          if (behRes.ok) {
            const bData = await behRes.json();
            const recs = bData.students || bData.data || [];
            if (Array.isArray(recs)) {
              rawList = recs.map((r: { id?: string; student_name?: string; class_name?: string; academic_year?: string }) => ({
                id: r.id,
                name: r.student_name,
                className: r.class_name,
                academicYear: r.academic_year || TARGET_ACADEMIC_YEAR,
              }));
            }
          }
        }

        // Strictly filter to Academic Year 2026/2027 and SMP classes (No SMA)
        const smp2026List: StudentRecord[] = rawList
          .filter((s) => s.academicYear === TARGET_ACADEMIC_YEAR && isSmpClass(s.className || ''))
          .map((s, idx) => ({
            id: s.id || `smp_${idx}_${s.name}`,
            name: (s.name || '').trim(),
            className: (s.className || '7').trim(),
            academicYear: TARGET_ACADEMIC_YEAR,
          }))
          .sort((a, b) => {
            const classCompare = a.className.localeCompare(b.className, undefined, { numeric: true });
            if (classCompare !== 0) return classCompare;
            return a.name.localeCompare(b.name);
          });

        if (isMounted) {
          setStudents(smp2026List);
          if (smp2026List.length > 0) {
            setPreviewStudent(smp2026List[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load students from Pusat Data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPusatDataStudents();
    return () => {
      isMounted = false;
    };
  }, []);

  // Distinct SMP classes available
  const availableClasses = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.className))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [students]);

  // Students by Class counts
  const studentCountByClass = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      counts[s.className] = (counts[s.className] || 0) + 1;
    });
    return counts;
  }, [students]);

  // Filtered Students for the Table
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClassTab === 'ALL' || s.className === selectedClassTab;
      const matchSearch =
        searchQuery.trim() === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [students, selectedClassTab, searchQuery]);

  // Preview student formatted print name
  const previewFormattedName = useMemo(() => {
    return formatCertificateStudentName(previewStudent.name, 22);
  }, [previewStudent.name]);

  // Toggle Publish Status
  const handleTogglePublish = async () => {
    setIsSaving(true);
    const newStatus = !template.is_published;
    try {
      const payload: CertificateTemplate = {
        ...template,
        target_class: 'ALL',
        is_published: newStatus,
        academic_year: TARGET_ACADEMIC_YEAR,
      };

      const res = await fetch('/api/grademaster/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan status sertifikat');

      setTemplate((prev) => ({
        ...prev,
        ...data.template,
      }));

      setToast({
        message: newStatus
          ? 'Sertifikat LDKS resmi diterbitkan ke seluruh siswa SMP (2026/2027)!'
          : 'Sertifikat ditarik ke status Draf (siswa tidak dapat mengunduh).',
        type: 'success',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan';
      setToast({ message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Download Single Student PDF
  const handleDownloadSingle = async (student: StudentRecord) => {
    setDownloadingSingleId(student.id);
    try {
      const doc = await generateLdksCertificatePdf(template, {
        studentName: student.name,
        className: student.className,
        academicYear: TARGET_ACADEMIC_YEAR,
      });

      const safePrintName = formatCertificateStudentName(student.name, 22).replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Sertifikat_LDKS_${safePrintName}_Kelas_${student.className}.pdf`);
      setToast({
        message: `Sertifikat untuk ${student.name} berhasil diunduh (PDF)`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to download single certificate:', err);
      setToast({ message: 'Gagal membuat file PDF', type: 'error' });
    } finally {
      setDownloadingSingleId(null);
    }
  };

  // Batch Download: All SMP Students or Filtered Class
  const handleBatchDownload = async (targetScope: 'ALL' | string) => {
    const listToDownload = targetScope === 'ALL'
      ? students
      : students.filter((s) => s.className === targetScope);

    if (listToDownload.length === 0) {
      setToast({ message: 'Tidak ada data siswa untuk diunduh', type: 'error' });
      return;
    }

    const label = targetScope === 'ALL' ? 'Semua Siswa SMP' : `Kelas ${targetScope}`;
    setBatchProgress({ current: 0, total: listToDownload.length, label });

    try {
      const studentInfos = listToDownload.map((s) => ({
        studentName: s.name,
        className: s.className,
        academicYear: TARGET_ACADEMIC_YEAR,
      }));

      const doc = await generateBatchLdksCertificatesPdf(template, studentInfos, (current, total) => {
        setBatchProgress({ current, total, label });
      });

      const fileName = targetScope === 'ALL'
        ? `Sertifikat_LDKS_SMP_2026-2027_SEMUA_${listToDownload.length}_SISWA.pdf`
        : `Sertifikat_LDKS_SMP_Kelas_${targetScope}_2026-2027.pdf`;

      doc.save(fileName);
      setToast({
        message: `Berhasil mengunduh 1 berkas PDF lengkap (${listToDownload.length} halaman) untuk ${label}!`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to generate batch certificates:', err);
      setToast({ message: 'Gagal membuat berkas PDF gabungan', type: 'error' });
    } finally {
      setBatchProgress(null);
    }
  };

  return (
    <main className="min-h-dvh p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto page-pt md:pt-16 pb-24 font-outfit bg-transparent">
      {/* Top Header */}
      <header className="mb-6 md:mb-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary font-sans text-xs font-bold uppercase tracking-wider transition-all mb-4 bg-surface-variant px-4 py-2.5 rounded-xl border border-outline-variant hover:border-primary/20 min-h-[38px]"
        >
          <ArrowLeft size={14} /> Beranda
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight flex items-center gap-3 font-outfit">
              <Award className="text-emerald-600" size={32} /> Sertifikat Penghargaan LDKS
            </h1>
            <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span>SMP Terpadu Al-Ittihadiyah</span>
              <span>•</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Pusat Data 2026/2027 ({students.length} Siswa)
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleBatchDownload('ALL')}
              disabled={batchProgress !== null || isLoading || students.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] shadow-md shadow-indigo-600/20 min-h-[42px] disabled:opacity-50"
            >
              {batchProgress ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Printer size={16} />
              )}
              <span>
                {batchProgress
                  ? `Memproses ${batchProgress.current}/${batchProgress.total}...`
                  : `Unduh Semua Sertifikat (${students.length} Siswa)`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={isSaving || isLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] shadow-md min-h-[42px] ${
                template.is_published
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : template.is_published ? (
                <RotateCcw size={16} />
              ) : (
                <Send size={16} />
              )}
              <span>
                {template.is_published
                  ? 'Tarik dari Siswa (Jadikan Draf)'
                  : 'Simpan & Terbitkan ke Siswa'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Status Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xs ${
          template.is_published
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              template.is_published ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
            }`}
          >
            {template.is_published ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </div>
          <div>
            <h4 className="text-sm font-bold font-outfit">
              {template.is_published
                ? 'Sertifikat Aktif dan Diterbitkan ke Seluruh Siswa SMP'
                : 'Sertifikat Berstatus Draf (Belum Diterbitkan ke Siswa)'}
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              {template.is_published
                ? `Sebanyak ${students.length} siswa SMP Terpadu Al-Ittihadiyah (Tahun 2026/2027) dapat mengunduh berkas sertifikat resmi di tab profil akun mereka.`
                : 'Siswa belum dapat melihat dokumen ini. Anda dapat mengunduh semua berkas PDF di halaman ini atau klik "Simpan & Terbitkan ke Siswa" jika sudah siap dirilis.'}
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 border ${
            template.is_published
              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
              : 'bg-amber-100 border-amber-300 text-amber-800'
          }`}
        >
          {template.is_published ? 'PUBLIK / TERBIT' : 'DRAF / PRIVAT'}
        </span>
      </div>

      {isLoading ? (
        <div className="py-28 flex flex-col items-center justify-center gap-3 text-slate-400 bg-surface border border-outline-variant rounded-3xl">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-xs font-bold uppercase tracking-wider">
            Memuat data siswa SMP dari Pusat Data (Tahun Ajaran 2026/2027)...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Top Section: Live Visual Preview Card */}
          <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Eye size={16} className="text-emerald-600" /> Pratinjau Tampilan Sertifikat LDKS (Canva)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Menampilkan nama siswa terpilih:{' '}
                  <strong className="text-slate-800">{previewStudent.name}</strong> (Kelas {previewStudent.className})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase border border-emerald-200">
                  A4 Landscape
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(previewStudent)}
                  disabled={downloadingSingleId === previewStudent.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  {downloadingSingleId === previewStudent.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <DownloadCloud size={13} />
                  )}
                  <span>Unduh PDF Siswa Ini</span>
                </button>
              </div>
            </div>

            {/* Exact Canva Template Preview Container */}
            <div className="relative w-full aspect-[2000/1414] max-w-4xl mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-md bg-white select-none">
              <Image
                src="/sertifikat-ldks.png"
                alt="Desain Sertifikat LDKS"
                width={2000}
                height={1414}
                priority
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Overlaid Student Name precisely above the line */}
              <div
                className="absolute font-sans font-bold text-slate-900 tracking-wide select-none pointer-events-none"
                style={{
                  left: '8.65%',
                  bottom: '47.2%',
                  fontSize: 'clamp(9px, 1.25vw, 15px)',
                  lineHeight: '1',
                  maxWidth: '34.2%',
                  whiteSpace: 'nowrap',
                }}
              >
                {previewFormattedName}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2 pt-1 max-w-4xl mx-auto">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-600" />
                Nama tercetak:{' '}
                <strong className="text-slate-800 font-sans">{previewFormattedName}</strong>
                {previewFormattedName !== previewStudent.name.toUpperCase() && (
                  <span className="text-emerald-700 italic font-medium">
                    (disingkat otomatis agar pas dengan panjang garis)
                  </span>
                )}
              </span>
              <span className="font-semibold text-slate-700">
                SMP Terpadu Al-Ittihadiyah • 2026/2027
              </span>
            </div>
          </div>

          {/* Middle Section: Quick Batch Download Per Class */}
          <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Printer size={16} className="text-indigo-600" /> Unduh Sertifikat Sekaligus Per Kelas (Batch PDF)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klik untuk langsung mengunduh 1 berkas PDF gabungan berisi seluruh sertifikat siswa di kelas tersebut:
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase">
                {availableClasses.length} Kelas SMP
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* All Classes Card */}
              <button
                type="button"
                onClick={() => handleBatchDownload('ALL')}
                disabled={batchProgress !== null || students.length === 0}
                className="p-3.5 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/80 rounded-xl text-left transition-all active:scale-[0.98] group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Semua Kelas SMP
                  </span>
                  <span className="text-lg font-black text-indigo-950 font-outfit block mt-1">
                    {students.length} Siswa
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1 mt-3">
                  Unduh Semua <ChevronRight size={11} />
                </span>
              </button>

              {/* Per Class Cards */}
              {availableClasses.map((cls) => {
                const count = studentCountByClass[cls] || 0;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => handleBatchDownload(cls)}
                    disabled={batchProgress !== null || count === 0}
                    className="p-3.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 rounded-xl text-left transition-all active:scale-[0.98] group flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-slate-600 group-hover:text-emerald-700 uppercase tracking-wider block">
                        Kelas {cls}
                      </span>
                      <span className="text-lg font-black text-slate-900 group-hover:text-emerald-950 font-outfit block mt-1">
                        {count} Siswa
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-700 group-hover:underline flex items-center gap-1 mt-3">
                      Unduh PDF <ChevronRight size={11} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Section: Full Student Table from Pusat Data */}
          <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-emerald-600" /> Daftar Siswa SMP Peserta LDKS (Pusat Data)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tahun Ajaran <strong>2026/2027</strong> • Menampilkan {filteredStudents.length} dari {students.length} siswa terdaftar
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau kelas..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Filter Tabs by Class */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedClassTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedClassTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Semua Siswa ({students.length})
              </button>
              {availableClasses.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClassTab(cls)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    selectedClassTab === cls
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  Kelas {cls} ({studentCountByClass[cls] || 0})
                </button>
              ))}
            </div>

            {/* Students Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5 w-12 text-center">No</th>
                      <th className="py-3 px-3.5">Nama Siswa (Pusat Data)</th>
                      <th className="py-3 px-3.5">Nama Tercetak di Piagam</th>
                      <th className="py-3 px-3.5 text-center w-20">Kelas</th>
                      <th className="py-3 px-3.5 text-right w-48">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Tidak ada siswa yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => {
                        const formattedName = formatCertificateStudentName(s.name, 22);
                        const isAbbr = formattedName !== s.name.toUpperCase();
                        const isCurrentPreview = previewStudent.name === s.name;

                        return (
                          <tr
                            key={s.id || idx}
                            className={`transition-colors ${
                              isCurrentPreview ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900">
                              {s.name}
                            </td>
                            <td className="py-2.5 px-3.5 font-sans">
                              <span className="font-bold text-slate-800">
                                {formattedName}
                              </span>
                              {isAbbr && (
                                <span className="ml-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                  Disingkat
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-bold text-slate-700">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {s.className}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewStudent(s)}
                                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    isCurrentPreview
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                  title="Tampilkan di Pratinjau Desain"
                                >
                                  <Eye size={13} />
                                  <span className="hidden sm:inline">Pratinjau</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadSingle(s)}
                                  disabled={downloadingSingleId === s.id}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                  title="Unduh Sertifikat PDF Siswa Ini"
                                >
                                  {downloadingSingleId === s.id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <DownloadCloud size={13} />
                                  )}
                                  <span className="hidden sm:inline">PDF</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}
    </main>
  );
}
