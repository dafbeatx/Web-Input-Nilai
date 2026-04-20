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

      {/* Mobile Top Header (Just Brand) - Robust Safe Area Solution */}
      <div 
        id="mobile-navbar"
        className="md:hidden fixed top-0 left-0 right-0 z-[100] bg-surface/90 backdrop-blur-xl border-b border-outline-variant flex items-center justify-between px-4 transition-all duration-300"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-2.5">
           <div className="w-8 h-8 md:w-7 md:h-7 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
             <NeonGraduationCap size={18} />
           </div>
           <span className="text-base md:text-sm font-black text-on-surface font-outfit uppercase tracking-tight">GradeMaster OS</span>
        </div>
        {isAdmin && (
           <button onClick={onOpenSettings} className="w-9 h-9 rounded-lg bg-surface-variant text-on-surface-variant flex items-center justify-center border border-outline-variant hover:text-primary hover:bg-surface-container-highest transition-colors">
             <Settings size={16} />
           </button>
        )}
        {!isAdmin && isStudent && studentData?.isGoogleLinked && (
           <button onClick={() => setIsMobileMenuOpen(true)} className="w-8 h-8 rounded-full shadow-md object-cover border border-outline-variant overflow-hidden">
             {studentData.photo_url ? (
               <img src={studentData.photo_url} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                 {studentData.name?.[0] || 'U'}
               </div>
             )}
           </button>
        )}
      </div>

      {/* Mobile Bottom Navigation (Pinned to Bottom) */}
      <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-slate-900/80 backdrop-blur-3xl border-t border-outline-variant pb-[env(safe-area-inset-bottom)] px-4 transition-all duration-300">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => onNavigate('home')}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isActive('exam') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant'}`}
          >
            <ClipboardList size={22} className={isActive('exam') ? 'animate-pulse' : ''} />
            {isActive('exam') && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Ujian</span>}
          </button>
          
          <button 
            onClick={() => onNavigate('behavior')}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isActive('behavior') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant'}`}
          >
            <ShieldCheck size={22} className={isActive('behavior') ? 'animate-pulse' : ''} />
            {isActive('behavior') && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Sikap</span>}
          </button>

          <button 
            onClick={() => onNavigate('attendance')}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isActive('attendance') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant'}`}
          >
            <Calendar size={22} className={isActive('attendance') ? 'animate-pulse' : ''} />
            {isActive('attendance') && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Absen</span>}
          </button>

          {isAdmin && (
            <button 
              onClick={() => onNavigate('remedial_dashboard')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isActive('remedial') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant'}`}
            >
              <RefreshCcw size={22} className={isActive('remedial') ? 'animate-pulse' : ''} />
              {isActive('remedial') && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Remedial</span>}
            </button>
          )}

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${isMobileMenuOpen ? 'bg-surface-container-highest text-on-surface' : 'text-on-surface-variant'}`}
          >
            <Menu size={22} />
            {isMobileMenuOpen && <span className="text-[8px] font-black uppercase tracking-widest mt-1">Lainnya</span>}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer (Menu Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[1002] md:hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-surface/80 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-slate-900 rounded-t-[2.5rem] border-t border-outline-variant p-8 pb-[calc(1.5rem + env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-full duration-500 premium-shadow overflow-y-auto">
            <div className="space-y-3">
              {isAdmin ? (
                <>
                  <div className="bg-surface-variant p-4 rounded-3xl border border-outline-variant mb-4">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Masuk Sebagai</p>
                    <p className="text-sm font-black text-on-surface uppercase">{adminUser || 'Administrator'}</p>
                  </div>
                  <button onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }} className="w-full p-4 bg-surface-variant text-on-surface-variant rounded-2xl text-xs font-black uppercase tracking-widest text-left flex items-center gap-3">
                    <Settings size={16} /> Pengaturan Profil
                  </button>
                  <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full p-4 bg-rose-500/10 text-rose-400 rounded-2xl text-xs font-black uppercase tracking-widest text-left flex items-center gap-3">
                    <LogOut size={16} /> Logout Sistem
                  </button>
                  <button 
                    onClick={() => { onNavigate('student_accounts'); setIsMobileMenuOpen(false); }} 
                    className="w-full p-4 bg-primary/10 text-primary rounded-2xl text-xs font-black uppercase tracking-widest text-left flex items-center gap-3 border border-primary/20"
                  >
                    <Users size={16} /> Manajemen Akun Siswa
                  </button>
                </>
              ) : isStudent && studentData?.isGoogleLinked ? (
                <>
                  <div className="bg-surface-variant p-4 rounded-3xl border border-outline-variant mb-4">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Masuk Sebagai</p>
                    <div className="flex items-center gap-3 mt-2">
                      {studentData.photo_url && <img src={studentData.photo_url} alt="Profile" className="w-10 h-10 rounded-full border border-outline-variant" />}
                      <p className="text-sm font-black text-on-surface truncate">{studentData.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { handleLinkGoogleStudent(); setIsMobileMenuOpen(false); }} 
                    disabled={isLinking}
                    className="w-full p-4 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-2xl text-xs font-black uppercase tracking-widest text-left flex items-center gap-3 border border-emerald-500/20 mb-2 disabled:opacity-50"
                  >
                    {isLinking ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />} 
                    Manajemen Nilai Siswa
                  </button>
                  <button 
                    onClick={() => { alert('Fitur Orang Tua akan segera hadir.'); setIsMobileMenuOpen(false); }} 
                    className="w-full p-4 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-2xl text-xs font-black uppercase tracking-widest text-left flex items-center gap-3 border border-blue-500/20 mb-4"
                  >
                    <Users size={16} /> Panel Orang Tua
                  </button>
                  <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full p-4 bg-rose-500/10 text-rose-400 rounded-2xl text-xs font-black uppercase tracking-widest text-left flex items-center gap-3 border border-rose-500/20">
                    <LogOut size={16} /> Logout Sistem
                  </button>
                </>
              ) : (
                <button onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }} className="w-full p-6 bg-primary text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20">
                  <LogIn size={20} className="inline mr-2" /> Login
                </button>
              )}
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-full p-4 bg-surface-variant text-on-surface-variant rounded-2xl text-[10px] font-black uppercase tracking-widest">
                Tutup Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
