import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearAuth, getStoredUser, saveUser, setAuthData } from './api';
import type { AuthResponse, User } from './types';

interface AuthCtx {
  user: User | null;
  signIn: (data: AuthResponse) => void;
  signOut: () => void;
  updateUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  const signIn = useCallback((data: AuthResponse) => {
    setAuthData(data.token, data.user);
    setUser(data.user);
  }, []);

  const signOut = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const updateUser = useCallback((u: User) => {
    saveUser(u);
    setUser(u);
  }, []);

  // The API client fires this when a token expires
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('vs:logout', onLogout);
    return () => window.removeEventListener('vs:logout', onLogout);
  }, []);

  // Refresh the stored profile once per load so it never goes stale
  useEffect(() => {
    if (!getStoredUser()) return;
    api.get<User>('/users/me').then(updateUser).catch(() => {});
  }, [updateUser]);

  return <Ctx.Provider value={{ user, signIn, signOut, updateUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Same as useAuth but guarantees a signed-in user (use inside protected routes) */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('No signed-in user');
  return user;
}
