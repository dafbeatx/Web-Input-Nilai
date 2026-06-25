import React from 'react';

interface NanoBananaMascotProps {
  state?: 'idle' | 'success' | 'sad' | 'streak';
  message?: string;
  className?: string;
}

export default function NanoBananaMascot({
  state = 'idle',
  message,
  className = '',
}: NanoBananaMascotProps) {
  
  // Custom CSS Keyframes injected directly for seamless portability and guaranteed support
  const keyframesStyle = `
    @keyframes nano-float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(1deg); }
    }
    @keyframes nano-bounce {
      0%, 100% { transform: translateY(0) scale(1); }
      30% { transform: translateY(-24px) scaleY(1.08) scaleX(0.95); }
      50% { transform: translateY(-20px) scale(1); }
      75% { transform: translateY(0) scaleY(0.95) scaleX(1.05); }
    }
    @keyframes nano-sad {
      0%, 100% { transform: translateY(0px) scale(0.95) rotate(-1deg); }
      50% { transform: translateY(4px) scale(0.93) rotate(1deg); }
    }
    @keyframes nano-streak-shake {
      0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
      10%, 30%, 50%, 70%, 90% { transform: translateY(-2px) rotate(-2deg) scale(1.02); }
      20%, 40%, 60%, 80% { transform: translateY(2px) rotate(2deg) scale(1.02); }
    }
    @keyframes nano-glow-fire {
      0%, 100% { box-shadow: 0 0 12px rgba(249, 115, 22, 0.4); }
      50% { box-shadow: 0 0 24px rgba(249, 115, 22, 0.8), 0 0 8px rgba(234, 88, 12, 0.6); }
    }
    .nano-animation-idle {
      animation: nano-float 3.5s ease-in-out infinite;
    }
    .nano-animation-success {
      animation: nano-bounce 1.2s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
    }
    .nano-animation-sad {
      animation: nano-sad 4s ease-in-out infinite;
    }
    .nano-animation-streak {
      animation: nano-streak-shake 0.8s ease-in-out infinite, nano-glow-fire 1.5s ease-in-out infinite;
    }
  `;

  // Determine styling class based on animation state
  let animationClass = 'nano-animation-idle';
  let decorationElement: React.ReactNode = null;

  if (state === 'success') {
    animationClass = 'nano-animation-success';
    decorationElement = (
      <div className="absolute -top-3 -right-3 text-2xl animate-ping select-none pointer-events-none">
        ✨
      </div>
    );
  } else if (state === 'sad') {
    animationClass = 'nano-animation-sad';
    decorationElement = (
      <div className="absolute top-2 right-2 text-xl select-none pointer-events-none opacity-80" style={{ transform: 'rotate(15deg)' }}>
        💧
      </div>
    );
  } else if (state === 'streak') {
    animationClass = 'nano-animation-streak';
    decorationElement = (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl select-none pointer-events-none animate-bounce">
        🔥
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-3xl bg-slate-50/70 border border-slate-100/50 backdrop-blur-md relative ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: keyframesStyle }} />
      
      {/* Mascot Image Container with animated states */}
      <div className="relative shrink-0 select-none">
        <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-white/80 border border-slate-100 flex items-center justify-center p-1.5 shadow-md transition-all duration-300 ${animationClass}`}>
          <img 
            src="/nano_banana.png" 
            alt="Nano Banana Mascot" 
            className="w-full h-full object-contain transform hover:scale-110 transition-transform duration-300"
          />
        </div>
        {decorationElement}
      </div>

      {/* Speech bubble */}
      {message && (
        <div className="flex-1 relative animate-in fade-in slide-in-from-left-4 duration-300 text-left">
          {/* Bubble body */}
          <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold leading-relaxed relative ${
            state === 'success' ? 'bg-emerald-50 text-emerald-950 border border-emerald-100' :
            state === 'sad' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
            state === 'streak' ? 'bg-orange-50 text-orange-950 border border-orange-100' :
            'bg-white text-slate-800 border border-slate-200/80 shadow-sm'
          }`}>
            <p className="whitespace-pre-line">{message}</p>
            
            {/* Bubble arrow for layout pointing to mascot */}
            <div className={`absolute w-3 h-3 rotate-45 border-l border-b ${
              state === 'success' ? 'bg-emerald-50 border-emerald-100' :
              state === 'sad' ? 'bg-slate-100 border-slate-200' :
              state === 'streak' ? 'bg-orange-50 border-orange-100' :
              'bg-white border-slate-200/80'
            } hidden sm:block -left-1.5 top-1/2 -translate-y-1/2`} />
          </div>
        </div>
      )}
    </div>
  );
}
