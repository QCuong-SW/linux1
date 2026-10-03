'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { authApi } from './auth-api';
import { validateCredentials } from './validation';
import { useAuth } from './auth-provider';

export function AuthForm({ register = false }: { register?: boolean }) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const { signIn, expired } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (error && !pending) passwordInput.current?.focus();
  }, [error, pending]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const cleanEmail = email.trim();
    const password = passwordInput.current?.value ?? '';
    const validation = validateCredentials(cleanEmail, password);
    setErrors(validation);
    setError('');
    if (validation.email || validation.password) {
      (validation.email ? emailInput : passwordInput).current?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    // Send only to the auth endpoint; keep passwords out of app state and storage.
    if (passwordInput.current) passwordInput.current.value = '';
    try {
      const session = await authApi.authenticate(cleanEmail, password, register);
      form.reset();
      signIn(session);
      router.replace('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Có lỗi xảy ra. Hãy thử lại.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <h1>{register ? 'Bắt đầu với MiniFlow' : 'Chào mừng trở lại'}</h1>
      <p className="muted">Một nơi gọn gàng cho project và task của bạn.</p>
      {expired && (
        <p className="field-error" role="alert">
          Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
        </p>
      )}
      <form className="auth-form" onSubmit={submit} noValidate aria-busy={pending}>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            ref={emailInput}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={pending}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((old) => ({ ...old, email: '' }));
            }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            placeholder="ban@example.com"
          />
          {errors.email && (
            <p id="email-error" className="field-error">
              {errors.email}
            </p>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="password">Mật khẩu{register ? ' (ít nhất 8 ký tự)' : ''}</label>
          <input
            ref={passwordInput}
            id="password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            minLength={8}
            disabled={pending}
            onChange={() => setErrors((old) => ({ ...old, password: '' }))}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className="field-error">
              {errors.password}
            </p>
          )}
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error} Nhập lại mật khẩu để thử lại.
          </p>
        )}
        <button className="submit-button" type="submit" disabled={pending}>
          {pending ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}
        </button>
        <span className="sr-only" role="status">
          {pending ? 'Đang xử lý, vui lòng chờ.' : ''}
        </span>
      </form>
      <p className="auth-switch">
        {register ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
        {pending ? (
          <span>{register ? 'Đăng nhập' : 'Đăng ký'}</span>
        ) : (
          <Link href={register ? '/login' : '/register'}>{register ? 'Đăng nhập' : 'Đăng ký'}</Link>
        )}
      </p>
    </>
  );
}
