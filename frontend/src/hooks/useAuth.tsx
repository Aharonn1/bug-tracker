import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AuthUser, LoginRequest, RegisterRequest } from '../types/auth.types';
import { authService } from '../api/authService';
import { AUTH_TOKEN_STORAGE_KEY } from '../config';

const AUTH_USER_STORAGE_KEY = 'bugtracker.authUser';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
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

  const persistSession = (token: string, authUser: AuthUser) => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const login = useCallback(async (dto: LoginRequest) => {
    setLoading(true);
    setError(null);
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

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth חייב לפעול בתוך AuthProvider');
  return ctx;
}
