"use client";

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Menu,
  X,
  Home,
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
  Activity,
  BookOpen,
  ListChecks,
  Database
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
    isParent,
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

  // Hidden in behavior page (uses its own nav), exam, auth, and student profile/lesson layers
  const isHidden = pathname?.startsWith('/behavior') || ['login', 'student_login', 'student_claim', 'teacher_claim', 'remedial', 'lesson_management', 'grading', 'student_profile', 'student_lesson'].includes(layer);

  useEffect(() => {
    if (!isHidden) {
      document.body.classList.add('has-desktop-sidebar');
    } else {
      document.body.classList.remove('has-desktop-sidebar');
    }
    return () => document.body.classList.remove('has-desktop-sidebar');
  }, [isHidden]);

  if (isHidden) return null;

  const onOpenSettings = () => setModal("adminSettings");
  const onLoginClick = () => onNavigate("login");

  const isActive = (target: string) => {
    if (target === 'exam') return ['home', 'setup', 'dashboard', 'grading'].includes(layer);
    if (target === 'behavior') return layer === 'behavior';
    if (target === 'attendance') return layer === 'attendance';
    if (target === 'remedial') return layer === 'remedial_dashboard';
    if (target === 'data_center') return layer === 'data_center';
    if (target === 'student_lesson') return layer === 'student_lesson';
    return false;
  };

  const handleLinkGoogleStudent = async () => {
    if (!studentData?.name) return;
    setIsLinking(true);
    try {
      const res = await fetch('/api/student/link-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          google_name: studentData.name,
          email: studentData.email || studentData.username
        })
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
      {/* Desktop Left Sidebar */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-surface/95 backdrop-blur-xl border-r border-outline-variant shadow-2xl z-[100]">
        <div className="flex flex-col h-full p-5">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10 mt-2">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
              <NeonGraduationCap size={22} />
            </div>
            <h1 className="text-lg font-black text-on-surface tracking-tight font-outfit uppercase leading-tight">GradeMaster<br/><span className="text-primary">OS</span></h1>
          </div>

          {/* Navigation Items */}
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <button
                onClick={() => onNavigate('home')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-3 ${
                  isActive('exam') ? 'bg-primary/10 text-primary border border-primary/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border border-transparent'
                }`}
            >
                <Home size={18} /> Beranda
            </button>
            <button
                onClick={() => onNavigate('behavior')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-3 ${
                  isActive('behavior') ? 'bg-primary/10 text-primary border border-primary/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border border-transparent'
                }`}
            >
                <ShieldCheck size={18} /> Sikap
            </button>
            <button
                onClick={() => onNavigate('attendance')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-3 ${
                  isActive('attendance') ? 'bg-primary/10 text-primary border border-primary/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border border-transparent'
                }`}
            >
                <Calendar size={18} /> Kehadiran
            </button>

            {(isStudent || isParent) && (
                <>
                  <div className="my-2 border-t border-outline-variant"></div>
                  <span className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-widest px-2 mb-1">Portal Siswa</span>
                  <button
                    onClick={() => onNavigate('student_lesson')}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-3 min-h-[44px] ${
                      isActive('student_lesson') ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border border-transparent'
                    }`}
                  >
                    <BookOpen size={18} /> Pelajaran Saya
                  </button>
                </>
            )}

            {isAdmin && (
                <>
                  <div className="my-2 border-t border-outline-variant"></div>
                  <span className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-widest px-2 mb-1">Admin Panel</span>
                  <button
                    onClick={() => onNavigate('lesson_management')}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-3 ${
                      layer === 'lesson_management' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border border-transparent'
                    }`}
                  >
                    <BookOpen size={18} /> Pelajaran
                  </button>
                  <button
                    onClick={() => onNavigate('data_center')}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-3 ${
                      layer === 'data_center' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border border-transparent'
                    }`}
                  >
                    <Database size={18} /> Pusat Data
                  </button>
                  <button
                    onClick={() => onNavigate('student_accounts')}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-3 ${
                      layer === 'student_accounts' ? 'bg-[#00b4ff]/10 text-[#00b4ff] border border-[#00b4ff]/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border border-transparent'
                    }`}
                  >
                    <Users size={18} /> Akun Siswa
                  </button>
                  <button
                    onClick={() => onNavigate('remedial_dashboard')}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-3 ${
                      layer === 'remedial_dashboard' ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border border-transparent'
                    }`}
                  >
                    <Settings size={18} /> Remedial
                  </button>
                </>
            )}
          </div>

          {/* User Profile / Auth */}
          <div className="mt-auto pt-4 border-t border-outline-variant">
            {isAdmin ? (
               <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 px-3 py-2 bg-surface-container rounded-xl border border-surface-container-high mb-2">
                     <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={16} />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Admin</p>
                        <p className="text-sm font-black text-on-surface truncate leading-tight">{adminUser || 'Admin'}</p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={onOpenSettings} className="flex-1 py-2 rounded-xl bg-surface-variant text-on-surface-variant hover:text-primary hover:bg-surface-container-highest flex items-center justify-center transition-colors border border-outline-variant">
                       <Settings size={16} />
                     </button>
                     <button onClick={onLogout} className="flex-1 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors border border-transparent hover:border-rose-500/20">
                       <LogOut size={16} />
                     </button>
                  </div>
               </div>
            ) : (isStudent && studentData?.isGoogleLinked) || isParent ? (
               <div className="relative">
                  <button 
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-variant border border-transparent hover:border-outline-variant transition-all text-left"
                  >
                    {studentData?.photo_url ? (
                      <img src={studentData.photo_url} alt="Profile" className="w-10 h-10 rounded-full shadow-md object-cover border border-outline-variant flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                        {studentData?.name?.[0] || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                       <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider truncate">{isParent ? 'Orang Tua' : 'Siswa'}</p>
                       <p className="text-sm font-black text-on-surface truncate leading-tight">{studentData?.name}</p>
                    </div>
                  </button>

                  {isProfileDropdownOpen && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-surface premium-shadow border border-outline-variant rounded-2xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                      {!isParent && (
                        <button 
                          onClick={handleLinkGoogleStudent}
                          disabled={isLinking}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 text-on-surface-variant transition-colors text-sm font-bold text-left disabled:opacity-50"
                        >
                          {isLinking ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />} 
                          Siswa / Mahasiswa
                        </button>
                      )}
                      <button 
                        onClick={() => {
                           onNavigate('student_profile');
                           setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-variant text-on-surface-variant transition-colors text-sm font-bold text-left mt-1"
                      >
                        <User size={16} /> {isParent ? 'Profil Siswa' : 'Profil Saya'}
                      </button>

                      <div className="border-t border-outline-variant mt-2 pt-2">
                        <button 
                          onClick={() => { onLogout(); setIsProfileDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors text-sm font-bold text-left"
                        >
                          <LogOut size={16} /> Logout Global
                        </button>
                      </div>
                    </div>
                  )}
               </div>
            ) : (
               <button 
                 onClick={() => onNavigate('student_login')}
                 className="w-full py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
               >
                 <LogIn size={16} /> Login
               </button>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE TOP HEADER — Frosted Glass, Safe Area Aware
       ═══════════════════════════════════════════════════════════ */}
      <div 
        id="mobile-navbar"
        className={`md:hidden fixed top-0 left-0 right-0 z-[100] bg-white/85 backdrop-blur-2xl border-b border-surface-container-high/60 flex items-center justify-between px-5 transition-all duration-300 ${layer === 'home' ? 'hidden pointer-events-none' : ''}`}
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-3 overflow-hidden">
           {!isAdmin && (isStudent || isParent) && studentData?.class_name ? (
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
          {!isAdmin && (isStudent || isParent) && (
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
              <Home size={20} strokeWidth={isActive('exam') ? 2.5 : 1.8} />
              <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isActive('exam') ? 'opacity-100' : 'opacity-70'}`}>Beranda</span>
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
              <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isActive('behavior') ? 'opacity-100' : 'opacity-70'}`}>Sikap</span>
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
              <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isActive('attendance') ? 'opacity-100' : 'opacity-70'}`}>Absen</span>
            </button>


            {/* Pelajaran Saya (Mobile Bottom Item) */}
            {(isStudent || isParent) && (
              <button 
                onClick={() => onNavigate('student_lesson')}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                  isActive('student_lesson') 
                    ? 'bg-primary-container/20 text-on-primary-fixed' 
                    : 'text-on-surface-variant/60 hover:text-on-surface-variant'
                }`}
              >
                <BookOpen size={20} strokeWidth={isActive('student_lesson') ? 2.5 : 1.8} />
                <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isActive('student_lesson') ? 'opacity-100' : 'opacity-70'}`}>Materi</span>
              </button>
            )}

            {/* More Menu / Profile */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                isMobileMenuOpen 
                  ? 'bg-surface-container text-on-surface' 
                  : 'text-on-surface-variant/60 hover:text-on-surface-variant'
              }`}
            >
              {isMobileMenuOpen ? (
                <X size={20} strokeWidth={2.5} />
              ) : (!isAdmin && (isStudent || isParent) && studentData?.photo_url) ? (
                <img src={studentData.photo_url} alt="Profile" className="w-[20px] h-[20px] rounded-full object-cover border border-outline-variant shadow-sm" />
              ) : (!isAdmin && (isStudent || isParent) && studentData?.name) ? (
                <div className="w-[20px] h-[20px] rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/20">
                  {studentData.name[0]}
                </div>
              ) : (
                <Menu size={20} strokeWidth={1.8} />
              )}
              <span className={`text-[9px] font-bold mt-0.5 tracking-wide transition-all ${isMobileMenuOpen ? 'opacity-100' : 'opacity-70'}`}>
                {(!isAdmin && (isStudent || isParent) && studentData) ? 'Profil' : 'Menu'}
              </span>
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
                    onClick={() => { onNavigate('lesson_management'); setIsMobileMenuOpen(false); }} 
                    className="w-full p-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-surface-container"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <BookOpen size={18} className="text-emerald-500" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">Manajemen Pelajaran</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Kelola materi AI & harian</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => { onNavigate('data_center'); setIsMobileMenuOpen(false); }} 
                    className="w-full p-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-surface-container"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <Database size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">Pusat Data</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Kelola siswa & nilai manual</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => { onNavigate('student_accounts'); setIsMobileMenuOpen(false); }} 
                    className="w-full p-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-surface-container"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                      <Users size={18} className="text-indigo-500" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">Akun Siswa</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Manajemen password & kenaikan kelas</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => { onNavigate('remedial_dashboard'); setIsMobileMenuOpen(false); }} 
                    className="w-full p-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-surface-container"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                      <Settings size={18} className="text-secondary" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">Manajemen Remedial</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Atur sesi & konfigurasi</span>
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
              ) : ((isStudent && studentData?.isGoogleLinked) || isParent) ? (
                <>
                  {/* Student Identity Card */}
                  <div className="bg-surface-container-low p-5 rounded-2xl border border-surface-container flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-surface-container-high shadow-sm flex-shrink-0">
                      {studentData?.photo_url ? (
                        <img src={studentData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary-container text-white flex items-center justify-center font-bold text-sm">
                          {studentData?.name?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{isParent ? 'Orang Tua' : 'Siswa'}</p>
                      <p className="text-sm font-extrabold text-on-surface truncate mt-0.5">{studentData?.name}</p>
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
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">{isParent ? 'Profil Anak' : 'Profil Saya'}</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Lihat data & performa</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => { onNavigate('student_lesson'); setIsMobileMenuOpen(false); }}
                    className="w-full p-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] border border-surface-container"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <BookOpen size={18} className="text-emerald-500" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">Pelajaran Saya</span>
                      <span className="text-[9px] font-medium text-on-surface-variant">Lihat materi & kuis harian</span>
                    </div>
                  </button>

                  {!isParent && (
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
                  )}

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
                <div className="pt-2">
                  <button 
                    onClick={() => { onNavigate('student_login'); setIsMobileMenuOpen(false); }} 
                    className="w-full p-4 bg-primary text-white rounded-xl text-left flex items-center gap-4 transition-colors active:scale-[0.98] shadow-lg shadow-primary/20"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <LogIn size={18} className="text-white" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold block leading-tight">Masuk ke GradeMaster</span>
                      <span className="text-[9px] font-medium opacity-80">Akses fitur penuh guru & siswa</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
