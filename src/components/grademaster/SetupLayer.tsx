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
  const cardClass = "bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8 animate-in mt-16 md:mt-0">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-indigo-200">
            <GraduationCap size={14} /> Setup Sesi Ujian Baru
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight font-outfit">GradeMaster</h1>
          <p className="text-slate-400 text-sm mt-2">Atur parameter dan soal untuk sesi ini</p>
        </div>

        {/* SECTION 1: INFORMASI UJIAN */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}><FolderOpen className="text-indigo-500" /> 1. Informasi Ujian</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}><FolderOpen size={14} /> Nama Sesi Kelas</label>
                <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Contoh: UTS Mat 10A" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}><Key size={14} /> Password Sesi</label>
                <input type="password" value={sessionPassword} onChange={(e) => setSessionPassword(e.target.value)} placeholder="Untuk akses & edit guru" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}><User size={14} /> Nama Guru</label>
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-100 pt-6">
              <div className="col-span-2 lg:col-span-1">
                <label className={labelClass}><GraduationCap size={14} /> Tingkat</label>
                <select value={schoolLevel} onChange={(e) => setSchoolLevel(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <label className={labelClass}><LayoutGrid size={14} /> Kelas</label>
                <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">-- Pilih Kelas --</option>
                  <optgroup label="Tingkat SMP">
                     <option value="7A">Kelas 7A</option><option value="7B">Kelas 7B</option><option value="7C">Kelas 7C</option>
                     <option value="8A">Kelas 8A</option><option value="8B">Kelas 8B</option><option value="8C">Kelas 8C</option>
                     <option value="9A">Kelas 9A</option><option value="9B">Kelas 9B</option><option value="9C">Kelas 9C</option>
                  </optgroup>
                  <optgroup label="Tingkat SMA">
                     <option value="10A">Kelas 10A</option><option value="10B">Kelas 10B</option>
                     <option value="11-IPA">Kelas 11 IPA</option><option value="11-IPS">Kelas 11 IPS</option>
                     <option value="12-IPA">Kelas 12 IPA</option><option value="12-IPS">Kelas 12 IPS</option>
                  </optgroup>
                </select>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <label className={labelClass}><BookOpen size={14} /> Semester</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <label className={labelClass}><BookOpen size={14} /> Thn Ajaran</label>
                <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="2024/2025">2024/2025</option>
                  <option value="2025/2026">2025/2026</option>
                  <option value="2026/2027">2026/2027</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
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
              <div>
                <label className={labelClass}><CheckCircle2 size={14} /> Nilai Minimal (KKM)</label>
                <input type="number" min="0" max="100" value={kkm} onChange={(e) => setKkm(Number(e.target.value))} className={inputClass} />
              </div>
            </div>
            
            {/* Answer key Pilihan Ganda */}
            <div className="pt-6 border-t border-slate-100">
              <label className={labelClass}><Key size={14} /> Kunci Jawaban Pilihan Ganda (PG)</label>
              <textarea
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={"Tempel kunci jawaban PG di sini, format bebas:\n1.A 2.B 3.C 4.D ...\nABCDABCD...\nA, B, C, D"}
                rows={4}
                className={`${inputClass} resize-none font-mono mb-2`}
              />
              {keyInput.trim().length > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview Kunci PG</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${parsedCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                      {parsedCount > 0 ? `${parsedCount} soal terdeteksi` : 'Belum terdeteksi'}
                    </span>
                  </div>
                  {parsedCount > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {parsedPreview.map((ans, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-slate-200 text-xs font-bold">
                          <span className="text-slate-400">{idx + 1}.</span>
                          <span className="text-indigo-600">{ans}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: ATUR SOAL REMEDIAL */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}><ClipboardList className="text-indigo-500" /> 2. Atur Soal Remedial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Input Soal */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}><FileText size={14} /> Soal Essay Remedial</label>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${remedialEssayCount > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  {remedialEssayCount} Soal terdeteksi
                </span>
              </div>
              <textarea
                value={remedialQuestionsInput}
                onChange={(e) => onRemedialInputChange(e.target.value)}
                placeholder={"Ketikkan soal remedial di sini.\nFormat bermarker angka:\n1. Jelaskan definisi AI...\n2. Bagaimana cara kerja Next.js?"}
                rows={9}
                className={`${inputClass} resize-y font-normal`}
              />
              {remedialEssayCount > 0 && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-dashed border-indigo-200 max-h-48 overflow-y-auto">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-2 sticky top-0 bg-indigo-50/80 backdrop-blur-sm py-1">Preview Soal</p>
                  <div className="space-y-2">
                    {remedialQuestions.map((q, idx) => (
                      <div key={idx} className="flex gap-2 text-[10px] md:text-xs">
                        <span className="font-black text-indigo-500">{idx + 1}.</span>
                        <span className="text-slate-700 font-medium">{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Kunci Jawaban */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}><Key size={14} /> Kunci Jawaban (Otomatis)</label>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${remedialAnswerKeys.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {remedialAnswerKeys.length} Kunci terdeteksi
                </span>
              </div>
              <textarea
                value={remedialAnswerKeysInput}
                onChange={(e) => onAnswerKeysInputChange(e.target.value)}
                placeholder={"Kunci jawaban essay format bernomor:\n1. Internet adalah jaringan global...\n2. Next.js adalah framework React..."}
                rows={9}
                className={`${inputClass} resize-y font-normal`}
              />
              {remedialAnswerKeys.length > 0 && (
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-200 max-h-48 overflow-y-auto">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2 sticky top-0 bg-emerald-50/80 backdrop-blur-sm py-1">Preview Kunci</p>
                  <div className="space-y-2">
                    {remedialAnswerKeys.map((k, idx) => (
                      <div key={idx} className="flex gap-2 text-[10px] md:text-xs">
                        <span className="font-black text-emerald-600">{idx + 1}.</span>
                        <span className="text-slate-700 font-medium">{k}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* SECTION 3: PENGATURAN UJIAN */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}><Settings className="text-indigo-500" /> 3. Pengaturan Ujian</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                    <p className="text-[9px] font-bold text-slate-400">Siswa bisa melihat hasil</p>
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
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />} Mulai Evaluasi & Simpan Sesi
          </button>

          <div className="mt-4 text-center">
            <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
              <ArrowLeft size={14} /> Batal & Kembali
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
