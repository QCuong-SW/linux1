import { apiRequest } from '../../shared/lib/api';
export type User = { id: string; email: string; createdAt: string };
export const authApi = {
  me: () => apiRequest<User>('/auth/me', { expireSession: false }),
  authenticate: (email: string, password: string, register: boolean) =>
    apiRequest<User>(register ? '/auth/register' : '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      expireSession: false,
    }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', expireSession: false }),
};
