'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { TaskTable } from '@/features/tasks/task-table';
import { CreateDialog } from './create-dialog';
import { statusLabels, type TaskStatus } from './workspace-types';
import { useWorkspace } from './workspace-provider';
import { formatDate, Stats, WorkspaceContent } from './workspace-ui';

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const { data } = useWorkspace();
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [notice, setNotice] = useState('');
  const filters = useRef<HTMLDivElement>(null);
  const project = data.project;
  const tasks = data.tasks.filter((task) => task.projectId === projectId);
  const counts = {
    total: project?.totalTasks ?? 0,
    TODO: project?.todoTasks ?? 0,
    IN_PROGRESS: project?.inProgressTasks ?? 0,
    DONE: project?.completedTasks ?? 0,
  };
  const filtered = tasks.filter((task) => filter === 'ALL' || task.status === filter);
  return (
    <>
      <Link className="back-link" href="/projects">
        ← Tất cả Project
      </Link>
      <WorkspaceContent>
        {project ? (
          <>
            <div className="page-heading content-heading">
              <div>
                <p className="eyebrow">PROJECT</p>
                <h1>{project.name}</h1>
                <p className="muted">Tạo {formatDate(project.createdAt)} · Bạn là chủ sở hữu</p>
              </div>
              <CreateDialog
                projectId={projectId}
                onCreated={() => {
                  setFilter('ALL');
                  setNotice('Đã tạo Task mới.');
                }}
              />
            </div>
            <p className="notice" role="status">
              {notice}
            </p>
            <Stats
              total={counts.total}
              todo={counts.TODO}
              inProgress={counts.IN_PROGRESS}
              completed={counts.DONE}
            />
            <div className="section-heading">
              <h2>Danh sách Task</h2>
              <span className="muted">Đổi trạng thái ngay trong bảng</span>
            </div>
            <div
              ref={filters}
              className="filters"
              role="group"
              aria-label="Lọc Task theo trạng thái"
            >
              {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const).map((status) => (
                <button
                  className={`filter-button${filter === status ? ' active' : ''}`}
                  aria-pressed={filter === status}
                  key={status}
                  onClick={() => setFilter(status)}
                >
                  {status === 'ALL' ? 'Tất cả' : statusLabels[status]}{' '}
                  <span>{status === 'ALL' ? counts.total : counts[status]}</span>
                </button>
              ))}
            </div>
            {filtered.length ? (
              <TaskTable
                tasks={filtered}
                onUpdated={(status) => {
                  setNotice(`Đã đổi trạng thái Task thành ${statusLabels[status]}.`);
                  if (filter !== 'ALL' && filter !== status)
                    filters.current
                      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
                      ?.focus();
                }}
              />
            ) : (
              <div className="state-panel">
                <h2>{tasks.length ? 'Bộ lọc chưa có Task' : 'Project chưa có Task'}</h2>
                <p className="muted">
                  {tasks.length
                    ? 'Chọn trạng thái khác để xem các Task còn lại.'
                    : 'Tạo Task đầu tiên cho Project này.'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="state-panel">
            <h1>Không tìm thấy Project</h1>
            <p className="muted">Project không tồn tại hoặc bạn không có quyền truy cập.</p>
            <Link className="text-link" href="/projects">
              Quay lại danh sách Projects →
            </Link>
          </div>
        )}
      </WorkspaceContent>
    </>
  );
}
