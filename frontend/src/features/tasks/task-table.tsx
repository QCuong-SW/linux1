'use client';

import { useRef, useState } from 'react';
import { statusLabels, type Task, type TaskStatus } from '@/features/projects/workspace-types';
import { useWorkspace } from '@/features/projects/workspace-provider';

function TaskRow({ task, onUpdated }: { task: Task; onUpdated: (status: TaskStatus) => void }) {
  const { updateTask } = useWorkspace();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  async function change(status: TaskStatus) {
    if (busy.current || status === task.status) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await updateTask(task.id, status);
      onUpdated(status);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không cập nhật được trạng thái.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <tr>
      <td>
        <strong className="task-name">{task.title}</strong>
        {task.description && <p className="task-description">{task.description}</p>}
      </td>
      <td>
        <select
          className={`status-select badge-${task.status.toLowerCase()}`}
          aria-label={`Trạng thái ${task.title}`}
          disabled={pending}
          value={task.status}
          onChange={(event) => void change(event.target.value as TaskStatus)}
        >
          {Object.entries(statusLabels).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        {pending && (
          <p className="muted" role="status">
            Đang cập nhật…
          </p>
        )}
        {error && (
          <p className="field-error" role="alert">
            {error} Chọn lại trạng thái để thử lại.
          </p>
        )}
      </td>
    </tr>
  );
}

export function TaskTable({
  tasks,
  onUpdated,
}: {
  tasks: Task[];
  onUpdated: (status: TaskStatus) => void;
}) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Danh sách Task, có thể cuộn ngang"
    >
      <table className="task-table">
        <thead>
          <tr>
            <th scope="col">Tên Task</th>
            <th scope="col">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onUpdated={onUpdated} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
