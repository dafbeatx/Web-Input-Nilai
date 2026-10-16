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
  Sparkles
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

  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
        const res = await fetch('/api/student/generate-account?action=classes');
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

  // Ambil daftar siswa ketika kelas dipilih
  const fetchStudents = useCallback(async (className: string) => {
    if (!className) return;
    setIsLoadingStudents(true);
    setErrorMessage('');
    setSelectedStudentName('');
    setStudentSearch('');
    try {
      const res = await fetch(
        `/api/student/generate-account?action=students&class=${encodeURIComponent(className)}`
      );
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
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

  // Handle generate akun
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedStudentName || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/student/generate-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_name: selectedClass,
          student_name: selectedStudentName
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat akun siswa');
      }

      setCreatedAccount({
        student_name: data.account.student_name,
        class_name: data.account.class_name,
        username: data.account.username,
        password: data.account.password
      });

      setToast({
        message: `Akun untuk ${data.account.student_name} berhasil dibuat!`,
        type: 'success'
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat akun siswa';
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 id="modal-title" className="text-sm font-bold text-slate-900 font-outfit">
                Buat Akun Siswa Mandiri
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Dapatkan username dan kata sandi resmi untuk portal nilai
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Tutup jendela modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Isi Modal */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Tampilan Ketika Akun Baru Saja Berhasil Dibuat */}
          {createdAccount ? (
            <div className="space-y-4 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={30} strokeWidth={2.5} />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 font-outfit">
                  Akun Siswa Berhasil Dibuat!
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Hai <strong className="text-slate-900">{createdAccount.student_name}</strong> (Kelas {createdAccount.class_name}), berikut adalah akses login Anda:
                </p>
              </div>

              {/* Kartu Kredensial */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Username
                  </span>
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 min-h-[44px]">
                    <span className="font-mono text-sm font-bold text-slate-900 select-all">
                      {createdAccount.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdAccount.username, 'username')}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
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
                    Kata Sandi
                  </span>
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 min-h-[44px]">
                    <span className="font-mono text-sm font-bold text-indigo-700 select-all">
                      {createdAccount.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdAccount.password, 'password')}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
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

              {/* Peringatan Keamanan */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-left flex items-start gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  <strong>Penting:</strong> Harap catat atau salin kata sandi di atas sekarang. Kata sandi ini digunakan untuk masuk ke portal nilai dan remedial Anda.
                </p>
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
                  <span>Gunakan & Masuk ke Portal</span>
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
            /* Form Pemilihan Kelas dan Siswa */
            <form onSubmit={handleGenerate} className="space-y-4">
              
              {/* Pesan Error Jika Ada */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-150">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Pilihan Kelas */}
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

              {/* Pilihan Nama Siswa */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    2. Pilih Nama Lengkap Anda
                  </label>
                  {!isLoadingStudents && students.length > 0 && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      {eligibleCount} siswa belum punya akun
                    </span>
                  )}
                </div>

                {isLoadingStudents ? (
                  <div className="h-32 bg-slate-100 animate-pulse rounded-xl flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
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
                      placeholder="Cari nama Anda di daftar..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all min-h-[40px]"
                    />

                    {/* Daftar Nama Siswa */}
                    <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((s) => {
                          const isSelected = selectedStudentName === s.student_name;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              disabled={s.has_account}
                              onClick={() => setSelectedStudentName(s.student_name)}
                              className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs transition-colors min-h-[44px] cursor-pointer ${
                                s.has_account
                                  ? 'bg-slate-50/70 text-slate-400 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-indigo-50/90 text-indigo-950 font-bold'
                                  : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <span className="block truncate">{s.student_name}</span>
                                {s.has_account && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Username: {s.username || 'terdaftar'}
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0">
                                {s.has_account ? (
                                  <span className="px-2 py-0.5 bg-slate-200/80 text-slate-600 rounded text-[10px] font-semibold">
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
                        <div className="p-4 text-center text-xs text-slate-400 font-medium">
                          Nama tidak ditemukan dalam pencarian.
                        </div>
                      )}
                    </div>

                    {eligibleCount === 0 && (
                      <p className="text-[11px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-center">
                        Semua siswa di Kelas {selectedClass} sudah memiliki akun. Silakan langsung masuk.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    Belum ada data siswa di kelas ini.
                  </div>
                )}
              </div>

              {/* Info Panduan */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 text-[11px] leading-relaxed">
                Sistem akan secara otomatis membuat username dengan format nama dan kelas serta kata sandi acak yang aman.
              </div>

              {/* Tombol Submit Generate */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!selectedStudentName || isGenerating}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[46px]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-slate-300" />
                      <span>Memproses Akun...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="text-amber-300" />
                      <span>Generate Akun & Kata Sandi</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
