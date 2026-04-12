"use client";

import React from 'react';
import { Home, Calendar, ShieldCheck, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { label: 'Beranda', icon: Home, path: '/' },
    { label: 'Sikap', icon: ShieldCheck, path: '/behavior' },
    { label: 'Kehadiran', icon: Calendar, path: '/attendance' },
    { label: 'Remedial', icon: RefreshCw, path: '/remedial' },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[100] h-16 md:h-20 bg-[#111113]/95 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.label}
            href={tab.path}
            className={`
              flex flex-col items-center justify-center gap-1 min-w-[64px] h-full
              transition-all duration-200 active:scale-90
              ${isActive ? 'text-[#00b4ff] scale-110' : 'text-slate-500'}
            `}
          >
            <div className={`
              p-1.5 rounded-xl transition-all duration-200
              ${isActive ? 'bg-[#00b4ff]/10 shadow-[0_0_15px_rgba(0,180,255,0.2)]' : 'bg-transparent'}
            `}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.2 : 0} />
            </div>
            <span className={`text-[10px] font-sans font-semibold tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
