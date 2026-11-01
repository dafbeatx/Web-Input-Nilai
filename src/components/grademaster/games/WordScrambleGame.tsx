"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ArrowLeft, BookOpen, Trophy, RotateCcw, 
  CheckCircle2, XCircle, Clock, Sparkles, 
  Award, ChevronRight, HelpCircle, FastForward, Undo2
} from "lucide-react";

interface WordScrambleGameProps {
  onBack: () => void;
}

interface WordItem {
  word: string;
  hint: string;
  subject: string;
}

interface LetterTile {
  id: string;
  letter: string;
  originalIndex: number;
}

type GameState = 'idle' | 'playing' | 'result';

// High-quality School Curriculum Word Bank (50 Words across subjects)
const WORD_BANK: WordItem[] = [
  // IPA / Sains
  { word: 'MITOKONDRIA', hint: 'Organel sel penghasil energi respirasi (ATP)', subject: 'IPA' },
  { word: 'FOTOSINTESIS', hint: 'Proses tumbuhan hijau mengolah makanan dengan cahaya', subject: 'IPA' },
  { word: 'METAMORFOSIS', hint: 'Perubahan bentuk fisik hewan dalam siklus perkembangannya', subject: 'IPA' },
  { word: 'GRAVITASI', hint: 'Gaya tarik alami antarpartikel bermassa di alam semesta', subject: 'IPA' },
  { word: 'EKOSISTEM', hint: 'Interaksi timbal balik antara makhluk hidup dan lingkungannya', subject: 'IPA' },
  { word: 'HOMEOSTASIS', hint: 'Kemampuan tubuh menjaga kestabilan kondisi internal', subject: 'IPA' },
  { word: 'KLOROFIL', hint: 'Pigmen hijau daun penyerap energi foton cahaya matahari', subject: 'IPA' },
  { word: 'KROMOSOM', hint: 'Struktur pembawa informasi materi genetik di inti sel', subject: 'IPA' },
  { word: 'PENCERNAAN', hint: 'Sistem penguraian zat makanan menjadi nutrisi tubuh', subject: 'IPA' },
  { word: 'BIODIVERSITAS', hint: 'Keanekaragaman hayati makhluk hidup dalam ekosistem', subject: 'IPA' },

  // Matematika
  { word: 'PYTHAGORAS', hint: 'Teorema kuadrat sisi miring pada segitiga siku-siku', subject: 'Matematika' },
  { word: 'LOGARITMA', hint: 'Operasi matematika kebalikan dari perpangkatan atau eksponen', subject: 'Matematika' },
  { word: 'TRIGONOMETRI', hint: 'Cabang matematika tentang hubungan sisi dan sudut segitiga', subject: 'Matematika' },
  { word: 'ALJABAR', hint: 'Cabang matematika menggunakan simbol variabel dan angka', subject: 'Matematika' },
  { word: 'PERSAMAAN', hint: 'Pernyataan matematika dua ekspresi yang memiliki nilai sama', subject: 'Matematika' },
  { word: 'STATISTIKA', hint: 'Ilmu merencanakan, mengumpulkan, dan menganalisis data', subject: 'Matematika' },
  { word: 'KOORDINAT', hint: 'Kedudukan atau posisi suatu titik pada bidang Cartesius', subject: 'Matematika' },
  { word: 'VEKTOR', hint: 'Besaran fisika-matematika yang memiliki nilai dan arah', subject: 'Matematika' },
  { word: 'FRAKTAL', hint: 'Bentuk geometris dengan pola perulangan serupa di tiap skala', subject: 'Matematika' },
  { word: 'PROBABILITAS', hint: 'Ukuran kemungkinan terjadinya suatu peristiwa tertentu', subject: 'Matematika' },

  // Bahasa Indonesia
  { word: 'METAFORA', hint: 'Majas perbandingan langsung tanpa kata penghubung', subject: 'Bahasa Indonesia' },
  { word: 'HIPERBOLA', hint: 'Gaya bahasa kiasan yang melebih-lebihkan kenyataan', subject: 'Bahasa Indonesia' },
  { word: 'PARAGRAF', hint: 'Kesatuan kalimat yang mengandung satu gagasan pokok', subject: 'Bahasa Indonesia' },
  { word: 'ANTONIM', hint: 'Hubungan semantik dua kata yang memiliki makna berlawanan', subject: 'Bahasa Indonesia' },
  { word: 'SINONIM', hint: 'Bentuk kata yang memiliki persamaan atau kesamaan makna', subject: 'Bahasa Indonesia' },
  { word: 'EKSPLANASI', hint: 'Teks yang menerangkan proses fenomena alam atau sosial', subject: 'Bahasa Indonesia' },
  { word: 'MORFOLOGI', hint: 'Cabang ilmu linguistik tentang struktur pembentukan kata', subject: 'Bahasa Indonesia' },
  { word: 'RANGKUMAN', hint: 'Penyajian ringkas dari karangan atau wacana yang panjang', subject: 'Bahasa Indonesia' },
  { word: 'DEDUKTIF', hint: 'Paragraf dengan gagasan utama terletak di awal kalimat', subject: 'Bahasa Indonesia' },
  { word: 'PERSUASI', hint: 'Teks yang bertujuan mengajak atau meyakinkan pembaca', subject: 'Bahasa Indonesia' },

  // Bahasa Inggris
  { word: 'VOCABULARY', hint: 'Kumpulan kosakata atau perbendaharaan kata dalam bahasa', subject: 'Bahasa Inggris' },
  { word: 'ADJECTIVE', hint: 'Kata sifat yang menerangkan kata benda dalam kalimat', subject: 'Bahasa Inggris' },
  { word: 'CONJUNCTION', hint: 'Kata sambung penghubung klausa atau kalimat', subject: 'Bahasa Inggris' },
  { word: 'PRONOUN', hint: 'Kata ganti orang atau benda dalam struktur tata bahasa', subject: 'Bahasa Inggris' },
  { word: 'NARRATIVE', hint: 'Teks cerita khayalan atau peristiwa kronologis bermakna', subject: 'Bahasa Inggris' },
  { word: 'ADVERB', hint: 'Kata keterangan penjelas kata kerja atau kata sifat', subject: 'Bahasa Inggris' },
  { word: 'PREPOSITION', hint: 'Kata depan penunjuk posisi, arah, atau waktu', subject: 'Bahasa Inggris' },
  { word: 'QUESTION', hint: 'Kalimat interogatif untuk meminta informasi tertentu', subject: 'Bahasa Inggris' },
  { word: 'SENTENCE', hint: 'Rangkaian kata berpola yang memuat subjek dan predikat', subject: 'Bahasa Inggris' },
  { word: 'DICTIONARY', hint: 'Buku rujukan makna dan ejaan kata dalam bahasa', subject: 'Bahasa Inggris' },

  // IPS & Sejarah
  { word: 'PROKLAMASI', hint: 'Pernyataan resmi kemerdekaan Republik Indonesia 1945', subject: 'IPS & Sejarah' },
  { word: 'NUSANTARA', hint: 'Sebutan kepulauan kepunyaan Indonesia dari Sabang sampai Merauke', subject: 'IPS & Sejarah' },
  { word: 'DIPLOMASI', hint: 'Seni dan praktik bernegosiasi antarbangsa dan negara', subject: 'IPS & Sejarah' },
  { word: 'DEMOKRASI', hint: 'Pemerintahan dari rakyat, oleh rakyat, dan untuk rakyat', subject: 'IPS & Sejarah' },
  { word: 'MONETER', hint: 'Segala hal yang berkaitan dengan kebijakan keuangan dan mata uang', subject: 'IPS & Sejarah' },
  { word: 'KONGRES', hint: 'Pertemuan formal para wakil organisasi untuk bermusyawarah', subject: 'IPS & Sejarah' },
  { word: 'ARSIP', hint: 'Koleksi dokumen bersejarah yang disimpan secara permanen', subject: 'IPS & Sejarah' },
  { word: 'URBANISASI', hint: 'Perpindahan penduduk dari kawasan desa ke kota besar', subject: 'IPS & Sejarah' },
  { word: 'GEOSTRATEGI', hint: 'Pemanfaatan letak geografis untuk ketahanan nasional', subject: 'IPS & Sejarah' },
  { word: 'ANGGARAN', hint: 'Rencana pengeluaran dan pemasukan dana yang terinci', subject: 'IPS & Sejarah' }
];

