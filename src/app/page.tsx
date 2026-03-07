"use client";

import React, { useState, useEffect } from "react";
import { 
  GraduationCap, 
  Calculator, 
  BookOpen, 
  CloudSun, 
  Instagram, 
  Plus,
  X
} from "lucide-react";
import GradeMaster from "@/components/GradeMaster";
import Quran from "@/components/Quran";
import WeatherApp from "@/components/WeatherApp";

export default function GradeMasterOS() {
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [isBlurred, setIsBlurred] = useState(false);

  const openApp = (appId: string) => {
    if (appId === 'instagram') {
      window.open('https://instagram.com/keke', '_blank');
      return;
    }
    setActiveApp(appId);
    setIsBlurred(true);
  };

  const closeApp = () => {
    setActiveApp(null);
    setIsBlurred(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="bg-grid"></div>

      {/* Launcher */}
      <div 
        id="launcher" 
        className={`fixed inset-0 z-0 flex flex-col items-center justify-center p-8 transition-all duration-700 ${isBlurred ? "opacity-20 scale-95 blur-sm" : "opacity-100 scale-100"}`}
      >
        <div className="grid grid-cols-4 gap-8 mb-32 max-w-lg w-full px-4 animate-in">
          <AppIcon 
            id="grademaster" 
            name="GradeMaster" 
            icon={<GraduationCap size={32} />} 
            color="bg-indigo-600" 
            onClick={() => openApp('grademaster')} 
          />
          <AppIcon 
            id="calculator" 
            name="Kalkulator" 
            icon={<Calculator size={32} />} 
            color="bg-rose-600" 
            onClick={() => openApp('calculator')} 
          />
          <AppIcon 
            id="quran" 
            name="Al-Qur'an" 
            icon={<BookOpen size={32} />} 
            color="bg-emerald-600" 
            onClick={() => openApp('quran')} 
          />
          <AppIcon 
            id="cuaca" 
            name="Cuaca" 
            icon={<CloudSun size={32} />} 
            color="bg-sky-500" 
            onClick={() => openApp('cuaca')} 
          />
          <AppIcon 
            id="instagram" 
            name="Instagram" 
            icon={<Instagram size={32} />} 
            color="bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600" 
            onClick={() => openApp('instagram')} 
          />
          
          <div className="flex flex-col items-center gap-3 opacity-30 cursor-not-allowed">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-700 rounded-[1.5rem] flex items-center justify-center text-white">
              <Plus size={24} />
            </div>
            <span className="text-white text-xs font-bold tracking-wide">Add App</span>
          </div>
        </div>
      </div>

      {/* App Windows Container */}
      {activeApp && (
        <div className="fixed inset-0 z-50 flex flex-col items-center animate-in">
          <WindowHeader 
            title={getAppTitle(activeApp)} 
            icon={getAppIcon(activeApp)} 
            onClose={closeApp} 
            color={getAppColor(activeApp)}
          />
          <div className="w-full flex-1 overflow-auto bg-slate-50 pt-14 custom-scrollbar">
            {activeApp === 'grademaster' && <GradeMaster />}
            {activeApp === 'quran' && <Quran />}
            {activeApp === 'cuaca' && <WeatherApp />}
            {activeApp === 'calculator' && (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 font-bold uppercase tracking-widest">Kalkulator Coming Soon</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function AppIcon({ id, name, icon, color, onClick }: { id: string, name: string, icon: React.ReactNode, color: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-3 group">
      <div className={`w-16 h-16 sm:w-20 sm:h-20 ${color} rounded-[1.5rem] shadow-2xl flex items-center justify-center text-white ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-white text-xs font-bold tracking-wide group-hover:text-indigo-300 transition-colors">{name}</span>
    </button>
  );
}

function WindowHeader({ title, icon, onClose, color }: { title: string, icon: React.ReactElement, onClose: () => void, color: string }) {
  return (
    <div className="fixed top-0 inset-x-0 h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 z-[60] flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center text-white shadow-sm`}>
          {React.cloneElement(icon, { size: 16 })}
        </div>
        <span className="font-outfit font-bold text-slate-800">{title}</span>
      </div>
      <button 
        onClick={onClose} 
        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function getAppTitle(id: string) {
  switch (id) {
    case 'grademaster': return 'GradeMaster';
    case 'calculator': return 'Kalkulator';
    case 'quran': return 'Al-Qur\'an Indonesia';
    case 'cuaca': return 'Cuaca & Gempa BMKG';
    default: return 'App';
  }
}

function getAppIcon(id: string) {
  switch (id) {
    case 'grademaster': return <GraduationCap />;
    case 'calculator': return <Calculator />;
    case 'quran': return <BookOpen />;
    case 'cuaca': return <CloudSun />;
    default: return <Plus />;
  }
}

function getAppColor(id: string) {
  switch (id) {
    case 'grademaster': return 'bg-indigo-600';
    case 'calculator': return 'bg-rose-600';
    case 'quran': return 'bg-emerald-600';
    case 'cuaca': return 'bg-sky-500';
    default: return 'bg-slate-600';
  }
}
