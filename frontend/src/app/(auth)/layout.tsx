import { AuthGuard } from '@/features/auth/auth-guard';
import { Brand } from '@/shared/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <main className="auth-view">
        <div className="auth-card">
          <Brand />
          {children}
          <p className="auth-note">MiniFlow · Phiên demo trong bộ nhớ.</p>
        </div>
      </main>
    </AuthGuard>
  );
}
