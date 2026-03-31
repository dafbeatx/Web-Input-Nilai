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
    return false;
  };

  return (
    <>
      <nav className="sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-9 md:h-9 bg-primary text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                <GraduationCap size={18} className="md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-black text-white tracking-tight truncate">GradeMaster</h1>
              </div>
            </div>

            {/* Center: Desktop Navigation */}
            {isAdmin && (
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => onNavigate('home')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive('exam')
                      ? 'bg-primary/20 text-primary border border-primary/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <ClipboardList size={14} /> Penilaian Ujian
                </button>
                <button
                  onClick={() => onNavigate('behavior')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive('behavior')
                      ? 'bg-primary/20 text-primary border border-primary/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <Users size={14} /> Kehadiran & Perilaku
                </button>
                <button
                  onClick={() => onNavigate('remedial_dashboard')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive('remedial')
                      ? 'bg-primary/20 text-primary border border-primary/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <RefreshCcw size={14} /> Remedial
                </button>
              </div>
            )}

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                    <CheckCircle2 size={10} /> {adminUser || 'Admin'}
                  </span>
                  <button
                    onClick={onOpenSettings}
                    className="hidden md:flex w-8 h-8 rounded-lg bg-white/5 text-slate-400 hover:text-primary hover:bg-white/10 items-center justify-center transition-colors border border-white/10"
                    title="Pengaturan"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={onLogout}
                    className="hidden md:flex px-3 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors items-center gap-1.5 border border-transparent hover:border-rose-500/20"
                  >
                    <LogOut size={12} /> Logout
                  </button>
                </>
              )}
              {!isAdmin && (
                <button
                  onClick={onLoginClick}
                  className="hidden md:flex px-3 py-1.5 text-slate-400 hover:text-primary hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors items-center gap-1.5 border border-transparent hover:border-white/10"
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-t border-white/10 shadow-2xl pb-safe">
        <div className="flex items-center justify-around h-[68px] px-2">
          {isAdmin ? (
            <>
              <button 
                onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }} 
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors active:scale-95 ${isActive('exam') ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
              >
                <div className={`p-1.5 rounded-full ${isActive('exam') ? 'bg-primary/10' : 'bg-transparent'}`}>
                  <ClipboardList size={22} className="stroke-[2]" />
                </div>
                <span className="text-[10px] font-bold -mt-1 uppercase tracking-tight">Ujian</span>
              </button>
              <button 
                onClick={() => { onNavigate('behavior'); setIsMobileMenuOpen(false); }} 
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors active:scale-95 ${isActive('behavior') ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
              >
                <div className={`p-1.5 rounded-full ${isActive('behavior') ? 'bg-primary/10' : 'bg-transparent'}`}>
                  <Users size={22} className="stroke-[2]" />
                </div>
                <span className="text-[10px] font-bold -mt-1 uppercase tracking-tight">Kehadiran</span>
              </button>
              <button 
                onClick={() => { onNavigate('remedial_dashboard'); setIsMobileMenuOpen(false); }} 
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors active:scale-95 ${isActive('remedial') ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
              >
                <div className={`p-1.5 rounded-full ${isActive('remedial') ? 'bg-primary/10' : 'bg-transparent'}`}>
                  <RefreshCcw size={22} className="stroke-[2]" />
                </div>
                <span className="text-[10px] font-bold -mt-1 uppercase tracking-tight">Remedial</span>
              </button>
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors active:scale-95 ${isMobileMenuOpen ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
              >
                <div className={`p-1.5 rounded-full ${isMobileMenuOpen ? 'bg-primary/10' : 'bg-transparent'}`}>
                  <Menu size={22} className="stroke-[2]" />
                </div>
                <span className="text-[10px] font-bold -mt-1 uppercase tracking-tight">Menu</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }} 
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-slate-400 hover:text-primary transition-colors active:scale-95 cursor-pointer"
            >
              <div className="p-1.5 rounded-full bg-transparent">
                  <LogIn size={22} className="stroke-[2]" />
              </div>
              <span className="text-[10px] font-bold -mt-1 uppercase tracking-tight">Login Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[190] md:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-72 bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-left-full duration-200 border-r border-white/10">
            <div className="p-6 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h2 className="font-black text-base text-white tracking-tight">GradeMaster</h2>
                  {isAdmin && (
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 size={10} /> {adminUser || 'Admin'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto bg-slate-900">
              {isAdmin ? (
                <>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 mt-2">Navigasi</p>
                  <button
                    onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }}
                    className={`p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 ${
                      isActive('exam') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <ClipboardList size={16} /> Penilaian Ujian
                  </button>
                  <button
                    onClick={() => { onNavigate('remedial_dashboard'); setIsMobileMenuOpen(false); }}
                    className={`p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 ${
                      isActive('remedial') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <RefreshCcw size={16} /> Remedial
                  </button>
                  <div className="h-px bg-white/10 my-2" />
                  <button
                    onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }}
                    className="p-3 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-white/5 flex items-center gap-3 border border-white/5 transition-all"
                  >
                    <Settings size={16} /> Pengaturan Admin
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}
                  className="p-3 rounded-xl text-left text-xs font-bold text-primary hover:bg-primary/10 flex items-center gap-3 border border-transparent transition-all mt-2"
                >
                  <LogIn size={16} /> Login Admin
                </button>
              )}
            </div>
            {isAdmin && (
              <div className="p-4 border-t border-white/5 bg-slate-900">
                <button
                  onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-black uppercase tracking-widest transition-colors text-center border border-rose-500/20"
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
