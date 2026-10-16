"use client";

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  DownloadCloud,
  Eye,
  Save,
  AlertCircle,
  Calendar,
  UserCheck,
  Send,
  Loader2,
  FileText,
  RotateCcw
} from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';
import { CertificateTemplate } from '@/app/api/grademaster/certificates/route';
import { generateLdksCertificatePdf } from '@/lib/grademaster/certificateGenerator';

interface CertificateManagementLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  academicYear?: string;
}

export default function CertificateManagementLayer({
  onBack,
  setToast,
  academicYear = '2026/2027',
}: CertificateManagementLayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);
  const [isDownloadingCustom, setIsDownloadingCustom] = useState(false);

  // Form state
  const [form, setForm] = useState<CertificateTemplate>({
    cert_type: 'LDKS',
    title: 'SERTIFIKAT PENGHARGAAN',
    subtitle: 'Latihan Dasar Kepemimpinan Siswa (LDKS)',
    cert_number_prefix: '042/LDKS-SMATAS/X/2026',
    citation: 'Diberikan dengan penuh hormat dan apresiasi kepada:',
    description: 'Atas partisipasi aktif, dedikasi, serta integritas tinggi dalam mengikuti dan menyelesaikan seluruh rangkaian kegiatan Latihan Dasar Kepemimpinan Siswa (LDKS) sebagai PESERTA.',
    city: 'Bogor',
    issue_date: '16 Oktober 2026',
    signer1_role: 'Ketua Panitia LDKS,',
    signer1_name: 'Ketua Panitia LDKS, S.Pd.',
    signer2_role: 'Kepala Sekolah,',
    signer2_name: 'Farhan Sopian Sahid, S.Pd.I',
    academic_year: academicYear,
    target_class: 'ALL_X',
    is_published: false,
  });

  // Custom student test download state
  const [customStudentName, setCustomStudentName] = useState('');
  const [customClassName, setCustomClassName] = useState('X-1');
  const [registeredStudents, setRegisteredStudents] = useState<Array<{ name: string; className: string }>>([]);

  // Fetch student roster for convenient autocomplete
  useEffect(() => {
    let isMounted = true;
    const fetchStudents = async () => {
      try {
        const res = await fetch(`/api/grademaster/student-accounts?year=${encodeURIComponent(form.academic_year || academicYear)}`);
        if (res.ok) {
          const data = await res.json();
          const accs = data.accounts || data.data || [];
          if (Array.isArray(accs) && isMounted) {
            setRegisteredStudents(accs.map((a: { student_name: string; class_name: string }) => ({
              name: a.student_name,
              className: a.class_name || 'X-1'
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load registered students for certificate autocomplete:', err);
      }
    };
    fetchStudents();
    return () => {
      isMounted = false;
    };
  }, [form.academic_year, academicYear]);

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
            setForm((prev) => ({
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

  const handleSave = async (publish: boolean) => {
    setIsSaving(true);
    try {
      const payload: CertificateTemplate = {
        ...form,
        is_published: publish,
        academic_year: form.academic_year || academicYear,
      };

      const res = await fetch('/api/grademaster/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan perubahan');
      }

      setForm((prev) => ({
        ...prev,
        ...data.template,
      }));

      setToast({
        message: publish
          ? 'Sertifikat LDKS berhasil diperbarui dan diterbitkan ke seluruh siswa!'
          : 'Draf sertifikat LDKS berhasil disimpan.',
        type: 'success',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan';
      setToast({ message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadSample = async () => {
    setIsDownloadingSample(true);
    try {
      const sampleStudent = {
        studentName: 'MUHAMMAD RIZKY PRATAMA',
        className: 'X-1',
        academicYear: form.academic_year || academicYear,
      };

      const doc = await generateLdksCertificatePdf(form, sampleStudent);
      doc.save(`Sertifikat_Penghargaan_LDKS_${form.city}_${form.academic_year?.replace('/', '-')}.pdf`);
      setToast({ message: 'Contoh Sertifikat LDKS (.PDF) berhasil diunduh', type: 'success' });
    } catch (err) {
      console.error('Failed to download sample pdf:', err);
      setToast({ message: 'Gagal membuat file PDF', type: 'error' });
    } finally {
      setIsDownloadingSample(false);
    }
  };

  const handleDownloadCustomStudent = async () => {
    if (!customStudentName.trim()) {
      setToast({ message: 'Silakan isi nama siswa terlebih dahulu', type: 'error' });
      return;
    }

    setIsDownloadingCustom(true);
    try {
      const studentInfo = {
        studentName: customStudentName.trim().toUpperCase(),
        className: customClassName.trim() || 'X',
        academicYear: form.academic_year || academicYear,
      };

      const doc = await generateLdksCertificatePdf(form, studentInfo);
      const safeName = studentInfo.studentName.replace(/\s+/g, '_');
      const safeClass = studentInfo.className.replace(/\s+/g, '_');
      doc.save(`Sertifikat_Penghargaan_LDKS_${safeName}_${safeClass}.pdf`);
      setToast({ message: `Sertifikat untuk ${studentInfo.studentName} berhasil diunduh (PDF)`, type: 'success' });
    } catch (err) {
      console.error('Failed to download custom student pdf:', err);
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
              <Award className="text-amber-500" size={32} /> Manajemen Sertifikat LDKS (.PDF)
            </h1>
            <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest mt-1.5">
              Kustomisasi teks piagam, tanggal, penandatangan, dan terbitkan sertifikat ke siswa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleDownloadSample}
              disabled={isDownloadingSample || isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] shadow-sm min-h-[42px]"
            >
              {isDownloadingSample ? <Loader2 size={16} className="animate-spin text-amber-600" /> : <DownloadCloud size={16} className="text-amber-600" />}
              <span>Unduh Contoh .PDF</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] min-h-[42px]"
            >
              <Save size={16} />
              <span>Simpan Draf</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(!form.is_published)}
              disabled={isSaving || isLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] shadow-md min-h-[42px] ${
                form.is_published
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
              }`}
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : form.is_published ? (
                <RotateCcw size={16} />
              ) : (
                <Send size={16} />
              )}
              <span>{form.is_published ? 'Tarik dari Siswa (Jadikan Draf)' : 'Simpan & Terbitkan ke Siswa'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Status Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xs ${
        form.is_published 
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
          : 'bg-amber-50/80 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            form.is_published ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            {form.is_published ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </div>
          <div>
            <h4 className="text-sm font-bold font-outfit">
              {form.is_published 
                ? 'Sertifikat Aktif dan Telah Diterbitkan ke Siswa' 
                : 'Sertifikat Berstatus Draf (Belum Diunggah ke Siswa)'}
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              {form.is_published 
                ? 'Seluruh siswa kelas X / siswa baru dapat melihat dan mengunduh sertifikat resmi (.PDF) di tab profil akun mereka.' 
                : 'Siswa belum dapat melihat dokumen ini. Silakan atur seluruh teks dan klik tombol "Simpan & Terbitkan ke Siswa" jika sudah siap.'}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 border ${
          form.is_published 
            ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
            : 'bg-amber-100 border-amber-300 text-amber-800'
        }`}>
          {form.is_published ? 'PUBLIK / AKTIF' : 'DRAF / PRIVAT'}
        </span>
      </div>

      {isLoading ? (
        <div className="py-28 flex flex-col items-center justify-center gap-3 text-slate-400 bg-surface border border-outline-variant rounded-3xl">
          <Loader2 size={32} className="animate-spin text-amber-500" />
          <p className="text-xs font-bold uppercase tracking-wider">Memuat konfigurasi template sertifikat...</p>
        </div>
      ) : (
        /* Two Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Form Editor (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Card 1: Data Utama */}
            <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText size={16} className="text-amber-600" />
                Data Utama Piagam Penghargaan
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Judul Piagam */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Judul Piagam <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Contoh: SERTIFIKAT PENGHARGAAN"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400">Judul utama sertifikat dalam huruf kapital tebal.</p>
                </div>

                {/* Subjudul Kegiatan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Subjudul Kegiatan
                  </label>
                  <input
                    type="text"
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="Contoh: Latihan Dasar Kepemimpinan Siswa (LDKS)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400">Nama kegiatan atau tema pendukung.</p>
                </div>

                {/* Nomor Sertifikat */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Format Nomor Sertifikat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.cert_number_prefix}
                    onChange={(e) => setForm({ ...form, cert_number_prefix: e.target.value })}
                    placeholder="Contoh: 042/LDKS-SMATAS/X/2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400">Nomor registrasi resmi yang tercetak di bawah kop.</p>
                </div>

                {/* Tanggal Sertifikat */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-600" />
                    Tanggal Sertifikat (Diisi Admin) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                    placeholder="Contoh: 16 Oktober 2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400">Tanggal yang tercetak pada titimangsa dokumen.</p>
                </div>

                {/* Kota Titimangsa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Kota Titimangsa
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Contoh: Bogor"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Target Penerima */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Target Penerima Sertifikat
                  </label>
                  <select
                    value={form.target_class}
                    onChange={(e) => setForm({ ...form, target_class: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="ALL_X">Semua Siswa Kelas X / Siswa Baru</option>
                    <option value="ALL">Seluruh Siswa Terdaftar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 2: Narasi & Alasan Penghargaan */}
            <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText size={16} className="text-amber-600" />
                Narasi & Alasan Penghargaan (Peserta LDKS)
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Teks Narasi / Alasan Penghargaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ketik narasi alasan penghargaan di sini..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">
                  Teks ini menjelaskan partisipasi aktif siswa sebagai peserta LDKS pada badan sertifikat.
                </p>
              </div>
            </div>

            {/* Card 3: Konfigurasi Penandatangan */}
            <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserCheck size={16} className="text-indigo-600" />
                Konfigurasi Penandatangan Resmi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Penandatangan 1 - Panitia LDKS */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Sisi Kiri (Panitia LDKS)
                  </span>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Jabatan / Peran</label>
                    <input
                      type="text"
                      value={form.signer1_role}
                      onChange={(e) => setForm({ ...form, signer1_role: e.target.value })}
                      placeholder="Contoh: Ketua Panitia LDKS,"
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Nama Lengkap & Gelar</label>
                    <input
                      type="text"
                      value={form.signer1_name}
                      onChange={(e) => setForm({ ...form, signer1_name: e.target.value })}
                      placeholder="Ketik nama Ketua Panitia LDKS..."
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Penandatangan 2 - Kepala Sekolah */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Sisi Kanan (Kepala Sekolah)
                  </span>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Jabatan / Peran</label>
                    <input
                      type="text"
                      value={form.signer2_role}
                      onChange={(e) => setForm({ ...form, signer2_role: e.target.value })}
                      placeholder="Contoh: Kepala Sekolah,"
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Nama Lengkap & Gelar</label>
                    <input
                      type="text"
                      value={form.signer2_name}
                      onChange={(e) => setForm({ ...form, signer2_name: e.target.value })}
                      placeholder="Contoh: Farhan Sopian Sahid, S.Pd.I"
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Visual Preview & Custom Download (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Visual Preview Card */}
            <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={16} className="text-amber-600" /> Pratinjau Desain Sertifikat (Canva)
                </h3>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase border border-emerald-200">
                  A4 Landscape
                </span>
              </div>

              {/* Exact Canva Template Preview with Live Name Overlay */}
              <div className="relative w-full aspect-[2000/1414] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white select-none">
                <img
                  src="/sertifikat-ldks.png"
                  alt="Desain Sertifikat LDKS"
                  className="w-full h-full object-contain pointer-events-none"
                />
                {/* Live Overlaid Student Name directly on top of the Canva line */}
                <div
                  className="absolute font-sans font-bold text-slate-900 tracking-wide"
                  style={{
                    left: '8.65%', // 173 / 2000
                    top: '49.8%',  // sits right above y: 756 / 1414
                    fontSize: 'clamp(8px, 1.6vw, 18px)',
                    maxWidth: '34.2%', // (856 - 171) / 2000
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={customStudentName || 'NAMA LENGKAP SISWA'}
                >
                  {(customStudentName || 'MUHAMMAD RIZKY PRATAMA').toUpperCase()}
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>
                  Menggunakan template desain Canva (<strong>sertifikat-ldks.png</strong>). Nama siswa dicetak otomatis di atas garis.
                </span>
              </div>
            </div>

            {/* Quick Student Certificate Download Card */}
            <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <DownloadCloud size={16} className="text-indigo-600" /> Unduh Sertifikat Atas Nama Siswa
              </h3>
              <p className="text-xs text-slate-500">
                Pilih dari siswa terdaftar atau ketik manual untuk langsung men-generate dan mengunduh sertifikat resmi berformat .PDF:
              </p>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Nama Siswa</label>
                  <input
                    type="text"
                    list="registered-students-list"
                    value={customStudentName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomStudentName(val);
                      const matched = registeredStudents.find(
                        (s) => s.name.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (matched) {
                        setCustomClassName(matched.className);
                      }
                    }}
                    placeholder="Pilih atau ketik nama siswa..."
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <datalist id="registered-students-list">
                    {registeredStudents.map((s, idx) => (
                      <option key={`${s.name}-${idx}`} value={s.name}>
                        {s.className}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Kelas</label>
                  <input
                    type="text"
                    value={customClassName}
                    onChange={(e) => setCustomClassName(e.target.value)}
                    placeholder="Contoh: X-1"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCustomStudent}
                  disabled={isDownloadingCustom}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDownloadingCustom ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <DownloadCloud size={15} />
                  )}
                  <span>Unduh Sertifikat Siswa (.PDF)</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </main>
  );
}
