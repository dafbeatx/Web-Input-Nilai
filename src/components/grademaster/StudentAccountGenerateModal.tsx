"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { ToastType } from '@/lib/grademaster/types';

interface StudentAccountGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: (account: {
    username: string;
    password: string;
    studentName: string;
    className: string;
  }) => void;
  setToast: (t: ToastType) => void;
}

interface StudentItem {
  id: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  has_account: boolean;
  username?: string;
}

function getPreviewUsername(name: string, className: string): string {
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');

  const classSuffix = className
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return `${cleanName}.${classSuffix}`;
}

export default function StudentAccountGenerateModal({
  isOpen,
  onClose,
  onAccountCreated,
  setToast
}: StudentAccountGenerateModalProps) {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [createdAccount, setCreatedAccount] = useState<{
    student_name: string;
    class_name: string;
    username: string;
    password: string;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  const handleClose = useCallback(() => {
    setSelectedClass('');
    setStudents([]);
    setSelectedStudentName('');
    setStudentSearch('');
    setCustomPassword('');
    setShowPassword(false);
    setErrorMessage('');
    setCreatedAccount(null);
    setCopiedField(null);
    onClose();
  }, [onClose]);

  // Ambil daftar kelas saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchClasses() {
      setIsLoadingClasses(true);
      setErrorMessage('');
      try {
        const res = await fetch('/api/student/generate-account?action=classes&year=2026/2027');
        const data = await res.json();
        if (res.ok && isMounted) {
          setClasses(data.classes || []);
          if (data.classes && data.classes.length > 0) {
            setSelectedClass(data.classes[0]);
          }
        } else if (isMounted) {
          setErrorMessage(data.error || 'Gagal memuat daftar kelas');
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Terjadi gangguan jaringan saat memuat kelas');
        }
      } finally {
        if (isMounted) setIsLoadingClasses(false);
      }
    }

    fetchClasses();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Ambil daftar siswa ketika kelas dipilih untuk tahun ajaran aktif 2026/2027
  const fetchStudents = useCallback(async (className: string) => {
    if (!className) return;
    setIsLoadingStudents(true);
    setErrorMessage('');
    setSelectedStudentName('');
    setStudentSearch('');
    setCustomPassword('');
    try {
      const res = await fetch(
        `/api/student/generate-account?action=students&class=${encodeURIComponent(className)}&year=2026/2027`
      );
      const data = await res.json();
      if (res.ok) {
        // Jaminan satu nama saja (deduplikasi ketat)
        const seen = new Set<string>();
        const uniqueList: StudentItem[] = [];
        for (const s of (data.students || [])) {
          const key = s.student_name.trim().toUpperCase();
          if (!seen.has(key)) {
            seen.add(key);
            uniqueList.push(s);
          }
        }
        setStudents(uniqueList);
      } else {
        setErrorMessage(data.error || 'Gagal memuat data siswa');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat memuat siswa');
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !selectedClass) return;
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        fetchStudents(selectedClass);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedClass, fetchStudents]);

  // Handle tombol Escape untuk menutup modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Handle pendaftaran akun siswa
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedStudentName || isSubmitting) return;

    if (!customPassword.trim()) {
      setErrorMessage('Kata sandi wajib diisi agar akun Anda aman');
      return;
    }

    if (customPassword.trim().length < 4) {
      setErrorMessage('Kata sandi minimal 4 karakter');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/student/generate-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_name: selectedClass,
          student_name: selectedStudentName,
          academic_year: '2026/2027',
          password: customPassword.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendaftarkan akun siswa');
      }

      setCreatedAccount({
        student_name: data.account.student_name,
        class_name: data.account.class_name,
        username: data.account.username,
        password: data.account.password
      });

      setToast({
        message: `Pendaftaran berhasil! Akun untuk ${data.account.student_name} siap digunakan.`,
        type: 'success'
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftarkan akun siswa';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, field: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      setToast({
        message: `${field === 'username' ? 'Username' : 'Kata sandi'} disalin ke clipboard!`,
        type: 'success'
      });
    } catch {
      setToast({
        message: 'Gagal menyalin otomatis',
        type: 'error'
      });
    }
  };

  if (!isOpen) return null;

  // Siswa yang difilter berdasarkan pencarian nama
  const filteredStudents = students.filter((s) =>
    s.student_name.toLowerCase().includes(studentSearch.toLowerCase().trim())
  );

  const eligibleCount = students.filter((s) => !s.has_account).length;
  const previewUsername = selectedStudentName && selectedClass 
    ? getPreviewUsername(selectedStudentName, selectedClass) 
    : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <UserPlus size={18} />
            </div>
            <div className="min-w-0">
              <h2 id="modal-title" className="text-sm font-bold text-slate-900 font-outfit truncate">
                Daftar Akun Siswa
              </h2>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Username otomatis disediakan, kata sandi bebas ditentukan sendiri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Tutup jendela pendaftaran"
          >
            <X size={18} />
          </button>
        </div>

        {/* Isi Modal */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Tampilan Konfirmasi Setelah Berhasil Mendaftar */}
          {createdAccount ? (
            <div className="space-y-4 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={30} strokeWidth={2.5} />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 font-outfit">
                  Pendaftaran Akun Berhasil!
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Akun atas nama <strong className="text-slate-900">{createdAccount.student_name}</strong> (Kelas {createdAccount.class_name}) telah aktif.
                </p>
              </div>

              {/* Kartu Rincian Akun */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Username Resmi (Otomatis)
                  </span>
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 min-h-[44px]">
                    <span className="font-mono text-sm font-bold text-slate-900 select-all truncate">
                      {createdAccount.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdAccount.username, 'username')}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] shrink-0"
                    >
                      {copiedField === 'username' ? (
                        <>
                          <Check size={14} className="text-emerald-600" />
                          <span className="text-emerald-600">Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Kata Sandi Anda
                  </span>
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 min-h-[44px]">
                    <span className="font-mono text-sm font-bold text-indigo-700 select-all truncate">
                      {createdAccount.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdAccount.password, 'password')}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] shrink-0"
                    >
                      {copiedField === 'password' ? (
                        <>
                          <Check size={14} className="text-emerald-600" />
                          <span className="text-emerald-600">Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tombol Aksi Selesai */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAccountCreated({
                      username: createdAccount.username,
                      password: createdAccount.password,
                      studentName: createdAccount.student_name,
                      className: createdAccount.class_name
                    });
                    handleClose();
                  }}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px]"
                >
                  <KeyRound size={16} />
                  <span>Gunakan Akun & Masuk Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer min-h-[44px]"
                >
                  Tutup Jendela
                </button>
              </div>
            </div>
          ) : (
            /* Form Pendaftaran Siswa */
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Pesan Peringatan atau Error */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-150">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Langkah 1: Pilihan Kelas */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  1. Pilih Kelas Anda
                </label>
                {isLoadingClasses ? (
                  <div className="h-11 bg-slate-100 animate-pulse rounded-xl flex items-center px-4 text-xs text-slate-400">
                    Memuat daftar kelas...
                  </div>
                ) : classes.length > 0 ? (
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all min-h-[44px] cursor-pointer"
                  >
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                    Tidak ada data kelas yang terdaftar.
                  </div>
                )}
              </div>

              {/* Langkah 2: Pilihan Nama Siswa */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    2. Cari & Klik Nama Anda
                  </label>
                  {!isLoadingStudents && students.length > 0 && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      {eligibleCount} siswa belum daftar
                    </span>
                  )}
                </div>

                {isLoadingStudents ? (
                  <div className="h-28 bg-slate-100 animate-pulse rounded-xl flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 size={18} className="animate-spin text-indigo-600" />
                    <span>Memuat daftar siswa kelas {selectedClass}...</span>
                  </div>
                ) : students.length > 0 ? (
                  <div className="space-y-2">
                    {/* Input Filter Pencarian Nama */}
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Ketik nama Anda untuk mencari..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all min-h-[40px]"
                    />

                    {/* Daftar Nama Siswa */}
                    <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((s) => {
                          const isSelected = selectedStudentName === s.student_name;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedStudentName(s.student_name);
                                setErrorMessage('');
                              }}
                              className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs transition-colors min-h-[44px] cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50/90 text-indigo-950 font-bold border-l-4 border-indigo-600'
                                  : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <span className="block truncate">{s.student_name}</span>
                                {s.has_account && s.username && (
                                  <span className="text-[10px] text-indigo-600 font-mono block">
                                    @{s.username}
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0">
                                {s.has_account ? (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                                    Sudah Ada Akun
                                  </span>
                                ) : isSelected ? (
                                  <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold">
                                    Dipilih
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-[10px] font-semibold">
                                    Pilih
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400 font-medium">
                          Nama tidak ditemukan dalam pencarian.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    Belum ada data siswa di kelas ini.
                  </div>
                )}
              </div>

              {/* Tampilan Username Otomatis & Input Password (Hanya muncul jika nama siswa sudah dipilih) */}
              {selectedStudentName && (() => {
                const selectedStudent = students.find((s) => s.student_name === selectedStudentName);
                if (selectedStudent?.has_account) {
                  const studentUsername = selectedStudent.username || previewUsername;
                  return (
                    <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                      <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/70 rounded-xl space-y-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                          <span className="text-xs font-bold text-indigo-950 font-outfit">
                            Akun Siswa Sudah Terdaftar
                          </span>
                        </div>
                        <p className="text-xs text-indigo-900 leading-relaxed">
                          Akun atas nama <strong>{selectedStudent.student_name}</strong> sudah aktif dengan username resmi:
                        </p>
                        <div className="flex items-center justify-between bg-white border border-indigo-200 rounded-lg px-3 py-2 min-h-[40px]">
                          <span className="font-mono text-sm font-bold text-indigo-950 truncate select-all">
                            {studentUsername}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(studentUsername, 'username')}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            {copiedField === 'username' ? (
                              <>
                                <Check size={13} className="text-emerald-600" />
                                <span className="text-emerald-600">Disalin</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onAccountCreated({
                            username: studentUsername,
                            password: '',
                            studentName: selectedStudent.student_name,
                            className: selectedClass
                          });
                          handleClose();
                        }}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px]"
                      >
                        <KeyRound size={16} />
                        <span>Gunakan Username Ini untuk Masuk</span>
                      </button>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                        <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          <strong>Lupa kata sandi?</strong> Guru atau wali kelas dapat membuatkan kata sandi baru untuk Anda dalam hitungan detik melalui menu <em>Manajemen Akun Siswa</em>.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                    
                    {/* Kartu Username Otomatis */}
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10.5px] font-bold text-indigo-800 uppercase tracking-wider block">
                          Username Resmi Anda (Otomatis)
                        </span>
                        <span className="text-xs font-mono font-bold text-indigo-950 block truncate mt-0.5">
                          {previewUsername}
                        </span>
                      </div>
                      <span className="px-2 py-1 bg-white border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-md shrink-0">
                        Disediakan
                      </span>
                    </div>

                    {/* Input Password Bebas Pilihan Siswa */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        3. Tentukan Kata Sandi Anda Sendiri
                      </label>
                      <p className="text-[11px] text-slate-500 font-medium mb-1.5 leading-snug">
                        Kata sandi bebas Anda tentukan sendiri agar mudah diingat (minimal 4 karakter).
                      </p>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="Tulis kata sandi baru Anda..."
                          autoComplete="new-password"
                          required
                          className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all min-h-[44px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                          aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Tombol Submit Pendaftaran */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={!selectedStudentName || !customPassword.trim() || isSubmitting}
                        className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[46px]"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin text-slate-300" />
                            <span>Mendaftarkan Akun...</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={16} className="text-emerald-400" />
                            <span>Daftar & Masuk ke Portal</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                );
              })()}

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
