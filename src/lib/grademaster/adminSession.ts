export interface AdminSession {
  isAdmin: boolean;
  adminUser: string;
  loginTime: number;
}

const STORAGE_KEY = 'gm_admin_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function saveAdminSession(user: string): void {
  if (typeof window === 'undefined') return;
  
  const session: AdminSession = {
    isAdmin: true,
    adminUser: user,
    loginTime: Date.now()
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  
  try {
    const session: AdminSession = JSON.parse(raw);
    
    // Check if session has expired
    if (Date.now() - session.loginTime > SESSION_EXPIRY_MS) {
      clearAdminSession();
      return null;
    }
    
    return session;
  } catch (e) {
    clearAdminSession();
    return null;
  }
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
