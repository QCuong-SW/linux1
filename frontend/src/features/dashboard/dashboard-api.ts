import { apiRequest } from '../../shared/lib/api';
import type { Project, Task } from '../projects/workspace-types';
export type Dashboard = {
  totalProjects: number;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  recentProjects: Project[];
  pendingTasks: (Task & { project: { id: string; name: string } })[];
};
export const dashboardApi = {
  get: (signal?: AbortSignal) => apiRequest<Dashboard>('/dashboard', { signal }),
};
