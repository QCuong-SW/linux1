import type { Project } from '../../database/prisma/generated/client';
export function projectSummary(
  project: Project & { _count: { tasks: number } },
  completedTasks: number,
) {
  const { id, name, createdAt, _count } = project;
  return {
    id,
    name,
    createdAt,
    totalTasks: _count.tasks,
    completedTasks,
    progress: _count.tasks === 0 ? 0 : Math.round((completedTasks / _count.tasks) * 100),
  };
}
