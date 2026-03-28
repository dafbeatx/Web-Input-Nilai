"use client";

import React, { useState } from 'react';
import {
  GraduationCap,
  FolderOpen,
  Key,
  User,
  BookOpen,
  LayoutGrid,
  ClipboardList,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Settings,
  FileText
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
  remedialEssayCount: number;
  setRemedialEssayCount: (v: number) => void;
  remedialTimer: number;
  setRemedialTimer: (v: number) => void;
  remedialQuestions: string[];
  setRemedialQuestions: (v: string[]) => void;
  remedialQuestionsInput: string;
  onRemedialInputChange: (v: string) => void;
  remedialAnswerKeys: string[];
  setRemedialAnswerKeys: (v: string[]) => void;
  remedialAnswerKeysInput: string;
  onAnswerKeysInputChange: (v: string) => void;
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
    remedialEssayCount, setRemedialEssayCount,
    remedialTimer, setRemedialTimer,
    remedialQuestions, setRemedialQuestions,
    remedialQuestionsInput, onRemedialInputChange,
    remedialAnswerKeys, setRemedialAnswerKeys,
    remedialAnswerKeysInput, onAnswerKeysInputChange,
    isPublic, setIsPublic,
    isDemo, setIsDemo,
    onSubmit, onBack, isLoading, setToast,
  } = props;

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

  const inputClass = "w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300";
  const labelClass = "flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2";
  const sectionTitleClass = "flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest mb-6 pb-4 border-b border-slate-100";
  const cardClass = "bg-white rounded-2xl p-6 shadow-sm border border-slate-100";

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8 lg:py-12 animate-in bg-slate-50">
      <div className="w-full max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-indigo-200">
              <GraduationCap size={14} /> Setup Sesi Ujian
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight font-outfit">GradeMaster</h1>
            <p className="text-slate-500 text-sm mt-1">Atur parameter dan soal untuk sesi ujian baru secara lengkap.</p>
          </div>
          <div className="hidden lg:block">
            <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:shadow-md">
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
              <h2 className={sectionTitleClass}><FolderOpen className="text-indigo-500" /> Informasi Ujian</h2>
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
                      <optgroup label="Tingkat SMP">
                        <option value="7A">Kelas 7A</option><option value="7B">Kelas 7B</option><option value="7C">Kelas 7C</option>
                        <option value="8A">Kelas 8A</option><option value="8B">Kelas 8B</option><option value="8C">Kelas 8C</option>
                        <option value="9A">Kelas 9A</option><option value="9B">Kelas 9B</option><option value="9C">Kelas 9C</option>
                      </optgroup>
                      <optgroup label="Tingkat SMA">
                        <option value="SMA">SMA</option>
                      </optgroup>
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

            {/* 2. ATUR SOAL REMEDIAL */}
            <div className={cardClass}>
              <h2 className={sectionTitleClass}><ClipboardList className="text-indigo-500" /> Atur Soal Remedial</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClass}><FileText size={14} /> Soal Essay</label>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${remedialEssayCount > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                      {remedialEssayCount} Soal terdeteksi
                    </span>
                  </div>
                  <textarea
                    value={remedialQuestionsInput}
                    onChange={(e) => onRemedialInputChange(e.target.value)}
                    placeholder={"Ketikkan semua soal remedial di sini.\nFormat bermarker angka:\n1. Jelaskan definisi AI...\n2. Bagaimana cara kerja Next.js?"}
                    rows={8}
                    className={`${inputClass} resize-y font-normal`}
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2 mt-4">
                    <label className={labelClass}><Key size={14} /> Kunci Jawaban Essay <span className="text-[10px] text-emerald-500 lowercase ml-1">(Penilaian otomatis)</span></label>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${remedialAnswerKeys.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {remedialAnswerKeys.length} Kunci terdeteksi
                    </span>
                  </div>
                  <textarea
                    value={remedialAnswerKeysInput}
                    onChange={(e) => onAnswerKeysInputChange(e.target.value)}
                    placeholder={"Kunci jawaban essay format bernomor:\n1. Internet adalah jaringan global...\n2. Next.js adalah framework React..."}
                    rows={8}
                    className={`${inputClass} resize-y font-normal`}
                  />
                  <p className="text-xs text-slate-400 mt-2 font-medium">⚠️ Pasangkan nomor kunci jawaban secara berurutan sesuai dengan nomor soal essay.</p>
                </div>
              </div>
            </div>

            {/* 3. KUNCI JAWABAN PG */}
            <div className={cardClass}>
              <h2 className={sectionTitleClass}><Key className="text-indigo-500" /> Kunci Jawaban Pilihan Ganda (PG)</h2>
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
              <h2 className={sectionTitleClass}><Settings className="text-indigo-500" /> Pengaturan</h2>
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
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border-2 border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isPublic ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                        {isPublic ? '🔓' : '🔒'}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-700">Hasil Publik</h4>
                        <p className="text-[9px] font-bold text-slate-400">Siswa bisa melihat nilai</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPublic(!isPublic)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isPublic ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
                {setIsDemo && (
                  <div>
                    <label className={labelClass}>Mode Sandbox</label>
                    <div className="flex items-center justify-between p-3.5 bg-amber-50 rounded-xl border-2 border-amber-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDemo ? 'bg-amber-200 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                          {isDemo ? '🧪' : '🛑'}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-amber-700">Mode Demo (Testing)</h4>
                          <p className="text-[9px] font-bold text-amber-600/70">Sembunyikan dari list siswa</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsDemo(!isDemo)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isDemo ? 'bg-amber-500' : 'bg-slate-300'}`}
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
              {/* Preview Essay */}
              {remedialEssayCount > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-100 border-t-4 border-t-indigo-500">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">Preview Soal Essay</p>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {remedialQuestions.map((q, idx) => (
                      <div key={idx} className="flex gap-2 text-[11px]">
                        <span className="font-black text-indigo-600">{idx + 1}.</span>
                        <span className="text-slate-700 font-medium">{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Essay Keys */}
              {remedialAnswerKeys.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 border-t-4 border-t-emerald-500">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3">Preview Kunci Essay</p>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {remedialAnswerKeys.map((k, idx) => (
                      <div key={idx} className="flex gap-2 text-[11px]">
                        <span className="font-black text-emerald-600">{idx + 1}.</span>
                        <span className="text-slate-700 font-medium">{k}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview PG Keys */}
              {parsedCount > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-sky-100 border-t-4 border-t-sky-500">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">Preview Kunci PG</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-50 text-sky-600">
                      {parsedCount}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-2">
                    {parsedPreview.map((ans, idx) => (
                      <span key={idx} className="inline-flex justify-center items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-bold">
                        <span className="text-slate-400">{idx + 1}.</span>
                        <span className="text-sky-600">{ans}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTON (Desktop Static, Mobile Sticky) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50 lg:static lg:bg-transparent lg:border-none lg:p-0">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} Simpan & Mulai Sesi
              </button>
              <button 
                onClick={onBack} 
                className="w-full mt-3 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors lg:hidden flex items-center justify-center gap-2"
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
