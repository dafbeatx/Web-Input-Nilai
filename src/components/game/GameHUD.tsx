"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { DeviceMode, InteractiveTrigger, CharacterProfile, CHARACTER_PROFILES } from '@/lib/game/types';
import { DEFAULT_GAME_QUESTIONS, GameQuestion } from '@/lib/grademaster/services/game-questions.service';
import {
  Wallet,
  MapPin,
  Maximize2,
  Minimize2,
  Monitor,
  Smartphone,
  Tv,
  ArrowLeft,
  X,
  ShoppingBag,
  School,
  Building,
  Info,
  CheckCircle,
  ChevronDown,
  User,
  Users,
  Check,
  Wrench,
  BookOpen,
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  HelpCircle,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';

interface ShopItem {
  name: string;
  price: number;
  desc: string;
}

interface GameHUDProps {
  deviceMode: DeviceMode;
  onDeviceModeChange: (mode: DeviceMode) => void;
  currentZone: string;
  nearTrigger: InteractiveTrigger | null;
  activeModalTrigger: InteractiveTrigger | null;
  onCloseModal: () => void;
  walletBalance: number;
  onBuyItem: (item: { name: string; price: number }) => void;
  onAddReward?: (amount: number) => void;
  currentCharacter?: CharacterProfile;
  onSelectCharacter?: (char: CharacterProfile) => void;
  onEnterClassroom?: (classroomId: 'VII' | 'VIII' | 'IX') => void;
  onEnterRuangGuru?: () => void;
}

export default function GameHUD({
  deviceMode,
  onDeviceModeChange,
  currentZone,
  nearTrigger,
  activeModalTrigger,
  onCloseModal,
  walletBalance,
  onBuyItem,
  onAddReward,
  currentCharacter = CHARACTER_PROFILES[0],
  onSelectCharacter,
  onEnterClassroom,
  onEnterRuangGuru,
}: GameHUDProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // WorkAdventure-style trigger transition & Quiz state
  const [overrideTrigger, setOverrideTrigger] = useState<InteractiveTrigger | null>(null);
  const currentModal = overrideTrigger || activeModalTrigger;

  const [quizQuestions, setQuizQuestions] = useState<GameQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [isRewardClaimed, setIsRewardClaimed] = useState<boolean>(false);

  useEffect(() => {
    if (currentModal?.type === 'quiz') {
      const subject = (currentModal.data?.subject as string) || 'Matematika';
      let pool = DEFAULT_GAME_QUESTIONS.filter(
        q => q.subject.toLowerCase() === subject.toLowerCase()
      );
      if (pool.length < 5) pool = DEFAULT_GAME_QUESTIONS;
      const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 5);
      setQuizQuestions(shuffled);
      setCurrentQuestionIdx(0);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizCompleted(false);
      setIsRewardClaimed(false);
    }
  }, [currentModal]);

  const handleModalClose = () => {
    setOverrideTrigger(null);
    onCloseModal();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePurchase = (item: { name: string; price: number }) => {
    if (walletBalance >= item.price) {
      onBuyItem(item);
      setPurchaseSuccess(`Berhasil membeli ${item.name}!`);
      setTimeout(() => setPurchaseSuccess(null), 2500);
    } else {
      alert("Saldo tunai tidak mencukupi!");
    }
  };

  const isBoard = deviceMode === 'interactive_board';

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          TOP BAR HUD (Compact, clean, responsive)
         ═══════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-40 p-3 sm:p-4 pointer-events-none flex items-start justify-between gap-3">
        {/* Left: Identity & Wallet */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Back to LMS Button */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg transition-all"
            title="Kembali ke Dashboard Utama"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Keluar</span>
          </Link>

          {/* Player Badge & Character Switcher */}
          <button
            onClick={() => setIsCharacterModalOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg cursor-pointer transition-colors active:scale-95 text-left"
            title="Klik atau Ketuk untuk Ganti Karakter"
          >
            <div className={`w-8 h-8 rounded-lg ${currentCharacter.avatarBg} flex items-center justify-center overflow-hidden border border-white/20 shadow-sm relative flex-shrink-0`}>
              {currentCharacter.avatarUrl ? (
                <img
                  src={currentCharacter.avatarUrl}
                  alt={currentCharacter.name}
                  className="w-10 h-10 object-contain translate-y-1"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="font-black text-xs text-white">
                  {currentCharacter.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black leading-tight flex items-center gap-1">
                {currentCharacter.name}
                <ChevronDown size={11} className="text-slate-400" />
              </span>
              <span className="text-[9px] font-bold text-cyan-400 leading-none">{currentCharacter.role}</span>
            </div>
          </button>

          {/* Wallet Balance */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 text-emerald-400 rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg font-mono font-bold text-xs">
            <Wallet size={14} className="text-emerald-400" />
            <span>Rp {walletBalance.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Center / Right: Zone & Device Selector & Fullscreen */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Current Zone Location Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 text-slate-200 rounded-xl border border-slate-700/70 backdrop-blur-md shadow-md text-xs font-semibold">
            <MapPin size={13} className="text-rose-400" />
            <span>{currentZone}</span>
          </div>

          {/* Outdoor Students Counter (10 students max, 30 min rotation) */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 text-amber-300 rounded-xl border border-amber-500/30 backdrop-blur-md shadow-md text-xs font-semibold"
            title="Maksimal 10 siswa di luar kelas, berotasi setiap 30 menit"
          >
            <Users size={13} className="text-amber-400" />
            <span className="font-mono">Siswa Luar: 10/10</span>
          </div>

          {/* Multiplatform Device Mode Switcher (Essential for Section 5 & Interactive Board) */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg">
            <button
              onClick={() => onDeviceModeChange('desktop')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                deviceMode === 'desktop'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Desktop Mode (WASD + Mouse)"
            >
              <Monitor size={14} />
              <span className="hidden lg:inline text-[11px]">PC</span>
            </button>
            <button
              onClick={() => onDeviceModeChange('android')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                deviceMode === 'android'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Android Smartphone Mode (Virtual Joystick)"
            >
              <Smartphone size={14} />
              <span className="hidden lg:inline text-[11px]">Android</span>
            </button>
            <button
              onClick={() => onDeviceModeChange('interactive_board')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                deviceMode === 'interactive_board'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive Flat Panel / Smart Board Mode (Target sentuh besar >=64px)"
            >
              <Tv size={14} />
              <span className="hidden lg:inline text-[11px]">Smart Board</span>
            </button>
          </div>

          {/* Map Collision Editor Button */}
          <Link
            href="/game/editor"
            className="p-2 bg-slate-900/90 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg transition-all flex items-center gap-1.5"
            title="Buka Visual Collision Editor"
          >
            <Wrench size={15} />
            <span className="hidden xl:inline text-[11px] font-bold">Editor Peta</span>
          </Link>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg transition-all"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          FLOATING INTERACTION PROMPT (Appears near interactive zones)
         ═══════════════════════════════════════════════════════════ */}
      {nearTrigger && !currentModal && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-bounce">
          <div className="px-5 py-2.5 bg-indigo-950/90 border-2 border-indigo-400/80 text-white rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.5)] backdrop-blur-xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <p className="text-xs sm:text-sm font-black tracking-wide">
              {nearTrigger.promptText}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          INTERACTIVE MODAL DIALOG (Lessons, Quizzes, Warung, School, NPC)
         ═══════════════════════════════════════════════════════════ */}
      {currentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`w-full ${
              currentModal.type === 'lesson' || currentModal.type === 'quiz'
                ? 'max-w-2xl'
                : 'max-w-lg'
            } bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-white relative max-h-[90vh] flex flex-col ${
              isBoard ? 'scale-105' : ''
            }`}
          >
            {/* Close button */}
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Tutup dialog"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5 pr-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 overflow-hidden flex-shrink-0">
                {typeof currentModal.data?.avatarUrl === 'string' ? (
                  <img
                    src={currentModal.data.avatarUrl as string}
                    alt={currentModal.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    {currentModal.type === 'shop' && <ShoppingBag size={24} />}
                    {currentModal.type === 'building_entrance' && <School size={24} />}
                    {currentModal.type === 'interactive_board' && <Tv size={24} />}
                    {currentModal.type === 'npc' && <Building size={24} />}
                    {currentModal.type === 'lesson' && <BookOpen size={24} className="text-cyan-400" />}
                    {currentModal.type === 'quiz' && <Award size={24} className="text-amber-400" />}
                  </>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase truncate block">
                  {typeof currentModal.data?.role === 'string'
                    ? (currentModal.data.role as string)
                    : typeof currentModal.data?.gradeLabel === 'string'
                    ? (currentModal.data.gradeLabel as string)
                    : 'SMP Terpadu Al-Ittihadiyah'}
                </span>
                <h3 className="text-lg font-black tracking-tight truncate">{currentModal.name}</h3>
              </div>
            </div>

            {/* Notification Toast inside Modal */}
            {purchaseSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle size={16} />
                <span>{purchaseSuccess}</span>
              </div>
            )}

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto no-scrollbar flex-1 pr-1">
              {/* 1. LESSON / SMART BOARD VIEW */}
              {currentModal.type === 'lesson' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs mb-1">
                      <GraduationCap size={16} />
                      <span>
                        Kurikulum Merdeka • {typeof currentModal.data?.gradeLabel === 'string' ? currentModal.data.gradeLabel : 'Fase D'}
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white">
                      {(currentModal.data?.lesson as any)?.lessonTitle || currentModal.name}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {(currentModal.data?.lesson as any)?.summary || 'Modul rangkuman materi pembelajaran inti untuk peserta didik.'}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {Array.isArray((currentModal.data?.lesson as any)?.keyPoints) &&
                      ((currentModal.data?.lesson as any).keyPoints as { title: string; desc: string }[]).map((point, idx) => (
                        <div key={idx} className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-xs">
                          <p className="font-bold text-cyan-300 mb-1 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-[10px] text-cyan-300 font-mono flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span>{point.title}</span>
                          </p>
                          <p className="text-slate-300 leading-relaxed pl-7">{point.desc}</p>
                        </div>
                      ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-400 text-center sm:text-left">
                      💡 Pahami materi di atas, lalu uji pemahamanmu di meja kuis untuk mendapatkan koin!
                    </p>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={handleModalClose}
                        className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Tutup
                      </button>
                      <button
                        onClick={() => {
                          const lessonData = currentModal.data?.lesson as any;
                          const gradeLabel = (currentModal.data?.gradeLabel as string) || 'Kelas';
                          const quizSubject = lessonData?.quizSubject || (currentModal.data?.subject as string) || 'Matematika';
                          setOverrideTrigger({
                            id: 'trigger-quiz-from-lesson',
                            name: `Meja Belajar Siswa (${gradeLabel})`,
                            type: 'quiz',
                            promptText: 'Mulai Kuis Interaktif',
                            data: {
                              gradeLabel,
                              subject: quizSubject,
                              rewardPerQuestion: 2000,
                            },
                          });
                        }}
                        className="min-h-[44px] px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Sparkles size={15} />
                        <span>Mulai Kuis (+Hadiah Koin)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. QUIZ INTERACTIVE VIEW */}
              {currentModal.type === 'quiz' && (
                <div className="space-y-4">
                  {quizQuestions.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Memuat bank soal kuis pembelajaran...
                    </div>
                  ) : isQuizCompleted ? (
                    /* Completion / Reward Screen */
                    <div className="text-center py-4 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-400">
                        <Award size={36} />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white">Kuis Pembelajaran Selesai!</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Evaluasi pemahaman materi mata pelajaran {(currentModal.data?.subject as string) || 'Umum'}
                        </p>
                      </div>

                      <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl max-w-sm mx-auto flex items-center justify-around">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black">Benar</p>
                          <p className="text-xl font-black text-emerald-400">{score} / {quizQuestions.length}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-700" />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black">Nilai</p>
                          <p className="text-xl font-black text-cyan-400">
                            {Math.round((score / quizQuestions.length) * 100)}
                          </p>
                        </div>
                        <div className="h-8 w-px bg-slate-700" />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black">Hadiah Koin</p>
                          <p className="text-xl font-black text-amber-400">
                            Rp {(score * 2000).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      {score > 0 && (
                        <div className="pt-2">
                          {isRewardClaimed ? (
                            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                              <CheckCircle2 size={16} />
                              <span>Hadiah Rp {(score * 2000).toLocaleString('id-ID')} berhasil masuk ke dompet Anda!</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                const rewardAmount = score * 2000;
                                onAddReward?.(rewardAmount);
                                setIsRewardClaimed(true);
                              }}
                              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                              <Sparkles size={16} />
                              <span>Klaim Hadiah Tunai Rp {(score * 2000).toLocaleString('id-ID')}</span>
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => {
                            const subject = (currentModal.data?.subject as string) || 'Matematika';
                            let pool = DEFAULT_GAME_QUESTIONS.filter(
                              q => q.subject.toLowerCase() === subject.toLowerCase()
                            );
                            if (pool.length < 5) pool = DEFAULT_GAME_QUESTIONS;
                            const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 5);
                            setQuizQuestions(shuffled);
                            setCurrentQuestionIdx(0);
                            setSelectedOption(null);
                            setIsAnswerSubmitted(false);
                            setScore(0);
                            setIsQuizCompleted(false);
                            setIsRewardClaimed(false);
                          }}
                          className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw size={14} />
                          <span>Ulangi Kuis</span>
                        </button>
                        <button
                          onClick={handleModalClose}
                          className="min-h-[44px] px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          Selesai & Kembali ke Kelas
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Answering Screen */
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                          <span className="text-cyan-400">
                            Pertanyaan {currentQuestionIdx + 1} dari {quizQuestions.length}
                          </span>
                          <span className="text-amber-400 font-mono">
                            Skor Benar: {score}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/70">
                        <p className="text-sm font-bold text-slate-100 leading-relaxed">
                          {quizQuestions[currentQuestionIdx]?.question}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {quizQuestions[currentQuestionIdx]?.options.map((opt, optIdx) => {
                          const isSelected = selectedOption === optIdx;
                          const isCorrect = optIdx === quizQuestions[currentQuestionIdx].correct_index;

                          let buttonStyle = 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/80 text-slate-200';
                          let pillStyle = 'bg-slate-700/80 text-slate-300';

                          if (isAnswerSubmitted) {
                            if (isCorrect) {
                              buttonStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-md shadow-emerald-950/50';
                              pillStyle = 'bg-emerald-600 text-white';
                            } else if (isSelected) {
                              buttonStyle = 'bg-rose-950/80 border-rose-500 text-rose-100';
                              pillStyle = 'bg-rose-600 text-white';
                            }
                          }

                          const optionLabels = ['A', 'B', 'C', 'D'];

                          return (
                            <button
                              key={optIdx}
                              disabled={isAnswerSubmitted}
                              onClick={() => {
                                setSelectedOption(optIdx);
                                setIsAnswerSubmitted(true);
                                if (optIdx === quizQuestions[currentQuestionIdx].correct_index) {
                                  setScore(prev => prev + 1);
                                }
                              }}
                              className={`w-full min-h-[50px] p-3 text-left rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default active:scale-[0.99] ${buttonStyle}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${pillStyle}`}>
                                  {optionLabels[optIdx]}
                                </span>
                                <span className="text-xs sm:text-sm font-semibold">{opt}</span>
                              </div>
                              {isAnswerSubmitted && (
                                <div className="flex-shrink-0">
                                  {isCorrect ? (
                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                  ) : isSelected ? (
                                    <XCircle size={18} className="text-rose-400" />
                                  ) : null}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {isAnswerSubmitted && (
                        <div className="p-3.5 bg-indigo-950/50 border border-indigo-500/40 rounded-xl space-y-1 animate-in fade-in duration-200">
                          <p className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                            <HelpCircle size={14} />
                            <span>Pembahasan Jawaban:</span>
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {quizQuestions[currentQuestionIdx]?.explanation ||
                              (selectedOption === quizQuestions[currentQuestionIdx]?.correct_index
                                ? 'Jawaban Anda tepat dan benar!'
                                : 'Jawaban yang tepat adalah opsi ' +
                                  ['A', 'B', 'C', 'D'][quizQuestions[currentQuestionIdx].correct_index])}
                          </p>
                        </div>
                      )}

                      {isAnswerSubmitted && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => {
                              if (currentQuestionIdx < quizQuestions.length - 1) {
                                setCurrentQuestionIdx(prev => prev + 1);
                                setSelectedOption(null);
                                setIsAnswerSubmitted(false);
                              } else {
                                setIsQuizCompleted(true);
                              }
                            }}
                            className="min-h-[44px] px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                          >
                            <span>
                              {currentQuestionIdx < quizQuestions.length - 1
                                ? 'Soal Selanjutnya →'
                                : 'Lihat Hasil Kuis ✨'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. SHOP MODAL */}
              {currentModal.type === 'shop' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 mb-2">
                    Pilih jajanan dan makanan khas warung Indonesia untuk memulihkan stamina karakter:
                  </p>
                  <div className="space-y-2">
                    {(currentModal.data?.items as ShopItem[] | undefined)?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-100">{item.name}</p>
                          <p className="text-[11px] text-slate-400">{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            Rp {item.price.toLocaleString('id-ID')}
                          </span>
                          <button
                            onClick={() => handlePurchase(item)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
                          >
                            Beli
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. CLASSROOM ENTRANCE MODAL */}
              {currentModal.type === 'building_entrance' && Boolean(currentModal.data?.isClassroom) && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {typeof currentModal.data?.desc === 'string'
                      ? currentModal.data.desc
                      : 'Ruang pembelajaran aktif Kurikulum Merdeka SMP Terpadu Al-Ittihadiyah.'}
                  </p>
                  <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs space-y-2 text-slate-300">
                    <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <School size={15} />
                      <span>Konfigurasi Interior Kelas:</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <p>• Papan Tulis Interaktif (Smart Board)</p>
                      <p>• Meja Guru & Stasiun Pembinaan</p>
                      <p>• Meja Belajar & Kuis Interaktif</p>
                      <p>• Navigasi Bebas Lorong 2.5D</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      onClick={handleModalClose}
                      className="min-h-[48px] px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all shadow cursor-pointer active:scale-95"
                    >
                      ✕ Batal
                    </button>
                    <button
                      onClick={() => {
                        if (onEnterClassroom && typeof currentModal.data?.classroomId === 'string') {
                          onEnterClassroom(currentModal.data.classroomId as 'VII' | 'VIII' | 'IX');
                        }
                        handleModalClose();
                      }}
                      className="min-h-[48px] px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer ring-2 ring-emerald-400/30"
                    >
                      <span>✓ Masuk ke Kelas</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 5. GENERAL BUILDING ENTRANCE */}
              {currentModal.type === 'building_entrance' && !currentModal.data?.isClassroom && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {typeof currentModal.data?.desc === 'string'
                      ? currentModal.data.desc
                      : 'Selamat datang di area SMP Terpadu Al-Ittihadiyah.'}
                  </p>
                  {Array.isArray(currentModal.data?.features) && (
                    <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs space-y-1.5 text-slate-300">
                      <p className="font-bold text-indigo-300">Fasilitas Unggulan:</p>
                      {currentModal.data.features.map((feat, i) => (
                        <p key={i}>• {String(feat)}</p>
                      ))}
                    </div>
                  )}
                  <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs space-y-1 text-slate-300">
                    <p className="font-bold text-indigo-300">Status Operasional:</p>
                    <p>• Jam Pembelajaran: 07.00 - 15.30 WIB</p>
                    <p>• Akses: Guru, Siswa, dan Tenaga Kependidikan</p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (currentModal.id === 'trigger-ruang-guru') {
                          onEnterRuangGuru?.();
                        }
                        handleModalClose();
                      }}
                      className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer ${
                        currentModal.id === 'trigger-ruang-guru'
                          ? 'bg-blue-600 hover:bg-blue-500 ring-2 ring-blue-400/30'
                          : 'bg-indigo-600 hover:bg-indigo-500'
                      }`}
                    >
                      {currentModal.id === 'trigger-ruang-guru'
                        ? 'Masuk ke Ruang Guru →'
                        : 'Tutup / Masuk Fasilitas'}
                    </button>
                  </div>
                </div>
              )}

              {/* 6. INTERACTIVE BOARD MODAL */}
              {currentModal.type === 'interactive_board' && (
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-950/40 border border-cyan-500/40 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-cyan-300 font-bold text-xs">
                      <Info size={16} />
                      <span>{typeof currentModal.data?.title === 'string' ? currentModal.data.title : 'Papan Interaktif Digital (PID)'}</span>
                    </div>
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                      {typeof currentModal.data?.desc === 'string'
                        ? currentModal.data.desc
                        : 'Pusat interaksi dan modul edukasi interaktif sekolah.'}
                    </p>
                    {Array.isArray(currentModal.data?.features) && (
                      <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                        {currentModal.data.features.map((feat, i) => (
                          <li key={i}>{String(feat)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleModalClose}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Tutup Papan Informasi
                    </button>
                  </div>
                </div>
              )}

              {/* 7. NPC TEACHER / STAFF DIALOG */}
              {currentModal.type === 'npc' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {typeof currentModal.data?.desc === 'string'
                      ? currentModal.data.desc
                      : 'Petugas sekolah menyapa Anda dengan ramah:'}
                  </p>
                  <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 text-xs italic text-slate-200 leading-relaxed">
                    {typeof currentModal.data?.quote === 'string'
                      ? currentModal.data.quote
                      : '“Selamat beraktivitas di lingkungan SMP Terpadu Al-Ittihadiyah. Jaga sopan santun, ketertiban, dan kebersihan lingkungan sekolah!”'}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleModalClose}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Siap, Mengerti!
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CHARACTER SELECTION MODAL (Touch Friendly for PID & Mobile)
         ═══════════════════════════════════════════════════════════ */}
      {isCharacterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black font-outfit text-white">Pilih Karakter Warga</h3>
                  <p className="text-[11px] text-slate-400">Pilih profesi dan identitas di Indonesian Life RP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCharacterModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Character Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
              {CHARACTER_PROFILES.map((char) => {
                const isSelected = char.id === currentCharacter.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => {
                      if (onSelectCharacter) onSelectCharacter(char);
                      setIsCharacterModalOpen(false);
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer min-h-[56px] relative group ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-500/20'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${char.avatarBg} flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/20 shadow-md relative mt-0.5`}>
                      {char.avatarUrl ? (
                        <img
                          src={char.avatarUrl}
                          alt={char.name}
                          className="w-14 h-14 object-contain translate-y-1.5"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <span className="font-black text-sm text-white">
                          {char.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white truncate">{char.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700/70 text-slate-300">
                          {char.tag}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-cyan-400 block truncate mt-0.5">{char.role}</span>
                      <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-1">{char.description}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Mode: <strong className="text-white">{deviceMode.toUpperCase()}</strong></span>
              <button
                type="button"
                onClick={() => setIsCharacterModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer min-h-[40px]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
