"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Users, Download, Trash2, Shield, Loader2,
  UserPlus, ShieldCheck, Camera, AlertCircle, CheckCircle2,
  KeyRound, Image as ImageIcon
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
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Ukuran foto maksimal 5MB', type: 'error' });
      return;
    }

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
    <div className="min-h-screen bg-slate-950 p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto pt-16 pb-24 md:pb-8">
      <header className="mb-6 md:mb-10">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-[#00b4ff] font-sans text-[13px] font-medium transition-all mb-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:border-[#00b4ff]/20">
          <ArrowLeft size={14} /> Beranda
        </button>
        <h1 className="text-xl md:text-3xl font-sans font-bold text-white tracking-[-0.5px] flex items-center gap-3">
          <KeyRound className="text-[#00b4ff]" size={24} /> Manajemen Akun Siswa
        </h1>
        <p className="text-[13px] text-slate-500 font-sans mt-1">Buat, kelola, dan ekspor kredensial login siswa</p>
      </header>

      {/* Class Selector */}
      <div className="bg-[#111113] rounded-2xl p-4 border border-white/10 mb-6 shadow-xl shadow-black/20">
        <label className="block text-[12px] font-sans font-medium text-slate-400 mb-2">Pilih Kelas</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-[15px] font-sans font-medium text-white outline-none focus:border-[#00b4ff]/50 transition-all appearance-none"
        >
          <option value="">-- Pilih Kelas --</option>
          {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Action Buttons */}
      {selectedClass && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-[#00b4ff]/10 text-[#00b4ff] border border-[#00b4ff]/20 rounded-2xl text-[13px] font-sans font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Generate
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || accounts.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl text-[13px] font-sans font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export Excel
          </button>
          <button
            onClick={handleClearPasswords}
            disabled={isClearing || !hasPasswords}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl text-[13px] font-sans font-semibold transition-all active:scale-[0.97] disabled:opacity-50 col-span-2 md:col-span-1"
          >
            {isClearing ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Hapus Password
          </button>
          <div className="hidden md:flex items-center justify-center px-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-[13px] font-sans font-medium text-slate-500">
            <Users size={16} className="mr-2" /> {accounts.length} Akun
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#111113] border border-white/5 rounded-2xl p-4 animate-pulse flex gap-4 items-center">
              <div className="w-12 h-12 bg-white/5 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-white/10 rounded-full w-2/3" />
                <div className="h-3 bg-white/5 rounded-full w-1/3" />
              </div>
            </div>
          ))
        ) : accounts.length > 0 ? (
          accounts.map((account, idx) => (
            <div key={account.id} className="bg-[#111113] border border-white/10 rounded-2xl p-4 shadow-lg shadow-black/20 transition-all active:scale-[0.99]">
              <div className="flex items-center gap-4">
                {/* Photo / Avatar */}
                <div className="relative group shrink-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                    {account.profile_photo_url ? (
                      <img
                        src={account.profile_photo_url}
                        alt={account.student_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-lg font-bold text-slate-600">{account.student_name.charAt(0)}</span>
                    )}
                  </div>
                  <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black/60 rounded-2xl flex items-center justify-center transition-opacity">
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
                    <h3 className="text-[15px] font-sans font-semibold text-white truncate">{account.student_name}</h3>
                    <span className="text-[11px] font-sans text-slate-500">#{idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[12px] font-sans text-[#00b4ff] font-medium">@{account.username}</span>
                    {account.password_plain ? (
                      <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-500/20">{account.password_plain}</span>
                    ) : (
                      <span className="text-[11px] font-sans text-slate-600 flex items-center gap-1">
                        <ShieldCheck size={10} /> Tersimpan
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="p-2 text-slate-600 hover:text-rose-500 rounded-xl transition-colors active:bg-white/5 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : selectedClass ? (
          <div className="py-20 text-center">
            <Users size={48} className="mx-auto text-slate-700 mb-4 stroke-1" />
            <p className="text-[14px] font-sans font-medium text-slate-500">Belum ada akun untuk kelas ini</p>
            <p className="text-[12px] font-sans text-slate-600 mt-1">Klik "Generate" untuk membuat akun otomatis</p>
          </div>
        ) : (
          <div className="py-20 text-center">
            <KeyRound size={48} className="mx-auto text-slate-700 mb-4 stroke-1" />
            <p className="text-[14px] font-sans font-medium text-slate-500">Pilih kelas untuk memulai</p>
          </div>
        )}
      </div>

      {/* Security Notice */}
      {hasPasswords && accounts.length > 0 && (
        <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-sans font-semibold text-amber-400">Password Masih Tersimpan</h4>
            <p className="text-[12px] font-sans text-slate-400 mt-0.5 leading-relaxed">
              Segera ekspor ke Excel lalu klik "Hapus Password" untuk keamanan. Password plain hanya bersifat sementara.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
