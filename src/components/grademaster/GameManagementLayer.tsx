"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Plus, Search, Trash2, 
  Pencil, CheckCircle2, RotateCcw, 
  Gamepad2, Save, X, Eye
} from 'lucide-react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { 
  GameQuestion, 
  GameQuestionsService, 
  GAME_SUBJECTS 
} from '@/lib/grademaster/services/game-questions.service';

import { ToastType } from '@/lib/grademaster/types';

interface GameManagementLayerProps {
  onBack?: () => void;
  setToast?: (toast: ToastType) => void;
}

export default function GameManagementLayer({ onBack, setToast: setToastProp }: GameManagementLayerProps) {
  const { setLayer, setToast: setToastContext } = useGradeMaster();
  const setToast = setToastProp || setToastContext;
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<GameQuestion | null>(null);

  // Form fields
  const [formSubject, setFormSubject] = useState<string>('Matematika');
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<'Mudah' | 'Sedang' | 'Sulit'>('Sedang');

  // Preview Question Modal
  const [previewQuestion, setPreviewQuestion] = useState<GameQuestion | null>(null);

  // Load questions on mount asynchronously without synchronous setState
  useEffect(() => {
    let isMounted = true;
    GameQuestionsService.fetchQuestions()
      .then((data) => {
        if (isMounted) {
          setQuestions(data);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.warn('Failed loading questions:', e);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered list
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchSubject = selectedSubjectFilter === 'ALL' || q.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();
      const matchSearch = !searchQuery || 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchSearch;
    });
  }, [questions, selectedSubjectFilter, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingQuestion(null);
    setFormSubject('Matematika');
    setFormQuestion('');
    setFormOptions(['', '', '', '']);
    setFormCorrectIndex(0);
    setFormExplanation('');
    setFormDifficulty('Sedang');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (q: GameQuestion) => {
    setEditingQuestion(q);
    setFormSubject(q.subject);
    setFormQuestion(q.question);
    setFormOptions([...q.options]);
    setFormCorrectIndex(q.correct_index);
    setFormExplanation(q.explanation || '');
    setFormDifficulty(q.difficulty || 'Sedang');
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim()) {
      setToast?.({ message: 'Soal tidak boleh kosong', type: 'error' });
      return;
    }
    if (formOptions.some(opt => !opt.trim())) {
      setToast?.({ message: 'Semua 4 pilihan jawaban wajib diisi', type: 'error' });
      return;
    }

    const payload: GameQuestion = {
      id: editingQuestion?.id || `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      game_type: 'chess',
      subject: formSubject,
      question: formQuestion.trim(),
      options: formOptions.map(o => o.trim()),
      correct_index: formCorrectIndex,
      explanation: formExplanation.trim(),
      difficulty: formDifficulty,
      created_at: editingQuestion?.created_at || new Date().toISOString()
    };

    const updated = await GameQuestionsService.addOrUpdateQuestion(payload);
    setQuestions(updated);
    setIsModalOpen(false);
    setToast?.({ 
      message: editingQuestion ? 'Soal game berhasil diperbarui!' : 'Soal game baru berhasil ditambahkan!', 
      type: 'success' 
    });
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus soal ini dari game?')) return;
    const updated = await GameQuestionsService.deleteQuestion(id);
    setQuestions(updated);
    setToast?.({ message: 'Soal berhasil dihapus', type: 'success' });
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Pulihkan seluruh soal default standar kurikulum? Soal yang Anda buat mungkin akan terganti.')) return;
    const defaults = GameQuestionsService.resetDefaults();
    setQuestions(defaults);
    setToast?.({ message: 'Bank soal game berhasil dipulihkan ke default!', type: 'success' });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setLayer('home');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-5 px-3.5 sm:px-6 text-left">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95"
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-outfit">
                Manajemen Game & Bank Soal
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kelola pertanyaan duel untuk permainan Catur Pintar dan game edukasi lainnya.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Pulihkan Soal Bawaan"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset Soal Default</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Tambah Soal Game</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Soal</span>
          <span className="text-2xl font-black text-slate-900 font-outfit mt-1 block">{questions.length}</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mata Pelajaran</span>
          <span className="text-2xl font-black text-indigo-600 font-outfit mt-1 block">{GAME_SUBJECTS.length}</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Game Terkait</span>
          <span className="text-2xl font-black text-emerald-600 font-outfit mt-1 block">Catur 2D</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Integrasi Siswa</span>
          <span className="text-2xl font-black text-amber-500 font-outfit mt-1 block">Aktif</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 mb-5 shadow-sm space-y-3">
        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedSubjectFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({questions.length})
          </button>
          {GAME_SUBJECTS.map(subj => {
            const count = questions.filter(q => q.subject.toLowerCase() === subj.toLowerCase()).length;
            const isSelected = selectedSubjectFilter === subj;
            return (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubjectFilter(subj)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{subj}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan teks pertanyaan atau topik..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Memuat daftar soal game...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center">
            <Gamepad2 size={36} className="text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Tidak ada soal ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1">Coba ganti filter mapel atau tambahkan soal baru.</p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {q.subject}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    Tingkat: {q.difficulty || 'Sedang'}
                  </span>
                  <span className="text-[10.5px] font-bold text-slate-400">
                    # {idx + 1}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mb-3">
                  {q.question}
                </h3>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correct_index;
                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-slate-50 border-slate-200/70 text-slate-600'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="truncate">{opt}</span>
                        {isCorrect && <CheckCircle2 size={14} className="text-emerald-600 ml-auto shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    <strong className="text-slate-700 font-bold">Pembahasan:</strong> {q.explanation}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  type="button"
                  onClick={() => setPreviewQuestion(q)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Lihat Tampilan Duel Game"
                >
                  <Eye size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(q)}
                  className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                  title="Edit Soal"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                  title="Hapus Soal"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ADD / EDIT QUESTION MODAL
      ═══════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900 font-outfit">
                {editingQuestion ? 'Edit Soal Game Catur' : 'Tambah Soal Baru untuk Game'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Subject & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    {GAME_SUBJECTS.map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as 'Mudah' | 'Sedang' | 'Sulit')}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="Mudah">Mudah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Sulit">Sulit</option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Isi Pertanyaan
                </label>
                <textarea
                  rows={3}
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Ketik soal kuis di sini..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Options */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Pilihan Jawaban (Pilih radio untuk jawaban benar)
                </label>
                <div className="space-y-2">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                        <input
                          type="radio"
                          name="correctOptionRadio"
                          checked={formCorrectIndex === idx}
                          onChange={() => setFormCorrectIndex(idx)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black">
                          {String.fromCharCode(65 + idx)}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...formOptions];
                          next[idx] = e.target.value;
                          setFormOptions(next);
                        }}
                        placeholder={`Teks pilihan ${String.fromCharCode(65 + idx)}...`}
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                          formCorrectIndex === idx ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-slate-50'
                        }`}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Pembahasan / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Penjelasan singkat mengapa jawaban tersebut benar..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Save size={15} />
                  <span>Simpan Soal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PREVIEW MODAL (Duel Mode Preview)
      ═══════════════════════════════════════════════════════════ */}
      {previewQuestion && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                Simulasi Tampilan Duel Game
              </span>
              <button onClick={() => setPreviewQuestion(null)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X size={15} />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              {previewQuestion.subject}
            </p>
            <h3 className="text-sm font-bold text-slate-900 mb-4 leading-snug">
              {previewQuestion.question}
            </h3>

            <div className="space-y-2 mb-4">
              {previewQuestion.options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                    idx === previewQuestion.correct_index
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                  {idx === previewQuestion.correct_index && (
                    <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded">Kunci</span>
                  )}
                </div>
              ))}
            </div>

            {previewQuestion.explanation && (
              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-200 mb-4">
                <strong>Pembahasan:</strong> {previewQuestion.explanation}
              </div>
            )}

            <button
              onClick={() => setPreviewQuestion(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              Tutup Simulasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
