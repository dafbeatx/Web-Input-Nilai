import React from 'react';
import { ShieldCheck, ArrowLeft, MoreVertical, Search } from 'lucide-react';

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
    <header 
      className="sticky top-0 z-[100] w-full bg-[#0e0e10]/80 backdrop-blur-xl transition-colors flex items-center justify-between px-6 h-20 border-b border-white/5"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-4 overflow-hidden">
        {showBack ? (
          <button 
            onClick={onBack}
            className="text-primary active:scale-95 transition-transform"
          >
            <ArrowLeft size={24} />
          </button>
        ) : (
          <span className="text-primary active:scale-95 transition-transform">
            <Search size={24} />
          </span>
        )}
        <h1 className="font-headline font-black text-sm tracking-[0.15em] text-primary uppercase truncate">
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        {actions ? actions : (
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/30 cursor-pointer active:scale-95 duration-200">
             <img alt="Educator Profile" className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Educator&background=2c2c2f&color=f9f9f9&size=128&bold=true" />
          </div>
        )}
      </div>
    </header>
  );
}
