import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default function LoginPage() {
  return (
    <>
      <h1>Chào mừng trở lại</h1>
      <p className="muted">Một nơi gọn gàng cho project và task của bạn.</p>
      <div className="auth-placeholder">
        <span className="flow-label">Flow 02 · Đăng nhập</span>
        <p>Form đăng nhập sẽ được triển khai trong flow tiếp theo.</p>
      </div>
      <p className="auth-switch">
        Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
      </p>
      <Link className="back-link" href="/dashboard">
        ← Xem workspace demo
      </Link>
    </>
  );
}
