"use client";

import React, { useState } from 'react';
import {
  GraduationCap,
  Menu,
  X,
  ClipboardList,
  Users,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Settings,
  LogIn,
  RefreshCcw,
} from 'lucide-react';
import { Layer } from '@/lib/grademaster/types';

interface NavbarProps {
  isAdmin: boolean;
  adminUser: string | null;
  layer: Layer;
  onNavigate: (layer: Layer) => void;
  onLogout: () => void;
  onLoginClick: () => void;
  onOpenSettings: () => void;
}

export default function Navbar({
  isAdmin,
  adminUser,
  layer,
  onNavigate,
  onLogout,
  onLoginClick,
  onOpenSettings,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (target: string) => {
    if (target === 'exam') return ['home', 'setup', 'dashboard', 'grading'].includes(layer);
    if (target === 'behavior') return layer === 'behavior';
    if (target === 'remedial') return layer === 'remedial_dashboard';
    if (target === 'analysis') return layer === 'analysis';
    return false;
  };

  return (
    <>
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-9 md:h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap size={18} className="md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-black text-slate-800 tracking-tight truncate">GradeMaster</h1>
              </div>
            </div>

            {/* Center: Desktop Navigation */}
            {isAdmin && (
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => onNavigate('home')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive('exam')
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                  }`}
                >
                  <ClipboardList size={14} /> Penilaian Ujian
                </button>
                <button
                  onClick={() => onNavigate('behavior')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive('behavior')
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                  }`}
                >
                  <Users size={14} /> Kehadiran & Perilaku
                </button>
                <button
                  onClick={() => onNavigate('remedial_dashboard')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive('remedial')
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                  }`}
                >
                </button>
                <button
                  onClick={() => onNavigate('analysis')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive('analysis')
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                  }`}
                >
                  <ShieldCheck size={14} /> Analisis Nilai
                </button>
              </div>
            )}

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                    <CheckCircle2 size={10} /> {adminUser || 'Admin'}
                  </span>
                  <button
                    onClick={onOpenSettings}
                    className="hidden md:flex w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 items-center justify-center transition-colors"
                    title="Pengaturan"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={onLogout}
                    className="hidden md:flex px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors items-center gap-1.5"
                  >
                    <LogOut size={12} /> Logout
                  </button>
                </>
              )}
              {!isAdmin && (
                <button
                  onClick={onLoginClick}
                  className="hidden md:flex px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors items-center gap-1.5"
                >
                  <LogIn size={12} /> Login Admin
                </button>
              )}

              {/* Hamburger removed from top nav in mobile (moved to bottom nav) */}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.08)] pb-safe">
        <div className="flex items-center justify-around h-[68px] px-2">
          {isAdmin ? (
            <>
              <button 
                onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }} 
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors active:scale-95 ${isActive('exam') ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`}
              >
                <div className={`p-1.5 rounded-full ${isActive('exam') ? 'bg-indigo-50' : 'bg-transparent'}`}>
                  <ClipboardList size={22} className="stroke-[2]" />
                </div>
                <span className="text-[10px] font-bold -mt-1">Ujian</span>
              </button>
              <button 
                onClick={() => { onNavigate('behavior'); setIsMobileMenuOpen(false); }} 
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors active:scale-95 ${isActive('behavior') ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`}
              >
                <div className={`p-1.5 rounded-full ${isActive('behavior') ? 'bg-indigo-50' : 'bg-transparent'}`}>
                  <Users size={22} className="stroke-[2]" />
                </div>
                <span className="text-[10px] font-bold -mt-1">Kehadiran</span>
              </button>
              <button 
                onClick={() => { onNavigate('remedial_dashboard'); setIsMobileMenuOpen(false); }} 
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors active:scale-95 ${isActive('remedial') ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`}
              >
                <div className={`p-1.5 rounded-full ${isActive('remedial') ? 'bg-indigo-50' : 'bg-transparent'}`}>
                  <RefreshCcw size={22} className="stroke-[2]" />
                </div>
                <span className="text-[10px] font-bold -mt-1">Remedial</span>
              </button>
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors active:scale-95 ${isMobileMenuOpen ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`}
              >
                <div className={`p-1.5 rounded-full ${isMobileMenuOpen ? 'bg-indigo-50' : 'bg-transparent'}`}>
                  <Menu size={22} className="stroke-[2]" />
                </div>
                <span className="text-[10px] font-bold -mt-1">Menu</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }} 
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-slate-500 hover:text-indigo-600 transition-colors active:scale-95 cursor-pointer"
            >
              <div className="p-1.5 rounded-full bg-transparent">
                  <LogIn size={22} className="stroke-[2]" />
              </div>
              <span className="text-[10px] font-bold -mt-1">Login Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[190] md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-72 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left-full duration-200 border-r border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h2 className="font-black text-base text-slate-800 tracking-tight">GradeMaster</h2>
                  {isAdmin && (
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 size={10} /> {adminUser || 'Admin'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
              {isAdmin ? (
                <>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 mt-2">Navigasi</p>
                  <button
                    onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }}
                    className={`p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 ${
                      isActive('exam') ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <ClipboardList size={16} /> Penilaian Ujian
                  </button>
                  <button
                    onClick={() => { onNavigate('remedial_dashboard'); setIsMobileMenuOpen(false); }}
                    className={`p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 ${
                      isActive('remedial') ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <RefreshCcw size={16} /> Remedial
                  </button>
                  <button
                    onClick={() => { onNavigate('analysis'); setIsMobileMenuOpen(false); }}
                    className={`p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 ${
                      isActive('analysis') ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <ShieldCheck size={16} /> Analisis Nilai
                  </button>
                  <div className="h-px bg-slate-100 my-2" />
                  <button
                    onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }}
                    className="p-3 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border border-transparent transition-all"
                  >
                    <Settings size={16} /> Pengaturan Admin
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}
                  className="p-3 rounded-xl text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-3 border border-transparent transition-all mt-2"
                >
                  <LogIn size={16} /> Login Admin
                </button>
              )}
            </div>
            {isAdmin && (
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors text-center border border-rose-100"
                >
                  <LogOut size={14} className="inline mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
