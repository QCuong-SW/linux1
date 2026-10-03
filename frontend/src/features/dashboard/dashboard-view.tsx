'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CreateDialog } from '@/features/projects/create-dialog';
import { statusLabels } from '@/features/projects/workspace-types';
import { useWorkspace } from '@/features/projects/workspace-provider';
import {
  EmptyProjects,
  ProjectCards,
  Stats,
  WorkspaceContent,
} from '@/features/projects/workspace-ui';

export function DashboardView() {
  const { data, loading, error } = useWorkspace();
  const [notice, setNotice] = useState('');
  const dashboard = data.dashboard;
  const attention = dashboard.pendingTasks;
  return (
    <>
      <div className="page-heading content-heading">
        <div>
          <p className="eyebrow">TỔNG QUAN WORKSPACE</p>
          <h1>Chào bạn, bắt đầu thôi</h1>
          <p className="muted">Mọi project và tiến độ công việc, trong một góc nhìn.</p>
        </div>
        {!loading && !error && <CreateDialog onCreated={() => setNotice('Đã tạo Project mới.')} />}
      </div>
      <p className="notice" role="status">
        {notice}
      </p>
      <WorkspaceContent>
        <Stats
          total={dashboard.totalTasks}
          todo={dashboard.todoTasks}
          inProgress={dashboard.inProgressTasks}
          completed={dashboard.completedTasks}
          projectCount={dashboard.totalProjects}
        />
        <div className="section-heading">
          <h2>Project của bạn</h2>
          <Link className="text-link" href="/projects">
            Xem tất cả →
          </Link>
        </div>
        {dashboard.totalProjects ? (
          <ProjectCards projects={dashboard.recentProjects} />
        ) : (
          <EmptyProjects />
        )}
        <div className="section-heading">
          <h2>Task cần chú ý</h2>
          <span className="muted">Tối đa 5 Task mới nhất chưa hoàn thành</span>
        </div>
        {attention.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Task cần chú ý, có thể cuộn ngang"
          >
            <table className="task-table">
              <thead>
                <tr>
                  <th scope="col">Tên Task</th>
                  <th scope="col">Project</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {attention.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <Link
                        className="task-name text-link"
                        href={`/projects/${encodeURIComponent(task.projectId)}`}
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={`/projects/${encodeURIComponent(task.projectId)}`}
                      >
                        {task.project.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`status-badge badge-${task.status.toLowerCase()}`}>
                        {statusLabels[task.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="state-panel">
            <h2>{dashboard.totalProjects ? 'Không còn Task cần chú ý' : 'Chưa có Task'}</h2>
            <p className="muted">
              {dashboard.totalTasks
                ? 'Mọi Task đã hoàn thành. Bạn làm tốt lắm!'
                : 'Tạo Project và thêm Task để theo dõi công việc tại đây.'}
            </p>
          </div>
        )}
      </WorkspaceContent>
    </>
  );
}
