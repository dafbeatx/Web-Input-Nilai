"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Plus, Search, Trash2, 
  Pencil, CheckCircle2, RotateCcw, 
  Gamepad2, X, Eye, Tv, Zap, 
  BookOpen, Compass, Settings, 
  Clock, Sparkles, Play, Sliders, Volume2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { 
  GameQuestion, 
  GameQuestionsService, 
  GAME_SUBJECTS 
} from '@/lib/grademaster/services/game-questions.service';
import { ToastType } from '@/lib/grademaster/types';
import ChessGame from './games/ChessGame';
import QuickQuizGame from './games/QuickQuizGame';
import WordScrambleGame from './games/WordScrambleGame';

interface GameManagementLayerProps {
  onBack?: () => void;
  setToast?: (toast: ToastType) => void;
}

type ManagementTab = 'ruang_game' | 'bank_soal' | 'pengaturan';
type ActiveGameModal = 'chess' | 'quick_quiz' | 'word_scramble' | null;

interface PIDGameConfig {
  quizTimerDuration: number; // in seconds
  defaultDifficulty: 'Mudah' | 'Sedang' | 'Sulit' | 'Campuran';
  touchTargetScale: 'standard' | 'large_board';
  soundFxEnabled: boolean;
  autoFullscreenOnPID: boolean;
}

