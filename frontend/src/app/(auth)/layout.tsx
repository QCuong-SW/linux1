import { Brand } from '@/shared/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-view">
      <div className="auth-card">
        <Brand />
        {children}
        <p className="auth-note">Bản dựng giao diện · Chưa có xác thực tài khoản.</p>
      </div>
    </main>
  );
}
