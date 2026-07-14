import React from 'react';

interface StudentCardProps {
  name: string;
  className: string;
  points: number;
  onClick: () => void;
}

export default function StudentCard({ name, className, points, onClick }: StudentCardProps) {
  // Determine Grade & Color based on points
  let grade = 'D';
  let gradeLabel = 'CRITICAL';
  let colorClass = 'text-error';
  let bgClass = 'bg-error/10';
  let dotClass = 'bg-error';

  if (points >= 90) {
    grade = 'A';
    gradeLabel = 'EXCELLENT';
    colorClass = 'text-tertiary';
    bgClass = 'bg-tertiary/10';
    dotClass = 'bg-tertiary';
  } else if (points >= 70) {
    grade = 'B';
    gradeLabel = 'GOOD';
    colorClass = 'text-primary';
    bgClass = 'bg-primary/10';
    dotClass = 'bg-primary'; // Usually hidden or different, we'll keep primary
  } else if (points >= 40) {
    grade = 'C';
    gradeLabel = 'WARNING';
    colorClass = 'text-[#ffc107]';
    bgClass = 'bg-[#ffc107]/10';
    dotClass = 'bg-[#ffc107]';
  }

  // Generate a professional initial avatar
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2c2c2f&color=f9f9f9&size=128&bold=true`;

  const formatName = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 2) return name;
    const firstName = parts[0];
    const initials = parts.slice(1).map(p => p[0].toUpperCase() + ".").join(" ");
    return `${firstName} ${initials}`;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-surface-container hover:bg-surface-bright transition-colors rounded-xl p-4 flex items-center justify-between group cursor-pointer active:scale-[0.98] min-w-0"
    >
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <div className="relative shrink-0">
          <img 
            src={avatarUrl} 
            alt={`${name} Portrait`} 
            className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover border border-outline-variant/30" 
          />
          {grade !== 'B' && (
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 ${dotClass} rounded-full border-2 border-surface-container`}></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-headline font-bold text-[14px] md:text-base text-primary tracking-tight truncate w-full" title={name}>
            {formatName(name)}
          </h4>
          <p className="text-[10px] md:text-xs text-on-surface-variant font-medium">Class {className}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-[9px] uppercase font-bold tracking-tighter text-on-surface-variant">Skor Perilaku</p>
          <p className={`text-xs ${colorClass} font-bold`}>{gradeLabel}</p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgClass} ${colorClass} font-headline font-black text-lg`}>
          {grade}
        </div>
      </div>
    </div>
  );
}
