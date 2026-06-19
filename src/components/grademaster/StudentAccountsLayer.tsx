"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Users, Download, Trash2, Shield, Loader2,
  UserPlus, ShieldCheck, Camera, AlertCircle, CheckCircle2,
  KeyRound, Image as ImageIcon, TrendingUp
} from 'lucide-react';
import { ToastType, StudentAccount } from '@/lib/grademaster/types';

interface StudentAccountsLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  activeClass?: string;
  activeYear?: string;
}

export default function StudentAccountsLayer({
  onBack,
  setToast,
  activeClass = '',
  activeYear = '2025/2026'
}: StudentAccountsLayerProps) {
  const [accounts, setAccounts] = useState<StudentAccount[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState(activeClass);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteToClass, setPromoteToClass] = useState('');
  const [promoteToYear, setPromoteToYear] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  const getNextAcademicYear = (current: string) => {
    const parts = current.split('/');
    if (parts.length === 2) {
      const y1 = parseInt(parts[0]);
      const y2 = parseInt(parts[1]);
      if (!isNaN(y1) && !isNaN(y2)) {
        return `${y1 + 1}/${y2 + 1}`;
      }
    }
    return '2026/2027';
  };

  const handlePromote = async () => {
    if (!selectedClass || !promoteToClass.trim() || !promoteToYear.trim() || isPromoting) return;
    setIsPromoting(true);
    try {
      const res = await fetch('/api/grademaster/student-accounts/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromClass: selectedClass,
          toClass: promoteToClass,
          fromYear: activeYear,
          toYear: promoteToYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message || 'Kenaikan kelas siswa berhasil diproses!', type: 'success' });
        setShowPromoteModal(false);
        setPromoteToClass('');
        fetchClasses();
        fetchAccounts();
      } else {
        setToast({ message: data.error || 'Gagal memproses kenaikan kelas', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan saat memproses kenaikan kelas', type: 'error' });
    } finally {
      setIsPromoting(false);
    }
  };

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/grademaster/behaviors?year=${encodeURIComponent(activeYear)}`);
      const data = await res.json();
      if (res.ok) setAvailableClasses(data.classes || []);
    } catch {
      // silent
    }
  }, [activeYear]);

  const fetchAccounts = useCallback(async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/grademaster/student-accounts?class=${encodeURIComponent(selectedClass)}&year=${encodeURIComponent(activeYear)}`
      );
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts || []);
      } else {
        setToast({ message: data.error || 'Gagal memuat akun', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: 'Gagal memuat akun siswa', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, activeYear, setToast]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);
  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleGenerate = async () => {
    if (!selectedClass || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/grademaster/student-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: selectedClass, academicYear: activeYear }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message, type: 'success' });
        fetchAccounts();
      } else {
        setToast({ message: data.error || 'Gagal membuat akun', type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal membuat akun siswa', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const url = selectedClass
        ? `/api/grademaster/student-accounts/export?class=${encodeURIComponent(selectedClass)}&year=${encodeURIComponent(activeYear)}`
        : `/api/grademaster/student-accounts/export?year=${encodeURIComponent(activeYear)}`;

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Export gagal');
      }

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `akun-siswa-${selectedClass || 'semua'}-${activeYear.replace('/', '-')}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);

      setToast({ message: 'File Excel berhasil diunduh', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Gagal mengekspor', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearPasswords = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      const res = await fetch('/api/grademaster/student-accounts/clear-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: selectedClass, academicYear: activeYear }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message, type: 'success' });
        fetchAccounts();
      } else {
        setToast({ message: data.error, type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal menghapus password', type: 'error' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const res = await fetch('/api/grademaster/student-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message, type: 'success' });
        setAccounts(prev => prev.filter(a => a.id !== accountId));
      } else {
        setToast({ message: data.error, type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal menghapus akun', type: 'error' });
    }
  };

  const handlePhotoUpload = async (accountId: string, file: File) => {
    // 1. Validasi Ukuran (Batas lebih besar untuk foto modern 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setToast({ message: 'Ukuran foto maksimal 20MB', type: 'error' });
      return;
    }

    setToast({ message: "Memproses & mengoptimalkan foto...", type: "success" });
    
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('accountId', accountId);

    try {
      const res = await fetch('/api/grademaster/student-accounts/photo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: `Foto berhasil diupload (${Math.round(data.compressedSize / 1024)}KB WebP)`, type: 'success' });
        setAccounts(prev => prev.map(a =>
          a.id === accountId ? { ...a, profile_photo_url: data.url } : a
        ));
      } else {
        setToast({ message: data.error, type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal mengupload foto', type: 'error' });
    }
  };

  const hasPasswords = accounts.some(a => a.password_plain);

  return (
    <main className="min-h-dvh p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto page-pt md:pt-16 pb-24 font-outfit bg-transparent">
      <header className="mb-6 md:mb-10">
        <button 
          type="button" 
          onClick={onBack} 
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary font-sans text-xs font-bold uppercase tracking-wider transition-all mb-4 bg-surface-variant px-4 py-2.5 rounded-xl border border-outline-variant hover:border-primary/20 min-h-[38px]"
        >
          <ArrowLeft size={14} /> Beranda
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight flex items-center gap-3 font-outfit">
          <KeyRound className="text-primary" size={28} /> Manajemen Akun Siswa
        </h1>
        <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest mt-1.5">Buat, kelola, dan ekspor kredensial login siswa</p>
      </header>

      {/* Class Selector */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-5 mb-6 shadow-sm">
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pilih Kelas</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
        >
          <option value="" className="text-on-surface-variant">-- Pilih Kelas --</option>
          {availableClasses.map(c => <option key={c} value={c} className="text-on-surface">{c}</option>)}
        </select>
      </div>

      {/* Action Buttons */}
      {selectedClass && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white border border-primary/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] hover:bg-primary/95 disabled:opacity-50 min-h-[44px]"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Generate
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || accounts.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 min-h-[44px]"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export Excel
          </button>
          <button
            onClick={handleClearPasswords}
            disabled={isClearing || !hasPasswords}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 min-h-[44px]"
          >
            {isClearing ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Hapus Password
          </button>
          <button
            onClick={() => {
              setPromoteToClass('');
              setPromoteToYear(getNextAcademicYear(activeYear));
              setShowPromoteModal(true);
            }}
            disabled={accounts.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 min-h-[44px]"
          >
            <TrendingUp size={16} />
            Kenaikan Kelas
          </button>
          <div className="hidden md:flex items-center justify-center px-4 py-3 bg-surface border border-outline-variant rounded-xl text-xs font-bold text-on-surface-variant uppercase tracking-wider min-h-[44px]">
            <Users size={16} className="mr-2 text-primary" /> {accounts.length} Akun
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface border border-outline-variant rounded-xl p-4 animate-pulse flex gap-4 items-center">
              <div className="w-12 h-12 bg-surface-container-highest rounded-xl shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-surface-container-highest rounded-full w-2/3" />
                <div className="h-3 bg-surface-variant rounded-full w-1/3" />
              </div>
            </div>
          ))
        ) : accounts.length > 0 ? (
          accounts.map((account, idx) => (
            <div key={account.id} className="bg-surface border border-outline-variant hover:border-primary/30 rounded-xl p-4 shadow-sm hover:shadow transition-all duration-200">
              <div className="flex items-center gap-4">
                {/* Photo / Avatar */}
                <div className="relative group shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-variant border border-outline-variant flex items-center justify-center">
                    {account.profile_photo_url ? (
                      <img
                        src={account.profile_photo_url}
                        alt={account.student_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-base font-black text-primary font-outfit">{(account.student_name || 'S').charAt(0)}</span>
                    )}
                  </div>
                  <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black/60 rounded-xl flex items-center justify-center transition-opacity">
                    <Camera size={16} className="text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(account.id, file);
                      }}
                    />
                  </label>
                </div>

                {/* Info */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-on-surface truncate font-sans">{account.student_name}</h3>
                    <span className="text-[10px] font-bold text-on-surface-variant/40 bg-surface-variant px-1.5 py-0.5 rounded font-mono">#{idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-primary">@{account.username}</span>
                    {account.password_plain ? (
                      <span className="text-xs font-mono bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-bold">{account.password_plain}</span>
                    ) : (
                      <span className="text-[11px] font-bold text-on-surface-variant/60 flex items-center gap-1">
                        <ShieldCheck size={12} className="text-emerald-500" /> Tersimpan
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="p-2 text-on-surface-variant/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all shrink-0 min-h-[38px] flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : selectedClass ? (
          <div className="py-20 text-center bg-surface border border-dashed border-outline-variant rounded-2xl">
            <Users size={48} className="mx-auto text-on-surface-variant/40 mb-4 stroke-1" />
            <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Belum ada akun untuk kelas ini</p>
            <p className="text-xs text-on-surface-variant/60 mt-1">Klik tombol **"Generate"** di atas untuk membuat akun otomatis secara instan.</p>
          </div>
        ) : (
          <div className="py-20 text-center bg-surface border border-dashed border-outline-variant rounded-2xl">
            <KeyRound size={48} className="mx-auto text-on-surface-variant/40 mb-4 stroke-1" />
            <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Silakan pilih kelas terlebih dahulu</p>
            <p className="text-xs text-on-surface-variant/60 mt-1">Gunakan pemilih kelas di atas untuk memulai pengelolaan kredensial siswa.</p>
          </div>
        )}
      </div>

      {/* Security Notice */}
      {hasPasswords && accounts.length > 0 && (
        <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Password Masih Tersimpan</h4>
            <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
              Segera ekspor ke Excel lalu klik **"Hapus Password"** untuk keamanan. Password plain hanya bersifat sementara sebelum akun diklaim siswa.
            </p>
          </div>
        </div>
      )}

      {/* Modal Kenaikan Kelas */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-surface border border-outline-variant rounded-[2rem] p-6 max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-bold text-on-surface mb-2 flex items-center gap-2 font-outfit">
              <TrendingUp className="text-indigo-600" size={20} /> Kenaikan Kelas Siswa
            </h3>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed text-left">
              Pindahkan seluruh siswa kelas <span className="text-primary font-bold">{selectedClass}</span> ({activeYear}) secara massal ke kelas dan tahun ajaran baru di bawah ini.
            </p>
            
            <div className="space-y-4 mb-6 text-left">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Kelas Baru (Tujuan)</label>
                <input
                  type="text"
                  value={promoteToClass}
                  onChange={(e) => setPromoteToClass(e.target.value.toUpperCase())}
                  placeholder="Misal: 8A"
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3.5 text-sm font-bold text-on-surface outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tahun Ajaran Baru (Tujuan)</label>
                <input
                  type="text"
                  value={promoteToYear}
                  onChange={(e) => setPromoteToYear(e.target.value)}
                  placeholder="Misal: 2026/2027"
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3.5 text-sm font-bold text-on-surface outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPromoteModal(false)}
                type="button"
                className="flex-1 py-3 bg-surface-variant border border-outline-variant hover:bg-surface-container-highest rounded-xl text-xs font-bold uppercase tracking-wider text-on-surface transition-all active:scale-[0.97] min-h-[44px]"
              >
                Batal
              </button>
              <button
                onClick={handlePromote}
                disabled={!promoteToClass.trim() || !promoteToYear.trim() || isPromoting}
                type="button"
                className="flex-1 py-3 bg-primary hover:bg-primary-dim disabled:opacity-50 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {isPromoting ? <Loader2 size={14} className="animate-spin" /> : "Konfirmasi Naik"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
