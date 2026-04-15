"use client";

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  FolderOpen,
  Key,
  User,
  BookOpen,
  LayoutGrid,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { parseAnswerKey } from '@/lib/grademaster/parser';
import { ToastType } from '@/lib/grademaster/types';

interface SetupLayerProps {
  sessionName: string;
  setSessionName: (v: string) => void;
  sessionPassword: string;
  setSessionPassword: (v: string) => void;
  teacherName: string;
  setTeacherName: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  studentClass: string;
  setStudentClass: (v: string) => void;
  schoolLevel: string;
  setSchoolLevel: (v: string) => void;
  keyInput: string;
  setKeyInput: (v: string) => void;
  studentList: string[];
  setStudentList: (v: string[]) => void;
  examType: string;
  setExamType: (v: string) => void;
  academicYear: string;
  setAcademicYear: (v: string) => void;
  semester: string;
  setSemester: (v: string) => void;
  kkm: number;
  setKkm: (v: number) => void;
  remedialTimer: number;
  setRemedialTimer: (v: number) => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  isDemo?: boolean;
  setIsDemo?: (v: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
  setToast: (t: ToastType) => void;
}

export default function SetupLayer(props: SetupLayerProps) {
  const {
    sessionName, setSessionName,
    sessionPassword, setSessionPassword,
    teacherName, setTeacherName,
    subject, setSubject,
    studentClass, setStudentClass,
    schoolLevel, setSchoolLevel,
    keyInput, setKeyInput,
    studentList, setStudentList,
    examType, setExamType,
    academicYear, setAcademicYear,
    semester, setSemester,
    kkm, setKkm,
    remedialTimer, setRemedialTimer,
    isPublic, setIsPublic,
    isDemo, setIsDemo,
    onSubmit, onBack, isLoading, setToast,
  } = props;

  const [smaClasses, setSmaClasses] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  useEffect(() => {
    if (schoolLevel !== 'SMA') return;
    setIsLoadingClasses(true);
    fetch(`/api/grademaster/behaviors?year=${encodeURIComponent(academicYear)}`)
      .then(res => res.json())
      .then(data => setSmaClasses(data.classes || []))
      .catch(() => setSmaClasses([]))
      .finally(() => setIsLoadingClasses(false));
  }, [schoolLevel, academicYear]);

  const parsedPreview = parseAnswerKey(keyInput);
  const parsedCount = parsedPreview.length;

  const handleSubmit = async () => {
    if (!teacherName.trim()) { setToast({ message: 'Nama guru wajib diisi', type: 'error' }); return; }
    if (!subject.trim()) { setToast({ message: 'Mata pelajaran wajib dipilih', type: 'error' }); return; }
    if (!studentClass.trim()) { setToast({ message: 'Kelas wajib dipilih', type: 'error' }); return; }
    if (!academicYear.trim()) { setToast({ message: 'Tahun ajaran wajib dipilih', type: 'error' }); return; }
    if (!semester.trim()) { setToast({ message: 'Semester wajib dipilih', type: 'error' }); return; }
    if (!sessionName.trim()) { setToast({ message: 'Nama sesi wajib diisi', type: 'error' }); return; }
    if (!sessionPassword.trim()) { setToast({ message: 'Password sesi wajib diisi', type: 'error' }); return; }
    if (parsedCount === 0) { setToast({ message: 'Kunci jawaban belum valid', type: 'error' }); return; }

    try {
      const res = await fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(studentClass)}&year=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      
      const students = data.students?.map((s: any) => s.student_name) || [];
      if (students.length === 0) {
        setToast({ message: `Peringatan: Tidak ada data siswa di kelas ${studentClass} tahun ${academicYear}. Harap isi di menu Kehadiran & Perilaku.`, type: 'error' });
      } else {
        setToast({ message: `${students.length} siswa otomatis termuat dari data pusat.`, type: 'success' });
      }

      setStudentList(students);
      onSubmit();
    } catch (err: any) {
      setToast({ message: 'Gagal memuat sinkronisasi data siswa otomatis', type: 'error' });
      onSubmit(); 
    }
  };

