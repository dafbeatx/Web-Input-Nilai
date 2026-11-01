"use client";

import React, { useState } from 'react';
import VirtualJoystick from './VirtualJoystick';
import { DeviceMode, InteractiveTrigger } from '@/lib/game/types';
import { Zap, Hand, ChevronUp } from 'lucide-react';

interface VirtualControlsProps {
  deviceMode: DeviceMode;
  nearTrigger: InteractiveTrigger | null;
  onJoystickMove: (x: number, y: number) => void;
  onSprintChange: (sprinting: boolean) => void;
  onInteractClick: () => void;
}

export default function VirtualControls({
  deviceMode,
  nearTrigger,
  onJoystickMove,
  onSprintChange,
  onInteractClick,
}: VirtualControlsProps) {
  const [isSprintLocked, setIsSprintLocked] = useState(false);
  const [showDesktopTouch, setShowDesktopTouch] = useState(false);

  // If on desktop, only display if user enabled touch simulator
  const isTouchDevice = deviceMode === 'android' || deviceMode === 'interactive_board';
  if (!isTouchDevice && !showDesktopTouch) {
    return (
      <div className="fixed bottom-3 right-3 z-30 pointer-events-auto">
        <button
          onClick={() => setShowDesktopTouch(true)}
          className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700/60 backdrop-blur-md shadow-md transition-all flex items-center gap-1.5"
          title="Tampilkan kontrol virtual sentuh di desktop"
        >
          <span>🎮 Kontrol Virtual</span>
        </button>
      </div>
    );
  }

  // Large sizing for Interactive Flat Panel (Digital Smart Board >= 64px targets)
  const isBoard = deviceMode === 'interactive_board';
  const joystickSize = isBoard ? 160 : 124;
  const joystickKnobSize = isBoard ? 68 : 52;
  const actionBtnSize = isBoard ? 'w-18 h-18 text-base' : 'w-14 h-14 text-sm';
  const interactBtnSize = isBoard ? 'w-20 h-20 text-base' : 'w-16 h-16 text-sm';

  const handleSprintDown = () => {
    onSprintChange(true);
  };

  const handleSprintUp = () => {
    if (!isSprintLocked) {
      onSprintChange(false);
    }
  };

  const toggleSprintLock = () => {
    const next = !isSprintLocked;
    setIsSprintLocked(next);
    onSprintChange(next);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Controls Toggle for Desktop Simulation */}
      {!isTouchDevice && showDesktopTouch && (
        <div className="self-end pointer-events-auto">
          <button
            onClick={() => setShowDesktopTouch(false)}
            className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-slate-400 text-xs rounded border border-slate-700"
          >
            ✕ Sembunyikan Virtual
          </button>
        </div>
      )}

      <div className="flex-1" />

      {/* Bottom Virtual Controls Row */}
      <div className="flex items-end justify-between w-full pointer-events-none pb-2">
        {/* Left: Virtual Joystick */}
        <div className="pointer-events-auto touch-none">
          <VirtualJoystick
            size={joystickSize}
            knobSize={joystickKnobSize}
            onMove={onJoystickMove}
          />
        </div>

        {/* Right: Action Buttons (Sprint & Interact) */}
        <div className="pointer-events-auto flex items-end gap-3 sm:gap-4 touch-none">
          {/* Sprint Toggle / Hold Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              onPointerDown={handleSprintDown}
              onPointerUp={handleSprintUp}
              onPointerCancel={handleSprintUp}
              className={`rounded-2xl flex flex-col items-center justify-center font-bold shadow-xl border transition-all active:scale-95 touch-none ${actionBtnSize} ${
                isSprintLocked
                  ? 'bg-amber-500 border-amber-300 text-slate-950 ring-4 ring-amber-400/30'
                  : 'bg-slate-900/70 border-slate-700 text-amber-400 hover:bg-slate-850'
              }`}
              title="Lari / Sprint (Shift)"
            >
              <Zap size={isBoard ? 26 : 20} className={isSprintLocked ? 'fill-slate-950' : ''} />
              <span className="text-[10px] font-black tracking-wider uppercase mt-0.5">Lari</span>
            </button>
            <button
              onClick={toggleSprintLock}
              className="text-[9px] font-bold text-slate-400 bg-slate-900/60 hover:text-white px-2 py-0.5 rounded border border-slate-800 flex items-center gap-0.5"
            >
              <ChevronUp size={10} className={isSprintLocked ? 'rotate-180' : ''} />
              {isSprintLocked ? 'Kunci: ON' : 'Kunci'}
            </button>
          </div>

          {/* Interact Button */}
          <button
            onClick={onInteractClick}
            className={`rounded-2xl flex flex-col items-center justify-center font-black shadow-2xl border transition-all active:scale-90 touch-none ${interactBtnSize} ${
              nearTrigger
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-300 text-white animate-pulse ring-4 ring-indigo-400/40 shadow-[0_0_24px_rgba(99,102,241,0.5)]'
                : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:bg-slate-850'
            }`}
            title="Interaksi (E / Spasi)"
          >
            <Hand size={isBoard ? 30 : 22} />
            <span className="text-[10px] font-black tracking-wider uppercase mt-0.5">Aksi [E]</span>
          </button>
        </div>
      </div>
    </div>
  );
}

