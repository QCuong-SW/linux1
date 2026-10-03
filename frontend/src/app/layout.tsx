import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/auth-provider';
import { WorkspaceSessionBoundary } from '@/features/projects/workspace-provider';

export const metadata: Metadata = {
  title: { default: 'MiniFlow', template: '%s | MiniFlow' },
  description: 'Một nơi gọn gàng cho project và task của bạn.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <WorkspaceSessionBoundary>{children}</WorkspaceSessionBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
