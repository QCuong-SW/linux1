import type { Metadata } from 'next';
import Link from 'next/link';
import { FlowPlaceholder } from '@/shared/components/flow-placeholder';

export const metadata: Metadata = { title: 'Chi tiết Project' };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <>
      <Link className="back-link" href="/projects">
        ← Tất cả Project
      </Link>
      <FlowPlaceholder
        title="Chi tiết Project"
        description={`Mã Project: ${projectId}`}
        flow="Flow 05–07 · Project và Task"
      />
    </>
  );
}
