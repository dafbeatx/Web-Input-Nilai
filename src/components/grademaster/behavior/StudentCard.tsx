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
    if (points >= 70) return 'primary';
    if (points >= 40) return 'amber';
    return 'rose';
  };

  const color = getStatusColor();

  const StatusIcon = points >= 70 ? ShieldCheck : points >= 40 ? ShieldAlert : ShieldX;

  return (
    <div 
      onClick={onClick}
      className="
        group relative overflow-hidden
        bg-slate-900/40 backdrop-blur-xl
        border border-white/5 hover:border-white/10
        rounded-[2rem] p-5 shadow-2xl
        transition-all duration-300
        active:scale-[0.97] active:bg-slate-900/60
        cursor-pointer
      "
    >
      {/* Decorative Gradient Background */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 bg-${color}-500/10 blur-[40px] rounded-full group-hover:scale-150 transition-transform`} />
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
            bg-${color}-500/10 text-${color}-500 border border-${color}-500/20
          `}>
            <StatusIcon size={24} fill="currentColor" fillOpacity={0.2} />
          </div>
          
          <div className="overflow-hidden">
            <h3 className="font-black text-white font-outfit uppercase tracking-tight truncate leading-tight">
              {name}
            </h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
              Kelas {className}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className={`text-xl font-black text-${color}-500 font-outfit leading-none`}>
              {points}
            </span>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Poin</p>
          </div>
          <ChevronRight size={16} className="text-slate-700 group-hover:text-primary transition-colors" />
        </div>
      </div>
      
      {/* ProgressBar (Visual decoration) */}
      <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div 
          className={`h-full bg-gradient-to-r from-${color}-500/50 to-${color}-500 transition-all duration-1000`} 
          style={{ width: `${Math.min(100, points)}%` }}
        />
      </div>
    </div>
  );
}