const AVAILABLE_SUBJECTS = [
  'Semua Mapel',
  'IPA',
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'IPS & Sejarah'
];

// Shuffle helper ensuring letters are scrambled
function createScrambledTiles(word: string): LetterTile[] {
  const letters = word.toUpperCase().split('');
  const tiles: LetterTile[] = letters.map((char, idx) => ({
    id: `${char}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    letter: char,
    originalIndex: idx
  }));

  const shuffled = [...tiles];
  let attempts = 0;
  while (attempts < 8) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const currentWord = shuffled.map(t => t.letter).join('');
    if (currentWord !== word) {
      break;
    }
    attempts++;
  }

  // Fallback swap if still matches original and length >= 2
  if (shuffled.map(t => t.letter).join('') === word && shuffled.length >= 2) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}

export default function WordScrambleGame({ onBack }: WordScrambleGameProps) {
  // Game Flow States
  const [gameState, setGameState] = useState<GameState>('idle');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('Semua Mapel');

  // Words Queue
  const [sessionWords, setSessionWords] = useState<WordItem[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [slideKey, setSlideKey] = useState<number>(0);

  // Tiles State for Current Word
  const [poolTiles, setPoolTiles] = useState<LetterTile[]>([]);
  const [answerTiles, setAnswerTiles] = useState<LetterTile[]>([]);

  // Timer & Scoring
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [wrongAttempts, setWrongAttempts] = useState<number>(0);

  // Animation & Feedback States
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [feedbackState, setFeedbackState] = useState<'none' | 'correct' | 'wrong' | 'timeout'>('none');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isBouncing, setIsBouncing] = useState<boolean>(false);
  const [displayScore, setDisplayScore] = useState<number>(0);

  // Timers ref cleanup
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // Pick 10 random words from WORD_BANK
  const pickSessionWords = useCallback((subjectFilter: string): WordItem[] => {
    let pool = WORD_BANK;
    if (subjectFilter !== 'Semua Mapel') {
      pool = WORD_BANK.filter(w => w.subject === subjectFilter);
      if (pool.length === 0) pool = WORD_BANK;
    }

    // Shuffle pool and slice 10
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, []);

  // Initialize a new word
  const loadWord = useCallback((wordItem: WordItem) => {
    const scrambled = createScrambledTiles(wordItem.word);
    setPoolTiles(scrambled);
    setAnswerTiles([]);
    setTimeLeft(45);
    setWrongAttempts(0);
    setIsEvaluating(false);
    setFeedbackState('none');
    setIsShaking(false);
    setIsBouncing(false);
    setSlideKey(k => k + 1);
  }, []);

  // Start new game
  const startGame = useCallback((filter: string) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    const words = pickSessionWords(filter);
    setSessionWords(words);
    setCurrentWordIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSkippedCount(0);
    setDisplayScore(0);
    loadWord(words[0]);
    setGameState('playing');
  }, [pickSessionWords, loadWord]);

  // Advance to next word or result screen
  const advanceToNextWord = useCallback(() => {
    if (currentWordIndex + 1 < sessionWords.length) {
      const nextIdx = currentWordIndex + 1;
      setCurrentWordIndex(nextIdx);
      loadWord(sessionWords[nextIdx]);
    } else {
      setGameState('result');
    }
  }, [currentWordIndex, sessionWords, loadWord]);

  // Tile clicked from pool -> Move to Answer Area
  const handleTileFromPool = useCallback((tile: LetterTile) => {
    if (isEvaluating || feedbackState !== 'none') return;
    setPoolTiles(prev => prev.filter(t => t.id !== tile.id));
    setAnswerTiles(prev => [...prev, tile]);
  }, [isEvaluating, feedbackState]);

  // Tile clicked from Answer Area -> Return to pool
  const handleTileFromAnswer = useCallback((tile: LetterTile) => {
    if (isEvaluating || feedbackState !== 'none') return;
    setAnswerTiles(prev => prev.filter(t => t.id !== tile.id));
    setPoolTiles(prev => [...prev, tile]);
  }, [isEvaluating, feedbackState]);

  // Reset all tiles back to pool
  const handleResetLetters = useCallback(() => {
    if (isEvaluating || feedbackState !== 'none' || answerTiles.length === 0) return;
    setPoolTiles(prev => [...prev, ...answerTiles]);
    setAnswerTiles([]);
  }, [isEvaluating, feedbackState, answerTiles]);

  // Check Answer Button Logic
  const handleCheckAnswer = useCallback(() => {
    if (isEvaluating || feedbackState !== 'none') return;
    const currentWordItem = sessionWords[currentWordIndex];
    if (!currentWordItem) return;

    const assembledWord = answerTiles.map(t => t.letter).join('');
    const target = currentWordItem.word.toUpperCase();

    if (assembledWord === target) {
      // Correct!
      setIsEvaluating(true);
      setFeedbackState('correct');
      setIsBouncing(true);
      setScore(s => s + 10);
      setCorrectCount(c => c + 1);

      feedbackTimerRef.current = setTimeout(() => {
        advanceToNextWord();
      }, 1000);
    } else {
      // Incorrect!
      setIsEvaluating(true);
      setFeedbackState('wrong');
      setIsShaking(true);
      setScore(s => Math.max(0, s - 2));
      setWrongAttempts(prev => prev + 1);

      // Stop shake after 380ms and re-enable input
      setTimeout(() => {
        setIsShaking(false);
      }, 380);

      feedbackTimerRef.current = setTimeout(() => {
        setFeedbackState('none');
        setIsEvaluating(false);
      }, 800);
    }
  }, [isEvaluating, feedbackState, sessionWords, currentWordIndex, answerTiles, advanceToNextWord]);

  // Skip current word (manual or via timeout)
  const handleSkipWord = useCallback((isTimeout = false) => {
    if (isEvaluating || feedbackState !== 'none') return;
    const currentWordItem = sessionWords[currentWordIndex];
    if (!currentWordItem) return;

    setIsEvaluating(true);
    setFeedbackState(isTimeout ? 'timeout' : 'wrong');
    setSkippedCount(s => s + 1);

    // Auto-assemble the correct word into answerTiles for learning
    const correctLetters = currentWordItem.word.toUpperCase().split('');
    const revealedTiles: LetterTile[] = correctLetters.map((char, idx) => ({
      id: `revealed-${char}-${idx}`,
      letter: char,
      originalIndex: idx
    }));
    setAnswerTiles(revealedTiles);
    setPoolTiles([]);

    // Wait 1300ms showing the revealed word, then advance
    feedbackTimerRef.current = setTimeout(() => {
      advanceToNextWord();
    }, 1300);
  }, [isEvaluating, feedbackState, sessionWords, currentWordIndex, advanceToNextWord]);

  // Timer per word effect
  useEffect(() => {
    if (gameState !== 'playing' || isEvaluating || feedbackState !== 'none') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, isEvaluating, feedbackState, currentWordIndex]);

  // Trigger timeout auto-skip when timeLeft reaches 0
  useEffect(() => {
    if (gameState === 'playing' && !isEvaluating && feedbackState === 'none' && timeLeft === 0) {
      const timer = setTimeout(() => {
        handleSkipWord(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, gameState, isEvaluating, feedbackState, handleSkipWord]);

  // Result screen score count-up
  useEffect(() => {
    if (gameState !== 'result' || score <= 0) return;

    const duration = 1200;
    const steps = 30;
    const stepTime = Math.max(20, Math.floor(duration / steps));
    const increment = Math.ceil(score / steps);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [gameState, score]);

  // Current active word item
  const activeWord = sessionWords[currentWordIndex] || null;
  const targetLength = activeWord ? activeWord.word.length : 0;

  // Timer color
  const getTimerColor = (time: number): string => {
    if (time > 20) return 'bg-emerald-500';
    if (time > 10) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  // Grade calculation
  const getRankData = (finalScore: number) => {
    if (finalScore >= 90) {
      return {
        rank: 'A+',
        title: 'Kosakata Sempurna',
        desc: 'Hebat sekali! Penguasaan istilah akademikmu sangat luar biasa.'
      };
    }
    if (finalScore >= 70) {
      return {
        rank: 'A',
        title: 'Master Kata',
        desc: 'Daya ingat dan analisis istilahmu sangat baik dan cermat.'
      };
    }
    if (finalScore >= 50) {
      return {
        rank: 'B',
        title: 'Cukup Terampil',
        desc: 'Kemampuan menyusun kata baik, tingkatkan perbendaharaan istilah.'
      };
    }
    if (finalScore >= 30) {
      return {
        rank: 'C',
        title: 'Perlu Asahan',
        desc: 'Perbanyak membaca istilah pelajaran untuk mempercepat tebakan.'
      };
    }
    return {
      rank: 'D',
      title: 'Ayo Coba Lagi',
      desc: 'Latih lagi ingatanmu untuk menyusun huruf dengan tepat!'
    };
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-3.5 py-3 space-y-4 text-left pb-24">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
            title="Kembali ke Hub Game"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight font-outfit">
                Susun Kata
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200/70 text-sky-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <BookOpen size={11} className="text-sky-600" />
                Istilah Sekolah
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Tebak & susun huruf materi pelajaran
            </p>
          </div>
        </div>

        {gameState === 'playing' && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1 rounded-xl bg-violet-50 border border-violet-200 text-violet-800 text-xs font-black">
              {score} Pts
            </div>
          </div>
        )}
      </div>

      {/* STATE 1: IDLE / SETUP */}
      {gameState === 'idle' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100 inline-block mb-2">
              Tantangan Kosakata
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-outfit leading-snug">
              Pilih Kategori Istilah
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Tebak 10 istilah pelajaran dengan menyusun huruf acak ke urutan yang benar. Benar bernilai +10 poin, salah -2 poin. Waktu setiap kata 45 detik.
            </p>
          </div>

          {/* Subject Filter Pills */}
          <div className="space-y-2">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Filter Mata Pelajaran:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_SUBJECTS.map((sub) => {
                const isSelected = selectedSubjectFilter === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubjectFilter(sub)}
                    className={`min-h-[46px] p-3 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer active:scale-[0.98] flex items-center justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{sub}</span>
                    {isSelected && <CheckCircle2 size={15} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gameplay Rules Highlights */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <Clock size={16} className="text-amber-500 mx-auto" />
              <p className="text-[11px] font-black text-slate-800">45 Detik</p>
              <p className="text-[9px] text-slate-500">Per kata</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <Sparkles size={16} className="text-violet-600 mx-auto" />
              <p className="text-[11px] font-black text-slate-800">+10 / -2 Pts</p>
              <p className="text-[9px] text-slate-500">Benar vs Salah</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <FastForward size={16} className="text-sky-600 mx-auto" />
              <p className="text-[11px] font-black text-slate-800">Bisa Skip</p>
              <p className="text-[9px] text-slate-500">Setelah 2x salah</p>
            </div>
          </div>

          {/* Start CTA */}
          <button
            type="button"
            onClick={() => startGame(selectedSubjectFilter)}
            className="w-full min-h-[50px] py-3.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            <span>Mulai Susun Kata Sekarang</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* STATE 2: PLAYING */}
      {gameState === 'playing' && activeWord && (
        <div className="space-y-3.5">
          {/* Top Progress & Timer Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Kata</span>
                <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 font-black">
                  {currentWordIndex + 1} / {sessionWords.length}
                </span>
                <span className="text-slate-400 font-semibold text-[11px] hidden sm:inline">
                  • {activeWord.subject}
                </span>
              </div>

              {/* Remaining Seconds Text */}
              <div className="flex items-center gap-1.5 font-outfit">
                <Clock size={14} className={timeLeft <= 10 ? 'text-rose-500 animate-bounce' : 'text-slate-400'} />
                <span className={`text-sm font-black ${
                  timeLeft <= 10 ? 'text-rose-600 font-mono text-base' : timeLeft <= 20 ? 'text-amber-600 font-mono' : 'text-slate-700 font-mono'
                }`}>
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Purposeful Timer Progress Bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${getTimerColor(timeLeft)}`}
                style={{ width: `${(timeLeft / 45) * 100}%` }}
              />
            </div>
          </div>

          {/* Main Gameplay Board */}
          <div
            key={slideKey}
            style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-5"
          >
            {/* Clue / Hint Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle size={12} className="text-violet-600" />
                  Petunjuk Istilah ({activeWord.subject})
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {targetLength} Huruf
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                &ldquo;{activeWord.hint}&rdquo;
              </p>
            </div>

            {/* Answer Area (Dashed slots when empty, filled tiles when placed) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Area Jawaban:
                </span>
                <span className="text-[10px] text-slate-400">
                  Klik huruf di bawah untuk memasukkan
                </span>
              </div>

              <div
                className={`min-h-[64px] p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${
                  isShaking ? 'animate-shake' : ''
                } ${
                  isBouncing ? 'animate-bounce' : ''
                } ${
                  feedbackState === 'correct'
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                    : feedbackState === 'wrong'
                    ? 'bg-rose-50 border-rose-300'
                    : feedbackState === 'timeout'
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-slate-50/70 border-slate-200/90'
                }`}
              >
                {Array.from({ length: targetLength }).map((_, slotIdx) => {
                  const tile = answerTiles[slotIdx];
                  if (tile) {
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        disabled={isEvaluating}
                        onClick={() => handleTileFromAnswer(tile)}
                        className={`w-10 h-11 sm:w-12 sm:h-13 rounded-xl font-black text-sm sm:text-base border shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                          feedbackState === 'correct'
                            ? 'bg-emerald-500 text-white border-emerald-600'
                            : feedbackState === 'wrong'
                            ? 'bg-rose-500 text-white border-rose-600'
                            : 'bg-violet-600 text-white border-violet-700 hover:bg-violet-700'
                        }`}
                        title="Klik untuk kembalikan huruf"
                      >
                        {tile.letter}
                      </button>
                    );
                  }

                  // Empty slot with dashed border
                  return (
                    <div
                      key={`empty-slot-${slotIdx}`}
                      className="w-10 h-11 sm:w-12 sm:h-13 rounded-xl border-2 border-dashed border-slate-300 bg-white/50 flex items-center justify-center text-slate-300 font-bold select-none"
                    >
                      _
                    </div>
                  );
                })}
              </div>

              {/* Feedback Message */}
              {feedbackState === 'correct' && (
                <div className="p-2 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>Jawaban Benar! +10 Poin</span>
                </div>
              )}
              {feedbackState === 'wrong' && (
                <div className="p-2 rounded-xl bg-rose-500 text-white text-xs font-black flex items-center justify-center gap-1.5">
                  <XCircle size={15} />
                  <span>Susunan Belum Tepat (-2 Poin). Coba Lagi!</span>
                </div>
              )}
              {feedbackState === 'timeout' && (
                <div className="p-2 rounded-xl bg-amber-500 text-white text-xs font-black flex items-center justify-center gap-1.5">
                  <Clock size={15} />
                  <span>Waktu Habis! Jawaban yang benar adalah: {activeWord.word}</span>
                </div>
              )}
            </div>

            {/* Letter Tiles Pool */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Pilihan Huruf Acak:
              </span>

              <div className="min-h-[58px] p-2 sm:p-2.5 rounded-2xl bg-slate-100/70 border border-slate-200/80 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                {poolTiles.length === 0 ? (
                  <span className="text-xs text-slate-400 font-medium italic py-2">
                    Semua huruf telah dimasukkan ke area jawaban
                  </span>
                ) : (
                  poolTiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      disabled={isEvaluating}
                      onClick={() => handleTileFromPool(tile)}
                      className="w-10 h-11 sm:w-12 sm:h-13 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-black text-sm sm:text-base border border-slate-200 shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:border-violet-300"
                    >
                      {tile.letter}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons: Reset, Skip, Check */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                disabled={isEvaluating || answerTiles.length === 0}
                onClick={handleResetLetters}
                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Undo2 size={15} />
                <span>Reset</span>
              </button>

              <button
                type="button"
                disabled={isEvaluating}
                onClick={() => handleSkipWord(false)}
                className={`min-h-[44px] py-2.5 px-3 rounded-xl active:scale-[0.98] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
                  wrongAttempts >= 2
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
                title={wrongAttempts >= 2 ? 'Lewati kata ini' : 'Bisa dilewati'}
              >
                <FastForward size={15} />
                <span>Lewati</span>
              </button>

              <button
                type="button"
                disabled={isEvaluating || answerTiles.length === 0}
                onClick={handleCheckAnswer}
                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-violet-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <CheckCircle2 size={16} />
                <span>Cek</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: RESULT SCREEN */}
      {gameState === 'result' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          {(() => {
            const rank = getRankData(score);
            return (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto shadow-sm">
                  <Trophy size={32} />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-800 text-xs font-black uppercase tracking-wider mb-1.5">
                    <Award size={14} />
                    <span>Peringkat: {rank.rank} • {rank.title}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-outfit">
                    Susun Kata Selesai!
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    {rank.desc}
                  </p>
                </div>

                {/* Animated Score Count-up */}
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 max-w-xs mx-auto">
                  <span className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider block">
                    Total Skor Akhir
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-sky-700 font-outfit tracking-tight">
                    {displayScore}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Kategori: {selectedSubjectFilter}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-emerald-700 font-black text-base sm:text-lg block">
                {correctCount} / {sessionWords.length}
              </span>
              <p className="text-[10px] font-bold text-emerald-800">Kata Berhasil Disusun</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <span className="text-amber-700 font-black text-base sm:text-lg block">
                {skippedCount}
              </span>
              <p className="text-[10px] font-bold text-amber-800">Kata Terlewat / Timeout</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => startGame(selectedSubjectFilter)}
              className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
            >
              <RotateCcw size={16} />
              <span>Main Lagi ({selectedSubjectFilter})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGameState('idle');
                setDisplayScore(0);
              }}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <BookOpen size={15} />
              <span>Pilih Kategori Istilah Lain</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded CSS Keyframes */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(28px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
