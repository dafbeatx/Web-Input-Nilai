"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ArrowLeft, Zap, Trophy, RotateCcw, 
  CheckCircle2, XCircle, Clock, Flame, 
  Sparkles, Award, ChevronRight, BookOpen
} from "lucide-react";
import { 
  GameQuestion, 
  GameQuestionsService, 
  GAME_SUBJECTS, 
  GameSubject 
} from "@/lib/grademaster/services/game-questions.service";

interface QuickQuizGameProps {
  onBack: () => void;
}

type QuizState = 'idle' | 'playing' | 'result';

export default function QuickQuizGame({ onBack }: QuickQuizGameProps) {
  // Game Configuration & State Machine
  const [gameState, setGameState] = useState<QuizState>('idle');
  const [selectedSubject, setSelectedSubject] = useState<GameSubject>('Matematika');

  // Question Engine
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const usedQuestionIdsRef = useRef<string[]>([]);
  const [slideKey, setSlideKey] = useState<number>(0);

  // Timer & Scoring
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);

  // Interaction & Feedback States
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [showStreakBonus, setShowStreakBonus] = useState<boolean>(false);
  const [displayScore, setDisplayScore] = useState<number>(0);

  // Timeout ref for feedback delays
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up any pending transition timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Fetch or pick next question
  const pickNextQuestion = useCallback((subject: GameSubject, excludeIds: string[]): GameQuestion => {
    return GameQuestionsService.getRandomQuestionForDuel(subject, excludeIds);
  }, []);

  // Start new game session
  const startQuiz = useCallback((subject: GameSubject) => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    const firstQ = pickNextQuestion(subject, []);
    setCurrentQuestion(firstQ);
    usedQuestionIdsRef.current = [firstQ.id];
    setCurrentQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowStreakBonus(false);
    setTimeLeft(15);
    setDisplayScore(0);
    setSlideKey(k => k + 1);
    setGameState('playing');
  }, [pickNextQuestion]);

  // Advance to next question or result screen
  const advanceToNext = useCallback(() => {
    if (currentQuestionIndex + 1 < 10) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      const nextQ = pickNextQuestion(selectedSubject, usedQuestionIdsRef.current);
      setCurrentQuestion(nextQ);
      usedQuestionIdsRef.current.push(nextQ.id);

      setSelectedOption(null);
      setIsAnswered(false);
      setShowStreakBonus(false);
      setTimeLeft(15);
      setSlideKey(k => k + 1);
    } else {
      setGameState('result');
    }
  }, [currentQuestionIndex, pickNextQuestion, selectedSubject]);

  // Handle user selecting an option
  const handleSelectOption = useCallback((optionIndex: number) => {
    if (isAnswered || gameState !== 'playing' || !currentQuestion) return;

    setIsAnswered(true);
    setSelectedOption(optionIndex);

    const isCorrect = optionIndex === currentQuestion.correct_index;

    if (isCorrect) {
      // Formula: 10 + Math.round(timeLeft * 14/15)
      const basePoints = 10 + Math.round(timeLeft * (14 / 15));

      setStreak(prevStreak => {
        const newStreak = prevStreak + 1;
        setMaxStreak(prevMax => Math.max(prevMax, newStreak));

        let bonus = 0;
        if (newStreak >= 3) {
          bonus = 5;
          setShowStreakBonus(true);
        }

        const totalEarned = basePoints + bonus;
        setScore(s => s + totalEarned);
        return newStreak;
      });

      setCorrectCount(c => c + 1);

      // Flash green and advance after 900ms
      transitionTimerRef.current = setTimeout(() => {
        advanceToNext();
      }, 900);
    } else {
      // Incorrect answer: reset streak, flash red & show correct
      setStreak(0);
      setWrongCount(w => w + 1);
      setShowStreakBonus(false);

      // Give 1300ms to see correct answer and learn
      transitionTimerRef.current = setTimeout(() => {
        advanceToNext();
      }, 1300);
    }
  }, [isAnswered, gameState, currentQuestion, timeLeft, advanceToNext]);

  // Handle countdown timeout
  const handleTimeout = useCallback(() => {
    if (isAnswered || gameState !== 'playing') return;

    setIsAnswered(true);
    setSelectedOption(-1); // indicates timeout
    setStreak(0);
    setWrongCount(w => w + 1);
    setShowStreakBonus(false);

    // Wait 1200ms showing the correct answer before advancing
    transitionTimerRef.current = setTimeout(() => {
      advanceToNext();
    }, 1200);
  }, [isAnswered, gameState, advanceToNext]);

  // Timer interval effect
  useEffect(() => {
    if (gameState !== 'playing' || isAnswered) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, isAnswered, currentQuestionIndex]);

  // Trigger timeout when timeLeft hits 0
  useEffect(() => {
    if (gameState === 'playing' && !isAnswered && timeLeft === 0) {
      const timer = setTimeout(() => {
        handleTimeout();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, gameState, isAnswered, handleTimeout]);

  // Score count-up on result screen
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

  // Helper for grade ranking
  const getRankData = (finalScore: number) => {
    if (finalScore >= 220) {
      return {
        rank: 'A+',
        title: 'Master Kilat',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        desc: 'Kecepatan dan akurasi sempurna! Pertahankan ketajamanmu.'
      };
    }
    if (finalScore >= 170) {
      return {
        rank: 'A',
        title: 'Sangat Mahir',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-300',
        desc: 'Pemahaman materi dan respons sangat cepat.'
      };
    }
    if (finalScore >= 120) {
      return {
        rank: 'B',
        title: 'Bagus & Cermat',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-300',
        desc: 'Hasil bagus, tingkatkan kecepatan untuk skor lebih tinggi.'
      };
    }
    if (finalScore >= 80) {
      return {
        rank: 'C',
        title: 'Cukup Terlatih',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-300',
        desc: 'Perlu latihan lebih intensif untuk mempercepat jawaban.'
      };
    }
    return {
      rank: 'D',
      title: 'Perlu Latihan',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
      desc: 'Jangan menyerah! Coba lagi untuk menguasai konsepnya.'
    };
  };

  // Timer color calculation
  const getTimerColor = (time: number): string => {
    if (time > 10) return 'bg-emerald-500';
    if (time > 5) return 'bg-amber-500';
    return 'bg-rose-500';
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
                Kuis Kilat
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/70 text-amber-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Zap size={11} className="fill-amber-500 text-amber-500" />
                15 Detik
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Uji kecepatan & akurasi 10 soal
            </p>
          </div>
        </div>

        {gameState === 'playing' && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Streak Badge Indicator */}
            {streak >= 3 && (
              <div className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black flex items-center gap-1 animate-pulse shadow-sm">
                <Flame size={13} className="fill-white" />
                <span>Streak {streak}x</span>
              </div>
            )}
            {/* Current Score */}
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
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-md border border-violet-100 inline-block mb-2">
              Persiapan Permainan
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-outfit leading-snug">
              Pilih Mata Pelajaran Kuis
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Kamu akan menjawab 10 soal acak. Setiap soal dibatasi waktu 15 detik. Jawab lebih cepat untuk poin ekstra dan capai 3x streak untuk bonus berlipat!
            </p>
          </div>

          {/* Subject Selection Pills */}
          <div className="space-y-2">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Mata Pelajaran:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GAME_SUBJECTS.map((subject) => {
                const isSelected = selectedSubject === subject;
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setSelectedSubject(subject)}
                    className={`min-h-[46px] p-3 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer active:scale-[0.98] flex items-center justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{subject}</span>
                    {isSelected && <CheckCircle2 size={15} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rules Overview Cards */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <Clock size={16} className="text-amber-500 mx-auto" />
              <p className="text-[11px] font-black text-slate-800">15 Detik</p>
              <p className="text-[9px] text-slate-500">Batas per soal</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <Zap size={16} className="text-violet-600 mx-auto" />
              <p className="text-[11px] font-black text-slate-800">10-24 Poin</p>
              <p className="text-[9px] text-slate-500">Cepat = poin tinggi</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <Flame size={16} className="text-rose-500 mx-auto" />
              <p className="text-[11px] font-black text-slate-800">+5 Bonus</p>
              <p className="text-[9px] text-slate-500">Streak ≥ 3 berturut</p>
            </div>
          </div>

          {/* Start CTA Button */}
          <button
            type="button"
            onClick={() => startQuiz(selectedSubject)}
            className="w-full min-h-[50px] py-3.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            <span>Mulai Kuis Kilat Sekarang</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* STATE 2: PLAYING */}
      {gameState === 'playing' && currentQuestion && (
        <div className="space-y-3.5">
          {/* Top Progress & Timer Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Soal</span>
                <span className="px-2 py-0.5 rounded-lg bg-violet-100 text-violet-800 font-black">
                  {currentQuestionIndex + 1} / 10
                </span>
                <span className="text-slate-400 font-semibold text-[11px] hidden sm:inline">
                  • {selectedSubject}
                </span>
              </div>

              {/* Remaining Seconds Text */}
              <div className="flex items-center gap-1.5 font-outfit">
                <Clock size={14} className={timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-slate-400'} />
                <span className={`text-sm font-black ${
                  timeLeft <= 5 ? 'text-rose-600 font-mono text-base' : timeLeft <= 10 ? 'text-amber-600 font-mono' : 'text-slate-700 font-mono'
                }`}>
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Purposeful Timer Bar (Shrinking from right to left) */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${getTimerColor(timeLeft)}`}
                style={{ width: `${(timeLeft / 15) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card with CSS slide-in transition */}
          <div
            key={slideKey}
            style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
          >
            {/* Streak Bonus Alert Toast */}
            {showStreakBonus && (
              <div className="p-2.5 rounded-xl bg-amber-500 text-white flex items-center justify-between text-xs font-black shadow-sm transform transition-all duration-300 scale-100 animate-in zoom-in-90">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="fill-white" />
                  <span>Streak Beruntun! +5 Bonus Poin Tambahan</span>
                </div>
                <Sparkles size={16} />
              </div>
            )}

            {/* Question Text */}
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Pertanyaan
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                {currentQuestion.question}
              </h3>
            </div>

            {/* 4 Answer Options */}
            <div className="space-y-2 pt-1">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correct_index;

                // State colors based on answered status
                let btnStyle = 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90';

                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-500 border-emerald-600 text-white font-black shadow-md';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-500 border-rose-600 text-white font-black';
                  } else {
                    btnStyle = 'bg-slate-50 border-slate-200/60 text-slate-400 opacity-60';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-violet-600 border-violet-600 text-white font-black';
                }

                return (
                  <button
                    key={`${currentQuestion.id}-opt-${idx}`}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full min-h-[46px] p-3 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${btnStyle}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                        isAnswered && isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isAnswered && isSelected && !isCorrect
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="truncate">{option}</span>
                    </div>

                    {/* Feedback Icons */}
                    {isAnswered && isCorrect && (
                      <CheckCircle2 size={18} className="text-white shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle size={18} className="text-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation box on answered */}
            {isAnswered && currentQuestion.explanation && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1">
                <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider block">
                  Penjelasan:
                </span>
                <p>{currentQuestion.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATE 3: RESULT SCREEN */}
      {gameState === 'result' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          {/* Header Rank Badge */}
          {(() => {
            const rank = getRankData(score);
            return (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
                  <Trophy size={32} />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider mb-1.5">
                    <Award size={14} />
                    <span>Peringkat: {rank.rank} • {rank.title}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-outfit">
                    Kuis Kilat Selesai!
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    {rank.desc}
                  </p>
                </div>

                {/* Animated Score Count-up */}
                <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-100 max-w-xs mx-auto">
                  <span className="text-[10px] font-extrabold text-violet-600 uppercase tracking-wider block">
                    Total Skor Akhir
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-violet-700 font-outfit tracking-tight">
                    {displayScore}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Mata Pelajaran: {selectedSubject}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-emerald-700 font-black text-base sm:text-lg block">
                {correctCount}
              </span>
              <p className="text-[10px] font-bold text-emerald-800">Jawaban Benar</p>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
              <span className="text-rose-700 font-black text-base sm:text-lg block">
                {wrongCount}
              </span>
              <p className="text-[10px] font-bold text-rose-800">Jawaban Salah</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <span className="text-amber-700 font-black text-base sm:text-lg block">
                {maxStreak}x
              </span>
              <p className="text-[10px] font-bold text-amber-800">Max Streak</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => startQuiz(selectedSubject)}
              className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
            >
              <RotateCcw size={16} />
              <span>Main Lagi ({selectedSubject})</span>
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
              <span>Pilih Mata Pelajaran Lain</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded CSS Keyframes for Purposeful Slide Transition */}
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
