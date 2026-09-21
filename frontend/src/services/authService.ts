import type { User } from '../types';
import { api } from './api';

export const authService = {
  login: (username: string, password: string) =>
    api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => api<{ user: User }>('/auth/me').then((r) => r.user),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ token: string }>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
};
