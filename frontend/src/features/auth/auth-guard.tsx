'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

export function AuthGuard({
  children,
  workspace = false,
}: {
  children: React.ReactNode;
  workspace?: boolean;
}) {
  const { session, loading, error, retry } = useAuth();
  const router = useRouter();
  const allowed = workspace ? Boolean(session) : !session;
  useEffect(() => {
    if (!loading && !error && !allowed) router.replace(workspace ? '/login' : '/dashboard');
  }, [allowed, loading, error, router, workspace]);
  if (error)
    return (
      <div className="session-loading">
        <p className="field-error" role="alert">
          {error}
        </p>
        <button className="secondary-button" onClick={() => void retry()}>
          Thử lại
        </button>
      </div>
    );
  if (loading || !allowed)
    return (
      <div className="session-loading" role="status">
        {loading ? 'Đang kiểm tra phiên đăng nhập…' : 'Đang chuyển trang…'}
      </div>
    );
  return children;
}
