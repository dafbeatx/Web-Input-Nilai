"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Layer, ToastType, ModalType } from '@/lib/grademaster/types';
import { supabase } from '@/lib/supabase/client';
import { type Session } from '@supabase/supabase-js';

interface StudentData {
  name?: string;
  username?: string;
  photo_url?: string;
  avatar_url?: string;
  email?: string;
  id?: string;
  class_name?: string;
  isGoogleLinked?: boolean;
  behavior_id?: string;
  student_id?: string;
  total_points?: number;
  streak?: number;
  study_streak?: number;
  last_active_date?: string;
  academic_year?: string;
  [key: string]: unknown;
}

const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      console.warn(`[SafeStorage] Failed to getItem ${key}:`, e);
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] Failed to setItem ${key}:`, e);
    }
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Failed to removeItem ${key}:`, e);
    }
  }
};


interface GradeMasterContextType {
  layer: Layer;
  setLayer: (layer: Layer, bypassGuards?: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  adminUser: string | null;
  setAdminUser: (name: string | null) => void;
  isStudent: boolean;
  setIsStudent: (isStudent: boolean) => void;
  isParent: boolean;
  setIsParent: (isParent: boolean) => void;
  studentData: StudentData | null;
  setStudentData: (data: StudentData | null) => void;
  toast: ToastType | null;
  setToast: (toast: ToastType | null) => void;
  modal: ModalType;
  setModal: (modal: ModalType) => void;
  studentClass: string;
  setStudentClass: (className: string) => void;
  academicYear: string;
  setAcademicYear: (year: string) => void;
  isAuthLoading: boolean;
  refetchAuth: () => Promise<void>;
  skipAuthLoading: () => void;
  logout: () => void;
}

const GradeMasterContext = createContext<GradeMasterContextType | undefined>(undefined);

export function GradeMasterProvider({ children }: { children: ReactNode }) {
  const [layer, setLayer] = useState<Layer>("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [toast, setToast] = useState<ToastType | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [studentClass, setStudentClass] = useState("");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const lastUserEmailRef = useRef<string | null>(null);
  const hasInitialLoadedRef = useRef(false);
  const activeCheckIdRef = useRef(0);
  const checkAuthAndRouteRef = useRef<((session: Session | null) => Promise<void>) | null>(null);

  // Ref to track roles for the popstate handler to avoid stale closures
  const authStateRef = useRef({ isAdmin, isStudent, isParent });
  useEffect(() => {
    authStateRef.current = { isAdmin, isStudent, isParent };
  }, [isAdmin, isStudent, isParent]);

  // Synchronize authentication and layer state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isUnmounted = false;
    let activeSubscription: { unsubscribe: () => void } | null = null;

    const hash = window.location.hash.replace('#', '');
    const validLayers: Layer[] = [
      'home', 'setup', 'dashboard', 'grading', 'remedial', 'behavior', 
      'remedial_dashboard', 'login', 'attendance', 'student_accounts', 
      'student_login', 'student_claim', 'teacher_claim', 'lesson_management', 
      'remedial_management', 'data_center', 'student_profile', 'student_lesson'
    ];

    const savedClass = safeLocalStorage.getItem('gm_studentClass');
    const savedYear = safeLocalStorage.getItem('gm_academicYear') || "2025/2026";

    queueMicrotask(() => {
      if (savedClass) setStudentClass(savedClass);
      setAcademicYear(savedYear);
    });

    const checkAuthAndRoute = async (currentSession: Session | null) => {
      activeCheckIdRef.current += 1;
      const checkId = activeCheckIdRef.current;

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('dev') === 'admin') {
          setIsAdmin(true);
          setAdminUser("Dev Admin");
          setIsStudent(false);
          setIsParent(false);
          setLayer("home");
          setIsAuthLoading(false);
          return;
        }
      }

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
          safeLocalStorage.removeItem('gm_isParent');
          safeLocalStorage.removeItem('gm_studentData');
          safeLocalStorage.removeItem('gm_admin_session');
        }

        const savedParent = safeLocalStorage.getItem('gm_isParent') === 'true';
        const savedStudentData = safeLocalStorage.getItem('gm_studentData');

        let activeAdmin = false;
        let activeStudent = false;
        let activeParent = false;
        let resolvedStudentData: StudentData | null = null;
        let activeAdminUser: string | null = null;

