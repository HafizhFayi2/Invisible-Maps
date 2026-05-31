import React, { createContext, useContext, useEffect, useState } from 'react';

// ─── Type Definitions ──────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  username: string;
  created_at: string;
  updated_at?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (userData: AppUser) => void;
  logout: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

// ─── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on boot
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as AppUser);
      } catch (e) {
        console.error('[AuthContext] Failed to parse saved user session:', e);
        localStorage.removeItem('app_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: AppUser) => {
    setUser(userData);
    localStorage.setItem('app_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
