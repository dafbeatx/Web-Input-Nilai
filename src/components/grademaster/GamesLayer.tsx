"use client";

import React from "react";
import Link from "next/link";
import { Gamepad2, ArrowLeft, Sparkles, Code2, ShieldAlert } from "lucide-react";
import { useGradeMaster } from "@/context/GradeMasterContext";

interface GamesLayerProps {
  onBack?: () => void;
}

export default function GamesLayer({ onBack }: GamesLayerProps) {
  const { isStudent, studentData, isAuthLoading, setLayer } = useGradeMaster();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (setLayer) {
      setLayer("home");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 mobile-shell-padding">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center shadow-inner mb-5">
          <Gamepad2 size={32} strokeWidth={2.2} />
        </div>

        {!isAuthLoading && !isStudent ? (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-3">
              <ShieldAlert size={14} />
              <span>Mode Siswa Saja</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
              Akses Khusus Siswa
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Halaman dan menu game ini disetel khusus untuk mode siswa. Silakan masuk sebagai siswa untuk mengakses zona permainan.
            </p>

            <Link
              href="/#student_login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/20 min-h-[44px] mb-3"
            >
              Masuk sebagai Siswa
            </Link>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
              <Code2 size={14} />
              <span>File Siap Menerima Kode</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
              Halaman Games
            </h1>

            {studentData?.name && (
              <p className="text-xs font-bold text-indigo-600 mb-2">
                Halo, {studentData.name}!
              </p>
            )}

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              File tersendiri untuk games telah disiapkan. Silakan berikan kode game Anda, kode tersebut siap dipasang di sini.
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-left mb-6">
              <div className="flex items-center gap-2 text-slate-800 text-xs font-bold mb-1">
                <Sparkles size={14} className="text-amber-500" />
                <span>File Tersendiri:</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Komponen: <code className="text-indigo-600 font-mono bg-indigo-50 px-1 py-0.5 rounded">src/components/grademaster/GamesLayer.tsx</code>
                <br />
                Route: <code className="text-indigo-600 font-mono bg-indigo-50 px-1 py-0.5 rounded">src/app/games/page.tsx</code>
              </p>
            </div>
          </>
        )}

        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/10 min-h-[44px]"
        >
          <ArrowLeft size={16} />
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}
