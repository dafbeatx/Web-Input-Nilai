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
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-[#19191c]/80 backdrop-blur-xl rounded-t-[1.5rem] shadow-2xl shadow-black/20">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.label}
            href={tab.path}
            className={`
              flex flex-col items-center justify-center px-5 py-2 transition-all active:scale-90 duration-300
              ${isActive ? 'bg-[#2c2c2f] text-[#f9f9f9] rounded-[1rem]' : 'text-[#adaaad] hover:text-[#f9f9f9]'}
            `}
          >
            <Icon size={24} className="mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span className="font-sans text-[10px] font-bold uppercase tracking-widest">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
