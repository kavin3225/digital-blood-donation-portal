import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, RoleType } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<any>;
  loginWithGoogle: (credential: string) => Promise<any>;
  registerWithPassword: (data: Record<string, any>) => Promise<any>;
  updateProfile: (profileData: any) => Promise<any>;
  updateRolePreference: (newRole: RoleType) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  pendingReviewNotice: string | null;
  setPendingReviewNotice: (msg: string | null) => void;
  blockedNotice: string | null;
  setBlockedNotice: (msg: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingReviewNotice, setPendingReviewNotice] = useState<string | null>(null);
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const loginWithPassword = async (email: string, password: string) => {
    const res = await api.loginWithPassword({ email, password });
    if (res.success && res.user) setUser(res.user);
    return res;
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await api.loginWithGoogle(credential);
    if (res.success && res.user) setUser(res.user);
    return res;
  };

  const registerWithPassword = async (data: Record<string, any>) => {
    const res = await api.registerWithPassword(data);
    if (res.success && res.user) setUser(res.user);
    return res;
  };

  const updateProfile = async (profileData: any) => {
    setLoading(true);
    try {
      const res = await api.updateProfile(profileData);
      if (res.success && res.user) {
        setUser(res.user);
        return res;
      }
    } finally {
      setLoading(false);
    }
  };

  const updateRolePreference = async (newRole: RoleType) => {
    const res = await api.updatePortalRole(newRole);
    if (res.success && res.user) setUser(res.user);
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithPassword,
        loginWithGoogle,
        registerWithPassword,
        updateProfile,
        updateRolePreference,
        logout,
        refreshUser: fetchCurrentUser,
        pendingReviewNotice,
        setPendingReviewNotice,
        blockedNotice,
        setBlockedNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
