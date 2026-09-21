import type { AdminUser, Role } from '../types';
import { api } from './api';

export const userService = {
  list: () => api<{ data: AdminUser[] }>('/users').then((r) => r.data),
  create: (input: { fullName: string; username: string; password: string; role: Role }) => api<unknown>('/users', { method: 'POST', body: input }),
  update: (id: string, input: { fullName?: string; role?: Role; isActive?: boolean }) => api<unknown>(`/users/${id}`, { method: 'PUT', body: input }),
  resetPassword: (id: string, password: string) => api<unknown>(`/users/${id}/reset-password`, { method: 'POST', body: { password } }),
};
