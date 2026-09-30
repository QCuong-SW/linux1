import type { Metadata } from 'next';
import Link from 'next/link';
import { FlowPlaceholder } from '@/shared/components/flow-placeholder';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <FlowPlaceholder
      title="Chào bạn, bắt đầu thôi"
      description="Mọi project và tiến độ công việc, trong một góc nhìn."
      flow="Flow 08 · Dashboard"
    >
      <Link className="link-button" href="/projects">
        Đến danh sách Project <span aria-hidden="true">→</span>
      </Link>
    </FlowPlaceholder>
  );
}
