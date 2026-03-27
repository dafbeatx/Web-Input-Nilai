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
  remedialTimer: number;
  setRemedialTimer: (v: number) => void;
  remedialQuestions: string[];
  setRemedialQuestions: (v: string[]) => void;
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
    remedialTimer, setRemedialTimer,
    remedialQuestions, setRemedialQuestions,
    onSubmit, onBack, isLoading, setToast,
  } = props;

  const [studentManualInput, setStudentManualInput] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const parsedPreview = parseAnswerKey(keyInput);
  const parsedCount = parsedPreview.length;

  const handleSubmit = async () => {
    if (!teacherName.trim()) { setToast({ message: 'Nama guru wajib diisi', type: 'error' }); return; }
    if (!subject.trim()) { setToast({ message: 'Mata pelajaran wajib diisi', type: 'error' }); return; }
    if (!studentClass.trim()) { setToast({ message: 'Kelas wajib diisi', type: 'error' }); return; }
    if (!sessionName.trim()) { setToast({ message: 'Nama sesi wajib diisi', type: 'error' }); return; }
    if (!sessionPassword.trim()) { setToast({ message: 'Password sesi wajib diisi', type: 'error' }); return; }
    if (parsedCount === 0) { setToast({ message: 'Kunci jawaban belum valid', type: 'error' }); return; }

    try {
      // Auto-fetch students from the global registry (gm_behaviors)
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
      onSubmit(); // Proceed anyway with empty list
    }
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className={labelClass}><CheckCircle2 size={12} className="md:w-3.5 md:h-3.5" /> Nilai Minimal (KKM)</label>
              <input type="number" min="0" max="100" value={kkm} onChange={(e) => setKkm(Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}><BookOpen size={12} className="md:w-3.5 md:h-3.5" /> Jumlah Soal Remedial (Essay)</label>
              <input type="number" min="1" max="20" value={remedialEssayCount} onChange={(e) => {
                const count = Number(e.target.value);
                setRemedialEssayCount(count);
                if (count > remedialQuestions.length) {
                  setRemedialQuestions([...remedialQuestions, ...Array(count - remedialQuestions.length).fill("")]);
                } else {
                  setRemedialQuestions(remedialQuestions.slice(0, count));
                }
              }} className={inputClass} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className={labelClass}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock md:w-3.5 md:h-3.5 mr-1 inline-block text-slate-400">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Waktu Ujian (Menit)
              </label>
              <input type="number" min="1" max="180" value={remedialTimer} onChange={(e) => setRemedialTimer(Number(e.target.value))} className={inputClass} />
            </div>
          </div>

          {/* Remedial Questions Input */}
          {remedialEssayCount > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Soal Remedial (Opsional)</h3>
              {Array.from({ length: remedialEssayCount }).map((_, idx) => (
                <div key={idx}>
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 md:mb-2 block">
                    Pertanyaan #{idx + 1}
                  </label>
                  <textarea
                    value={remedialQuestions[idx] || ""}
                    onChange={(e) => {
                      const newQuestions = [...remedialQuestions];
                      newQuestions[idx] = e.target.value;
                      setRemedialQuestions(newQuestions);
                    }}
                    placeholder={`Ketikkan instruksi soal #${idx + 1}...`}
                    rows={2}
                    className={`${inputClass} resize-y text-sm font-normal`}
                  />
                </div>
              ))}
            </div>
          )}

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
