'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { Brand } from './brand';

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: '◫' },
  { href: '/projects', label: 'Projects', icon: '▤' },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  async function logout() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await signOut();
      router.replace('/login');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Đăng xuất chưa thành công. Vui lòng thử lại.',
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const isProjectDetail = pathname.startsWith('/projects/');
  const section = pathname === '/dashboard' ? 'Dashboard' : 'Projects';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <aside className="sidebar">
        <Brand />
        <p className="workspace-label">WORKSPACE CỦA BẠN</p>
        <nav className="workspace-nav" aria-label="Điều hướng chính">
          {navigation.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar" aria-hidden="true">
              M
            </span>
            <div>
              <strong>{session?.email}</strong>
              <span>Tài khoản của bạn</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <nav className="breadcrumb" aria-label="Vị trí hiện tại">
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            {isProjectDetail ? (
              <>
                <Link href="/projects">Projects</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">Chi tiết Project</span>
              </>
            ) : (
              <span aria-current="page">{section}</span>
            )}
          </nav>
          <button className="logout-button" disabled={pending} onClick={() => void logout()}>
            {pending ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </button>
        </header>
        <main id="main-content" tabIndex={-1}>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {children}
        </main>
        <footer className="workspace-footer">
          <span>MiniFlow</span>
          <span>Ít thao tác hơn. Rõ việc hơn.</span>
        </footer>
      </div>
    </div>
  );
}
