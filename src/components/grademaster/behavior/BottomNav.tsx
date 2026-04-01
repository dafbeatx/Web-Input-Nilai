import React from 'react';
import { Home, Calendar, ShieldCheck, FileBarChart, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Absensi', icon: Calendar, path: '/attendance' },
    { label: 'Perilaku', icon: ShieldCheck, path: '/behavior' },
    { label: 'Rapor', icon: FileBarChart, path: '/reports' },
    { label: 'Setelan', icon: Settings, path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] h-16 md:h-18 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 pb-safe flex items-center justify-around px-2">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.label}
            href={tab.path}
            className={`
              flex flex-col items-center justify-center gap-1 min-w-[64px] h-full
              transition-all duration-300 active:scale-90
              ${isActive ? 'text-primary scale-110' : 'text-slate-500'}
            `}
          >
            <div className={`
              p-1 rounded-xl transition-all duration-300
              ${isActive ? 'bg-primary/10 shadow-lg shadow-primary/20' : 'bg-transparent'}
            `}>
              <Icon size={20} fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.2 : 0} />
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
