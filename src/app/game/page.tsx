"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// Phaser must be loaded exclusively on the client side
const GameContainer = dynamic(() => import('@/components/game/GameContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-dvh bg-slate-950 flex flex-col items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-lg font-black tracking-tight font-outfit">Memuat Indonesian Life RP...</h2>
      <p className="text-xs text-slate-400 mt-1">Menyiapkan dunia virtual Nusantara Asri</p>
    </div>
  ),
});

export default function GamePage() {
  return (
    <main className="w-full h-dvh overflow-hidden bg-slate-950">
      <GameContainer />
    </main>
  );
}

