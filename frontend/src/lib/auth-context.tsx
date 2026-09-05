'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api-client';
import { UserSummary, Role } from '@helpdesk/shared';

interface AuthContextType {
  user: UserSummary | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserSummary>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserSummary | null>;
  hasRole: (roles: Role | Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async (): Promise<UserSummary | null> => {
    try {
      const userData = await apiClient.get<UserSummary>('/auth/me');
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<UserSummary> => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<{ accessToken: string; user: UserSummary }>(
        '/auth/login',
        { email, password },
      );
      if (typeof window !== 'undefined' && res.accessToken) {
        localStorage.setItem('helpdesk_token', res.accessToken);
      }
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Proceed with local logout regardless
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('helpdesk_token');
      }
      setUser(null);
      router.push('/login');
    }
  };

  const hasRole = (roles: Role | Role[]): boolean => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
