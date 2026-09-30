'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brand } from './brand';

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: '◫' },
  { href: '/projects', label: 'Projects', icon: '▤' },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
          <p className="preview-note">
            Bản dựng giao diện<span>Flow 01 · Khung và điều hướng</span>
          </p>
          <div className="profile">
            <span className="avatar" aria-hidden="true">
              M
            </span>
            <div>
              <strong>Workspace demo</strong>
              <span>Chưa kết nối tài khoản</span>
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
          <Link className="auth-preview-link" href="/login">
            Xem đăng nhập <span aria-hidden="true">↗</span>
          </Link>
        </header>
        <main id="main-content" tabIndex={-1}>
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
