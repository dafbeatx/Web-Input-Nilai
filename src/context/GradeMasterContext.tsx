"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  isParent: boolean;
  setIsParent: (isParent: boolean) => void;
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
  isAuthLoading: boolean;
  logout: () => void;
}

const GradeMasterContext = createContext<GradeMasterContextType | undefined>(undefined);

export function GradeMasterProvider({ children }: { children: ReactNode }) {
  const [layer, setLayer] = useState<Layer>("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [studentData, setStudentData] = useState<any | null>(null);
  const [toast, setToast] = useState<ToastType | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [studentClass, setStudentClass] = useState("");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Ref to track roles for the popstate handler to avoid stale closures
  const authStateRef = useRef({ isAdmin, isStudent, isParent });
  useEffect(() => {
    authStateRef.current = { isAdmin, isStudent, isParent };
  }, [isAdmin, isStudent, isParent]);

  // Synchronize authentication and layer state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace('#', '');
    const validLayers: Layer[] = ['home', 'setup', 'dashboard', 'grading', 'remedial', 'behavior', 'remedial_dashboard', 'login', 'attendance', 'student_accounts', 'student_login', 'student_claim', 'teacher_claim', 'lesson_management', 'remedial_management', 'data_center'];

    const savedParent = localStorage.getItem('gm_isParent') === 'true';
    const savedStudentData = localStorage.getItem('gm_studentData');
    const savedClass = localStorage.getItem('gm_studentClass');
    const savedYear = localStorage.getItem('gm_academicYear') || "2025/2026";

    if (savedClass) setStudentClass(savedClass);
    setAcademicYear(savedYear);

    const checkAuthAndRoute = async () => {
      console.log("[AuthInit] checkAuthAndRoute: Starting auth initialization check...");
      let activeAdmin = false;
      let activeStudent = false;
      let activeParent = false;
      let resolvedStudentData: any = null;
      let activeAdminUser: string | null = null;

      if (savedParent) {
        console.log("[AuthInit] Parent mode detected via localStorage");
        activeParent = true;
        setIsParent(true);
        if (savedStudentData) {
          try {
            resolvedStudentData = JSON.parse(savedStudentData);
            setStudentData(resolvedStudentData);
            console.log("[AuthInit] Restored parent's student data:", resolvedStudentData.name);
          } catch (e) {
            console.error("[AuthInit] Failed to parse saved student data:", e);
          }
        }
      } else {
        // Authenticate with Google/Supabase Auth as source of truth
        try {
          console.log("[AuthInit] Waiting for Supabase session initialization...");
          
          // Wait for Supabase to resolve the session with a timeout of 2000ms
          const session = await new Promise<any>(async (resolve) => {
            // Check current session
            const { data: { session: immediateSession } } = await supabase.auth.getSession();
            if (immediateSession) {
              resolve(immediateSession);
              return;
            }

            // Listen for auth state change
            let resolved = false;
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
              if (resolved) return;
              console.log(`[AuthInit Listener] event: ${event}, session: ${!!currentSession}`);
              resolved = true;
              subscription.unsubscribe();
              resolve(currentSession);
            });

            // Timeout fallback
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                subscription.unsubscribe();
                resolve(null);
              }
            }, 2000);
          });

          if (session) {
            console.log("[AuthInit] Client-side Supabase session resolved successfully for email:", session.user?.email);
          } else {
            console.log("[AuthInit] No client-side Supabase session detected yet, checking backend cookies directly...");
          }

          // Helper for retrying fetches
          const fetchWithRetry = async (url: string, retries = 3, delay = 350): Promise<Response> => {
            for (let i = 0; i < retries; i++) {
              try {
                console.log(`[AuthInit Fetch] ${url} (attempt ${i + 1}/${retries})...`);
                const res = await fetch(url);
                if (res.ok) return res;
              } catch (e) {
                console.warn(`[AuthInit Fetch] ${url} failed on attempt ${i + 1}:`, e);
              }
              await new Promise(r => setTimeout(r, delay * (i + 1)));
            }
            return fetch(url);
          };

          // Check student status first
          const studentRes = await fetchWithRetry("/api/student/check");
          const studentCheckData = await studentRes.json();
          console.log("[AuthInit] Student check response:", studentCheckData);

          if (studentCheckData.authenticated) {
            activeStudent = true;
            setIsStudent(true);
            resolvedStudentData = { ...studentCheckData.student, isGoogleLinked: true };
            setStudentData(resolvedStudentData);
            if (resolvedStudentData.class_name) {
              setStudentClass(resolvedStudentData.class_name);
            }
            console.log("[AuthInit] User is authenticated student:", resolvedStudentData.name);
          } else {
            // Fallback to check admin (which also handles unlinked student_google role)
            const adminRes = await fetchWithRetry("/api/admin/check");
            const adminData = await adminRes.json();
            console.log("[AuthInit] Admin check response:", adminData);

            if (adminData.authenticated && adminData.role === 'admin') {
              activeAdmin = true;
              setIsAdmin(true);
              activeAdminUser = adminData.displayName || adminData.username;
              setAdminUser(activeAdminUser);
              console.log("[AuthInit] User is authenticated admin:", activeAdminUser);
            } else if (adminData.authenticated && adminData.role === 'student') {
              activeStudent = true;
              setIsStudent(true);
              resolvedStudentData = adminData.student;
              setStudentData(resolvedStudentData);
              if (resolvedStudentData.class_name) {
                setStudentClass(resolvedStudentData.class_name);
              }
              console.log("[AuthInit] User is authenticated student (via admin/check):", resolvedStudentData.name);
            } else if (adminData.role === 'student_google') {
              activeStudent = true;
              setIsStudent(true);
              resolvedStudentData = {
                name: adminData.username,
                username: adminData.email,
                photo_url: adminData.avatar_url,
                email: adminData.email,
                id: adminData.email,
                isGoogleLinked: false
              };
              setStudentData(resolvedStudentData);
              console.log("[AuthInit] User is unlinked student_google:", adminData.email);
            } else {
              console.log("[AuthInit] User has session but resolved no specific role");
            }
          }
        } catch (err) {
          console.error("[AuthInit] Error during session/auth routing check:", err);
        }
      }

      // Determine initial layer
      let initialLayer: Layer = 'home';
      if (validLayers.includes(hash as Layer) && hash !== 'dashboard') {
        initialLayer = hash as Layer;
      }

      const adminOnlyLayers = ['setup', 'grading', 'student_accounts', 'lesson_management', 'remedial_management', 'data_center'];
      const protectedLayers = ['remedial', 'student_lesson'];
      const authLayers = ['login', 'student_login'];

      if (adminOnlyLayers.includes(initialLayer) && !activeAdmin) {
        initialLayer = 'student_login';
      } else if (protectedLayers.includes(initialLayer) && !activeAdmin && !activeStudent && !activeParent) {
        initialLayer = 'student_login';
      } else if (authLayers.includes(initialLayer) && (activeAdmin || activeStudent || activeParent)) {
        if (activeAdmin) {
          initialLayer = 'home';
        } else if (activeStudent) {
          if (resolvedStudentData && resolvedStudentData.isGoogleLinked === false) {
            initialLayer = 'student_claim';
          } else {
            initialLayer = 'dashboard';
          }
        } else {
          initialLayer = 'dashboard'; // parent
        }
      } else if (initialLayer === 'home' && !activeAdmin && !activeStudent && !activeParent) {
        initialLayer = 'student_login';
      } else if (initialLayer === 'home' && activeStudent) {
        if (resolvedStudentData && resolvedStudentData.isGoogleLinked === false) {
          initialLayer = 'student_claim';
        } else {
          initialLayer = 'dashboard';
        }
      }

      console.log(`[AuthInit] Final resolved initialLayer: ${initialLayer}`);
      setLayer(initialLayer);
      window.history.replaceState({ layer: initialLayer }, '', `#${initialLayer}`);
      setIsAuthLoading(false);
    };

    checkAuthAndRoute();

    // History popstate listener
    const handlePopState = () => {
      const newHash = window.location.hash.replace('#', '') as Layer;
      if (validLayers.includes(newHash)) {
        const adminOnlyLayers = ['setup', 'grading', 'student_accounts', 'lesson_management', 'remedial_management', 'data_center'];
        const protectedLayers = ['remedial', 'student_lesson'];
        const { isAdmin: curAdmin, isStudent: curStudent, isParent: curParent } = authStateRef.current;

        if (adminOnlyLayers.includes(newHash) && !curAdmin) {
          setLayer('student_login');
          window.history.replaceState({ layer: 'student_login' }, '', '#student_login');
        } else if (protectedLayers.includes(newHash) && !curAdmin && !curStudent && !curParent) {
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

  // Sync parent session & configurations to LocalStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("gm_isParent", isParent.toString());
    if (isParent && studentData) {
      localStorage.setItem("gm_studentData", JSON.stringify(studentData));
    } else if (!isStudent) {
      localStorage.removeItem("gm_studentData");
    }

    localStorage.setItem("gm_studentClass", studentClass);
    localStorage.setItem("gm_academicYear", academicYear);
  }, [isParent, isStudent, studentData, studentClass, academicYear]);

  // Navigate and apply Auth guards dynamically
  const navigate = (newLayer: Layer) => {
    const adminOnlyLayers = ['setup', 'grading', 'student_accounts', 'lesson_management', 'remedial_management', 'data_center'];
    const protectedLayers = ['remedial', 'student_lesson'];

    if (adminOnlyLayers.includes(newLayer) && !isAdmin) {
      setLayer('student_login');
      window.history.pushState({ layer: 'student_login' }, '', '#student_login');
      return;
    }

    if (protectedLayers.includes(newLayer) && !isAdmin && !isStudent && !isParent) {
      setLayer('student_login');
      window.history.pushState({ layer: 'student_login' }, '', '#student_login');
      return;
    }

    setLayer(newLayer);
    if (window.location.hash.replace('#', '') !== newLayer) {
      window.history.pushState({ layer: newLayer }, '', `#${newLayer}`);
    }
  };

  const logout = async () => {
    if (isAdmin) {
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
      setIsAdmin(false);
      setAdminUser(null);
    } else if (isStudent || isParent) {
      await fetch('/api/student/logout', { method: 'POST' }).catch(() => {});
      setIsStudent(false);
      setIsParent(false);
      setStudentData(null);
      localStorage.removeItem('gm_isParent');
      localStorage.removeItem('gm_studentData');
    }

    await supabase.auth.signOut();
    setLayer("student_login");
    window.history.pushState({ layer: 'student_login' }, '', '#student_login');
  };

  return (
    <GradeMasterContext.Provider value={{
      layer, setLayer: navigate,
      isAdmin, setIsAdmin,
      adminUser, setAdminUser,
      isStudent, setIsStudent,
      isParent, setIsParent,
      studentData, setStudentData,
      toast, setToast,
      modal, setModal,
      studentClass, setStudentClass,
      academicYear, setAcademicYear,
      isAuthLoading,
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