export default function GameManagementLayer({ onBack, setToast: setToastProp }: GameManagementLayerProps) {
  const router = useRouter();
  const { setLayer, setToast: setToastContext } = useGradeMaster();
  const setToast = setToastProp || setToastContext;

  // Active Tab: 'ruang_game' (Game PID Guru), 'bank_soal' (All Games Bank), 'pengaturan' (Settings)
  const [activeTab, setActiveTab] = useState<ManagementTab>('ruang_game');
  const [activePlayModal, setActivePlayModal] = useState<ActiveGameModal>(null);

  // Questions Data
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modal state for adding/editing questions across ALL games
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<GameQuestion | null>(null);

  // Form fields
  const [formGameType, setFormGameType] = useState<string>('all');
  const [formSubject, setFormSubject] = useState<string>('Matematika');
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<'Mudah' | 'Sedang' | 'Sulit'>('Sedang');

  // Preview Question Modal
  const [previewQuestion, setPreviewQuestion] = useState<GameQuestion | null>(null);

  // PID Settings State (Persisted in localStorage)
  const [pidConfig, setPidConfig] = useState<PIDGameConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ilrp_pid_settings');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {
      quizTimerDuration: 30,
      defaultDifficulty: 'Sedang',
      touchTargetScale: 'large_board',
      soundFxEnabled: true,
      autoFullscreenOnPID: true,
    };
  });

  // Save settings on update
  const handleUpdateConfig = (newConfig: Partial<PIDGameConfig>) => {
    const updated = { ...pidConfig, ...newConfig };
    setPidConfig(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ilrp_pid_settings', JSON.stringify(updated));
    }
    setToast?.({ message: 'Pengaturan Game PID berhasil disimpan!', type: 'success' });
  };

  // Load questions on mount asynchronously
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

  // Filtered list across ALL games and subjects
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const qGame = (q.game_type || 'all').toLowerCase();
      const matchGame = selectedGameFilter === 'ALL' || 
        qGame === selectedGameFilter.toLowerCase() || 
        qGame === 'all';
      
      const matchSubject = selectedSubjectFilter === 'ALL' || 
        q.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();
      
      const matchSearch = !searchQuery || 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.subject.toLowerCase().includes(searchQuery.toLowerCase());

      return matchGame && matchSubject && matchSearch;
    });
  }, [questions, selectedGameFilter, selectedSubjectFilter, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingQuestion(null);
    setFormGameType('all');
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
    setFormGameType(q.game_type || 'all');
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
      game_type: formGameType,
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
    if (!window.confirm('Apakah Anda yakin ingin menghapus soal ini dari bank game?')) return;
    const updated = await GameQuestionsService.deleteQuestion(id);
    setQuestions(updated);
    setToast?.({ message: 'Soal berhasil dihapus', type: 'success' });
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Pulihkan seluruh soal default standar kurikulum untuk semua game? Soal kustom yang Anda buat mungkin akan terganti.')) return;
    const defaults = GameQuestionsService.resetDefaults();
    setQuestions(defaults);
    setToast?.({ message: 'Bank soal semua game berhasil dipulihkan ke default!', type: 'success' });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setLayer('home');
    }
  };

  // If teacher is running a game modal directly in PID mode
  if (activePlayModal === 'chess') {
    return (
      <div className="w-full min-h-[calc(100dvh-5rem)] py-3 px-2 sm:px-6">
        <div className="mb-3 flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <Tv size={18} className="text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-wider">Mode Papan Interaktif Digital (PID) • Catur Pintar</span>
          </div>
          <button
            onClick={() => setActivePlayModal(null)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            ✕ Keluar ke Menu PID
          </button>
        </div>
        <ChessGame onBack={() => setActivePlayModal(null)} />
      </div>
    );
  }

  if (activePlayModal === 'quick_quiz') {
    return (
      <div className="w-full min-h-[calc(100dvh-5rem)] py-3 px-2 sm:px-6">
        <div className="mb-3 flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider">Mode Papan Interaktif Digital (PID) • Kuis Kilat</span>
          </div>
          <button
            onClick={() => setActivePlayModal(null)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            ✕ Keluar ke Menu PID
          </button>
        </div>
        <QuickQuizGame onBack={() => setActivePlayModal(null)} />
      </div>
    );
  }

  if (activePlayModal === 'word_scramble') {
    return (
      <div className="w-full min-h-[calc(100dvh-5rem)] py-3 px-2 sm:px-6">
        <div className="mb-3 flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-sky-400" />
            <span className="text-xs font-black uppercase tracking-wider">Mode Papan Interaktif Digital (PID) • Susun Kata</span>
          </div>
          <button
            onClick={() => setActivePlayModal(null)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            ✕ Keluar ke Menu PID
          </button>
        </div>
        <WordScrambleGame onBack={() => setActivePlayModal(null)} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-5 px-3.5 sm:px-6 text-left">
      {/* ═══════════════════════════════════════════════════════════
          TOP EDITORIAL HEADER
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            title="Kembali ke Dashboard Utama"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-outfit">
                Game PID (Papan Interaktif Digital)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-50 text-cyan-700 border border-cyan-200">
                Khusus Guru
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pusat game edukasi interaktif kelas untuk layar sentuh smart board & pengelolaan bank soal lengkap.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Pulihkan Soal Bawaan Standar"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset Soal Default</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Soal Game</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          NAVIGATION TABS (RUANG GAME PID vs BANK SOAL vs PENGATURAN)
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('ruang_game')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'ruang_game'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tv size={16} className={activeTab === 'ruang_game' ? 'text-cyan-400' : 'text-slate-400'} />
          <span>Ruang Game PID Guru</span>
        </button>

        <button
          onClick={() => setActiveTab('bank_soal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'bank_soal'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen size={16} className={activeTab === 'bank_soal' ? 'text-indigo-400' : 'text-slate-400'} />
          <span>Bank Soal Semua Game ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pengaturan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'pengaturan'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings size={16} className={activeTab === 'pengaturan' ? 'text-amber-400' : 'text-slate-400'} />
          <span>Pengaturan Game & PID</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: RUANG GAME PID GURU (Siap Dimainkan di Smart Board)
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'ruang_game' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg">
            <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 block mb-1">
                Layar Sentuh Interaktif (Papan Digital Kelas)
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight font-outfit">
                Koleksi Game Guru untuk Papan Interaktif Digital (PID)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Pilih game edukasi di bawah untuk dimainkan langsung bersama siswa di layar sentuh depan kelas. Seluruh game dioptimalkan untuk navigasi multi-touch, tombol besar ≥64px, dan tanpa membutuhkan keyboard fisik.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* 1. Indonesian Life RP (PID Smart Board Mode) */}
            <div className="bg-white border-2 border-emerald-500/30 hover:border-emerald-500 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                    <Compass size={28} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Open World 2D
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">Nusantara Asri</span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Indonesian Life RP (Mode PID)
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Simulator roleplay kehidupan virtual warga Indonesia. Guru dan siswa dapat menjelajahi kota Nusantara Asri, gedung sekolah, balai warga, warung kelontong, dan papan pengumuman interaktif menggunakan kontrol sentuh layar besar.
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-4">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    🖥️ Smart Board 1080p
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    🎯 Tombol ≥64px
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    🤝 Roleplay Interaktif
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Rute: /game</span>
                <button
                  type="button"
                  onClick={() => router.push('/game?device_mode=interactive_board')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Play size={14} className="fill-white" />
                  <span>Mulai di Smart Board</span>
                </button>
              </div>
            </div>

            {/* 2. Catur Pintar (Interactive Duel) */}
            <div className="bg-white border-2 border-indigo-500/30 hover:border-indigo-500 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-900 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                    <Gamepad2 size={28} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Duel Papan Sentuh
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">2 Pemain / Regu</span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                  Catur Pintar PID (Duel Soal Kurikulum)
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Permainan catur 2D interaktif layar sentuh. Setiap kali siswa memakan bidak lawan, muncul soal tantangan akademik kurikulum yang harus dijawab dengan benar untuk mengamankan posisi bidak.
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-4">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    ♟️ Duel 2 Pemain
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    📚 Soal Multi Mapel
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    ⏱️ Timer Strategi
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Mode Guru PID</span>
                <button
                  type="button"
                  onClick={() => setActivePlayModal('chess')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Play size={14} className="fill-white" />
                  <span>Mulai Catur PID</span>
                </button>
              </div>
            </div>

            {/* 3. Kuis Kilat (Buzzer & Fast Q&A) */}
            <div className="bg-white border-2 border-amber-500/30 hover:border-amber-500 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                    <Zap size={28} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                      Cepat Tepat
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">Timer Kompetisi</span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                  Kuis Kilat PID (Adu Cepat Regu Kelas)
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Kuis cepat tepat berbatas waktu dengan 4 tombol opsi berukuran ekstra besar di layar sentuh. Sangat cocok untuk sesi kuis pemantik awal kelas (ice-breaking) atau evaluasi akhir bab.
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-4">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    ⚡ {pidConfig.quizTimerDuration}s Timer
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    🏆 Poin Otomatis
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    📱 Layar Besar
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Mode Guru PID</span>
                <button
                  type="button"
                  onClick={() => setActivePlayModal('quick_quiz')}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-amber-600/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Play size={14} className="fill-white" />
                  <span>Mulai Kuis Kilat</span>
                </button>
              </div>
            </div>

            {/* 4. Susun Kata (Interactive Puzzle) */}
            <div className="bg-white border-2 border-sky-500/30 hover:border-sky-500 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-900 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                    <BookOpen size={28} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                      Literasi Sentuh
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">Kosakata & Istilah</span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                  Susun Kata PID (Teka-Teki Sentuh & Geser)
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Permainan menyusun huruf acak menjadi istilah konsep mata pelajaran yang benar dengan petunjuk (clue) kurikulum. Siswa dapat mengetuk langsung ubin huruf di papan interaktif kelas.
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-4">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    🔤 Touch Tile
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    💡 Petunjuk Kurikulum
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    🧩 Edukasi Literasi
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Mode Guru PID</span>
                <button
                  type="button"
                  onClick={() => setActivePlayModal('word_scramble')}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-sky-600/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Play size={14} className="fill-white" />
                  <span>Mulai Susun Kata</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: BANK SOAL SEMUA GAME (Bukan Hanya Catur Doang)
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'bank_soal' && (
        <div className="space-y-5">
          {/* Stats Summary Bar across All Games */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Soal Semua Game</span>
              <span className="text-2xl font-black text-slate-900 font-outfit mt-1 block">{questions.length}</span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">♟️ Catur Pintar</span>
              <span className="text-2xl font-black text-indigo-600 font-outfit mt-1 block">
                {questions.filter(q => (q.game_type || 'all').toLowerCase() === 'chess' || (q.game_type || 'all').toLowerCase() === 'all').length}
              </span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">⚡ Kuis Kilat</span>
              <span className="text-2xl font-black text-amber-600 font-outfit mt-1 block">
                {questions.filter(q => (q.game_type || '').toLowerCase().includes('quiz') || (q.game_type || 'all').toLowerCase() === 'all').length}
              </span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">🗺️ Indonesian RP & Susun Kata</span>
              <span className="text-2xl font-black text-emerald-600 font-outfit mt-1 block">
                {questions.filter(q => ['word_scramble', 'ilrp', 'all'].includes((q.game_type || 'all').toLowerCase())).length}
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
            {/* Game Type Filter Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">Filter Game:</span>
              {[
                { id: 'ALL', label: 'Semua Game' },
                { id: 'chess', label: '♟️ Catur Pintar' },
                { id: 'quiz', label: '⚡ Kuis Kilat' },
                { id: 'word_scramble', label: '📖 Susun Kata' },
                { id: 'ilrp', label: '🗺️ Indonesian RP' },
              ].map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGameFilter(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedGameFilter === g.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Subject Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">Mapel:</span>
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSubjectFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Mapel ({questions.length})
              </button>
              {GAME_SUBJECTS.map(subj => {
                const count = questions.filter(q => q.subject.toLowerCase() === subj.toLowerCase()).length;
                const isSelected = selectedSubjectFilter === subj;
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubjectFilter(subj)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
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
                placeholder="Cari soal berdasarkan pertanyaan, topik materi, atau mata pelajaran..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs">Memuat daftar soal game...</div>
            ) : filteredQuestions.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center">
                <Gamepad2 size={36} className="text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">Tidak ada soal ditemukan</h3>
                <p className="text-xs text-slate-500 mt-1">Coba ganti filter game/mapel atau tambahkan soal baru.</p>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const gameLabel = 
                  q.game_type === 'chess' ? '♟️ Catur Pintar' :
                  q.game_type === 'quiz' ? '⚡ Kuis Kilat' :
                  q.game_type === 'word_scramble' ? '📖 Susun Kata' :
                  q.game_type === 'ilrp' ? '🗺️ Indonesian RP' : '🌐 Semua Game';

                return (
                  <div
                    key={q.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {q.subject}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                          {gameLabel}
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
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Lihat Tampilan Soal Duel"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(q)}
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                        title="Edit Soal"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                        title="Hapus Soal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 3: PENGATURAN GAME & PID (Layar Sentuh & Timer Kelas)
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'pengaturan' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900 font-outfit flex items-center gap-2">
                <Sliders size={18} className="text-indigo-600" />
                <span>Konfigurasi Game Papan Interaktif Digital (PID)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur perilaku antarmuka layar sentuh, batas waktu ronde kuis, dan audio untuk pengajaran di depan kelas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
              {/* 1. Timer Durasi Kuis Kilat */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Clock size={16} className="text-amber-500" />
                  <span>Durasi Timer Kuis Kilat per Soal</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Waktu yang diberikan kepada regu siswa untuk berdiskusi dan menekan tombol jawaban di PID.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {[15, 20, 30, 45, 60].map(seconds => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => handleUpdateConfig({ quizTimerDuration: seconds })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        pidConfig.quizTimerDuration === seconds
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Ukuran Target Sentuh PID */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Tv size={16} className="text-cyan-500" />
                  <span>Ukuran Tombol Layar Sentuh (Target Hitbox)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Menyesuaikan ukuran tombol agar sangat mudah disentuh pada layar monitor smart board besar.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig({ touchTargetScale: 'large_board' })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      pidConfig.touchTargetScale === 'large_board'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Ekstra Besar (≥64px Smart Board)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig({ touchTargetScale: 'standard' })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      pidConfig.touchTargetScale === 'standard'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Standar Desktop
                  </button>
                </div>
              </div>

              {/* 3. Tingkat Kesulitan Default */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Sparkles size={16} className="text-purple-500" />
                  <span>Tingkat Kesulitan Soal Standar</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Filter soal otomatis yang diutamakan muncul saat sesi game interaktif dimulai.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {(['Mudah', 'Sedang', 'Sulit', 'Campuran'] as const).map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => handleUpdateConfig({ defaultDifficulty: diff })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        pidConfig.defaultDifficulty === diff
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Efek Suara Game PID */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Volume2 size={16} className="text-emerald-500" />
                  <span>Efek Suara (Audio Feedback)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Bunyi efek saat jawaban benar, salah, skakmat catur, dan hitung mundur timer.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig({ soundFxEnabled: true })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      pidConfig.soundFxEnabled
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Suara Aktif (ON)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig({ soundFxEnabled: false })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !pidConfig.soundFxEnabled
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Senyap (Mute)
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone: Reset Data */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pemeliharaan & Pemulihan Bank Soal
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Pulihkan Seluruh Soal ke Bawaan Kurikulum
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Bersihkan riwayat skor permainan siswa di sesi ini?')) {
                      localStorage.removeItem('ilrp_game_scores');
                      setToast?.({ message: 'Riwayat skor game berhasil direset!', type: 'success' });
                    }
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Reset Riwayat Skor Siswa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ADD / EDIT QUESTION MODAL (Supports ALL Games)
         ═══════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                  Bank Soal Game PID
                </span>
                <h3 className="text-base font-black text-slate-900 font-outfit">
                  {editingQuestion ? 'Edit Soal Game' : 'Tambah Soal Baru untuk Game'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Target Game Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Target Game
                </label>
                <select
                  value={formGameType}
                  onChange={(e) => setFormGameType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="all">Semua Game (Universal)</option>
                  <option value="chess">♟️ Catur Pintar</option>
                  <option value="quiz">⚡ Kuis Kilat</option>
                  <option value="word_scramble">📖 Susun Kata</option>
                  <option value="ilrp">🗺️ Indonesian Life Roleplay</option>
                </select>
              </div>

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
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PREVIEW QUESTION MODAL
         ═══════════════════════════════════════════════════════════ */}
      {previewQuestion && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  {previewQuestion.subject}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Pratinjau Soal Game
                </span>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-900 mb-4 leading-snug">
              {previewQuestion.question}
            </h3>

            <div className="space-y-2 mb-4">
              {previewQuestion.options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    idx === previewQuestion.correct_index
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                  {idx === previewQuestion.correct_index && (
                    <span className="ml-auto text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                      Kunci Jawaban
                    </span>
                  )}
                </div>
              ))}
            </div>

            {previewQuestion.explanation && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 mb-4">
                <strong className="text-slate-800">Pembahasan:</strong> {previewQuestion.explanation}
              </div>
            )}

            <button
              onClick={() => setPreviewQuestion(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
