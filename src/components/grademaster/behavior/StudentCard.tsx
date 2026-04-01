import React from 'react';
import { ChevronRight, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

interface StudentCardProps {
  name: string;
  className: string;
  points: number;
  onClick: () => void;
}

export default function StudentCard({ name, className, points, onClick }: StudentCardProps) {
  const getStatusColor = () => {
    if (points >= 100) return 'emerald';
    if (points >= 70) return '#00b4ff'; // specific neon blue logic
    if (points >= 40) return 'amber';
    return 'rose';
  };

  const color = getStatusColor();
  // We use inline styles for the arbitrary tailwind neon blue, or safe tailwind colors
  const StatusIcon = points >= 70 ? ShieldCheck : points >= 40 ? ShieldAlert : ShieldX;

  const isBlue = color === '#00b4ff';
  const colorClassText = isBlue ? 'text-[#00b4ff]' : `text-${color}-500`;
  const colorClassBg = isBlue ? 'bg-[#00b4ff]/10' : `bg-${color}-500/10`;
  const colorClassBorder = isBlue ? 'border-[#00b4ff]/20' : `border-${color}-500/20`;

  const glowStyle = isBlue 
    ? { boxShadow: '0 0 20px rgba(0,180,255,0.4)' } 
    : {};

  return (
    <div 
      onClick={onClick}
      className={`
        group relative overflow-hidden
        bg-[#111113]
        border border-white/10
        rounded-3xl p-5 shadow-xl shadow-black/40
        transition-all duration-200
        active:scale-[0.97] active:bg-[#1a1a1d]
        cursor-pointer
      `}
    >
      {/* Decorative Glow Background */}
      <div 
        className={`absolute -top-10 -right-10 w-24 h-24 blur-[40px] rounded-full transition-transform group-hover:scale-150 ${colorClassBg}`} 
      />
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${colorClassBg} ${colorClassText} ${colorClassBorder}`}>
            <StatusIcon size={24} fill="currentColor" fillOpacity={0.2} />
          </div>
          
          <div className="overflow-hidden">
            <h3 className="text-[15px] font-sans font-semibold text-white tracking-[-0.5px] truncate leading-tight">
              {name}
            </h3>
            <p className="text-[12px] font-sans text-slate-400 mt-1 truncate">
              Kelas {className}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center px-3 py-1.5 bg-black/40 rounded-xl border border-white/5" style={glowStyle}>
            <span className={`text-xl font-bold font-sans leading-none ${colorClassText}`}>
              {points}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
