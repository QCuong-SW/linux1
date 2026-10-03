import { apiRequest } from '../../shared/lib/api';
import type { Project, ProjectDetail } from './workspace-types';
export const projectsApi = {
  list: (signal?: AbortSignal) => apiRequest<Project[]>('/projects', { signal }),
  detail: (id: string, signal?: AbortSignal) =>
    apiRequest<ProjectDetail>(`/projects/${encodeURIComponent(id)}`, { signal }),
  create: (name: string) =>
    apiRequest<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
    }),
};
