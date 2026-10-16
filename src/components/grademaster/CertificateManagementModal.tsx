"use client";

import React, { useState, useEffect } from 'react';
import { X, Award, CheckCircle2, DownloadCloud, Eye, Save, AlertCircle, Sparkles, Send, Calendar, UserCheck, ShieldCheck, Loader2 } from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';
import { CertificateTemplate } from '@/app/api/grademaster/certificates/route';
import { generateLdksCertificatePdf } from '@/lib/grademaster/certificateGenerator';

interface CertificateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  setToast: (t: ToastType) => void;
  academicYear?: string;
}

export default function CertificateManagementModal({
  isOpen,
  onClose,
  setToast,
  academicYear = '2026/2027',
}: CertificateManagementModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);

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

  // Load existing template on open
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, academicYear]);

  if (!isOpen) return null;

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

  const handleDownloadSample = () => {
    setIsDownloadingSample(true);
    try {
      const sampleStudent = {
        studentName: 'MUHAMMAD RIZKY PRATAMA',
        className: 'X-1',
        academicYear: form.academic_year || academicYear,
      };

      const doc = generateLdksCertificatePdf(form, sampleStudent);
      doc.save(`Contoh_Sertifikat_LDKS_${form.city}_${form.academic_year?.replace('/', '-')}.pdf`);
      setToast({ message: 'Contoh Sertifikat LDKS (.PDF) berhasil diunduh', type: 'success' });
    } catch (err) {
      console.error('Failed to download sample pdf:', err);
      setToast({ message: 'Gagal membuat file PDF', type: 'error' });
    } finally {
      setIsDownloadingSample(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-outfit leading-tight flex items-center gap-2">
                Manajemen Sertifikat LDKS (.PDF)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Sesuaikan teks sertifikat, tanggal, penandatangan, lalu terbitkan ke siswa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Bar */}
        <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${form.is_published ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            {form.is_published ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Status: <b>TELAH DITERBITKAN</b> ke seluruh siswa</span>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-amber-600" />
                <span>Status: <b>DRAF</b> (Belum diunggah ke siswa. Klik 'Terbitkan' untuk mengaktifkannya)</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSample}
              disabled={isDownloadingSample}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              {isDownloadingSample ? <Loader2 size={13} className="animate-spin text-amber-600" /> : <DownloadCloud size={13} />}
              <span>Unduh Contoh .PDF</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-left">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin text-amber-500" />
              <p className="text-xs font-bold uppercase tracking-wider">Memuat template sertifikat...</p>
            </div>
          ) : (
            <>
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Judul Piagam */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Judul Piagam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Contoh: SERTIFIKAT PENGHARGAAN"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400">Judul utama sertifikat (huruf kapital).</p>
                </div>

                {/* Subjudul */}
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
                    Format Nomor Sertifikat <span className="text-red-500">*</span>
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
                    Tanggal Sertifikat (Diisi Admin) <span className="text-red-500">*</span>
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

                {/* Target Kelas */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Target Penerima
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

              {/* Teks Narasi Alasan Penghargaan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Teks Narasi / Alasan Penghargaan (Dapat Diedit Bebas) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ketik narasi alasan penghargaan di sini..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">
                  Teks ini menjelaskan partisipasi siswa sebagai peserta LDKS pada badan sertifikat.
                </p>
              </div>

              {/* Bagian Penandatangan */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={15} className="text-indigo-600" />
                  Konfigurasi Penandatangan Resmi
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Penandatangan 1 - Panitia LDKS */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Sisi Kiri (Panitia LDKS)
                    </span>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Jabatan / Peran</label>
                      <input
                        type="text"
                        value={form.signer1_role}
                        onChange={(e) => setForm({ ...form, signer1_role: e.target.value })}
                        placeholder="Contoh: Ketua Panitia LDKS,"
                        className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Nama Lengkap & Gelar</label>
                      <input
                        type="text"
                        value={form.signer1_name}
                        onChange={(e) => setForm({ ...form, signer1_name: e.target.value })}
                        placeholder="Ketik nama Ketua Panitia LDKS..."
                        className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Penandatangan 2 - Kepala Sekolah */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Sisi Kanan (Kepala Sekolah)
                    </span>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Jabatan / Peran</label>
                      <input
                        type="text"
                        value={form.signer2_role}
                        onChange={(e) => setForm({ ...form, signer2_role: e.target.value })}
                        placeholder="Contoh: Kepala Sekolah,"
                        className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Nama Lengkap & Gelar</label>
                      <input
                        type="text"
                        value={form.signer2_name}
                        onChange={(e) => setForm({ ...form, signer2_name: e.target.value })}
                        placeholder="Contoh: Farhan Sopian Sahid, S.Pd.I"
                        className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye size={15} /> Pratinjau Tampilan Sertifikat
                  </h4>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    A4 Landscape • jsPDF Vektor
                  </span>
                </div>

                <div className="bg-[#FCFBF7] border-2 border-amber-300 rounded-xl p-6 text-center space-y-3 shadow-inner font-serif">
                  <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase">
                    SMA TERPADU AS SALAAM
                  </p>
                  <p className="text-[9px] text-slate-400 font-sans tracking-wide">
                    PANITIA LATIHAN DASAR KEPEMIMPINAN SISWA (LDKS)
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    Nomor: {form.cert_number_prefix}
                  </p>
                  <hr className="w-24 mx-auto border-amber-300" />
                  
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-wider">
                    {form.title || 'SERTIFIKAT PENGHARGAAN'}
                  </h2>
                  <p className="text-xs text-amber-800 italic">
                    {form.subtitle || 'Latihan Dasar Kepemimpinan Siswa (LDKS)'}
                  </p>

                  <p className="text-[10px] text-slate-500 font-sans mt-2">
                    {form.citation}
                  </p>
                  <h3 className="text-lg font-bold text-slate-900 underline decoration-amber-400 underline-offset-4">
                    [NAMA SISWA LENGKAP]
                  </h3>
                  <p className="text-[11px] text-slate-600 font-sans font-bold">
                    Kelas X-1 • Tahun Ajaran {form.academic_year || academicYear}
                  </p>

                  <p className="text-xs text-slate-700 max-w-xl mx-auto leading-relaxed italic px-2">
                    "{form.description}"
                  </p>

                  <p className="text-[10px] text-slate-500 font-sans pt-2">
                    {form.city}, {form.issue_date}
                  </p>

                  <div className="grid grid-cols-2 pt-3 text-xs text-slate-800 font-sans">
                    <div>
                      <p className="text-[10px] text-slate-500">{form.signer1_role}</p>
                      <p className="font-bold pt-8 underline">{form.signer1_name || '(Nama Panitia LDKS)'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">{form.signer2_role}</p>
                      <p className="font-bold pt-8 underline">{form.signer2_name || '(Nama Kepala Sekolah)'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving || isLoading}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} />
              <span>Simpan Draf</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving || isLoading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-600/20 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              <span>Simpan & Publikasikan ke Siswa</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
