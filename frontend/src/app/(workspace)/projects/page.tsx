import type { Metadata } from 'next';
import { FlowPlaceholder } from '@/shared/components/flow-placeholder';

export const metadata: Metadata = { title: 'Projects' };

export default function ProjectsPage() {
  return (
    <FlowPlaceholder
      title="Projects"
      description="Chia công việc thành những project dễ quản lý."
      flow="Flow 03–04 · Danh sách và tạo Project"
    />
  );
}
