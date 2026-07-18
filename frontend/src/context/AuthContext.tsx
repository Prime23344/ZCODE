import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, userApi } from '../services/api';

interface User {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  countryCode: string;
  provider?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string) => Promise<string | null>;
  verifyOtp: (phone: string, code: string) => Promise<boolean>;
  signup: (data: { phone: string; fullName: string; role: string; email?: string }) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('surety_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await userApi.getMe();
      setUser(res.data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('surety_token');
      localStorage.removeItem('surety_user');
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (phone: string): Promise<string | null> => {
    try {
      const res = await authApi.login({ phone });
      return res.data.mockCode || null;
    } catch {
      return null;
    }
  };

  const verifyOtp = async (phone: string, code: string): Promise<boolean> => {
    try {
      const res = await authApi.verifyOtp({ phone, code });
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('surety_token', newToken);
      localStorage.setItem('surety_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return true;
    } catch {
      return false;
    }
  };

  const signup = async (data: { phone: string; fullName: string; role: string; email?: string }): Promise<boolean> => {
    try {
      const res = await authApi.signup(data);
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('surety_token', newToken);
      localStorage.setItem('surety_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('surety_token');
    localStorage.removeItem('surety_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, verifyOtp, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
