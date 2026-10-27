/**
 * Стейт авторизации через React Context.
 */
import React, { createContext, useContext, useState } from 'react';
import type { User } from '@mintkitchen/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('mk_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('mk_token')
  );

  const setAuth = (u: User, t: string) => {
    localStorage.setItem('mk_token', t);
    localStorage.setItem('mk_user', JSON.stringify(u));
    setUser(u);
    setToken(t);
  };

  const updateUser = (u: User) => {
    localStorage.setItem('mk_user', JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('mk_token');
    localStorage.removeItem('mk_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, setAuth, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
