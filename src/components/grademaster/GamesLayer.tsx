"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  Gamepad2, Play, 
  Trophy, BookOpen, Zap, 
  Sparkles, Bot
} from "lucide-react";
import { useGradeMaster } from "@/context/GradeMasterContext";
import ChessGame from "./games/ChessGame";
import QuickQuizGame from "./games/QuickQuizGame";
import WordScrambleGame from "./games/WordScrambleGame";

interface GamesLayerProps {
  onBack?: () => void;
}

type ActiveGameId = 'chess' | 'quick_quiz' | 'word_scramble' | null;

interface GameCardData {
  id: 'chess' | 'quick_quiz' | 'word_scramble';
  title: string;
  subtitle: string;
  category: string;
  duration: string;
  players: string;
  description: string;
  highlights: string[];
  gradientTheme: string;
  accentBadge: string;
  icon: React.ElementType;
}

const ACTIVE_GAMES: GameCardData[] = [
  {
    id: 'quick_quiz',
    title: 'Kuis Kilat Otak',
    subtitle: 'Speed Run Quiz 10 Soal',
    category: 'Cepat Tepat',
    duration: '15 Detik / Soal',
    players: '1 Pemain',
    description: 'Jawab 10 soal secepat mungkin. Makin cepat menjawab makin tinggi poin, plus bonus streak beruntun!',
    highlights: ['Batas 15s per Soal', 'Streak Bonus +5 Pts', 'Ranking A+ hingga D'],
    gradientTheme: 'from-violet-950 via-slate-900 to-indigo-950 border-violet-800/40',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Zap
  },
  {
    id: 'word_scramble',
    title: 'Susun Kata Cermat',
    subtitle: 'Vocabulary Quest 10 Istilah',
    category: 'Bahasa & Istilah',
    duration: '45 Detik / Kata',
    players: '1 Pemain',
    description: 'Tebak dan susun istilah penting pelajaran dari huruf acak berwaktu. Asah memori dan perbendaharaan akademik.',
    highlights: ['50+ Bank Istilah', 'Batas 45s per Kata', 'Sistem Poin & Bantuan'],
    gradientTheme: 'from-sky-950 via-slate-900 to-slate-950 border-sky-800/40',
    accentBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    icon: BookOpen
  }
];

