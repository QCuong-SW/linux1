'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { validateName } from './workspace-types';
import { useWorkspace } from './workspace-provider';

export function CreateDialog({
  projectId,
  onCreated,
}: {
  projectId?: string;
  onCreated: () => void;
}) {
  const { createProject, createTask, writes } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const descriptionInput = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const kind = projectId ? 'Task' : 'Project';

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      nameInput.current?.focus();
    } else {
      dialog.current?.close();
    }
  }, [open]);

  useEffect(() => {
    if (error && !pending) nameInput.current?.focus();
  }, [error, pending]);

  function close() {
    if (busy.current) return;
    setOpen(false);
    trigger.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const validation = {
      name: validateName(name),
      description: description.trim().length > 1000 ? 'Mô tả tối đa 1.000 ký tự.' : '',
    };
    setErrors(validation);
    setError('');
    if (validation.name || validation.description) {
      (validation.name ? nameInput : descriptionInput).current?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      if (projectId) await createTask(projectId, name, description);
      else await createProject(name);
      busy.current = false;
      close();
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Có lỗi xảy ra. Hãy thử lại.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <button
        ref={trigger}
        className="submit-button"
        disabled={writes > 0}
        onClick={() => {
          setName('');
          setDescription('');
          setErrors({ name: '', description: '' });
          setError('');
          setOpen(true);
        }}
      >
        ＋ Tạo {kind}
      </button>
      <dialog
        ref={dialog}
        className="create-dialog"
        aria-labelledby={`${id}-title`}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const elements = event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)',
          );
          const first = elements[0];
          const last = elements[elements.length - 1];
          if (!first) {
            event.preventDefault();
            return;
          }
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
      >
        <div className="dialog-heading">
          <h2 id={`${id}-title`}>Tạo {kind}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng hộp thoại"
            disabled={pending}
            onClick={close}
          >
            ×
          </button>
        </div>
        <form className="create-form" noValidate onSubmit={submit} aria-busy={pending}>
          <div className="form-field">
            <label htmlFor={`${id}-name`}>Tên {kind}</label>
            <input
              id={`${id}-name`}
              ref={nameInput}
              value={name}
              disabled={pending}
              required
              aria-invalid={Boolean(errors.name)}
              aria-describedby={`${id}-name-hint${errors.name ? ` ${id}-name-error` : ''}`}
              placeholder={projectId ? 'Ví dụ: Thiết kế trang đăng nhập' : 'Ví dụ: Website công ty'}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((old) => ({ ...old, name: '' }));
              }}
            />
            <p id={`${id}-name-hint`} className="muted">
              Tối đa 100 ký tự sau khi bỏ khoảng trắng đầu/cuối.
            </p>
            {errors.name && (
              <p id={`${id}-name-error`} className="field-error">
                {errors.name}
              </p>
            )}
          </div>
          {projectId && (
            <div className="form-field">
              <label htmlFor={`${id}-description`}>
                Mô tả <span className="muted">(tùy chọn)</span>
              </label>
              <textarea
                id={`${id}-description`}
                ref={descriptionInput}
                rows={4}
                value={description}
                disabled={pending}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={`${id}-description-hint${errors.description ? ` ${id}-description-error` : ''}`}
                placeholder="Thêm thông tin cho Task…"
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrors((old) => ({ ...old, description: '' }));
                }}
              />
              <p id={`${id}-description-hint`} className="muted">
                {description.length}/1.000 ký tự
              </p>
              {errors.description && (
                <p id={`${id}-description-error`} className="field-error">
                  {errors.description}
                </p>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" className="secondary-button" disabled={pending} onClick={close}>
              Hủy
            </button>
            <button type="submit" className="submit-button" disabled={pending}>
              {pending ? 'Đang tạo…' : 'Tạo mới'}
            </button>
          </div>
          <span role="status" className="sr-only">
            {pending ? `Đang tạo ${kind}, vui lòng chờ.` : ''}
          </span>
        </form>
      </dialog>
    </>
  );
}
