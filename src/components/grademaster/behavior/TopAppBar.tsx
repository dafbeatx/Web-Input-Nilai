import React from 'react';
import { ShieldCheck, ArrowLeft, MoreVertical } from 'lucide-react';

interface TopAppBarProps {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export default function TopAppBar({ 
  title, 
  onBack, 
  showBack = false,
  actions 
}: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-[100] h-14 w-full bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between notch-safe">
      <div className="flex items-center gap-3 overflow-hidden">
        {showBack ? (
          <button 
            onClick={onBack}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-slate-400 active:bg-white/10 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border border-primary/20">
            <ShieldCheck size={20} fill="currentColor" fillOpacity={0.2} />
          </div>
        )}
        <h1 className="text-lg font-black text-white font-outfit uppercase tracking-tighter truncate">
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-1">
        {actions ? actions : (
          <button className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-slate-400 active:bg-white/10 active:scale-90 transition-all">
            <MoreVertical size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
