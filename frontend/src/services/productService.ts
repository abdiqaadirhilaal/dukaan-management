import type { Pagination, Product, ProductInput } from '../types';
import { api } from './api';

export interface ProductListParams {
  search?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'all';
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export const productService = {
  list: (params: ProductListParams) => api<{ data: Product[]; pagination: Pagination }>('/products', { query: { ...params } }),
  categories: () => api<{ categories: string[] }>('/products/categories').then((r) => r.categories),
  create: (input: ProductInput) => api<{ product: Product }>('/products', { method: 'POST', body: input }),
  update: (id: string, input: Partial<ProductInput>) => api<{ product: Product }>(`/products/${id}`, { method: 'PUT', body: input }),
  setStatus: (id: string, isActive: boolean) => api<{ product: Product }>(`/products/${id}/status`, { method: 'PATCH', body: { isActive } }),
  adjustStock: (id: string, change: number, reason: string) =>
    api<{ product: Product }>(`/products/${id}/stock`, { method: 'POST', body: { change, reason } }),
};
