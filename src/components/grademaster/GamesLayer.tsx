"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Gamepad2, ArrowLeft, Sparkles, Play, 
  Trophy, BookOpen, Clock, Star, Flame, ShieldAlert 
} from "lucide-react";
import { useGradeMaster } from "@/context/GradeMasterContext";
import ChessGame from "./games/ChessGame";

interface GamesLayerProps {
  onBack?: () => void;
}

interface GameItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  thumbnail: string;
  isAvailable: boolean;
  badge: string;
  badgeColor: string;
  description: string;
  players: string;
}

const AVAILABLE_GAMES: GameItem[] = [
  {
    id: 'chess',
    title: 'Catur Pintar',
    subtitle: 'Battle of Minds 2D',
    category: 'Strategi & Kuis',
    thumbnail: '/games/chess_thumbnail.jpg',
    isAvailable: true,
    badge: 'Terpopuler',
    badgeColor: 'bg-amber-500 text-white',
    description: 'Game catur 2D interaktif. Setiap pion atau perwira yang dimakan memicu duel kuis mata pelajaran pilihanmu!',
    players: '1 - 2 Pemain'
  },
  {
    id: 'quick_quiz',
    title: 'Kuis Kilat Otak',
    subtitle: 'Speed Run Quiz',
    category: 'Cepat Tepat',
    thumbnail: '/games/chess_thumbnail.jpg', // Placeholder fallback
    isAvailable: false,
    badge: 'Segera Hadir',
    badgeColor: 'bg-slate-200 text-slate-600',
    description: 'Jawab 10 soal secepat mungkin untuk mengumpulkan streak poin dan medali kehormatan.',
    players: 'Solo Run'
  },
  {
    id: 'word_puzzle',
    title: 'Susun Kata Cermat',
    subtitle: 'Vocabulary Quest',
    category: 'Bahasa & Logika',
    thumbnail: '/games/chess_thumbnail.jpg', // Placeholder fallback
    isAvailable: false,
    badge: 'Segera Hadir',
    badgeColor: 'bg-slate-200 text-slate-600',
    description: 'Tebak dan susun istilah penting mata pelajaran dalam teka-teki interaktif berwaktu.',
    players: 'Solo Run'
  }
];

export default function GamesLayer({ onBack }: GamesLayerProps) {
  const { isStudent, studentData, isAuthLoading, setLayer } = useGradeMaster();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const handleBackNavigation = () => {
    if (activeGameId) {
      setActiveGameId(null);
      return;
    }
    if (onBack) {
      onBack();
    } else if (setLayer) {
      setLayer("home");
    }
  };

  // If a game is active, render its screen
  if (activeGameId === 'chess') {
    return (
      <div className="w-full min-h-[calc(100dvh-8rem)] py-4 px-3 sm:px-4">
        <ChessGame onBack={() => setActiveGameId(null)} />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100dvh-8rem)] py-5 px-3.5 sm:px-6 max-w-5xl mx-auto text-left">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 border border-white/15 text-[11px] font-bold mb-2.5">
            <Flame size={14} className="text-amber-400" />
            <span>Zona Belajar Asyik & Gamifikasi</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-outfit">
            Pusat Game Edukasi Siswa
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            Asah kecerdasan logika dan kemampuan akademikmu lewat permainan seru. Setiap langkah menguji pengetahuanmu!
          </p>

          {studentData?.name && (
            <p className="text-xs text-indigo-300 font-bold mt-2">
              Pemain: <span className="text-white">{studentData.name}</span> {studentData.class_name ? `(Kelas ${studentData.class_name})` : ''}
            </p>
          )}
        </div>

        <div className="relative z-10 flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <div>
              <span className="text-[10px] text-slate-300 font-medium block leading-none">Status</span>
              <span className="text-xs font-black text-white">Gamifikasi Aktif</span>
            </div>
          </div>

          <button
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10"
          >
            <ArrowLeft size={14} />
            <span>Kembali</span>
          </button>
        </div>
      </div>

      {/* Game Cards Grid (Square Thumbnail Cards) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Gamepad2 size={20} className="text-indigo-600" />
              <span>Daftar Permainan</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pilih permainan untuk mulai bermain dan mengasah wawasan
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {AVAILABLE_GAMES.map(game => (
            <div
              key={game.id}
              className={`group bg-white rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden ${
                game.isAvailable
                  ? 'border-slate-200/90 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1'
                  : 'border-slate-200/60 opacity-80'
              }`}
            >
              {/* Square Thumbnail Container (Aspect Ratio 1:1) */}
              <div className="relative w-full aspect-square bg-slate-900 overflow-hidden flex items-center justify-center">
                <Image
                  src={game.thumbnail}
                  alt={game.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className={`object-cover transition-transform duration-500 ${
                    game.isAvailable ? 'group-hover:scale-105' : 'grayscale opacity-60'
                  }`}
                  priority={game.id === 'chess'}
                />

                {/* Badge Overlay */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${game.badgeColor}`}>
                    {game.badge}
                  </span>
                </div>

                {/* Category Pill */}
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-950/75 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                    {game.category}
                  </span>
                </div>

                {/* Quick Play Floating Overlay on Hover for Available Games */}
                {game.isAvailable && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                    <button
                      type="button"
                      onClick={() => setActiveGameId(game.id)}
                      className="px-5 py-2.5 rounded-full bg-white text-slate-900 font-black text-xs shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Play size={14} className="fill-slate-900 text-slate-900" />
                      <span>Mainkan Sekarang</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                      {game.title}
                    </h3>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {game.players}
                    </span>
                  </div>

                  <p className="text-[11px] font-bold text-indigo-600 mb-2">
                    {game.subtitle}
                  </p>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {game.description}
                  </p>
                </div>

                {/* Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {game.isAvailable ? (
                    <button
                      type="button"
                      onClick={() => setActiveGameId(game.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <Play size={15} className="fill-white" />
                      <span>Mulai Main Catur</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <Clock size={14} />
                      <span>Sedang Disiapkan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
