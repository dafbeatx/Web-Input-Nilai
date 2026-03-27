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
    if (target === 'exam') return !['behavior', 'login'].includes(layer);
    if (target === 'behavior') return layer === 'behavior';
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

              {/* Mobile hamburger — integrated in navbar */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-colors"
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

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
                    onClick={() => { onNavigate('behavior'); setIsMobileMenuOpen(false); }}
                    className={`p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 ${
                      isActive('behavior') ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Users size={16} /> Kehadiran & Perilaku
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