  const inputClass = "w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-on-surface-variant";
  const labelClass = "flex items-center gap-2 text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2";
  const sectionTitleClass = "flex items-center gap-2 text-sm font-black text-on-surface uppercase tracking-widest mb-6 pb-4 border-b border-outline-variant";
  const cardClass = "bg-surface premium-shadow backdrop-blur-xl rounded-2xl p-6 premium-shadow border border-outline-variant";

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8 lg:py-12 animate-in bg-transparent">
      <div className="w-full max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-primary/20">
              <GraduationCap size={14} /> Setup Sesi Ujian
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-on-surface tracking-tight font-outfit">GradeMaster</h1>
            <p className="text-on-surface-variant text-sm mt-1">Atur parameter dan soal untuk sesi ujian baru secara lengkap.</p>
          </div>
          <div className="hidden lg:block">
            <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-black text-on-surface-variant hover:text-primary uppercase tracking-widest transition-colors bg-surface-variant px-4 py-2 rounded-xl border border-outline-variant shadow-sm hover:premium-shadow">
              <ArrowLeft size={14} /> Kembali ke Menu
            </button>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* =============== LEFT COLUMN (2/3 width on desktop) =============== */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. INFORMASI UJIAN */}
            <div className={cardClass}>
              <h2 className={sectionTitleClass}><FolderOpen className="text-primary" /> Informasi Ujian</h2>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}><FolderOpen size={14} /> Nama Sesi Kelas</label>
                    <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Contoh: UTS Mat 10A" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}><Key size={14} /> Password Sesi</label>
                    <input type="password" value={sessionPassword} onChange={(e) => setSessionPassword(e.target.value)} placeholder="Akses guru & ubah nilai" className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}><User size={14} /> Nama Guru Pengawas</label>
                    <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Contoh: Budi Santoso" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}><BookOpen size={14} /> Mata Pelajaran</label>
                    <select value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} cursor-pointer`}>
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      <option value="Informatika">Informatika</option>
                      <option value="Matematika">Matematika</option>
                      <option value="IPA">IPA (Sains)</option>
                      <option value="IPS">IPS (Sosial)</option>
                      <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                      <option value="Bahasa Inggris">Bahasa Inggris</option>
                      <option value="PAI">PAI</option>
                      <option value="PJOK">PJOK</option>
                      <option value="Seni Budaya">Seni Budaya</option>
                      <option value="PKn">PKn</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelClass}><GraduationCap size={14} /> Tingkat</label>
                    <select value={schoolLevel} onChange={(e) => setSchoolLevel(e.target.value)} className={`${inputClass} cursor-pointer`}>
                      <option value="SMP">SMP</option>
                      <option value="SMA">SMA</option>
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelClass}><LayoutGrid size={14} /> Kelas</label>
                    <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className={`${inputClass} cursor-pointer`}>
                      <option value="">-- Pilih Kelas --</option>
                      {schoolLevel === 'SMP' ? (
                        <optgroup label="Tingkat SMP">
                          <option value="7A">Kelas 7A</option><option value="7B">Kelas 7B</option><option value="7C">Kelas 7C</option>
                          <option value="8A">Kelas 8A</option><option value="8B">Kelas 8B</option><option value="8C">Kelas 8C</option>
                          <option value="9A">Kelas 9A</option><option value="9B">Kelas 9B</option><option value="9C">Kelas 9C</option>
                        </optgroup>
                      ) : (
                        <optgroup label="Tingkat SMA">
                          {isLoadingClasses ? (
                            <option disabled>Memuat kelas...</option>
                          ) : smaClasses.length > 0 ? (
                            smaClasses.map(cls => (
                              <option key={cls} value={cls}>{cls}</option>
                            ))
                          ) : (
                            <option value="SMA">SMA</option>
                          )}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelClass}><BookOpen size={14} /> Semester</label>
                    <select value={semester} onChange={(e) => setSemester(e.target.value)} className={`${inputClass} cursor-pointer`}>
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelClass}><BookOpen size={14} /> Thn Ajaran</label>
                    <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${inputClass} cursor-pointer`}>
                      <option value="2024/2025">2024/2025</option>
                      <option value="2025/2026">2025/2026</option>
                      <option value="2026/2027">2026/2027</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}><BookOpen size={14} /> Jenis Ujian</label>
                    <select value={examType} onChange={(e) => setExamType(e.target.value)} className={`${inputClass} cursor-pointer`}>
                      <option value="UTS">UTS (Tengah Semester)</option>
                      <option value="UAS">UAS (Akhir Semester)</option>
                      <option value="PAS">PAS (Penilaian Akhir Semester)</option>
                      <option value="PAT">PAT (Penilaian Akhir Tahun)</option>
                      <option value="Ulangan Harian">Ulangan Harian</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>


            {/* 3. KUNCI JAWABAN PG */}
            <div className={cardClass}>
              <h2 className={sectionTitleClass}><Key className="text-primary" /> Kunci Jawaban Pilihan Ganda (PG)</h2>
              <div>
                <textarea
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={"Tempel kunci jawaban PG di sini, format bebas:\n1.A 2.B 3.C 4.D ...\nABCDABCD...\nA, B, C, D"}
                  rows={4}
                  className={`${inputClass} resize-y font-mono`}
                />
              </div>
            </div>

          </div>


          {/* =============== RIGHT COLUMN (1/3 width on desktop) =============== */}
          <div className="space-y-6">

            {/* PENGATURAN */}
            <div className={cardClass}>
              <h2 className={sectionTitleClass}><Settings className="text-primary" /> Pengaturan</h2>
              <div className="space-y-5">
                <div>
                  <label className={labelClass}><CheckCircle2 size={14} /> Nilai Minimal (KKM)</label>
                  <input type="number" min="0" max="100" value={kkm} onChange={(e) => setKkm(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Waktu Ujian Remedial (Menit)
                  </label>
                  <input type="number" min="1" max="180" value={remedialTimer} onChange={(e) => setRemedialTimer(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Sesi Publik</label>
                  <div className="flex items-center justify-between p-3.5 bg-surface-variant rounded-xl border border-outline-variant">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isPublic ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                        {isPublic ? '🔓' : '🔒'}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-on-surface">Hasil Publik</h4>
                        <p className="text-[9px] font-bold text-on-surface-variant">Siswa bisa melihat nilai</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPublic(!isPublic)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isPublic ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
                {setIsDemo && (
                  <div>
                    <label className={labelClass}>Mode Sandbox</label>
                    <div className="flex items-center justify-between p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDemo ? 'bg-amber-500/30 text-amber-400' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                          {isDemo ? '🧪' : '🛑'}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-amber-400">Mode Demo (Testing)</h4>
                          <p className="text-[9px] font-bold text-amber-500/60">Sembunyikan dari list siswa</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsDemo(!isDemo)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isDemo ? 'bg-amber-500' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDemo ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="space-y-6 hidden lg:block">

              {/* Preview PG Keys */}
              {parsedCount > 0 && (
                <div className="bg-surface premium-shadow backdrop-blur-xl rounded-2xl p-5 premium-shadow border border-primary/20 border-t-4 border-t-primary">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Preview Kunci PG</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-primary/20 text-primary">
                      {parsedCount}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-2">
                    {parsedPreview.map((ans, idx) => (
                      <span key={idx} className="inline-flex justify-center items-center gap-1.5 px-2 py-1.5 bg-surface-variant rounded-lg border border-outline-variant text-[10px] font-bold">
                        <span className="text-on-surface-variant">{idx + 1}.</span>
                        <span className="text-primary">{ans}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTON (Desktop Static, Mobile Sticky) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-outline-variant z-50 lg:static lg:bg-transparent lg:border-none lg:p-0">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} Simpan & Mulai Sesi
              </button>
              <button 
                onClick={onBack} 
                className="w-full mt-3 py-3 bg-surface-variant text-on-surface-variant rounded-xl text-xs font-black uppercase tracking-widest hover:bg-surface-container-highest transition-colors lg:hidden flex items-center justify-center gap-2 border border-outline-variant"
              >
                <ArrowLeft size={14} /> Kembali
              </button>
            </div>
            
            {/* Mobile padding spacer to prevent content blocking by sticky bottom */}
            <div className="h-32 lg:hidden"></div>

          </div>

        </div>
      </div>
    </div>
  );
}
