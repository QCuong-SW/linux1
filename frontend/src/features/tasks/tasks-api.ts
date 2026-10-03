import { apiRequest } from '../../shared/lib/api';
import type { Task, TaskStatus } from '../projects/workspace-types';
export const tasksApi = {
  list: (projectId: string, signal?: AbortSignal) =>
    apiRequest<Task[]>(`/projects/${encodeURIComponent(projectId)}/tasks`, { signal }),
  create: (projectId: string, title: string, description: string) =>
    apiRequest<Task>(`/projects/${encodeURIComponent(projectId)}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title: title.trim(), description: description.trim() }),
    }),
  updateStatus: (id: string, status: TaskStatus) =>
    apiRequest<Task>(`/tasks/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
