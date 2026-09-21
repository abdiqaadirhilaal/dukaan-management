import type { Pagination, PaymentType, SaleInput, SaleRecord } from '../types';
import { api } from './api';

export interface SaleListParams {
  search?: string;
  customerId?: string;
  paymentType?: PaymentType;
  status?: 'active' | 'archived' | 'all';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const saleService = {
  list: (params: SaleListParams) =>
    api<{ data: SaleRecord[]; pagination: Pagination; totals: { count: number; total: number; paid: number; due: number } }>('/sales', { query: { ...params } }),
  create: (input: SaleInput) => api<{ sale: SaleRecord }>('/sales', { method: 'POST', body: input }).then((r) => r.sale),
  archive: (id: string, reason: string) => api<unknown>(`/sales/${id}/archive`, { method: 'POST', body: { reason } }),
};
