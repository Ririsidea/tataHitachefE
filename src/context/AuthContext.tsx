import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { login as apiLogin, getMe, TOKEN_STORAGE_KEY } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  checking: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // On load/refresh, a stored token is verified against the backend before the
  // app is shown, rather than trusting whatever is sitting in localStorage.
  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!token) {
        setChecking(false);
        return;
      }
      try {
        const res = await getMe();
        if (!cancelled) setUser(res.data);
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  useEffect(() => {
    window.addEventListener('auth:unauthorized', logout);
    return () => window.removeEventListener('auth:unauthorized', logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  // Re-fetches the current user so the header/dashboard reflect a profile change
  // (e.g. a saved phone number) without needing a full page reload.
  const refreshUser = useCallback(async () => {
    const res = await getMe();
    setUser(res.data);
    return res.data;
  }, []);

  const value = { user, token, checking, login, logout, refreshUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
