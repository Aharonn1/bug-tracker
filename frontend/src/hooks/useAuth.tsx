import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AuthUser, LoginRequest, RegisterRequest } from '../types/auth.types';
import { authService } from '../api/authService';
import { AUTH_TOKEN_STORAGE_KEY } from '../config';
import { SESSION_EXPIRED_EVENT } from '../api/sessionGuard';

const AUTH_USER_STORAGE_KEY = 'bugtracker.authUser';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  sessionExpiredMessage: string | null;
  login: (dto: LoginRequest) => Promise<void>;
  register: (dto: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const persistSession = (token: string, authUser: AuthUser) => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setUser(null);
  }, []);

  // כל שירות API (חוץ מ-login/register) משדר את האירוע הזה כשמקבל 401 -
  // מנתק אוטומטית בחזרה למסך login במקום להשאיר את המשתמש מול שגיאות
  // מבלבלות על כל פעולה שהוא מנסה
  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
      setSessionExpiredMessage('ההתחברות שלך פגה - אנא התחבר/י מחדש');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [logout]);

  const login = useCallback(async (dto: LoginRequest) => {
    setLoading(true);
    setError(null);
    setSessionExpiredMessage(null);
    try {
      const response = await authService.login(dto);
      persistSession(response.token, response.user);
    } catch (err: any) {
      setError(err.message || 'אימייל או סיסמה שגויים');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (dto: RegisterRequest) => {
    setLoading(true);
    setError(null);
    setSessionExpiredMessage(null);
    try {
      const response = await authService.register(dto);
      persistSession(response.token, response.user);
    } catch (err: any) {
      setError(err.message || 'כשל בהרשמה למערכת');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, sessionExpiredMessage, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth חייב לפעול בתוך AuthProvider');
  return ctx;
}
