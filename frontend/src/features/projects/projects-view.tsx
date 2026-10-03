'use client';

import { useState } from 'react';
import { CreateDialog } from './create-dialog';
import { useWorkspace } from './workspace-provider';
import { EmptyProjects, ProjectCards, WorkspaceContent } from './workspace-ui';

export function ProjectsView() {
  const { data, loading, error } = useWorkspace();
  const [notice, setNotice] = useState('');
  return (
    <>
      <div className="page-heading content-heading">
        <div>
          <p className="eyebrow">KHÔNG GIAN LÀM VIỆC</p>
          <h1>Projects</h1>
          <p className="muted">Chia công việc thành những project dễ quản lý.</p>
        </div>
        {!loading && !error && <CreateDialog onCreated={() => setNotice('Đã tạo Project mới.')} />}
      </div>
      <p className="notice" role="status">
        {notice}
      </p>
      <WorkspaceContent>
        {data.projects.length ? <ProjectCards projects={data.projects} /> : <EmptyProjects />}
      </WorkspaceContent>
    </>
  );
}
