import type { Pagination, PaymentMethod, PaymentRecord } from '../types';
import { api } from './api';

export interface PaymentListParams {
  customerId?: string;
  status?: 'active' | 'archived' | 'all';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const paymentService = {
  list: (params: PaymentListParams) =>
    api<{ data: PaymentRecord[]; pagination: Pagination; totals: { count: number; amount: number } }>('/payments', { query: { ...params } }),
  create: (input: { customerId: string; amount: number; method: PaymentMethod; note?: string }) =>
    api<unknown>('/payments', { method: 'POST', body: input }),
  archive: (id: string, reason: string) => api<unknown>(`/payments/${id}/archive`, { method: 'POST', body: { reason } }),
};
