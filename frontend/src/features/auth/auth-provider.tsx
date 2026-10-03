'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ApiError, SESSION_EXPIRED_EVENT } from '@/shared/lib/api';
import { authApi, type User } from './auth-api';

const AuthContext = createContext<{
  session: User | null;
  loading: boolean;
  error: string;
  expired: boolean;
  retry: () => Promise<void>;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const generation = useRef(0);
  const retry = useCallback(async () => {
    const version = ++generation.current;
    try {
      const user = await authApi.me();
      if (version === generation.current) {
        setSession(user);
        setError('');
      }
    } catch (caught) {
      if (version !== generation.current) return;
      if (caught instanceof ApiError && caught.status === 401) setSession(null);
      else
        setError(caught instanceof Error ? caught.message : 'Không kiểm tra được phiên đăng nhập.');
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    function invalidate() {
      generation.current++;
      setSession(null);
      setExpired(true);
      setLoading(false);
      setError('');
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, invalidate);
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void retry();
    });
    const requests = generation;
    return () => {
      cancelled = true;
      requests.current++;
      window.removeEventListener(SESSION_EXPIRED_EVENT, invalidate);
    };
  }, [retry]);
  function retryWithLoading() {
    setLoading(true);
    setError('');
    return retry();
  }
  function signIn(user: User) {
    generation.current++;
    setSession(user);
    setExpired(false);
    setError('');
    setLoading(false);
  }
  async function signOut() {
    await authApi.logout();
    generation.current++;
    setSession(null);
    setExpired(false);
    setError('');
    setLoading(false);
  }
  return (
    <AuthContext.Provider
      value={{ session, loading, error, expired, retry: retryWithLoading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}
