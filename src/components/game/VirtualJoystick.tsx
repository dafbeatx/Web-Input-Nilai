"use client";

import React, { useRef, useState, useEffect } from 'react';

interface VirtualJoystickProps {
  size?: number; // Outer diameter in px (e.g. 120 on mobile, 160 on smart board)
  knobSize?: number; // Knob diameter in px
  onMove: (x: number, y: number) => void;
}

export default function VirtualJoystick({
  size = 130,
  knobSize = 56,
  onMove,
}: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = size / 2;
  const maxDistance = radius - knobSize / 3;

  const updateKnob = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    let finalX = dx;
    let finalY = dy;

    if (distance > maxDistance) {
      finalX = (dx / distance) * maxDistance;
      finalY = (dy / distance) * maxDistance;
    }

    setKnobPos({ x: finalX, y: finalY });

    // Normalized vector from -1 to 1
    const normalizedX = finalX / maxDistance;
    const normalizedY = finalY / maxDistance;
    onMove(normalizedX, normalizedY);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    touchIdRef.current = e.pointerId;
    setIsActive(true);
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive || e.pointerId !== touchIdRef.current) return;
    e.preventDefault();
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== touchIdRef.current) return;
    e.preventDefault();
    setIsActive(false);
    touchIdRef.current = null;
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  useEffect(() => {
    const handleWindowPointerUp = () => {
      if (isActive) {
        setIsActive(false);
        touchIdRef.current = null;
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
      }
    };
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => window.removeEventListener('pointerup', handleWindowPointerUp);
  }, [isActive, onMove]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        width: size,
        height: size,
        touchAction: 'none',
      }}
      className={`relative select-none flex items-center justify-center rounded-full border-2 transition-colors duration-150 backdrop-blur-md cursor-grab active:cursor-grabbing ${
        isActive
          ? 'bg-indigo-950/40 border-indigo-400/80 shadow-[0_0_24px_rgba(99,102,241,0.35)]'
          : 'bg-slate-900/40 border-slate-700/60 shadow-lg'
      }`}
    >
      {/* Direction Guide Crosshairs */}
      <div className="absolute w-[2px] h-10 bg-slate-500/20 pointer-events-none" />
      <div className="absolute h-[2px] w-10 bg-slate-500/20 pointer-events-none" />

      {/* Center Knob */}
      <div
        style={{
          width: knobSize,
          height: knobSize,
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
        }}
        className={`rounded-full flex items-center justify-center pointer-events-none shadow-xl transition-shadow ${
          isActive
            ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 border-2 border-indigo-300 ring-2 ring-indigo-400/50'
            : 'bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600'
        }`}
      >
        <div className="w-4 h-4 rounded-full bg-white/40" />
      </div>
    </div>
  );
}
