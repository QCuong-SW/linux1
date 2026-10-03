'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { ApiError } from '@/shared/lib/api';
import { dashboardApi, type Dashboard } from '@/features/dashboard/dashboard-api';
import { tasksApi } from '@/features/tasks/tasks-api';
import { projectsApi } from './projects-api';
import type { Project, ProjectDetail, Task, TaskStatus } from './workspace-types';

const emptyDashboard: Dashboard = {
  totalProjects: 0,
  totalTasks: 0,
  todoTasks: 0,
  inProgressTasks: 0,
  completedTasks: 0,
  recentProjects: [],
  pendingTasks: [],
};
type Data = {
  projects: Project[];
  project: ProjectDetail | null;
  tasks: Task[];
  dashboard: Dashboard;
};
const emptyData: Data = { projects: [], project: null, tasks: [], dashboard: emptyDashboard };

function useWorkspaceState() {
  const pathname = usePathname();
  const [data, setData] = useState<Data>(emptyData);
  const [loadedPath, setLoadedPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [writes, setWrites] = useState(0);
  const version = useRef(0);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const currentPath = useRef(pathname);

  const reload = useCallback(
    async (background = false) => {
      const requestVersion = ++version.current;
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      try {
        let result = emptyData;
        if (pathname === '/dashboard') {
          const dashboard = await dashboardApi.get(abort.signal);
          result = { ...emptyData, dashboard };
        } else if (pathname === '/projects') {
          result = { ...emptyData, projects: await projectsApi.list(abort.signal) };
        } else if (pathname.startsWith('/projects/')) {
          const id = decodeURIComponent(pathname.slice('/projects/'.length));
          const [project, tasks] = await Promise.all([
            projectsApi.detail(id, abort.signal),
            tasksApi.list(id, abort.signal),
          ]);
          result = { ...emptyData, project, tasks };
        }
        if (
          active.current &&
          requestVersion === version.current &&
          pathname === currentPath.current
        ) {
          setData(result);
          setError('');
          setNotFound(false);
        }
      } catch (caught) {
        if (
          !active.current ||
          requestVersion !== version.current ||
          pathname !== currentPath.current ||
          abort.signal.aborted
        )
          return;
        if (
          caught instanceof ApiError &&
          [400, 404].includes(caught.status) &&
          pathname.startsWith('/projects/')
        ) {
          setData(emptyData);
          setNotFound(true);
        } else if (!(caught instanceof ApiError && caught.status === 401)) {
          setError(
            background
              ? 'Thao tác đã lưu, nhưng chưa tải lại được dữ liệu. Bấm Thử lại để cập nhật.'
              : caught instanceof Error
                ? caught.message
                : 'Không tải được dữ liệu.',
          );
        }
      } finally {
        if (
          active.current &&
          requestVersion === version.current &&
          pathname === currentPath.current
        ) {
          setLoading(false);
          setLoadedPath(pathname);
        }
      }
    },
    [pathname],
  );

  useEffect(() => {
    active.current = true;
    currentPath.current = pathname;
    const requests = version;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void reload();
    });
    return () => {
      cancelled = true;
      active.current = false;
      requests.current++;
      controller.current?.abort();
    };
  }, [reload, pathname]);

  async function mutate<T>(operation: () => Promise<T>, apply: (result: T) => void) {
    const operationPath = pathname;
    version.current++;
    controller.current?.abort();
    setWrites((count) => count + 1);
    try {
      const result = await operation();
      if (active.current && currentPath.current === operationPath) {
        apply(result);
        // A successful write remains successful even if its follow-up read fails.
        void reload(true);
      }
    } finally {
      if (active.current) setWrites((count) => count - 1);
    }
  }
  return {
    data,
    loading: loading || loadedPath !== pathname,
    error,
    notFound,
    writes,
    reload: () => {
      setLoading(true);
      setError('');
      return reload();
    },
    createProject: (name: string) =>
      mutate(
        () => projectsApi.create(name),
        (project) =>
          setData((previous) => ({ ...previous, projects: [project, ...previous.projects] })),
      ),
    createTask: (projectId: string, title: string, description: string) =>
      mutate(
        () => tasksApi.create(projectId, title, description),
        (task) => setData((previous) => ({ ...previous, tasks: [task, ...previous.tasks] })),
      ),
    updateTask: (taskId: string, status: TaskStatus) =>
      mutate(
        () => tasksApi.updateStatus(taskId, status),
        (task) =>
          setData((previous) => ({
            ...previous,
            tasks: previous.tasks.map((item) => (item.id === task.id ? task : item)),
          })),
      ),
  };
}

const WorkspaceContext = createContext<ReturnType<typeof useWorkspaceState> | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const value = useWorkspaceState();
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
export function WorkspaceSessionBoundary({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  return session ? <WorkspaceProvider key={session.id}>{children}</WorkspaceProvider> : children;
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('WorkspaceProvider is required');
  return value;
}
