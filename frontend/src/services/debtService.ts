import type { DebtRow, Pagination } from '../types';
import { api } from './api';

export const debtService = {
  list: (params: { search?: string; page?: number; limit?: number }) =>
    api<{ data: DebtRow[]; pagination: Pagination; summary: { totalOutstanding: number; customersWithDebt: number } }>('/debts', { query: { ...params } }),
};
