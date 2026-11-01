"use client";

import React, { useState } from "react";
import { 
  Gamepad2, Zap, BookOpen, ArrowLeft, Compass
} from "lucide-react";
import { useRouter } from "next/navigation";
import ChessGame from "./games/ChessGame";
import QuickQuizGame from "./games/QuickQuizGame";
import WordScrambleGame from "./games/WordScrambleGame";

type ActiveGameId = 'chess' | 'quick_quiz' | 'word_scramble' | 'ilrp' | null;

interface GamesLayerProps {
  onBack?: () => void;
  initialGameId?: ActiveGameId;
}

interface GameItem {
  id: 'chess' | 'quick_quiz' | 'word_scramble' | 'ilrp';
  name: string;
  icon: React.ElementType;
  gradient: string;
  shadow: string;
  border: string;
}

const GAMES: GameItem[] = [
  {
    id: 'ilrp',
    name: 'Indonesian RP',
    icon: Compass,
    gradient: 'from-emerald-600 via-teal-700 to-slate-900',
    shadow: 'shadow-teal-600/30',
    border: 'border-emerald-400/30',
  },
  {
    id: 'chess',
    name: 'Catur Pintar',
    icon: Gamepad2,
    gradient: 'from-indigo-600 via-indigo-700 to-slate-900',
    shadow: 'shadow-indigo-600/30',
    border: 'border-indigo-400/30',
  },
  {
    id: 'quick_quiz',
    name: 'Kuis Kilat',
    icon: Zap,
    gradient: 'from-amber-500 via-orange-600 to-rose-700',
    shadow: 'shadow-amber-500/30',
    border: 'border-amber-400/30',
  },
  {
    id: 'word_scramble',
    name: 'Susun Kata',
    icon: BookOpen,
    gradient: 'from-sky-500 via-blue-600 to-indigo-900',
    shadow: 'shadow-sky-500/30',
    border: 'border-sky-400/30',
  }
];

export default function GamesLayer({ onBack, initialGameId = null }: GamesLayerProps) {
  const router = useRouter();
  const [activeGameId, setActiveGameId] = useState<ActiveGameId>(initialGameId);

  // If a game is active, render its screen
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
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-6 text-center pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}

        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-outfit uppercase">
            Game Edukasi
          </h1>
          <p className="text-[11px] text-slate-400 font-bold">
            Pilih game untuk mulai bermain
          </p>
        </div>

        <div className="w-9 h-9" />
      </div>

      {/* Grid of game icons with names underneath */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 justify-items-center max-w-lg mx-auto">
          {GAMES.map((game) => {
            const Icon = game.icon;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  if (game.id === 'ilrp') {
                    router.push('/game');
                  } else {
                    setActiveGameId(game.id);
                  }
                }}
                className="flex flex-col items-center gap-2.5 group cursor-pointer focus:outline-none w-full max-w-[100px] transition-all"
              >
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${game.gradient} flex items-center justify-center shadow-md ${game.shadow} border ${game.border} group-hover:scale-105 group-active:scale-95 transition-all duration-200 relative overflow-hidden`}
                >
                  <Icon size={36} className="text-white drop-shadow-md sm:scale-110" />
                </div>
                <span className="text-xs sm:text-[13px] font-black text-slate-800 text-center tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                  {game.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
