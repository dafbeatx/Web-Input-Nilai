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
  Loader2,
  User,
  Activity
} from 'lucide-react';
import { useGradeMaster } from '@/context/GradeMasterContext';
import { usePathname, useRouter } from 'next/navigation';
import NeonGraduationCap from '@/components/grademaster/ui/NeonGraduationCap';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const { 
    isAdmin, 
    adminUser, 
    isStudent,
    studentData,
    setStudentData,
    toast,
    setToast,
    layer, 
    setLayer: onNavigate, 
    logout: onLogout, 
    setModal 
  } = useGradeMaster();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Hidden in behavior page (uses its own nav), exam, and auth layers
  if (pathname?.startsWith('/behavior')) return null;
  if (['login', 'student_login', 'student_claim', 'remedial'].includes(layer)) return null;

  const onOpenSettings = () => setModal("adminSettings");
  const onLoginClick = () => onNavigate("login");

  const isActive = (target: string) => {
    if (target === 'exam') return ['home', 'setup', 'dashboard', 'grading'].includes(layer);
    if (target === 'behavior') return layer === 'behavior';
    if (target === 'attendance') return layer === 'attendance';
    if (target === 'remedial') return layer === 'remedial_dashboard';
    return false;
  };

  const handleLinkGoogleStudent = async () => {
    if (!studentData?.name) return;
    setIsLinking(true);
    try {
      const res = await fetch('/api/student/link-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_name: studentData.name })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setToast({ message: data.message, type: 'success' });
      // Configure context with matched DB data along with indicating link status
      setStudentData({ ...studentData, ...data.student, isGoogleLinked: true });
      setIsProfileDropdownOpen(false);
      onNavigate('dashboard');
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="hidden md:block sticky top-0 z-[100] bg-surface/80 backdrop-blur-xl border-b border-outline-variant shadow-lg">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <NeonGraduationCap size={20} />
              </div>
              <h1 className="text-base font-black text-on-surface tracking-tight font-outfit uppercase">GradeMaster OS</h1>
            </div>

            {/* Center: Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigate('home')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                  isActive('exam') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-white border border-transparent'
                }`}
              >
                <ClipboardList size={14} /> Beranda
              </button>
              <button
                onClick={() => onNavigate('behavior')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                  isActive('behavior') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-white border border-transparent'
                }`}
              >
                <ShieldCheck size={14} /> Sikap
              </button>
              <button
                onClick={() => onNavigate('attendance')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                  isActive('attendance') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-white border border-transparent'
                }`}
              >
                <Calendar size={14} /> Kehadiran
              </button>
              {isAdmin && (
                <button
                  onClick={() => onNavigate('remedial_dashboard')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                    isActive('remedial') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-white border border-transparent'
                  }`}
                >
                  <RefreshCcw size={14} /> Remedial
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => onNavigate('student_accounts')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                    layer === 'student_accounts' ? 'bg-primary/20 text-primary border border-primary/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-white border border-transparent'
                  }`}
                >
                  <Users size={14} /> Akun Siswa
                </button>
              )}
            </div>

            {/* Right: User/Auth */}
            <div className="flex items-center gap-3 relative">
              {isAdmin ? (
                <>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                    <CheckCircle2 size={10} /> {adminUser || 'Admin'}
                  </span>
                  <button onClick={onOpenSettings} className="w-8 h-8 rounded-lg bg-surface-variant text-on-surface-variant hover:text-primary hover:bg-surface-container-highest flex items-center justify-center transition-colors border border-outline-variant">
                    <Settings size={14} />
                  </button>
                  <button onClick={onLogout} className="px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-rose-500/20">
                    <LogOut size={12} />
                  </button>
                </>
              ) : isStudent && studentData?.isGoogleLinked ? (
                <>
                  <button 
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 px-1 py-1 rounded-full hover:bg-surface-variant border border-transparent hover:border-outline-variant transition-all focus:outline-none"
                  >
                    {studentData.photo_url ? (
                      <img src={studentData.photo_url} alt="Profile" className="w-8 h-8 rounded-full shadow-md object-cover border border-outline-variant" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {studentData.name?.[0] || 'U'}
                      </div>
                    )}
                  </button>

                  {isProfileDropdownOpen && (
                    <div className="absolute top-14 right-0 w-64 bg-surface premium-shadow border border-outline-variant rounded-2xl p-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                      <div className="px-4 py-3 border-b border-outline-variant mb-2">
                        <p className="text-xs text-on-surface-variant font-bold">Masuk Sebagai:</p>
                        <p className="text-sm font-black text-on-surface truncate">{studentData.name}</p>
                      </div>
                      
                      <button 
                        onClick={handleLinkGoogleStudent}
                        disabled={isLinking}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 text-on-surface-variant transition-colors text-sm font-bold text-left disabled:opacity-50"
                      >
                        {isLinking ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />} 
                        Siswa / Mahasiswa
                      </button>
                      <button 
                        onClick={() => {
                           onNavigate('student_profile');
                           setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 text-on-surface-variant transition-colors text-sm font-bold text-left mt-1"
                      >
                        <User size={16} /> Profil Saya
                      </button>

                      <div className="border-t border-outline-variant mt-2 pt-2">
                        <button 
                          onClick={() => { onLogout(); setIsProfileDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors text-sm font-bold text-left"
                        >
                          <LogOut size={16} /> Logout Global
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button onClick={onLoginClick} className="px-4 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <LogIn size={14} className="inline mr-2" /> Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE TOP HEADER — Frosted Glass, Safe Area Aware
       ═══════════════════════════════════════════════════════════ */}
      <div 
        id="mobile-navbar"
        className="md:hidden fixed top-0 left-0 right-0 z-[100] bg-white/85 backdrop-blur-2xl border-b border-surface-container-high/60 flex items-center justify-between px-5 transition-all duration-300"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-3 overflow-hidden">
           {!isAdmin && isStudent && studentData?.class_name ? (
             <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500 overflow-hidden">
               <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                 {studentData.photo_url ? (
                   <img src={studentData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                     {studentData.name?.[0] || 'U'}
                   </div>
                 )}
               </div>
               <div className="flex flex-col min-w-0">
                 <span className="text-xs font-black text-[#0F172A] tracking-tight leading-none truncate uppercase">{studentData.name}</span>
                 <span className="text-[9px] font-black text-[#7C3AED] tracking-widest uppercase leading-tight mt-0.5">Kelas {studentData.class_name}</span>
               </div>
             </div>
           ) : (
             <>
               <div className="w-9 h-9 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-sm">
                 <NeonGraduationCap size={18} />
               </div>
               <div className="flex flex-col">
                 <span className="text-[13px] font-extrabold text-on-surface tracking-tight leading-none">GradeMaster</span>
                 <span className="text-[9px] font-bold text-on-surface-variant/60 tracking-wider uppercase leading-tight">Education OS</span>
               </div>
             </>
           )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
             <button onClick={onOpenSettings} className="w-9 h-9 rounded-xl bg-surface-container-low text-on-surface-variant flex items-center justify-center border border-surface-container-high hover:bg-surface-container transition-colors active:scale-95">
               <Settings size={16} />
             </button>
          )}
          {!isAdmin && isStudent && (
             <button 
               onClick={() => onNavigate('student_profile')} 
               className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors active:scale-95"
             >
               <User size={18} />
             </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION — Floating Pill Bar
       ═══════════════════════════════════════════════════════════ */}
      <nav 
        id="mobile-bottom-nav" 
        className="md:hidden fixed bottom-0 left-0 right-0 z-[1001] transition-all duration-300"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Floating container */}
        <div className="mx-4 mb-2 bg-white/90 backdrop-blur-2xl rounded-2xl border border-surface-container-high/50 shadow-[0_-4px_30px_rgba(0,0,0,0.06)] px-2 py-1.5">
          <div className="flex items-center justify-around">
            {/* Beranda */}
            <button 
              onClick={() => onNavigate('home')}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                isActive('exam') 
                  ? 'bg-primary-container/20 text-on-primary-fixed' 
                  : 'text-on-surface-variant/60 hover:text-on-surface-variant'
              }`}
            >
              <ClipboardList size={20} strokeWidth={isActive('exam') ? 2.5 : 1.8} />
              <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isActive('exam') ? 'opacity-100' : 'opacity-0 h-0 mt-0 overflow-hidden'}`}>Beranda</span>
            </button>
            
            {/* Sikap */}
            <button 
              onClick={() => onNavigate('behavior')}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                isActive('behavior') 
                  ? 'bg-primary-container/20 text-on-primary-fixed' 
                  : 'text-on-surface-variant/60 hover:text-on-surface-variant'
              }`}
            >
              <ShieldCheck size={20} strokeWidth={isActive('behavior') ? 2.5 : 1.8} />
              <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isActive('behavior') ? 'opacity-100' : 'opacity-0 h-0 mt-0 overflow-hidden'}`}>Sikap</span>
            </button>

            {/* Kehadiran */}
            <button 
              onClick={() => onNavigate('attendance')}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                isActive('attendance') 
                  ? 'bg-primary-container/20 text-on-primary-fixed' 
                  : 'text-on-surface-variant/60 hover:text-on-surface-variant'
              }`}
            >
              <Calendar size={20} strokeWidth={isActive('attendance') ? 2.5 : 1.8} />
              <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isActive('attendance') ? 'opacity-100' : 'opacity-0 h-0 mt-0 overflow-hidden'}`}>Absen</span>
            </button>

            {/* Remedial (Admin only) */}
            {isAdmin && (
              <button 
                onClick={() => onNavigate('remedial_dashboard')}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                  isActive('remedial') 
                    ? 'bg-primary-container/20 text-on-primary-fixed' 
                    : 'text-on-surface-variant/60 hover:text-on-surface-variant'
                }`}
              >
                <RefreshCcw size={20} strokeWidth={isActive('remedial') ? 2.5 : 1.8} />
                <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isActive('remedial') ? 'opacity-100' : 'opacity-0 h-0 mt-0 overflow-hidden'}`}>Remedial</span>
              </button>
            )}

            {/* More Menu */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                isMobileMenuOpen 
                  ? 'bg-surface-container text-on-surface' 
                  : 'text-on-surface-variant/60 hover:text-on-surface-variant'
              }`}
            >
              {isMobileMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={1.8} />}
              <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 h-0 mt-0 overflow-hidden'}`}>Menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE DRAWER — Bottom Sheet with Light Theme
       ═══════════════════════════════════════════════════════════ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[1002] md:hidden animate-in fade-in duration-200">
          {/* Scrim */}
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-white rounded-t-3xl border-t border-surface-container-high shadow-[0_-20px_60px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-400 overflow-hidden">
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-surface-container-highest rounded-full" />
            </div>

            <div className="px-6 pb-[calc(6rem+env(safe-area-inset-bottom))] space-y-3 overflow-y-auto max-h-[calc(80vh-2rem)]">
              {isAdmin ? (
                <>
                  {/* Admin Identity Card */}
                  <div className="bg-surface-container-low p-5 rounded-2xl border border-surface-container flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <CheckCircle2 size={22} className="text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Administrator</p>
                      <p className="text-sm font-extrabold text-on-surface truncate mt-0.5">{adminUser || 'Admin'}</p>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <button 
                    onClick={() => { onNavigate('student_accounts'); setIsMobileMenuOpen(false); }} 
                    className="w-full p-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-surface-container"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-container/15 flex items-center justify-center">
                      <Users size={18} className="text-on-primary-fixed" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">Manajemen Akun Siswa</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Kelola data dan akses siswa</span>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }} 
                    className="w-full p-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-surface-container"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
                      <Settings size={18} className="text-on-surface-variant" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">Pengaturan</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Profil, keamanan & konfigurasi</span>
                    </div>
                  </button>

                  <div className="pt-2">
                    <button 
                      onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} 
                      className="w-full p-4 bg-error/5 hover:bg-error/10 rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-error/10"
                    >
                      <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                        <LogOut size={18} className="text-error" />
                      </div>
                      <span className="text-[11px] font-bold text-error">Logout Sistem</span>
                    </button>
                  </div>
                </>
              ) : isStudent && studentData?.isGoogleLinked ? (
                <>
                  {/* Student Identity Card */}
                  <div className="bg-surface-container-low p-5 rounded-2xl border border-surface-container flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-surface-container-high shadow-sm flex-shrink-0">
                      {studentData.photo_url ? (
                        <img src={studentData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary-container text-white flex items-center justify-center font-bold text-sm">
                          {studentData.name?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Siswa</p>
                      <p className="text-sm font-extrabold text-on-surface truncate mt-0.5">{studentData.name}</p>
                    </div>
                  </div>

                  {/* Student Actions */}
                  <button 
                    onClick={() => { onNavigate('student_profile'); setIsMobileMenuOpen(false); }}
                    className="w-full p-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-surface-container"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-container/15 flex items-center justify-center">
                      <User size={18} className="text-on-primary-fixed" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">Profil Saya</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Lihat data & performa</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => { handleLinkGoogleStudent(); setIsMobileMenuOpen(false); }} 
                    disabled={isLinking}
                    className="w-full p-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-surface-container disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      {isLinking ? <Loader2 size={18} className="animate-spin text-secondary" /> : <GraduationCap size={18} className="text-secondary" />}
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">Manajemen Nilai</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Sinkronkan data akademik</span>
                    </div>
                  </button>

                  <div className="pt-2">
                    <button 
                      onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} 
                      className="w-full p-4 bg-error/5 hover:bg-error/10 rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-error/10"
                    >
                      <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                        <LogOut size={18} className="text-error" />
                      </div>
                      <span className="text-[11px] font-bold text-error">Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <button 
                  onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }} 
                  className="w-full p-5 bg-primary-container text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest shadow-lg shadow-primary-container/30 flex items-center justify-center gap-3 active:scale-[0.97] transition-transform"
                >
                  <LogIn size={20} /> Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
