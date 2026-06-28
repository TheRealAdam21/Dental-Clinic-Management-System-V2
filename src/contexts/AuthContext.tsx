
import React, { createContext, useContext, useEffect, useState } from 'react';
import { sensitiveStore, SENSITIVE_KEYS } from '@/lib/sensitiveStore';
import { pullDentistsFromSupabase, findDentistForLogin } from '@/lib/authService';

interface LocalUser {
  id: string;
  email: string;
  role: 'admin' | 'dentist';
  dentist_id?: string;
  user_metadata?: {
    first_name?: string;
  };
}

interface LocalSession {
  user: LocalUser;
}

interface AuthContextType {
  user: LocalUser | null;
  session: LocalSession | null;
  userRole: 'admin' | 'dentist' | null;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOCAL_AUTH_KEY = 'toothtime.local.auth';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Adam1472468921';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'dentist' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const raw = localStorage.getItem(LOCAL_AUTH_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LocalSession;
          setSession(parsed);
          setUser(parsed.user);
          setUserRole(parsed.user.role);
        }
      } catch (_error) {
        localStorage.removeItem(LOCAL_AUTH_KEY);
      }

      try {
        await pullDentistsFromSupabase();
      } catch (error) {
        console.error('Failed to preload dentists:', error);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      let userData: LocalUser | null = null;

      if (normalizedEmail === ADMIN_USERNAME && normalizedPassword === ADMIN_PASSWORD) {
        userData = {
          id: 'local-admin-user',
          email: ADMIN_USERNAME,
          role: 'admin',
          user_metadata: { first_name: 'Admin' }
        };
      } else {
        const dentist = await findDentistForLogin(normalizedEmail);
        if (!dentist || dentist.password !== normalizedPassword) {
          return { error: { message: 'Invalid username or password' } };
        }
        userData = {
          id: dentist.id,
          dentist_id: dentist.id,
          email: dentist.username,
          role: 'dentist',
          user_metadata: { first_name: dentist.first_name }
        };
      }

      const localSession: LocalSession = { user: userData };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localSession));
      sensitiveStore.set(SENSITIVE_KEYS.AUTH_PASSWORD, normalizedPassword);
      setSession(localSession);
      setUser(userData);
      setUserRole(userData.role);
      return { error: null };
    } catch (error) {
      return { error: { message: 'Invalid username or password' } };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_AUTH_KEY);
    sensitiveStore.delete(SENSITIVE_KEYS.AUTH_PASSWORD);
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!user) return false;

    const normalizedPassword = password.trim();
    if (!normalizedPassword) return false;

    if (user.role === 'admin') {
      return normalizedPassword === ADMIN_PASSWORD;
    }

    const dentist = await findDentistForLogin(user.email?.toLowerCase() ?? '');
    return !!dentist && dentist.password === normalizedPassword;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      signIn,
      signOut,
      verifyPassword,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