export default function GamesLayer({}: GamesLayerProps) {
  const { studentData } = useGradeMaster();
  const [activeGameId, setActiveGameId] = useState<ActiveGameId>(null);

  // Render active game screen based on state
  if (activeGameId === 'chess') {
    return (
      <div className="w-full min-h-[calc(100dvh-5rem)] py-2 px-2 sm:px-4">
        <ChessGame onBack={() => setActiveGameId(null)} />
      </div>
    );
  }

  if (activeGameId === 'quick_quiz') {
    return (
      <div className="w-full min-h-[calc(100dvh-5rem)] py-2 px-2 sm:px-4">
        <QuickQuizGame onBack={() => setActiveGameId(null)} />
      </div>
    );
  }

  if (activeGameId === 'word_scramble') {
    return (
      <div className="w-full min-h-[calc(100dvh-5rem)] py-2 px-2 sm:px-4">
        <WordScrambleGame onBack={() => setActiveGameId(null)} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-3.5 py-3 space-y-4 text-left pb-28">
      {/* Top Banner (Compact & Integrated with Student Portal Style) */}
      <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 overflow-hidden flex items-center justify-between gap-3 shadow-sm border border-slate-800">
        <div className="min-w-0 z-10 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9.5px] font-black uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Zona Gamifikasi
            </span>
            <span className="text-[10px] text-slate-300 font-semibold truncate">
              {studentData?.name ? `Siswa: ${studentData.name.split(' ')[0]}` : 'Nawasena Arena'}
            </span>
          </div>

          <h1 className="text-white font-black text-base sm:text-lg leading-tight font-outfit truncate">
            Arena Game Edukasi Siswa
          </h1>

          <p className="text-slate-300 text-[11px] font-medium mt-1 leading-relaxed line-clamp-2">
            Belajar menyenangkan melalui strategi catur, kuis kecepatan kilat, dan tantangan susun kosakata akademik.
          </p>
        </div>

        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 relative select-none pointer-events-none">
          <Image 
            src="/mascot_hijab_idle.png" 
            alt="Maskot Siswa" 
            fill
            sizes="80px"
            className="object-contain" 
            priority
          />
        </div>
      </div>

      {/* Featured Game Hero Card: Catur Pintar 2D */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Gamepad2 size={18} />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide font-outfit">
                Game Unggulan
              </h2>
              <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                Siap Dimainkan Sekarang
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
        </div>

        {/* Thumbnail Card Preview */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[2/1] rounded-xl overflow-hidden bg-slate-900 shadow-sm border border-slate-200/70 group">
          <Image
            src="/games/chess_thumbnail.jpg"
            alt="Catur Pintar 2D"
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

          {/* Badges on Thumbnail */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[9.5px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
              <Trophy size={11} className="fill-white" />
              Taktik & Duel
            </span>
          </div>

          <div className="absolute top-2.5 right-2.5">
            <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9.5px] font-bold border border-white/20">
              1 - 2 Pemain
            </span>
          </div>

          {/* Bottom Title on Thumbnail */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[9px] font-extrabold uppercase tracking-wider mb-1 inline-block">
              2D Strategic Chess
            </span>
            <h3 className="text-white font-black text-sm sm:text-base leading-tight font-outfit drop-shadow">
              Catur Pintar: Duel Pelajaran
            </h3>
          </div>
        </div>

        {/* Game Details & Subject Pills */}
        <div className="space-y-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            Mainkan catur 2D interaktif melawan <strong>Guru AI</strong> atau teman. Setiap kali bidak dimakan, muncul kuis berwaktu 30 detik untuk menentukan keberhasilan eksekusi bidak!
          </p>

          <div>
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Pilihan Mata Pelajaran Soal:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['Matematika', 'IPA', 'B. Indonesia', 'B. Inggris', 'Agama Islam', 'Wawasan Umum'].map(s => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 text-[10px] font-bold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
              <Bot size={15} className="text-indigo-600 shrink-0" />
              <span className="text-[10px] font-bold text-slate-700 truncate">Mode Bot Guru AI</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
              <Zap size={15} className="text-amber-500 shrink-0" />
              <span className="text-[10px] font-bold text-slate-700 truncate">Duel Kuis 30 Detik</span>
            </div>
          </div>

          {/* Big Action Button */}
          <button
            type="button"
            onClick={() => setActiveGameId('chess')}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all min-h-[48px] cursor-pointer"
          >
            <Play size={16} className="fill-white" />
            <span>Mulai Main Catur Pintar</span>
          </button>
        </div>
      </div>

      {/* Available Educational Games Grid: Kuis Kilat & Susun Kata */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide font-outfit">
                Permainan Edukasi Baru
              </h2>
              <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                Tersedia & Siap Dimainkan
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 text-[9px] font-black uppercase tracking-wider rounded-lg">
            2 Game Baru
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {ACTIVE_GAMES.map((game) => {
            const Icon = game.icon;
            return (
              <div
                key={game.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5"
              >
                {/* Stylized Thumbnail Placeholder using CSS Gradient & Icon */}
                <div className={`relative w-full aspect-[16/7] rounded-xl overflow-hidden bg-gradient-to-br ${game.gradientTheme} border shadow-inner flex flex-col justify-between p-3.5`}>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between z-10">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${game.accentBadge} flex items-center gap-1`}>
                      <Icon size={12} />
                      <span>{game.category}</span>
                    </span>

                    <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[9.5px] font-bold border border-white/10 backdrop-blur-md">
                      {game.duration}
                    </span>
                  </div>

                  {/* Center Watermark Icon */}
                  <div className="absolute right-4 bottom-2 opacity-10 pointer-events-none">
                    <Icon size={96} className="text-white" />
                  </div>

                  {/* Bottom Title on Thumbnail */}
                  <div className="z-10">
                    <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wide block">
                      {game.subtitle}
                    </span>
                    <h3 className="text-white font-black text-sm sm:text-base leading-tight font-outfit">
                      {game.title}
                    </h3>
                  </div>
                </div>

                {/* Description & Features */}
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {game.description}
                  </p>

                  {/* Feature Highlights */}
                  <div className="flex flex-wrap gap-1.5">
                    {game.highlights.map((feat) => (
                      <span
                        key={feat}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-[10px] font-bold"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>

                  {/* Functioning Action Button */}
                  <button
                    type="button"
                    onClick={() => setActiveGameId(game.id)}
                    className="w-full mt-1.5 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-violet-600/20 transition-all min-h-[46px] cursor-pointer"
                  >
                    <Play size={15} className="fill-white" />
                    <span>Mulai Main {game.title}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panduan Bermain Cepat */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-2.5">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide font-outfit flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-500" />
          <span>Panduan Arena Gamifikasi</span>
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black inline-flex items-center justify-center mb-1">
              <Gamepad2 size={11} />
            </span>
            <p className="text-[10px] font-extrabold text-slate-800">Catur Pintar</p>
            <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Strategi papan catur berpadu duel kuis 30s</p>
          </div>

          <div className="p-2.5 rounded-xl bg-violet-100/70 border border-violet-100 text-center">
            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black inline-flex items-center justify-center mb-1">
              <Zap size={11} />
            </span>
            <p className="text-[10px] font-extrabold text-slate-800">Kuis Kilat</p>
            <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">10 soal cepat berwaktu 15s dan bonus streak</p>
          </div>

          <div className="p-2.5 rounded-xl bg-sky-100/70 border border-sky-100 text-center">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black inline-flex items-center justify-center mb-1">
              <BookOpen size={11} />
            </span>
            <p className="text-[10px] font-extrabold text-slate-800">Susun Kata</p>
            <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Tebak istilah akademik 45s dari huruf acak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
