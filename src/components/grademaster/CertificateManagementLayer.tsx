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
  Users
} from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';
import { CertificateTemplate } from '@/app/api/grademaster/certificates/route';
import {
  generateLdksCertificatePdf,
  formatCertificateStudentName,
} from '@/lib/grademaster/certificateGenerator';

interface CertificateManagementLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  academicYear?: string;
}

interface StudentOption {
  name: string;
  className: string;
}

// Filter out SMA classes: only keep SMP classes (e.g. 7, 8, 8A, 9, 9A, etc.)
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
  academicYear = '2026/2027',
}: CertificateManagementLayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);
  const [isDownloadingCustom, setIsDownloadingCustom] = useState(false);

  // Template state (stores publication status and academic year)
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
    academic_year: academicYear,
    target_class: 'ALL',
    is_published: false,
  });

  // SMP Students and Classes state
  const [smpStudents, setSmpStudents] = useState<StudentOption[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

  // Input state
  const [customStudentName, setCustomStudentName] = useState('MUHAMMAD RIZKY PRATAMA');
  const [customClassName, setCustomClassName] = useState('7');

  // Load existing template on mount
  useEffect(() => {
    let isMounted = true;
    const fetchTemplate = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/grademaster/certificates?type=LDKS');
        if (res.ok) {
          const data = await res.json();
          if (data.template && isMounted) {
            setTemplate((prev) => ({
              ...prev,
              ...data.template,
              academic_year: data.template.academic_year || academicYear,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load certificate template:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTemplate();
    return () => {
      isMounted = false;
    };
  }, [academicYear]);

  // Load SMP student roster and classes (strictly exclude SMA)
  useEffect(() => {
    let isMounted = true;
    const fetchStudentsAndClasses = async () => {
      try {
        const [accRes, classRes] = await Promise.all([
          fetch(`/api/grademaster/student-accounts?year=${encodeURIComponent(academicYear)}`),
          fetch(`/api/grademaster/student-accounts?mode=classes&year=${encodeURIComponent(academicYear)}`),
        ]);

        let studentsList: StudentOption[] = [];
        if (accRes.ok) {
          const d = await accRes.json();
          const accs = d.accounts || d.data || [];
          if (Array.isArray(accs)) {
            studentsList = accs
              .filter((a: { class_name?: string }) => isSmpClass(a.class_name || ''))
              .map((a: { student_name: string; class_name?: string }) => ({
                name: (a.student_name || '').trim(),
                className: (a.class_name || '7').trim(),
              }));
          }
        }

        let smpClassesList: string[] = [];
        if (classRes.ok) {
          const cd = await classRes.json();
          if (Array.isArray(cd.classes)) {
            smpClassesList = cd.classes.filter(isSmpClass);
          }
        }

        // Merge discovered classes
        const mergedClasses = Array.from(
          new Set([...smpClassesList, ...studentsList.map((s) => s.className)])
        ).sort();

        if (isMounted) {
          setSmpStudents(studentsList);
          setAvailableClasses(mergedClasses);
          if (mergedClasses.length > 0 && selectedClass === 'ALL') {
            setSelectedClass('ALL');
          }
        }
      } catch (err) {
        console.error('Failed to fetch SMP students for certificate:', err);
      }
    };

    fetchStudentsAndClasses();
    return () => {
      isMounted = false;
    };
  }, [academicYear, selectedClass]);

  // Filtered students by chosen class
  const filteredStudents = useMemo(() => {
    if (selectedClass === 'ALL') return smpStudents;
    return smpStudents.filter((s) => s.className === selectedClass);
  }, [smpStudents, selectedClass]);

  // Calculate abbreviated name in real time
  const formattedPrintName = useMemo(() => {
    return formatCertificateStudentName(customStudentName || 'MUHAMMAD RIZKY PRATAMA', 22);
  }, [customStudentName]);

  const isNameAbbreviated = useMemo(() => {
    const raw = (customStudentName || '').trim().toUpperCase();
    return raw.length > 0 && formattedPrintName !== raw;
  }, [customStudentName, formattedPrintName]);

  // Handle Save / Publish toggle
  const handleTogglePublish = async () => {
    setIsSaving(true);
    const newStatus = !template.is_published;
    try {
      const payload: CertificateTemplate = {
        ...template,
        target_class: 'ALL',
        is_published: newStatus,
        academic_year: template.academic_year || academicYear,
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
          ? 'Sertifikat LDKS resmi diterbitkan ke seluruh siswa SMP!'
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

  // Download Sample PDF
  const handleDownloadSample = async () => {
    setIsDownloadingSample(true);
    try {
      const sampleStudent = {
        studentName: 'MUHAMMAD RIZKY PRATAMA',
        className: '7',
        academicYear: template.academic_year || academicYear,
      };

      const doc = await generateLdksCertificatePdf(template, sampleStudent);
      doc.save(`Contoh_Sertifikat_LDKS_SMP_${template.academic_year?.replace('/', '-')}.pdf`);
      setToast({ message: 'Contoh Sertifikat LDKS (.PDF) berhasil diunduh', type: 'success' });
    } catch (err) {
      console.error('Failed to download sample pdf:', err);
      setToast({ message: 'Gagal membuat file PDF', type: 'error' });
    } finally {
      setIsDownloadingSample(false);
    }
  };

  // Download Single Student PDF
  const handleDownloadStudent = async () => {
    if (!customStudentName.trim()) {
      setToast({ message: 'Silakan ketik atau pilih nama siswa terlebih dahulu', type: 'error' });
      return;
    }

    setIsDownloadingCustom(true);
    try {
      const studentInfo = {
        studentName: customStudentName.trim(),
        className: customClassName.trim() || '7',
        academicYear: template.academic_year || academicYear,
      };

      const doc = await generateLdksCertificatePdf(template, studentInfo);
      const safeName = formattedPrintName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Sertifikat_LDKS_${safeName}.pdf`);
      setToast({
        message: `Sertifikat untuk ${formattedPrintName} berhasil diunduh (PDF)`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to download student pdf:', err);
      setToast({ message: 'Gagal membuat file PDF', type: 'error' });
    } finally {
      setIsDownloadingCustom(false);
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
            <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest mt-1.5">
              SMP Terpadu Al-Ittihadiyah • Cetak Otomatis Nama Peserta LDKS
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleDownloadSample}
              disabled={isDownloadingSample || isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] shadow-sm min-h-[42px]"
            >
              {isDownloadingSample ? (
                <Loader2 size={16} className="animate-spin text-emerald-600" />
              ) : (
                <DownloadCloud size={16} className="text-emerald-600" />
              )}
              <span>Unduh Contoh .PDF</span>
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
                ? 'Sertifikat Aktif dan Diterbitkan ke Siswa SMP'
                : 'Sertifikat Berstatus Draf (Belum Diterbitkan ke Siswa)'}
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              {template.is_published
                ? 'Seluruh siswa SMP dapat melihat dan mengunduh sertifikat resmi (.PDF) di tab profil akun mereka.'
                : 'Siswa belum dapat melihat dokumen ini. Klik tombol "Simpan & Terbitkan ke Siswa" jika sudah siap dirilis.'}
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
          <p className="text-xs font-bold uppercase tracking-wider">Memuat sertifikat...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Layout: Control Panel on Top/Left, Preview in Center */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left/Top Column: Clean Student Control Panel (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-emerald-600" /> Pilih Siswa SMP Peserta LDKS
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase">
                    SMP Terpadu
                  </span>
                </div>

                {/* Filter Kelas SMP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                    <span>Kelas SMP</span>
                    <span className="text-[10px] font-semibold text-emerald-700">Khusus SMP (Tanpa SMA)</span>
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedClass(val);
                      if (val !== 'ALL') {
                        setCustomClassName(val);
                        const firstStudent = smpStudents.find((s) => s.className === val);
                        if (firstStudent) {
                          setCustomStudentName(firstStudent.name);
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Kelas SMP (Kelas 7, 8, 9)</option>
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Autocomplete / Input Nama Siswa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                    <span>Nama Lengkap Siswa</span>
                    <span className="text-[10px] text-slate-400">Pilih atau ketik manual</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="smp-students-datalist"
                      value={customStudentName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomStudentName(val);
                        const matched = smpStudents.find(
                          (s) => s.name.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (matched) {
                          setCustomClassName(matched.className);
                        }
                      }}
                      placeholder="Ketik atau pilih nama siswa SMP..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <datalist id="smp-students-datalist">
                      {filteredStudents.map((s, idx) => (
                        <option key={`${s.name}-${idx}`} value={s.name}>
                          Kelas {s.className}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Box Pratinjau Nama & Otomatis Singkat */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-emerald-600" /> Nama Tercetak di Sertifikat
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      Font Proporsional (14pt)
                    </span>
                  </div>

                  <div className="bg-white px-3.5 py-2.5 rounded-lg border border-emerald-200/80 shadow-2xs">
                    <p className="text-sm font-black text-slate-900 tracking-wide font-sans">
                      {formattedPrintName || 'NAMA LENGKAP SISWA'}
                    </p>
                  </div>

                  {isNameAbbreviated && (
                    <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                      Nama panjang disingkat otomatis (<strong>{formattedPrintName}</strong>) agar pas dan rapi tepat di atas garis piagam tanpa terpotong.
                    </p>
                  )}
                </div>

                {/* Tombol Unduh PDF Siswa Terpilih */}
                <button
                  type="button"
                  onClick={handleDownloadStudent}
                  disabled={isDownloadingCustom || !customStudentName.trim()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  {isDownloadingCustom ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <DownloadCloud size={16} />
                  )}
                  <span>Unduh Sertifikat PDF ({formattedPrintName.split(' ')[0]})</span>
                </button>
              </div>

              {/* Quick Info Box */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Desain Canva Siap Digunakan</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Seluruh teks piagam, nomor, tanggal, logo SMP Terpadu Al-Ittihadiyah, cap, dan tanda tangan telah tertanam rapi di dalam template desain Canva. Sistem hanya mencetak nama siswa yang dipilih tepat di atas garis.
                </p>
              </div>
            </div>

            {/* Right Column: Prominent Certificate Visual Preview (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Eye size={16} className="text-emerald-600" /> Pratinjau Tampilan Sertifikat (Canva)
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase border border-emerald-200">
                    A4 Landscape • SMP
                  </span>
                </div>

                {/* Canva Template Container with Pixel-Perfect Positioned Student Name */}
                <div className="relative w-full aspect-[2000/1414] rounded-xl overflow-hidden border border-slate-200 shadow-md bg-white select-none">
                  <Image
                    src="/sertifikat-ldks.png"
                    alt="Desain Sertifikat LDKS"
                    width={2000}
                    height={1414}
                    priority
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Overlaid Student Name: Positioned just above the line at Y=756px (53.46%) */}
                  <div
                    className="absolute font-sans font-bold text-slate-900 tracking-wide select-none pointer-events-none"
                    style={{
                      left: '8.65%', // X starts at 173px (~25.68mm)
                      bottom: '47.2%', // Line is at 53.46%, bottom 47.2% places baseline neatly above line
                      fontSize: 'clamp(9px, 1.25vw, 15px)',
                      lineHeight: '1',
                      maxWidth: '34.2%', // Line length is 685px (~101.7mm)
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formattedPrintName}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Panjang nama disesuaikan dengan proporsi garis di Canva</span>
                  <span className="font-semibold text-slate-700">
                    Kertas: 297 × 210 mm (A4)
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
