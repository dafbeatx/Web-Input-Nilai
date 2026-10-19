'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  DownloadCloud,
  FileCheck,
  School,
  Calendar,
  User,
  ArrowLeft,
  ExternalLink,
  Award,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { generateLdksCertificatePdf } from '@/lib/grademaster/certificateGenerator';
import { CertificateTemplate } from '@/app/api/grademaster/certificates/route';

function CertificateVerificationContent() {
  const searchParams = useSearchParams();
  const rawName = searchParams.get('name') || 'Siswa Peserta LDKS';
  const className = searchParams.get('class') || 'SMP';
  const academicYear = searchParams.get('year') || '2026/2027';

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isExcluded, setIsExcluded] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/grademaster/certificates?type=LDKS')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data.exclusions)) {
          const norm = rawName.trim().toUpperCase();
          if (data.exclusions.some((x: string) => (typeof x === 'string' ? x : '').trim().toUpperCase() === norm)) {
            setIsExcluded(true);
          }
        }
      })
      .catch((err) => console.warn('Failed to verify exclusion:', err));

    return () => {
      isMounted = false;
    };
  }, [rawName]);

  const imageUrl = `/api/grademaster/certificates/render?name=${encodeURIComponent(rawName)}&class=${encodeURIComponent(className)}&year=${encodeURIComponent(academicYear)}`;

  const handleDownloadPdf = async () => {
    if (isExcluded) return;
    setIsDownloadingPdf(true);
    try {
      const template: CertificateTemplate = {
        cert_type: 'LDKS',
        title: 'SERTIFIKAT PENGHARGAAN',
        subtitle: 'Latihan Dasar Kepemimpinan Siswa (LDKS)',
        cert_number_prefix: '042/LDKS-SMATAS/X/2026',
        citation: 'Diberikan dengan penuh apresiasi kepada:',
        description:
          'Sebagai Peserta Latihan Dasar Kepemimpinan Siswa (LDKS) SMP Terpadu Al-Ittihadiyah Tahun 2026 yang diselenggarakan pada tanggal 14-15 Oktober 2026.',
        city: 'Bogor',
        issue_date: '16 Oktober 2026',
        signer1_name: 'Farhan Sopian Sahid, S.Pd.I',
        signer1_role: 'Kepala Sekolah',
        signer2_name: 'Septi Nur Aeni, S.E',
        signer2_role: 'Ketua Pelaksana LDKS',
        academic_year: academicYear,
        target_class: className,
        is_published: true,
      };

      const doc = await generateLdksCertificatePdf(template, {
        studentName: rawName,
        className: className,
        academicYear: academicYear,
      });

      const safeName = rawName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Sertifikat_LDKS_${safeName}_Kelas_${className}.pdf`);
    } catch (err) {
      console.error('Failed to download PDF certificate:', err);
      alert('Gagal mengunduh dokumen PDF. Silakan coba lagi.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <School size={20} />
            </div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-wider text-slate-100 font-outfit">
                SMP Terpadu Al-Ittihadiyah
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Sistem Verifikasi Sertifikat Elektronik Resmi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isExcluded ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertTriangle size={14} /> Dokumen Telah Ditarik
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck size={14} /> Dokumen Asli Terdaftar
              </span>
            )}
            <Link
              href="/"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Beranda</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 sm:py-8 space-y-6">
        {/* Verification Success or Revoked Banner */}
        {isExcluded ? (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  Sertifikat Tidak Aktif atau Telah Ditarik
                </h2>
                <p className="text-xs text-rose-300/90 mt-0.5">
                  Nama siswa ini telah dihapus dari daftar penerima resmi Sertifikat LDKS oleh pihak sekolah.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
              STATUS: DITARIK
            </span>
          </div>
        ) : (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  Sertifikat Penghargaan LDKS Resmi Terverifikasi
                </h2>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  Dokumen elektronik ini sah dikeluarkan oleh Panitia LDKS dan Kepala Sekolah SMP Terpadu Al-Ittihadiyah.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
              Tahun Ajaran {academicYear}
            </span>
          </div>
        )}

        {/* The Certificate Image Card (Direct Visual Presentation) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between px-2 pt-1 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Tampilan Gambar Sertifikat
              </span>
            </div>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <span>Buka Resolusi Penuh</span>
              <ExternalLink size={13} />
            </a>
          </div>

          {/* Certificate Image Rendering */}
          <div className="relative w-full aspect-[2000/1414] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Sertifikat LDKS ${rawName}`}
              className="w-full h-full object-contain select-none"
              loading="eager"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <FileCheck size={15} className="text-emerald-400" />
              Tersimpan dalam database Pusat Data SMP Terpadu Al-Ittihadiyah
            </p>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={imageUrl}
                download={`Sertifikat_LDKS_${rawName.replace(/\s+/g, '_')}.png`}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all border border-slate-700 min-h-[42px]"
              >
                <DownloadCloud size={15} />
                <span>Unduh Gambar (PNG)</span>
              </a>

              {!isExcluded && (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 active:scale-95 min-h-[42px]"
                >
                  {isDownloadingPdf ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <DownloadCloud size={15} />
                  )}
                  <span>Unduh Berkas Resmi (PDF)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Verification Details Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileCheck size={16} className="text-indigo-400" /> Rincian Informasi Sertifikat
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User size={13} className="text-slate-400" /> Nama Siswa
              </span>
              <p className="text-sm font-extrabold text-white">{rawName}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <School size={13} className="text-slate-400" /> Tingkat / Kelas
              </span>
              <p className="text-sm font-extrabold text-white">Kelas {className} (SMP)</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" /> Tanggal Kegiatan
              </span>
              <p className="text-sm font-extrabold text-white">14 - 15 Oktober 2026</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                {isExcluded ? (
                  <AlertTriangle size={13} className="text-rose-400" />
                ) : (
                  <ShieldCheck size={13} className="text-emerald-400" />
                )}
                <span>Status Dokumen</span>
              </span>
              <p className={`text-sm font-extrabold ${isExcluded ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isExcluded ? 'DITARIK / TIDAK AKTIF' : 'SAH & AKTIF'}
              </p>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>
              Penandatangan: <strong>Farhan Sopian Sahid, S.Pd.I</strong> (Kepala Sekolah) &{' '}
              <strong>Septi Nur Aeni, S.E</strong> (Ketua Pelaksana LDKS)
            </span>
            <span className="text-slate-500">SMP Terpadu Al-Ittihadiyah Bogor</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>© 2026 SMP Terpadu Al-Ittihadiyah. Hak Cipta Dilindungi Undang-Undang.</p>
      </footer>
    </div>
  );
}

export default function CertificateVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center flex-col gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Memuat verifikasi sertifikat...
          </p>
        </div>
      }
    >
      <CertificateVerificationContent />
    </Suspense>
  );
}
