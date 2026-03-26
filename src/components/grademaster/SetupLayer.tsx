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
  kkm: number;
  setKkm: (v: number) => void;
  remedialEssayCount: number;
  setRemedialEssayCount: (v: number) => void;
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
    kkm, setKkm,
    remedialEssayCount, setRemedialEssayCount,
    onSubmit, onBack, isLoading, setToast,
  } = props;

  const [studentManualInput, setStudentManualInput] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const parsedPreview = parseAnswerKey(keyInput);
  const parsedCount = parsedPreview.length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/parse-document', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses file');
      if (data.students?.length > 0) {
        setStudentList(data.students);
        setToast({ message: `${data.students.length} siswa berhasil dimuat!`, type: 'success' });
      } else {
        throw new Error('Tidak ada nama siswa ditemukan');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal';
      setToast({ message, type: 'error' });
    } finally {
      setUploadingDoc(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = () => {
    if (!teacherName.trim()) { setToast({ message: 'Nama guru wajib diisi', type: 'error' }); return; }
    if (!subject.trim()) { setToast({ message: 'Mata pelajaran wajib diisi', type: 'error' }); return; }
    if (!studentClass.trim()) { setToast({ message: 'Kelas wajib diisi', type: 'error' }); return; }
    if (!sessionName.trim()) { setToast({ message: 'Nama sesi wajib diisi', type: 'error' }); return; }
    if (!sessionPassword.trim()) { setToast({ message: 'Password sesi wajib diisi', type: 'error' }); return; }
    if (parsedCount === 0) { setToast({ message: 'Kunci jawaban belum valid', type: 'error' }); return; }

    // Merge manual student input
    const extraStudents = studentManualInput
      .split(/\r?\n/)
      .map(line => line.trim().replace(/^[\d.\-*]+\s*/, ''))
      .filter(line => line.length > 2 && line.length < 50);
    const finalList = Array.from(new Set([...studentList, ...extraStudents]));
    setStudentList(finalList);
    onSubmit();
  };

  const inputClass = "w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300";
  const labelClass = "flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 md:mb-2";

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 animate-in">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6 md:mb-10">
          <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1 md:px-4 md:py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-3 md:mb-4 border border-indigo-200">
            <GraduationCap size={12} className="md:w-3.5 md:h-3.5" /> Koreksi Otomatis
          </div>
          <h1 className="text-2xl md:text-5xl font-black text-slate-800 tracking-tight font-outfit">GradeMaster</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1 md:mt-2">Isi data di bawah untuk mulai mengoreksi</p>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className={labelClass}><FolderOpen size={12} className="md:w-3.5 md:h-3.5" /> Nama Sesi Kelas</label>
              <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Contoh: UTS Mat 10A" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}><Key size={12} className="md:w-3.5 md:h-3.5" /> Password Sesi</label>
              <input type="password" value={sessionPassword} onChange={(e) => setSessionPassword(e.target.value)} placeholder="Untuk akses & edit" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}><User size={12} className="md:w-3.5 md:h-3.5" /> Nama Guru</label>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Contoh: Budi Santoso" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}><BookOpen size={12} className="md:w-3.5 md:h-3.5" /> Mata Pelajaran</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Contoh: Matematika" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className={labelClass}><LayoutGrid size={12} className="md:w-3.5 md:h-3.5" /> Kelas</label>
              <input type="text" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} placeholder="Contoh: 10A" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}><GraduationCap size={12} className="md:w-3.5 md:h-3.5" /> Tingkat</label>
              <select value={schoolLevel} onChange={(e) => setSchoolLevel(e.target.value)} className={`${inputClass} cursor-pointer`}>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className={labelClass}><BookOpen size={12} className="md:w-3.5 md:h-3.5" /> Jenis Ujian</label>
              <select value={examType} onChange={(e) => setExamType(e.target.value)} className={`${inputClass} cursor-pointer`}>
                <option value="UTS">UTS</option>
                <option value="UAS">UAS</option>
                <option value="PAT">PAT</option>
                <option value="PAS">PAS</option>
                <option value="Ulangan Harian">Ulangan Harian</option>
              </select>
            </div>
            <div>
              <label className={labelClass}><BookOpen size={12} className="md:w-3.5 md:h-3.5" /> Tahun Ajaran</label>
              <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2025/2026" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className={labelClass}><CheckCircle2 size={12} className="md:w-3.5 md:h-3.5" /> Nilai Minimal (KKM)</label>
              <input type="number" min="0" max="100" value={kkm} onChange={(e) => setKkm(Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}><BookOpen size={12} className="md:w-3.5 md:h-3.5" /> Jumlah Soal Remedial (Essay)</label>
              <input type="number" min="1" max="20" value={remedialEssayCount} onChange={(e) => setRemedialEssayCount(Number(e.target.value))} className={inputClass} />
            </div>
          </div>

          {/* Student upload */}
          <div>
            <label className="flex items-center justify-between text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 md:mb-2">
              <div className="flex items-center gap-1.5 md:gap-2"><User size={12} className="md:w-3.5 md:h-3.5" /> Daftar Siswa ({studentList.length} Anak)</div>
              {uploadingDoc && <Loader2 size={12} className="animate-spin text-indigo-500" />}
            </label>
            <div className="relative">
              <input type="file" accept=".txt,.csv,.xml,.pdf,.docx" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="w-full bg-slate-50 border-2 border-slate-100 border-dashed rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm font-bold text-slate-500 text-center transition-all hover:bg-slate-100 flex flex-col items-center justify-center gap-1.5 md:gap-2">
                {studentList.length > 0 ? (
                  <span className="text-indigo-600 flex items-center gap-1.5 md:gap-2"><CheckCircle2 size={20} className="md:w-6 md:h-6" /> {studentList.length} Nama Terekstrak</span>
                ) : (
                  <>
                    <ClipboardList size={20} className="text-slate-400 md:w-6 md:h-6" />
                    <span>Klik / Seret file daftar siswa ke sini</span>
                    <span className="text-[9px] md:text-[10px] font-normal text-slate-400">Mendukung .PDF, .DOCX, .TXT, .CSV, .XML</span>
                  </>
                )}
              </div>
            </div>
            <label className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-3 md:mt-4 mb-1.5 md:mb-2">
              <ClipboardList size={12} className="md:w-3.5 md:h-3.5" /> Atau Input Manual
            </label>
            <textarea
              value={studentManualInput}
              onChange={(e) => setStudentManualInput(e.target.value)}
              placeholder={"Contoh:\n1. Budi Santoso\n2. Siti Aminah"}
              rows={3}
              className={`${inputClass} resize-none font-mono`}
            />
          </div>

          {/* Answer key */}
          <div>
            <label className={labelClass}><Key size={12} className="md:w-3.5 md:h-3.5" /> Kunci Jawaban</label>
            <textarea
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={"Tempel kunci jawaban di sini, format bebas:\n1.A 2.B 3.C 4.D ...\nABCDABCD...\nA, B, C, D"}
              rows={5}
              className={`${inputClass} resize-none font-mono`}
            />
            {keyInput.trim().length > 0 && (
              <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview Kunci Jawaban</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${parsedCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {parsedCount > 0 ? `${parsedCount} soal terdeteksi` : 'Belum terdeteksi'}
                  </span>
                </div>
                {parsedCount > 0 && (
                  <div className="flex flex-wrap gap-1.5">
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

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Mulai Evaluasi
          </button>

          <div className="pt-3 md:pt-4 border-t border-slate-100">
            <button onClick={onBack} className="w-full py-2.5 md:py-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all flex items-center justify-center gap-1.5 md:gap-2">
              <ArrowLeft size={12} className="md:w-3.5 md:h-3.5" /> Kembali ke Kumpulan Kelas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
