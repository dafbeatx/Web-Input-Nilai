"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  ArrowLeft, Users, Download, Trash2, Shield, Loader2,
  UserPlus, ShieldCheck, Camera, AlertCircle,
  KeyRound, TrendingUp, RotateCcw, CheckCircle2, AlertTriangle,
  Copy, Check, X
} from 'lucide-react';
import { ToastType, StudentAccount, isImageUrl } from '@/lib/grademaster/types';

interface StudentAccountsLayerProps {
  onBack: () => void;
  setToast: (t: ToastType) => void;
  activeClass?: string;
  activeYear?: string;
  onPromoteSuccess?: (newClass: string, newYear: string) => void;
}

export default function StudentAccountsLayer({
  onBack,
  setToast,
  activeClass = '',
  activeYear = '2026/2027',
  onPromoteSuccess
}: StudentAccountsLayerProps) {
  const [accounts, setAccounts] = useState<StudentAccount[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState(activeClass);
  const [selectedYear, setSelectedYear] = useState(activeYear);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteToClass, setPromoteToClass] = useState('');
  const [promoteToYear, setPromoteToYear] = useState('');
  const [promoteToClassSelect, setPromoteToClassSelect] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [lastPromotedInfo, setLastPromotedInfo] = useState<{ fromClass: string; toClass: string; toYear: string } | null>(null);
  const [hasBehaviors, setHasBehaviors] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetScope, setResetScope] = useState<'class' | 'all'>('class');
  const [resetGoogle, setResetGoogle] = useState(true);
  const [resetConfirmationInput, setResetConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // States untuk Reset Password per Siswa & Kelas
  const [resettingAccount, setResettingAccount] = useState<StudentAccount | null>(null);
  const [resetCustomPassword, setResetCustomPassword] = useState('');
  const [isResettingSingle, setIsResettingSingle] = useState(false);
  const [singleResetSuccess, setSingleResetSuccess] = useState<string | null>(null);
  const [copiedResetPass, setCopiedResetPass] = useState(false);
  const [isRegeneratingClass, setIsRegeneratingClass] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedYear(activeYear);
    });
  }, [activeYear]);

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

  const getDefaultDestinationClass = (current: string) => {
    if (!current) return '';
    if (current.startsWith('7')) {
      return current.replace(/^7/, '8');
    } else if (current.startsWith('8')) {
      return current.replace(/^8/, '9');
    } else if (current.startsWith('9')) {
      return 'LULUS';
    }
    return '';
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
          fromYear: selectedYear,
          toYear: promoteToYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const promotedClass = promoteToClass;
        const promotedYear = promoteToYear;
        const fromCls = selectedClass;
        setLastPromotedInfo({ fromClass: fromCls, toClass: promotedClass, toYear: promotedYear });
        setToast({ 
          message: `Siswa telah dipindahkan ke ${promotedClass} (${promotedYear}). Ubah filter tahun ajaran untuk melihatnya.`, 
          type: 'success' 
        });
        setShowPromoteModal(false);
        setPromoteToClass('');
        if (onPromoteSuccess) {
          onPromoteSuccess(promotedClass, promotedYear);
        }
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

  const handleResetAccounts = async () => {
    if (resetConfirmationInput.trim().toUpperCase() !== 'RESET' || isResetting) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/grademaster/student-accounts/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: resetScope,
          className: selectedClass,
          academicYear: selectedYear,
          resetGoogle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ message: data.message || 'Akun siswa berhasil direset', type: 'success' });
        setShowResetModal(false);
        setResetConfirmationInput('');
        setAccounts([]);
        fetchClasses();
        fetchAccounts();
      } else {
        setToast({ message: data.error || 'Gagal mereset akun siswa', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan saat mereset akun siswa', type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  const fetchClasses = useCallback(async () => {
    try {
      const [behRes, accRes] = await Promise.all([
        fetch(`/api/grademaster/behaviors?year=${encodeURIComponent(selectedYear)}`),
        fetch(`/api/grademaster/student-accounts?mode=classes&year=${encodeURIComponent(selectedYear)}`)
      ]);
      const behData = behRes.ok ? await behRes.json() : { classes: [] };
      const accData = accRes.ok ? await accRes.json() : { classes: [] };
      
      const merged = Array.from(new Set([
        ...(behData.classes || []),
        ...(accData.classes || [])
      ])).sort();
      
      setAvailableClasses(merged);
    } catch {
      // silent
    }
  }, [selectedYear]);

  // Cek apakah ada data behaviors (roster siswa) untuk kelas yang dipilih
  const fetchBehaviorCount = useCallback(async () => {
    if (!selectedClass) {
      setHasBehaviors(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/grademaster/behaviors?class=${encodeURIComponent(selectedClass)}&year=${encodeURIComponent(selectedYear)}&countOnly=true`
      );
      if (res.ok) {
        const data = await res.json();
        setHasBehaviors((data.count || data.students?.length || 0) > 0);
      }
    } catch {
      setHasBehaviors(false);
    }
  }, [selectedClass, selectedYear]);

  const fetchAccounts = useCallback(async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/grademaster/student-accounts?class=${encodeURIComponent(selectedClass)}&year=${encodeURIComponent(selectedYear)}`
      );
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts || []);
      } else {
        setToast({ message: data.error || 'Gagal memuat akun', type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal memuat akun siswa', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedYear, setToast]);

  useEffect(() => { queueMicrotask(() => fetchClasses()); }, [fetchClasses]);
  useEffect(() => { queueMicrotask(() => fetchAccounts()); }, [fetchAccounts]);
  useEffect(() => { queueMicrotask(() => fetchBehaviorCount()); }, [fetchBehaviorCount]);
  
  useEffect(() => {
    if (activeClass) {
      queueMicrotask(() => {
        setSelectedClass(activeClass);
      });
    }
  }, [activeClass]);

  const handleGenerate = async () => {
    if (!selectedClass || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/grademaster/student-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: selectedClass, academicYear: selectedYear }),
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
        ? `/api/grademaster/student-accounts/export?class=${encodeURIComponent(selectedClass)}&year=${encodeURIComponent(selectedYear)}`
        : `/api/grademaster/student-accounts/export?year=${encodeURIComponent(selectedYear)}`;

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Export gagal');
      }

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `akun-siswa-${selectedClass || 'semua'}-${selectedYear.replace('/', '-')}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);

      setToast({ message: 'File Excel berhasil diunduh', type: 'success' });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setToast({ message: errMsg || 'Gagal mengekspor', type: 'error' });
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
        body: JSON.stringify({ className: selectedClass, academicYear: selectedYear }),
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

  const handleDeleteAccount = async (account: StudentAccount) => {
    if (!window.confirm(`Hapus akun dan data siswa "${account.student_name}" secara permanen? Data yang dihapus tidak akan muncul kembali.`)) {
      return;
    }
    try {
      const res = await fetch('/api/grademaster/student-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message || 'Akun siswa berhasil dihapus', type: 'success' });
        setAccounts(prev => prev.filter(a => a.id !== account.id && a.student_name.trim().toLowerCase() !== account.student_name.trim().toLowerCase()));
        fetchBehaviorCount();
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

  const handleResetStudentPassword = async () => {
    if (!resettingAccount || isResettingSingle) return;
    setIsResettingSingle(true);
    try {
      const res = await fetch('/api/grademaster/student-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: resettingAccount.id,
          customPassword: resetCustomPassword.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const newPass = data.newPassword || data.account?.password_plain;
        setSingleResetSuccess(newPass);
        setToast({
          message: `Kata sandi ${resettingAccount.student_name} berhasil diubah!`,
          type: 'success'
        });
        setAccounts(prev => prev.map(a => 
          a.id === resettingAccount.id ? { ...a, password_plain: newPass } : a
        ));
      } else {
        setToast({ message: data.error || 'Gagal mereset kata sandi', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan sistem saat mereset kata sandi', type: 'error' });
    } finally {
      setIsResettingSingle(false);
    }
  };

  const handleCopyResetPass = async (pass: string) => {
    try {
      await navigator.clipboard.writeText(pass);
      setCopiedResetPass(true);
      setTimeout(() => setCopiedResetPass(false), 2000);
      setToast({ message: 'Kata sandi berhasil disalin ke clipboard!', type: 'success' });
    } catch {
      setToast({ message: 'Gagal menyalin kata sandi', type: 'error' });
    }
  };

  const handleRegenerateClassPasswords = async () => {
    if (!selectedClass || isRegeneratingClass) return;
    if (!window.confirm(`Buat ulang kata sandi baru untuk seluruh siswa di Kelas ${selectedClass}? Kata sandi baru akan tersimpan dan dapat langsung diekspor ke Excel.`)) {
      return;
    }
    setIsRegeneratingClass(true);
    try {
      const res = await fetch('/api/grademaster/student-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className: selectedClass,
          academicYear: selectedYear,
          regenerateMissingPasswords: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message || 'Semua kata sandi berhasil dibuat ulang', type: 'success' });
        fetchAccounts();
      } else {
        setToast({ message: data.error || 'Gagal membuat ulang kata sandi', type: 'error' });
      }
    } catch {
      setToast({ message: 'Terjadi kesalahan sistem saat membuat ulang kata sandi', type: 'error' });
    } finally {
      setIsRegeneratingClass(false);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight flex items-center gap-3 font-outfit">
              <KeyRound className="text-primary" size={28} /> Manajemen Akun Siswa
            </h1>
            <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest mt-1.5">Buat, kelola, dan ekspor kredensial login siswa</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setResetScope(selectedClass ? 'class' : 'all');
              setResetConfirmationInput('');
              setShowResetModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] min-h-[44px] self-start sm:self-auto"
          >
            <RotateCcw size={16} /> Reset Akun Siswa
          </button>
        </div>
      </header>

      {/* Filters: Class and Academic Year */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tahun Ajaran</label>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedClass('');
              setAccounts([]);
            }}
            className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="2026/2027">2026/2027</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2027/2028">2027/2028</option>
          </select>
        </div>

        <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm">
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
      </div>

      {/* Action Buttons */}
      {selectedClass && (
        <div className="flex flex-wrap items-center gap-2.5 mb-6">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white border border-primary/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] hover:bg-primary/95 disabled:opacity-50 min-h-[42px] cursor-pointer"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Generate
          </button>
          {accounts.length > 0 && !hasPasswords && (
            <button
              onClick={handleRegenerateClassPasswords}
              disabled={isRegeneratingClass}
              title="Buat kata sandi baru untuk seluruh siswa di kelas ini agar bisa dibagikan"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 min-h-[42px] cursor-pointer"
            >
              {isRegeneratingClass ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              Buat Ulang Sandi
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={isExporting || accounts.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 min-h-[42px] cursor-pointer"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export Excel
          </button>
          <button
            onClick={handleClearPasswords}
            disabled={isClearing || !hasPasswords}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 min-h-[42px] cursor-pointer"
          >
            {isClearing ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Hapus Password
          </button>
          {accounts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setResetScope('class');
                setResetConfirmationInput('');
                setShowResetModal(true);
              }}
              title="Reset seluruh akun siswa kelas ini agar siswa dapat mendaftar ulang di halaman login"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 min-h-[42px] cursor-pointer"
            >
              <RotateCcw size={16} />
              Reset Akun Kelas
            </button>
          )}
          <button
            onClick={() => {
              const defClass = getDefaultDestinationClass(selectedClass);
              setPromoteToClass(defClass);
              setPromoteToClassSelect(defClass);
              setPromoteToYear(getNextAcademicYear(selectedYear));
              setShowPromoteModal(true);
            }}
            disabled={accounts.length === 0 && !hasBehaviors}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 min-h-[42px] cursor-pointer"
          >
            <TrendingUp size={16} />
            Kenaikan Kelas
          </button>
          <button
            onClick={() => {
              setResetScope('class');
              setResetConfirmationInput('');
              setShowResetModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] min-h-[42px] cursor-pointer"
          >
            <RotateCcw size={16} />
            Reset Akun
          </button>
          <div className="flex items-center justify-center px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-xs font-bold text-on-surface-variant uppercase tracking-wider min-h-[42px] ml-auto">
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
                    {account.profile_photo_url && isImageUrl(account.profile_photo_url) ? (
                      <Image
                        src={account.profile_photo_url}
                        alt={account.student_name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-base font-black text-primary font-outfit">{account.profile_photo_url || (account.student_name || 'S').charAt(0)}</span>
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

                {/* Actions: Reset Password & Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setResettingAccount(account);
                      setResetCustomPassword('');
                      setSingleResetSuccess(null);
                      setCopiedResetPass(false);
                    }}
                    title="Buat ulang kata sandi untuk siswa ini"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all active:scale-[0.97] min-h-[38px] cursor-pointer"
                  >
                    <KeyRound size={14} />
                    <span className="hidden sm:inline">Reset Sandi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(account)}
                    title="Hapus Akun Siswa"
                    className="p-2 text-on-surface-variant/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all shrink-0 min-h-[38px] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : selectedClass ? (
          <div className="py-20 text-center bg-surface border border-dashed border-outline-variant rounded-2xl px-4">
            {lastPromotedInfo && lastPromotedInfo.fromClass === selectedClass ? (
              <div className="max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp size={24} />
                </div>
                <p className="text-sm font-bold text-on-surface uppercase tracking-wider">Kenaikan Kelas Berhasil Diproses</p>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  Siswa kelas <strong className="text-primary">{selectedClass}</strong> telah dipindahkan ke <strong className="text-primary">{lastPromotedInfo.toClass}</strong> ({lastPromotedInfo.toYear}). Ubah filter kelas atau tahun ajaran di atas untuk melihat data siswa.
                </p>
              </div>
            ) : (
              <>
                <Users size={48} className="mx-auto text-on-surface-variant/40 mb-4 stroke-1" />
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Belum ada akun untuk kelas ini</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">Klik tombol &quot;Generate&quot; di atas untuk membuat akun otomatis secara instan.</p>
              </>
            )}
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
              Segera ekspor ke Excel lalu klik &quot;Hapus Password&quot; untuk keamanan. Password plain hanya bersifat sementara sebelum akun diklaim siswa.
            </p>
          </div>
        </div>
      )}

      {/* Modal Kenaikan Kelas */}
      {showPromoteModal && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => {
            if (!isPromoting && e.target === e.currentTarget) {
              setShowPromoteModal(false);
            }
          }}
        >
          <div className="bg-surface border border-outline-variant rounded-[2rem] p-6 max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-bold text-on-surface mb-2 flex items-center gap-2 font-outfit">
              <TrendingUp className="text-indigo-600" size={20} /> Kenaikan Kelas Siswa
            </h3>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed text-left">
              Akan menaikkan <span className="text-primary font-bold">{accounts.length} siswa</span> dari kelas <span className="text-primary font-bold">{selectedClass}</span> ({selectedYear}) ke kelas baru dan tahun ajaran baru di bawah ini.
            </p>
            
            <div className="space-y-4 mb-6 text-left">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Kelas Baru (Tujuan)</label>
                <select
                  value={promoteToClassSelect}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPromoteToClassSelect(val);
                    if (val !== '__custom__') {
                      setPromoteToClass(val);
                    } else {
                      setPromoteToClass('');
                    }
                  }}
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3.5 text-sm font-bold text-on-surface outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer mb-3"
                >
                  <option value="" className="text-on-surface-variant">-- Pilih Kelas Tujuan --</option>
                  
                  {/* Logical next class */}
                  {(() => {
                    if (!selectedClass) return null;
                    let nextSuggested = '';
                    if (selectedClass.startsWith('7')) {
                      nextSuggested = selectedClass.replace(/^7/, '8');
                    } else if (selectedClass.startsWith('8')) {
                      nextSuggested = selectedClass.replace(/^8/, '9');
                    } else if (selectedClass.startsWith('9')) {
                      nextSuggested = 'LULUS';
                    }
                    if (nextSuggested && nextSuggested !== 'LULUS') {
                      return <option value={nextSuggested}>Rekomendasi: {nextSuggested}</option>;
                    }
                    return null;
                  })()}
                  
                  {/* LULUS option */}
                  <option value="LULUS">🎓 LULUS (Lulus / Tamat)</option>
                  
                  {/* Existing classes */}
                  {availableClasses.filter(c => c !== selectedClass && c !== 'LULUS').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  
                  <option value="__custom__">✍️ Kustom (Tulis Manual)</option>
                </select>

                {promoteToClassSelect === '__custom__' && (
                  <input
                    type="text"
                    value={promoteToClass}
                    onChange={(e) => setPromoteToClass(e.target.value.toUpperCase())}
                    placeholder="Masukkan kelas kustom (misal: 8A, SMA)"
                    className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3.5 text-sm font-bold text-on-surface outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                )}
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
                disabled={isPromoting}
                type="button"
                className="flex-1 py-3 bg-surface-variant border border-outline-variant hover:bg-surface-container-highest rounded-xl text-xs font-bold uppercase tracking-wider text-on-surface transition-all active:scale-[0.97] min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                onClick={handlePromote}
                disabled={!promoteToClass.trim() || !promoteToYear.trim() || isPromoting}
                type="button"
                className="flex-1 py-3 bg-primary hover:bg-primary-dim disabled:opacity-50 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {isPromoting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Memindahkan...</span>
                  </>
                ) : "Konfirmasi Naik"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Akun Siswa */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-surface border border-outline-variant rounded-[2rem] p-6 max-w-lg w-full relative shadow-2xl animate-in zoom-in-95 duration-300 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface font-outfit">
                  Reset Akun Siswa
                </h3>
                <p className="text-xs text-on-surface-variant font-sans">
                  Hapus kredensial login dan sesi siswa untuk pendaftaran ulang mandiri.
                </p>
              </div>
            </div>

            {/* Guaranteed Data Safety Banner */}
            <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 leading-relaxed">
                <span className="font-bold block text-emerald-900 mb-0.5">Data Nilai & Perilaku Dijamin Aman</span>
                Nilai ujian (UTS/UAS), rekap remedial, kehadiran, dan poin perilaku siswa (behaviour) dijamin 100% utuh dan tidak akan hilang. Hanya kredensial login akun yang direset.
              </div>
            </div>

            {/* Scope Selection */}
            <div className="space-y-3 mb-4">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Pilih Cakupan Reset
              </label>

              {selectedClass ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResetScope('class')}
                    className={`p-3 rounded-xl border text-left transition-all min-h-[44px] ${
                      resetScope === 'class'
                        ? 'border-primary bg-primary/5 text-on-surface font-bold shadow-sm'
                        : 'border-outline-variant bg-surface-variant text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    <div className="text-xs font-bold text-on-surface">Kelas {selectedClass}</div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">{accounts.length} akun siswa</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetScope('all')}
                    className={`p-3 rounded-xl border text-left transition-all min-h-[44px] ${
                      resetScope === 'all'
                        ? 'border-rose-500 bg-rose-500/5 text-on-surface font-bold shadow-sm'
                        : 'border-outline-variant bg-surface-variant text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    <div className="text-xs font-bold text-rose-600">Semua Kelas</div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">Seluruh akun siswa di sistem</div>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-surface-variant border border-outline-variant rounded-xl text-xs font-bold text-on-surface">
                  Semua Kelas (Seluruh Akun Siswa di Sistem)
                </div>
              )}
            </div>

            {/* Google Reset Option */}
            <div className="mb-4 p-3 bg-surface-variant/70 border border-outline-variant rounded-xl flex items-start gap-3">
              <input
                id="reset-google-checkbox"
                type="checkbox"
                checked={resetGoogle}
                onChange={(e) => setResetGoogle(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 border-outline-variant focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="reset-google-checkbox" className="text-xs cursor-pointer select-none">
                <span className="font-bold text-on-surface block">Reset sesi login Google siswa</span>
                <span className="text-on-surface-variant text-[11px] leading-relaxed block mt-0.5">
                  Siswa yang login lewat Google akan direset tautannya sehingga dapat menautkan kembali atau membuat profil baru.
                </span>
              </label>
            </div>

            {/* Confirmation input */}
            <div className="mb-5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1.5">
                <AlertTriangle size={14} /> Konfirmasi Keamanan
              </label>
              <p className="text-xs text-on-surface-variant mb-2">
                Ketik kata <span className="font-mono font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">RESET</span> dengan huruf kapital untuk membuka tombol konfirmasi:
              </p>
              <input
                type="text"
                value={resetConfirmationInput}
                onChange={(e) => setResetConfirmationInput(e.target.value)}
                placeholder="Ketik RESET"
                className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm font-mono font-bold text-on-surface tracking-wider outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all uppercase min-h-[44px]"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmationInput('');
                }}
                disabled={isResetting}
                className="flex-1 py-3 bg-surface-variant border border-outline-variant hover:bg-surface-container-highest rounded-xl text-xs font-bold uppercase tracking-wider text-on-surface transition-all active:scale-[0.97] min-h-[44px] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetAccounts}
                disabled={resetConfirmationInput.trim() !== 'RESET' || isResetting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {isResetting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mereset...
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    Ya, Reset Akun
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Password Per Siswa */}
      {resettingAccount && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isResettingSingle) {
              setResettingAccount(null);
            }
          }}
        >
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-2xl shadow-xl overflow-hidden p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <KeyRound size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-on-surface font-outfit truncate">Reset Kata Sandi Siswa</h3>
                  <p className="text-[11px] font-medium text-on-surface-variant/70 truncate">Buat atau tentukan kata sandi baru</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResettingAccount(null)}
                disabled={isResettingSingle}
                className="p-1.5 text-on-surface-variant/50 hover:text-on-surface rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {singleResetSuccess ? (
              <div className="space-y-4 animate-in fade-in duration-200 text-center py-2">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 size={26} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-on-surface font-outfit">Kata Sandi Berhasil Dibuat Ulang!</h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Siswa: <strong className="text-on-surface">{resettingAccount.student_name}</strong> (@{resettingAccount.username})
                  </p>
                </div>
                <div className="p-3 bg-surface-variant border border-outline-variant rounded-xl flex items-center justify-between gap-3 min-h-[48px]">
                  <span className="font-mono text-base font-bold text-indigo-600 tracking-wider select-all truncate pl-1">
                    {singleResetSuccess}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyResetPass(singleResetSuccess)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[36px]"
                  >
                    {copiedResetPass ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedResetPass ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setResettingAccount(null)}
                  className="w-full py-2.5 bg-surface-variant hover:bg-surface-variant/80 text-on-surface rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[42px]"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-surface-variant border border-outline-variant rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-on-surface-variant">Nama Siswa:</span>
                    <span className="font-bold text-on-surface truncate">{resettingAccount.student_name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-on-surface-variant">Kelas:</span>
                    <span className="font-bold text-on-surface">{resettingAccount.class_name} ({resettingAccount.academic_year})</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-on-surface-variant">Username:</span>
                    <span className="font-mono font-bold text-primary truncate">@{resettingAccount.username}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Kata Sandi Baru (Opsional)
                  </label>
                  <input
                    type="text"
                    value={resetCustomPassword}
                    onChange={(e) => setResetCustomPassword(e.target.value)}
                    placeholder="Kosongkan untuk kata sandi acak otomatis..."
                    className="w-full px-3.5 py-2.5 bg-surface-variant border border-outline-variant rounded-xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-all min-h-[44px]"
                  />
                  <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                    Biarkan kosong jika ingin dibuatkan kata sandi acak 8 karakter secara otomatis.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setResettingAccount(null)}
                    disabled={isResettingSingle}
                    className="flex-1 py-2.5 bg-surface-variant hover:bg-surface-variant/80 text-on-surface rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleResetStudentPassword}
                    disabled={isResettingSingle}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[44px]"
                  >
                    {isResettingSingle ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                    <span>Simpan Kata Sandi</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
