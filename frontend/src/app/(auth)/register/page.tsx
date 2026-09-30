import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Đăng ký' };

export default function RegisterPage() {
  return (
    <>
      <h1>Bắt đầu với MiniFlow</h1>
      <p className="muted">Một góc nhỏ để sắp xếp công việc của bạn.</p>
      <div className="auth-placeholder">
        <span className="flow-label">Flow 02 · Đăng ký</span>
        <p>Form tạo tài khoản sẽ được triển khai trong flow tiếp theo.</p>
      </div>
      <p className="auth-switch">
        Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
      </p>
      <Link className="back-link" href="/dashboard">
        ← Xem workspace demo
      </Link>
    </>
  );
}
