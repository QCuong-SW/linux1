import { AuthGuard } from '@/features/auth/auth-guard';
import { WorkspaceShell } from '@/shared/components/workspace-shell';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard workspace>
      <WorkspaceShell>{children}</WorkspaceShell>
    </AuthGuard>
  );
}
