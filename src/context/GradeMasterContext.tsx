"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Layer, ToastType, ModalType } from '@/lib/grademaster/types';

interface GradeMasterContextType {
  layer: Layer;
  setLayer: (layer: Layer) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  adminUser: string | null;
  setAdminUser: (name: string | null) => void;
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
  const [toast, setToast] = useState<ToastType | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [studentClass, setStudentClass] = useState("");
  const [academicYear, setAcademicYear] = useState("2025/2026");

  // Synchronization with URL Hash & LocalStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace('#', '');
    const validLayers: Layer[] = ['home', 'setup', 'dashboard', 'grading', 'remedial', 'behavior', 'remedial_dashboard', 'login', 'attendance'];
    
    // 1. Restore Admin State
    const savedAdmin = localStorage.getItem('gm_isAdmin') === 'true';
    const savedUser = localStorage.getItem('gm_adminUser');
    const savedClass = localStorage.getItem('gm_studentClass');
    const savedYear = localStorage.getItem('gm_academicYear') || "2025/2026";
    
    if (savedAdmin) {
      setIsAdmin(true);
      setAdminUser(savedUser);
    }
    if (savedClass) setStudentClass(savedClass);
    setAcademicYear(savedYear);

    // 2. Determine Initial Layer
    let initialLayer: Layer = 'home';
    if (validLayers.includes(hash as Layer)) {
      initialLayer = hash as Layer;
    } else {
      const persistedLayer = localStorage.getItem("gm_layer") as Layer;
      if (validLayers.includes(persistedLayer)) {
        initialLayer = persistedLayer;
      }
    }

    // 3. Admin Guard
    if (initialLayer === 'setup' && !savedAdmin) {
      initialLayer = 'login';
    }

    setLayer(initialLayer);
    window.history.replaceState({ layer: initialLayer }, '', `#${initialLayer}`);

    // 4. History PopState Listener
    const handlePopState = () => {
      const newHash = window.location.hash.replace('#', '') as Layer;
      if (validLayers.includes(newHash)) {
        setLayer(newHash);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("gm_studentClass", studentClass);
    localStorage.setItem("gm_academicYear", academicYear);
  }, [studentClass, academicYear]);

  // Update URL and LocalStorage on Layer change
  const navigate = (newLayer: Layer) => {
    // Admin Guard
    if (newLayer === 'setup' && !isAdmin) {
      setLayer('login');
      window.history.pushState({ layer: 'login' }, '', '#login');
      localStorage.setItem("gm_layer", 'login');
      return;
    }

    setLayer(newLayer);
    localStorage.setItem("gm_layer", newLayer);
    
    if (window.location.hash.replace('#', '') !== newLayer) {
      window.history.pushState({ layer: newLayer }, '', `#${newLayer}`);
    }
  };

  const logout = () => {
    setIsAdmin(false);
    setAdminUser(null);
    setLayer("home");
    localStorage.removeItem('gm_isAdmin');
    localStorage.removeItem('gm_adminUser');
    localStorage.setItem("gm_layer", "home");
    window.history.pushState({ layer: 'home' }, '', '#home');
  };

  return (
    <GradeMasterContext.Provider value={{
      layer, setLayer: navigate,
      isAdmin, setIsAdmin,
      adminUser, setAdminUser,
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