        // Helper for retrying fetches with cache bypassing and signal timeout (fast fail for auth bootstrap)
        const fetchWithRetry = async (url: string, retries = 1, delay = 250): Promise<Response> => {
          for (let i = 0; i < retries; i++) {
            try {
              const urlObj = new URL(url, window.location.origin);
              urlObj.searchParams.set('t', Date.now().toString());
              console.log(`[AuthInit Fetch] ${urlObj.toString()} (attempt ${i + 1}/${retries + 1})...`);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2500);
              const res = await fetch(urlObj.toString(), { cache: 'no-store', signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) return res;
            } catch (e) {
              console.warn(`[AuthInit Fetch] ${url} failed on attempt ${i + 1}:`, e);
            }
            await new Promise(r => setTimeout(r, delay * (i + 1)));
          }
          const finalUrlObj = new URL(url, window.location.origin);
          finalUrlObj.searchParams.set('t', Date.now().toString());
          const finalController = new AbortController();
          const finalTimeoutId = setTimeout(() => finalController.abort(), 2500);
          try {
            const res = await fetch(finalUrlObj.toString(), { cache: 'no-store', signal: finalController.signal });
            clearTimeout(finalTimeoutId);
            return res;
          } catch (e) {
            clearTimeout(finalTimeoutId);
            throw e;
          }
        };

        if (savedParent) {
          console.log("[AuthInit] Parent mode detected via localStorage");
          let parsedStudentData: StudentData | null = null;
          if (savedStudentData) {
            try {
              parsedStudentData = JSON.parse(savedStudentData) as StudentData;
            } catch (e) {
              console.error("[AuthInit] Failed to parse saved student data:", e);
            }
          }
          if (parsedStudentData) {
            activeParent = true;
            setIsParent(true);
            setIsAdmin(false);
            setIsStudent(false);
            resolvedStudentData = parsedStudentData;
            setStudentData(resolvedStudentData);
            console.log("[AuthInit] Restored parent's student data:", resolvedStudentData.name);
          } else {
            console.warn("[AuthInit] Parent mode detected but studentData is missing or invalid. Cleared parent session.");
            safeLocalStorage.removeItem('gm_isParent');
            safeLocalStorage.removeItem('gm_studentData');
            activeParent = false;
            setIsParent(false);
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
            if (checkId !== activeCheckIdRef.current) {
              console.log(`[AuthCheck] checkId ${checkId} superseded. Aborting admin profile load.`);
              return;
            }
            const adminData = await adminRes.json();
            if (checkId !== activeCheckIdRef.current) return;
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
            if (checkId !== activeCheckIdRef.current) {
              console.log(`[AuthCheck] checkId ${checkId} superseded. Aborting student profile load.`);
              return;
            }
            const studentData = await studentRes.json();
            if (checkId !== activeCheckIdRef.current) return;

            if (studentData.authenticated && studentData.role === 'student') {
              resolvedStudentData = { ...studentData.student, isGoogleLinked: true };
              setStudentData(resolvedStudentData);
              if (resolvedStudentData && resolvedStudentData.class_name) {
                setStudentClass(resolvedStudentData.class_name);
              }
            } else {
              // Unlinked Google student
              resolvedStudentData = {
                name: String(currentSession.user.user_metadata?.full_name || email),
                username: email,
                photo_url: String(currentSession.user.user_metadata?.avatar_url || ''),
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
          if (checkId !== activeCheckIdRef.current) {
            console.log(`[AuthCheck] checkId ${checkId} superseded. Aborting legacy student check.`);
            return;
          }
          const studentCheckData = await studentRes.json();
          if (checkId !== activeCheckIdRef.current) return;

          if (studentCheckData.authenticated) {
            activeStudent = true;
            setIsStudent(true);
            setIsAdmin(false);
            setIsParent(false);
            resolvedStudentData = { ...studentCheckData.student, isGoogleLinked: true };
            setStudentData(resolvedStudentData);
            if (resolvedStudentData && resolvedStudentData.class_name) {
              setStudentClass(resolvedStudentData.class_name);
            }
            console.log("[AuthInit] Legacy student token found:", resolvedStudentData?.name);
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
          safeLocalStorage.removeItem('gm_remedial_session');
          if (authLayers.includes(initialLayer) || initialLayer === 'student_claim' || initialLayer === 'remedial') {
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

        if (checkId !== activeCheckIdRef.current) {
          console.log(`[AuthCheck] checkId ${checkId} superseded right before route application.`);
          return;
        }

        console.log(`[AuthInit] Final resolved initialLayer: ${initialLayer}`);
        lastUserEmailRef.current = currentSession?.user?.email || null;
        hasInitialLoadedRef.current = true;
        setLayer(initialLayer);
        window.history.replaceState({ layer: initialLayer }, '', `#${initialLayer}`);
      } catch (err) {
        if (checkId !== activeCheckIdRef.current) return;
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
        if (checkId === activeCheckIdRef.current) {
          setIsAuthLoading(false);
        }
      }
    };
    checkAuthAndRouteRef.current = checkAuthAndRoute;

    const handleAuthStateChange = async (event: string, session: Session | null) => {
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
        
        // Only set isAuthLoading to true if initial bootstrap hasn't finished yet.
        // Post-mount background auth events (token refresh, user update) execute silently.
        if (!hasInitialLoadedRef.current) {
          setIsAuthLoading(true);
        }
        await checkAuthAndRoute(session);
      }
    };

    const initAuth = async () => {
      try {
        // 1. Subscribe to auth changes FIRST so we do not miss any initial SIGNED_IN events
        // that trigger while the browser is loading/parsing cookies in the background.
        try {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            handleAuthStateChange(event, session).catch(err => {
              console.error("[AuthInit] Error in auth state change handler:", err);
            });
          });
          activeSubscription = subscription;
        } catch (subErr) {
          console.error("[AuthInit] Failed to subscribe to auth changes:", subErr);
        }

        // 2. Query initial session with 2.5s timeout guard to prevent SDK hangs
        let session: Session | null = null;
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 2500)
          );
          const res = await Promise.race([sessionPromise, timeoutPromise]);
          session = res.data?.session || null;
        } catch (err) {
          console.error("[AuthInit] supabase.auth.getSession() failed:", err);
        }
        
