'use client';

import Link from 'next/link';
import type { Project } from './workspace-types';
import { useWorkspace } from './workspace-provider';

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC' }).format(new Date(value));
}

export function WorkspaceContent({ children }: { children: React.ReactNode }) {
  const { loading, error, reload } = useWorkspace();
  return (
    <>
      {loading ? (
        <div className="state-panel" role="status">
          Đang tải dữ liệu workspace…
        </div>
      ) : error ? (
        <div className="state-panel">
          <p className="field-error" role="alert">
            {error}
          </p>
          <button className="secondary-button" onClick={() => void reload()}>
            Thử lại
          </button>
        </div>
      ) : (
        children
      )}
    </>
  );
}

export function Stats({
  total,
  todo,
  inProgress,
  completed,
  projectCount,
}: {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  projectCount?: number;
}) {
  const items = [
    [projectCount === undefined ? 'Tổng Task' : 'Tổng Project', projectCount ?? total],
    ['Cần làm', todo],
    ['Đang làm', inProgress],
    ['Hoàn thành', completed],
  ];
  return (
    <div className="stats-grid">
      {items.map(([label, value], index) => (
        <div className={`stat-card stat-${index}`} key={label}>
          <p>{label}</p>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function ProjectCards({ projects }: { projects: Project[] }) {
  return (
    <div className="project-grid">
      {projects.map((project, index) => {
        return (
          <Link
            className="project-card"
            key={project.id}
            href={`/projects/${encodeURIComponent(project.id)}`}
          >
            <div className={`project-symbol symbol-${index % 3}`} aria-hidden="true">
              {['◈', '▧', '⌘'][index % 3]}
            </div>
            <h2>{project.name}</h2>
            <p className="muted">{project.totalTasks} Task</p>
            <div className="progress-label">
              <span>
                {project.completedTasks}/{project.totalTasks} hoàn thành
              </span>
              <strong>{project.progress}%</strong>
            </div>
            <progress
              value={project.progress}
              max={100}
              aria-label={`Tiến độ ${project.name}: ${project.progress}%`}
            />
            <p className="project-date">
              Tạo {formatDate(project.createdAt)}
              <span aria-hidden="true">↗</span>
            </p>
          </Link>
        );
      })}
    </div>
  );
}

export function EmptyProjects() {
  return (
    <div className="state-panel">
      <h2>Chưa có Project</h2>
      <p className="muted">Tạo Project đầu tiên để bắt đầu sắp xếp công việc của bạn.</p>
    </div>
  );
}
