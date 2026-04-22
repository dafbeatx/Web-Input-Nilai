"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Layer, ToastType, ModalType } from '@/lib/grademaster/types';
import { supabase } from '@/lib/supabase/client';

interface GradeMasterContextType {
  layer: Layer;
  setLayer: (layer: Layer) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  adminUser: string | null;
  setAdminUser: (name: string | null) => void;
  isStudent: boolean;
  setIsStudent: (isStudent: boolean) => void;
  studentData: any | null;
  setStudentData: (data: any | null) => void;
  toast: ToastType | null;
  setToast: (toast: ToastType | null) => void;
  modal: ModalType;
  setModal: (modal: ModalType) => void;
  studentClass: string;
  setStudentClass: (className: string) => void;
  academicYear: string;
  setAcademicYear: (year: string) => void;
  logout: () => void;
}

const GradeMasterContext = createContext<GradeMasterContextType | undefined>(undefined);

export function GradeMasterProvider({ children }: { children: ReactNode }) {
  const [layer, setLayer] = useState<Layer>("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [studentData, setStudentData] = useState<any | null>(null);
  const [toast, setToast] = useState<ToastType | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [studentClass, setStudentClass] = useState("");
  const [academicYear, setAcademicYear] = useState("2025/2026");

  // Synchronization with URL Hash & LocalStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace('#', '');
    const validLayers: Layer[] = ['home', 'setup', 'dashboard', 'grading', 'remedial', 'behavior', 'remedial_dashboard', 'login', 'attendance', 'student_accounts', 'student_login', 'student_claim', 'teacher_claim'];
    
    // 1. Restore Admin State
    const savedAdmin = localStorage.getItem('gm_isAdmin') === 'true';
    const savedUser = localStorage.getItem('gm_adminUser');
    const savedStudent = localStorage.getItem('gm_isStudent') === 'true';
    const savedStudentData = localStorage.getItem('gm_studentData');
    const savedClass = localStorage.getItem('gm_studentClass');
    const savedYear = localStorage.getItem('gm_academicYear') || "2025/2026";
    
    if (savedAdmin) {
      setIsAdmin(true);
      setAdminUser(savedUser);
    }
    if (savedStudent) {
      setIsStudent(true);
      if (savedStudentData) {
        try { setStudentData(JSON.parse(savedStudentData)); } catch(e) {}
      }
    }
    if (savedClass) setStudentClass(savedClass);
    setAcademicYear(savedYear);

    // 2. Determine Initial Layer
    let initialLayer: Layer = 'home';
    
    // We only respect specific hashes during refresh, preventing 'dashboard' 
    // from automatically taking over the screen on reload or root access.
    // Local storage fallback is removed so the app always lands cleanly on 'home'.
    if (validLayers.includes(hash as Layer) && hash !== 'dashboard') {
      initialLayer = hash as Layer;
    }

    // 3. Auth Guards
    const adminOnlyLayers = ['setup', 'grading', 'remedial_dashboard', 'student_accounts'];
    const protectedLayers = ['remedial'];
    const authLayers = ['login', 'student_login'];
    
    if (adminOnlyLayers.includes(initialLayer) && !savedAdmin) {
      initialLayer = 'login';
    } else if (protectedLayers.includes(initialLayer) && !savedAdmin && !savedStudent) {
      initialLayer = 'student_login';
    } else if (authLayers.includes(initialLayer) && (savedAdmin || savedStudent)) {
      initialLayer = savedAdmin ? 'setup' : 'dashboard';
    } else if (initialLayer === 'home' && !savedAdmin && !savedStudent) {
      // Default unauthenticated landing to student_login per user request for shared links
      initialLayer = 'student_login';
    }

    setLayer(initialLayer);
    window.history.replaceState({ layer: initialLayer }, '', `#${initialLayer}`);

    // 4. History PopState Listener
    const handlePopState = () => {
      const newHash = window.location.hash.replace('#', '') as Layer;
      if (validLayers.includes(newHash)) {
        const adminOnlyLayers = ['setup', 'grading', 'remedial_dashboard', 'student_accounts'];
        const protectedLayers = ['remedial'];
        if (adminOnlyLayers.includes(newHash) && !localStorage.getItem('gm_isAdmin')) {
          setLayer('login');
          window.history.replaceState({ layer: 'login' }, '', '#login');
        } else if (protectedLayers.includes(newHash) && !localStorage.getItem('gm_isAdmin') && !localStorage.getItem('gm_isStudent')) {
          setLayer('student_login');
          window.history.replaceState({ layer: 'student_login' }, '', '#student_login');
        } else {
          setLayer(newHash);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("gm_isAdmin", isAdmin.toString());
    if (adminUser) localStorage.setItem("gm_adminUser", adminUser);
    else localStorage.removeItem("gm_adminUser");
    
    localStorage.setItem("gm_isStudent", isStudent.toString());
    if (studentData) localStorage.setItem("gm_studentData", JSON.stringify(studentData));
    else localStorage.removeItem("gm_studentData");

    localStorage.setItem("gm_studentClass", studentClass);
    localStorage.setItem("gm_academicYear", academicYear);
  }, [isAdmin, adminUser, isStudent, studentData, studentClass, academicYear]);

  // Update URL and LocalStorage on Layer change
  const navigate = (newLayer: Layer) => {
    // Auth Guards
    const adminOnlyLayers = ['setup', 'grading', 'remedial_dashboard', 'student_accounts'];
    const protectedLayers = ['remedial'];

    if (adminOnlyLayers.includes(newLayer) && !isAdmin) {
      console.warn(`[Guard] Admin access required for layer: ${newLayer}`);
      setLayer('login');
      window.history.pushState({ layer: 'login' }, '', '#login');
      localStorage.setItem("gm_layer", 'login');
      return;
    }

    if (protectedLayers.includes(newLayer) && !isAdmin && !isStudent) {
      console.warn(`[Guard] Student access required for layer: ${newLayer}`);
      setLayer('student_login');
      window.history.pushState({ layer: 'student_login' }, '', '#student_login');
      localStorage.setItem("gm_layer", 'student_login');
      return;
    }

    setLayer(newLayer);
    localStorage.setItem("gm_layer", newLayer);
    
    if (window.location.hash.replace('#', '') !== newLayer) {
      window.history.pushState({ layer: newLayer }, '', `#${newLayer}`);
    }
  };

  const logout = async () => {
    if (isAdmin) {
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
      setIsAdmin(false);
      setAdminUser(null);
      localStorage.removeItem('gm_isAdmin');
      localStorage.removeItem('gm_adminUser');
    } else if (isStudent) {
      await fetch('/api/student/logout', { method: 'POST' }).catch(() => {});
      setIsStudent(false);
      setStudentData(null);
      localStorage.removeItem('gm_isStudent');
      localStorage.removeItem('gm_studentData');
    }

    // 3. Global Sign Out (Supabase/Google)
    await supabase.auth.signOut();

    setLayer("student_login");
    localStorage.setItem("gm_layer", "student_login");
    window.history.pushState({ layer: 'student_login' }, '', '#student_login');
  };

  return (
    <GradeMasterContext.Provider value={{
      layer, setLayer: navigate,
      isAdmin, setIsAdmin,
      adminUser, setAdminUser,
      isStudent, setIsStudent,
      studentData, setStudentData,
      toast, setToast,
      modal, setModal,
      studentClass, setStudentClass,
      academicYear, setAcademicYear,
      logout
    }}>
      {children}
    </GradeMasterContext.Provider>
  );
}

export function useGradeMaster() {
  const context = useContext(GradeMasterContext);
  if (context === undefined) {
    throw new Error('useGradeMaster must be used within a GradeMasterProvider');
  }
  return context;
}