        if (isUnmounted) return;
        
        // 3. Only run the initial check if onAuthStateChange hasn't already handled a valid session
        if (!hasInitialLoadedRef.current) {
          await checkAuthAndRoute(session);
        }
      } catch (err) {
        console.error("[AuthInit] Critical error in initAuth:", err);
        if (!isUnmounted && !hasInitialLoadedRef.current) {
          await checkAuthAndRoute(null);
        }
      }
    };

    // Safety timeout guard: Guarantee isAuthLoading resolves within 4.5 seconds
    const safetyTimeout = setTimeout(() => {
      if (!isUnmounted && !hasInitialLoadedRef.current) {
        console.warn("[AuthInit] Global auth check timed out after 4.5s. Forcing fallback to unauthenticated state.");
        hasInitialLoadedRef.current = true;
        setIsAdmin(false);
        setAdminUser(null);
        setIsStudent(false);
        setIsParent(false);
        setStudentData(null);
        setIsAuthLoading(false);
      }
    }, 4500);

    initAuth();

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
      isUnmounted = true;
      clearTimeout(safetyTimeout);
      if (activeSubscription) {
        activeSubscription.unsubscribe();
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);


  // Sync parent session & configurations to LocalStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    safeLocalStorage.setItem("gm_isParent", isParent.toString());
    if (isParent && studentData) {
      safeLocalStorage.setItem("gm_studentData", JSON.stringify(studentData));
    } else if (!isStudent) {
      safeLocalStorage.removeItem("gm_studentData");
    }

    safeLocalStorage.setItem("gm_studentClass", studentClass);
    safeLocalStorage.setItem("gm_academicYear", academicYear);
  }, [isParent, isStudent, studentData, studentClass, academicYear]);

  // Navigate and apply Auth guards dynamically
  const navigate = (newLayer: Layer, bypassGuards: boolean = false) => {
    const adminOnlyLayers = ['setup', 'dashboard', 'grading', 'student_accounts', 'lesson_management', 'remedial_management', 'data_center'];
    const protectedLayers = ['remedial', 'student_lesson', 'student_profile'];
    const authLayers = ['login', 'student_login'];

    if (!bypassGuards) {
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

    // Hapus cookie orang tua / parent jika ada
    document.cookie = "gm_parent_student=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict";

    await supabase.auth.signOut();

    setIsAdmin(false);
    setAdminUser(null);
    setIsStudent(false);
    setIsParent(false);
    setStudentData(null);
    setStudentClass("");

    safeLocalStorage.removeItem('gm_isParent');
    safeLocalStorage.removeItem('gm_studentData');
    safeLocalStorage.removeItem('gm_admin_session');
    safeLocalStorage.removeItem('gm_sessionId');
    safeLocalStorage.removeItem('gm_sessionName');
    safeLocalStorage.removeItem('gm_sessionPassword');
    safeLocalStorage.removeItem('gm_isPublicView');
    safeLocalStorage.removeItem('gm_studentClass');
    safeLocalStorage.removeItem('gm_remedial_session');
    safeLocalStorage.setItem('gm_remember_me', 'false'); // Force disable remember me status on logout

    setLayer("student_login");
    window.history.pushState({ layer: 'student_login' }, '', '#student_login');
  };

  const refetchAuth = async () => {
    try {
      hasInitialLoadedRef.current = false;
      lastUserEmailRef.current = null;
      const res = await supabase.auth.getSession();
      const session = res.data?.session || null;
      if (checkAuthAndRouteRef.current) {
        await checkAuthAndRouteRef.current(session);
      }
    } catch (e) {
      console.error("[RefetchAuth] Failed to refetch session:", e);
    }
  };

  const skipAuthLoading = () => {
    console.warn("[AuthInit] User manually bypassed auth loading screen.");
    hasInitialLoadedRef.current = true;
    setIsAuthLoading(false);
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
      refetchAuth,
      skipAuthLoading,
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
