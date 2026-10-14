"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  Gamepad2, ArrowLeft, Play, 
  Trophy, BookOpen, Clock, Zap, 
  CheckCircle2, Sparkles, Shield, Users, Bot
} from "lucide-react";
import { useGradeMaster } from "@/context/GradeMasterContext";
import ChessGame from "./games/ChessGame";

interface GamesLayerProps {
  onBack?: () => void;
}

const UPCOMING_GAMES = [
  {
    id: 'quick_quiz',
    title: 'Kuis Kilat Otak',
    subtitle: 'Speed Run Quiz 10 Soal',
    category: 'Cepat Tepat',
    icon: Zap,
    iconColor: 'text-amber-500 bg-amber-50 border-amber-200',
    description: 'Jawab 10 soal secepat mungkin untuk mengumpulkan streak poin.',
    status: 'Segera Hadir'
  },
  {
    id: 'word_puzzle',
    title: 'Susun Kata Cermat',
    subtitle: 'Vocabulary Quest',
    category: 'Bahasa & Istilah',
    icon: BookOpen,
    iconColor: 'text-sky-500 bg-sky-50 border-sky-200',
    description: 'Tebak dan susun istilah penting materi pelajaran berwaktu.',
    status: 'Segera Hadir'
  }
];

export default function GamesLayer({ onBack }: GamesLayerProps) {
  const { studentData, setLayer } = useGradeMaster();
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
      <div className="w-full min-h-[calc(100dvh-5rem)] py-2 px-2 sm:px-4">
        <ChessGame onBack={() => setActiveGameId(null)} />
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Zona Gamifikasi
            </span>
            <span className="text-[10px] text-slate-300 font-semibold truncate">
              {studentData?.name ? `Siswa: ${studentData.name.split(' ')[0]}` : 'GradeMaster Arena'}
            </span>
          </div>

          <h1 className="text-white font-black text-base sm:text-lg leading-tight font-outfit truncate">
            Arena Game Edukasi Siswa
          </h1>

          <p className="text-slate-300 text-[11px] font-medium mt-1 leading-relaxed line-clamp-2">
            Asah strategi logika dan uji wawasan akademik. Setiap bidak dimakan memicu duel kuis!
          </p>
        </div>

        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 relative select-none pointer-events-none">
          <img 
            src="/mascot_hijab_idle.png" 
            alt="Maskot" 
            className="w-full h-full object-contain" 
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
                Game Utama Tersedia
              </h2>
              <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                Siap Dimainkan Sekarang
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
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
              Terpopuler
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
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all min-h-[48px]"
          >
            <Play size={16} className="fill-white" />
            <span>Mulai Main Catur Pintar</span>
          </button>
        </div>
      </div>

      {/* Cara Bermain Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-2.5">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide font-outfit flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-500" />
          <span>Cara Bermain Catur Pintar</span>
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black inline-flex items-center justify-center mb-1">
              1
            </span>
            <p className="text-[10px] font-extrabold text-slate-800">Pilih Mapel</p>
            <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Tentukan mata pelajaran yang ingin kamu latih</p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black inline-flex items-center justify-center mb-1">
              2
            </span>
            <p className="text-[10px] font-extrabold text-slate-800">Makan Bidak</p>
            <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Atur langkah taktik catur untuk menyerang pion lawan</p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black inline-flex items-center justify-center mb-1">
              3
            </span>
            <p className="text-[10px] font-extrabold text-slate-800">Jawab Soal</p>
            <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Jawab benar dalam 30s untuk memenangkan bidak</p>
          </div>
        </div>
      </div>

      {/* Segera Hadir Section (Compact List, Not Broken Grid) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide font-outfit flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            <span>Permainan Lainnya (Segera Hadir)</span>
          </h3>
          <span className="text-[9px] font-bold text-slate-400">Dalam Pengembangan</span>
        </div>

        <div className="space-y-2">
          {UPCOMING_GAMES.map(g => {
            const Icon = g.icon;
            return (
              <div
                key={g.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3 opacity-80"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${g.iconColor}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-slate-800 font-outfit truncate">
                        {g.title}
                      </h4>
                      <span className="px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded text-[8.5px] font-extrabold">
                        {g.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {g.description}
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-600 text-[9px] font-black uppercase tracking-wider shrink-0">
                  {g.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
