export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Project = {
  id: string;
  name: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
};
export type ProjectDetail = Project & { todoTasks: number; inProgressTasks: number };
export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
};
export const statusLabels: Record<TaskStatus, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Hoàn thành',
};
export function validateName(name: string) {
  return !name.trim()
    ? 'Vui lòng nhập tên.'
    : name.trim().length > 100
      ? 'Tên tối đa 100 ký tự.'
      : '';
}
