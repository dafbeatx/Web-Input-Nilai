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

  const lastUserEmailRef = useRef<string | null>(null);
  const hasInitialLoadedRef = useRef(false);

  // Ref to track roles for the popstate handler to avoid stale closures
  const authStateRef = useRef({ isAdmin, isStudent, isParent });
  useEffect(() => {
    authStateRef.current = { isAdmin, isStudent, isParent };
  }, [isAdmin, isStudent, isParent]);

  // Synchronize authentication and layer state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace('#', '');
    const validLayers: Layer[] = [
      'home', 'setup', 'dashboard', 'grading', 'remedial', 'behavior', 
      'remedial_dashboard', 'login', 'attendance', 'student_accounts', 
      'student_login', 'student_claim', 'teacher_claim', 'lesson_management', 
      'remedial_management', 'data_center', 'student_profile', 'student_lesson'
    ];

    const savedClass = localStorage.getItem('gm_studentClass');
    const savedYear = localStorage.getItem('gm_academicYear') || "2025/2026";

    if (savedClass) setStudentClass(savedClass);
    setAcademicYear(savedYear);

    const checkAuthAndRoute = async (currentSession: any) => {
      try {
        console.log("[AuthCheck] checkAuthAndRoute: Resolving role for session:", currentSession?.user?.email || "none");
        
        // 2. Reset all role-related states immediately to prevent carrying over from previous logins
        setIsAdmin(false);
        setAdminUser(null);
        setIsStudent(false);
        setIsParent(false);
        setStudentData(null);

        // If there's an active Google session, clean up any conflicting parent or legacy session data
        if (currentSession && currentSession.user) {
          localStorage.removeItem('gm_isParent');
          localStorage.removeItem('gm_studentData');
          localStorage.removeItem('gm_admin_session');
        }

        const savedParent = localStorage.getItem('gm_isParent') === 'true';
        const savedStudentData = localStorage.getItem('gm_studentData');

        let activeAdmin = false;
        let activeStudent = false;
        let activeParent = false;
        let resolvedStudentData: any = null;
        let activeAdminUser: string | null = null;

        // Helper for retrying fetches with cache bypassing
        const fetchWithRetry = async (url: string, retries = 3, delay = 350): Promise<Response> => {
          for (let i = 0; i < retries; i++) {
            try {
              const urlObj = new URL(url, window.location.origin);
              urlObj.searchParams.set('t', Date.now().toString());
              console.log(`[AuthInit Fetch] ${urlObj.toString()} (attempt ${i + 1}/${retries})...`);
              const res = await fetch(urlObj.toString(), { cache: 'no-store' });
              if (res.ok) return res;
            } catch (e) {
              console.warn(`[AuthInit Fetch] ${url} failed on attempt ${i + 1}:`, e);
            }
            await new Promise(r => setTimeout(r, delay * (i + 1)));
          }
          const finalUrlObj = new URL(url, window.location.origin);
          finalUrlObj.searchParams.set('t', Date.now().toString());
          return fetch(finalUrlObj.toString(), { cache: 'no-store' });
        };

        if (savedParent) {
          console.log("[AuthInit] Parent mode detected via localStorage");
          activeParent = true;
          setIsParent(true);
          setIsAdmin(false);
          setIsStudent(false);
          if (savedStudentData) {
            try {
              resolvedStudentData = JSON.parse(savedStudentData);
              setStudentData(resolvedStudentData);
              console.log("[AuthInit] Restored parent's student data:", resolvedStudentData.name);
            } catch (e) {
              console.error("[AuthInit] Failed to parse saved student data:", e);
            }
          }
        } else if (currentSession && currentSession.user && currentSession.user.email) {
          const email = currentSession.user.email.toLowerCase();
          console.log("[AuthInit] Client-side Supabase session resolved successfully for email:", email);

          const adminDomains = ['@guru.smp.belajar.id', '@guru.belajar.id', '@smp.belajar.id', '@admin.belajar.id'];
          const emailIsAdmin = adminDomains.some(domain => email.endsWith(domain)) || email === 'dafbeatx@gmail.com';

          if (emailIsAdmin) {
            console.log("[AuthInit] Email domain resolved as Admin/Guru");
            activeAdmin = true;
            setIsAdmin(true);
            setIsStudent(false);
            setIsParent(false);

            // Get actual profile metadata from backend
            const adminRes = await fetchWithRetry("/api/admin/check");
            const adminData = await adminRes.json();
            activeAdminUser = adminData.displayName || adminData.username || currentSession.user.user_metadata?.full_name || email;
            setAdminUser(activeAdminUser);
          } else {
            console.log("[AuthInit] Email domain resolved as Student");
            activeStudent = true;
            setIsStudent(true);
            setIsAdmin(false);
            setIsParent(false);

            // Check if they are already bound to a student account
            const studentRes = await fetchWithRetry("/api/student/check");
            const studentData = await studentRes.json();

            if (studentData.authenticated && studentData.role === 'student') {
              resolvedStudentData = { ...studentData.student, isGoogleLinked: true };
              setStudentData(resolvedStudentData);
              if (resolvedStudentData.class_name) {
                setStudentClass(resolvedStudentData.class_name);
              }
            } else {
              // Unlinked Google student
              resolvedStudentData = {
                name: currentSession.user.user_metadata?.full_name || email,
                username: email,
                photo_url: currentSession.user.user_metadata?.avatar_url || '',
                email: email,
                id: email,
                isGoogleLinked: false
              };
              setStudentData(resolvedStudentData);
            }
          }
        } else {
          console.log("[AuthInit] No Supabase session, checking backend cookies for legacy student token...");
          const studentRes = await fetchWithRetry("/api/student/check");
          const studentCheckData = await studentRes.json();

          if (studentCheckData.authenticated) {
            activeStudent = true;
            setIsStudent(true);
            setIsAdmin(false);
            setIsParent(false);
            resolvedStudentData = { ...studentCheckData.student, isGoogleLinked: true };
            setStudentData(resolvedStudentData);
            if (resolvedStudentData.class_name) {
              setStudentClass(resolvedStudentData.class_name);
            }
            console.log("[AuthInit] Legacy student token found:", resolvedStudentData.name);
          } else {
            // No session anywhere, clear all roles
            setIsAdmin(false);
            setAdminUser(null);
            setIsStudent(false);
            setIsParent(false);
            setStudentData(null);
          }
        }

        // Determine initial layer
        let initialLayer: Layer = 'student_login';
        if (validLayers.includes(hash as Layer)) {
          initialLayer = hash as Layer;
        }

        const adminOnlyLayers = ['setup', 'dashboard', 'grading', 'student_accounts', 'lesson_management', 'remedial_management', 'data_center'];
        const protectedLayers = ['remedial', 'student_lesson', 'student_profile'];
        const authLayers = ['login', 'student_login'];

        if (activeAdmin) {
          if (authLayers.includes(initialLayer) || initialLayer === 'student_claim') {
            initialLayer = 'home';
          }
        } else if (activeStudent) {
          if (resolvedStudentData && resolvedStudentData.isGoogleLinked === false) {
            initialLayer = 'student_claim';
          } else {
            if (adminOnlyLayers.includes(initialLayer) || authLayers.includes(initialLayer) || initialLayer === 'home') {
              initialLayer = 'student_profile';
            }
          }
        } else if (activeParent) {
          if (adminOnlyLayers.includes(initialLayer) || authLayers.includes(initialLayer) || initialLayer === 'home') {
            initialLayer = 'student_profile';
          }
        } else {
          if (adminOnlyLayers.includes(initialLayer) || protectedLayers.includes(initialLayer) || initialLayer === 'home' || initialLayer === 'student_claim') {
            initialLayer = 'student_login';
          }
        }

        console.log(`[AuthInit] Final resolved initialLayer: ${initialLayer}`);
        lastUserEmailRef.current = currentSession?.user?.email || null;
        hasInitialLoadedRef.current = true;
        setLayer(initialLayer);
        window.history.replaceState({ layer: initialLayer }, '', `#${initialLayer}`);
      } catch (err) {
        console.error("[AuthInit] Error during checkAuthAndRoute, fallback to student_login:", err);
        setIsAdmin(false);
        setAdminUser(null);
        setIsStudent(false);
        setIsParent(false);
        setStudentData(null);
        lastUserEmailRef.current = null;
        hasInitialLoadedRef.current = true;
        setLayer("student_login");
        window.history.replaceState({ layer: 'student_login' }, '', '#student_login');
      } finally {
        setIsAuthLoading(false);
      }
    };

    // Listen to Supabase Auth state changes globally
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Global Auth Change] Event: ${event}, Session: ${!!session}`);
      
      const currentEmail = session?.user?.email || null;

      if (event === 'SIGNED_OUT') {
        lastUserEmailRef.current = null;
        hasInitialLoadedRef.current = true;
        // Reset all states immediately on sign out
        setIsAdmin(false);
        setAdminUser(null);
        setIsStudent(false);
        setIsParent(false);
        setStudentData(null);
        setLayer("student_login");
        window.history.replaceState({ layer: 'student_login' }, '', '#student_login');
        setIsAuthLoading(false);
      } else {
        // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION
        if (hasInitialLoadedRef.current && currentEmail === lastUserEmailRef.current) {
          console.log(`[Global Auth Change] Skipping redundant check for same user: ${currentEmail}`);
          return;
        }
        
        setIsAuthLoading(true);
        await checkAuthAndRoute(session);
      }
    });

    // History popstate listener
    const handlePopState = () => {
      const newHash = window.location.hash.replace('#', '') as Layer;
      if (validLayers.includes(newHash)) {
        const adminOnlyLayers = ['setup', 'dashboard', 'grading', 'student_accounts', 'lesson_management', 'remedial_management', 'data_center'];
        const protectedLayers = ['remedial', 'student_lesson', 'student_profile'];
        const authLayers = ['login', 'student_login'];
        const { isAdmin: curAdmin, isStudent: curStudent, isParent: curParent } = authStateRef.current;

        if (adminOnlyLayers.includes(newHash) && !curAdmin) {
          setLayer('student_login');
          window.history.replaceState({ layer: 'student_login' }, '', '#student_login');
        } else if (protectedLayers.includes(newHash) && !curAdmin && !curStudent && !curParent) {
          setLayer('student_login');
          window.history.replaceState({ layer: 'student_login' }, '', '#student_login');
        } else if (authLayers.includes(newHash) && (curAdmin || curStudent || curParent)) {
          const redirectTarget = curAdmin ? 'home' : 'student_profile';
          setLayer(redirectTarget);
          window.history.replaceState({ layer: redirectTarget }, '', `#${redirectTarget}`);
        } else {
          setLayer(newHash);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
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
    const adminOnlyLayers = ['setup', 'dashboard', 'grading', 'student_accounts', 'lesson_management', 'remedial_management', 'data_center'];
    const protectedLayers = ['remedial', 'student_lesson', 'student_profile'];
    const authLayers = ['login', 'student_login'];

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

    if (authLayers.includes(newLayer) && (isAdmin || isStudent || isParent)) {
      const redirectTarget = isAdmin ? 'home' : 'student_profile';
      setLayer(redirectTarget);
      window.history.pushState({ layer: redirectTarget }, '', `#${redirectTarget}`);
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
    } else if (isStudent || isParent) {
      await fetch('/api/student/logout', { method: 'POST' }).catch(() => {});
    }

    await supabase.auth.signOut();

    setIsAdmin(false);
    setAdminUser(null);
    setIsStudent(false);
    setIsParent(false);
    setStudentData(null);

    localStorage.removeItem('gm_isParent');
    localStorage.removeItem('gm_studentData');
    localStorage.removeItem('gm_admin_session');
    localStorage.removeItem('gm_sessionId');
    localStorage.removeItem('gm_sessionName');
    localStorage.removeItem('gm_sessionPassword');
    localStorage.removeItem('gm_isPublicView');
    localStorage.setItem('gm_remember_me', 'false'); // Force disable remember me status on logout

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
