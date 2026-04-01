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
  Calendar,
} from 'lucide-react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const { 
    isAdmin, 
    adminUser, 
    layer, 
    setLayer: onNavigate, 
    logout: onLogout, 
    setModal 
  } = useGradeMaster();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hidden in behavior page (uses its own nav), exam and login
  if (pathname?.startsWith('/behavior')) return null;
  if (['login', 'remedial'].includes(layer)) return null;

  const onOpenSettings = () => setModal("adminSettings");
  const onLoginClick = () => onNavigate("login");

  const isActive = (target: string) => {
    if (target === 'exam') return ['home', 'setup', 'dashboard', 'grading'].includes(layer);
    if (target === 'behavior') return layer === 'behavior';
    if (target === 'attendance') return layer === 'attendance';
    if (target === 'remedial') return layer === 'remedial_dashboard';
    return false;
  };

  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="hidden md:block sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <GraduationCap size={20} />
              </div>
              <h1 className="text-base font-black text-white tracking-tight font-outfit uppercase">GradeMaster OS</h1>
            </div>

            {/* Center: Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigate('home')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                  isActive('exam') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <ClipboardList size={14} /> Beranda
              </button>
              <button
                onClick={() => onNavigate('behavior')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                  isActive('behavior') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <ShieldCheck size={14} /> Sikap
              </button>
              <button
                onClick={() => onNavigate('attendance')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                  isActive('attendance') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Calendar size={14} /> Kehadiran
              </button>
              {isAdmin && (
                <button
                  onClick={() => onNavigate('remedial_dashboard')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                    isActive('remedial') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <RefreshCcw size={14} /> Remedial
                </button>
              )}
            </div>

            {/* Right: User/Auth */}
            <div className="flex items-center gap-3">
              {isAdmin ? (
                <>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                    <CheckCircle2 size={10} /> {adminUser || 'Admin'}
                  </span>
                  <button onClick={onOpenSettings} className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 hover:text-primary hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10">
                    <Settings size={14} />
                  </button>
                  <button onClick={onLogout} className="px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-rose-500/20">
                    <LogOut size={12} />
                  </button>
                </>
              ) : (
                <button onClick={onLoginClick} className="px-4 py-2 text-slate-400 hover:text-primary hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <LogIn size={14} className="inline mr-2" /> Login Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Header (Just Brand) - Robust Safe Area Solution */}
      <div 
        className="md:hidden fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/10 flex flex-col pt-[var(--safe-top)]"
        style={{ height: 'calc(var(--nav-height) + var(--safe-top))' }}
      >
        <div className="flex-1 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
             <div className="w-8 h-8 md:w-7 md:h-7 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
               <GraduationCap size={18} />
             </div>
             <span className="text-base md:text-sm font-black text-white font-outfit uppercase tracking-tight">GradeMaster OS</span>
          </div>
          {isAdmin && (
             <button onClick={onOpenSettings} className="w-9 h-9 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center border border-white/10 hover:text-primary hover:bg-white/10 transition-colors">
               <Settings size={16} />
             </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation (Pinned to Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 pb-[env(safe-area-inset-bottom)] px-4">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => onNavigate('home')}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isActive('exam') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500'}`}
          >
            <ClipboardList size={22} className={isActive('exam') ? 'animate-pulse' : ''} />
            {isActive('exam') && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Ujian</span>}
          </button>
          
          <button 
            onClick={() => onNavigate('behavior')}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isActive('behavior') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500'}`}
          >
            <ShieldCheck size={22} className={isActive('behavior') ? 'animate-pulse' : ''} />
            {isActive('behavior') && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Sikap</span>}
          </button>

          <button 
            onClick={() => onNavigate('attendance')}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isActive('attendance') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500'}`}
          >
            <Calendar size={22} className={isActive('attendance') ? 'animate-pulse' : ''} />
            {isActive('attendance') && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Absen</span>}
          </button>

          {isAdmin && (
            <button 
              onClick={() => onNavigate('remedial_dashboard')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isActive('remedial') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500'}`}
            >
              <RefreshCcw size={22} className={isActive('remedial') ? 'animate-pulse' : ''} />
              {isActive('remedial') && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Remedial</span>}
            </button>
          )}

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isMobileMenuOpen ? 'bg-white/10 text-white' : 'text-slate-500'}`}
          >
            <Menu size={22} />
            {isMobileMenuOpen && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Lainnya</span>}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer (Menu Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[1002] md:hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-slate-900 rounded-t-[2.5rem] border-t border-white/10 p-8 pb-[calc(1.5rem + env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-full duration-500 shadow-2xl overflow-y-auto">
            <div className="space-y-3">
              {isAdmin ? (
                <>
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/5 mb-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Masuk Sebagai</p>
                    <p className="text-sm font-black text-white uppercase">{adminUser || 'Administrator'}</p>
                  </div>
                  <button onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }} className="w-full p-4 bg-white/5 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest text-left flex items-center gap-3">
                    <Settings size={16} /> Pengaturan Profil
                  </button>
                  <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full p-4 bg-rose-500/10 text-rose-400 rounded-2xl text-xs font-black uppercase tracking-widest text-left flex items-center gap-3">
                    <LogOut size={16} /> Logout Sistem
                  </button>
                </>
              ) : (
                <button onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }} className="w-full p-6 bg-primary text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20">
                  <LogIn size={20} className="inline mr-2" /> Login Admin
                </button>
              )}
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-full p-4 bg-white/5 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                Tutup Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
