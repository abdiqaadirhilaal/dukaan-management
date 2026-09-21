import type { Customer, CustomerInput, CustomerListResponse, CustomerProfile } from '../types';
import { api } from './api';

export interface CustomerListParams {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  hasDebt?: boolean;
  page?: number;
  limit?: number;
}

export const customerService = {
  list: (params: CustomerListParams) => api<CustomerListResponse>('/customers', { query: { ...params } }),
  get: (id: string) => api<CustomerProfile>(`/customers/${id}`),
  create: (input: CustomerInput) => api<{ customer: Customer }>('/customers', { method: 'POST', body: input }),
  update: (id: string, input: CustomerInput) =>
    api<{ customer: Customer }>(`/customers/${id}`, { method: 'PUT', body: input }),
  setStatus: (id: string, isActive: boolean) =>
    api<{ customer: Customer }>(`/customers/${id}/status`, { method: 'PATCH', body: { isActive } }),
};
