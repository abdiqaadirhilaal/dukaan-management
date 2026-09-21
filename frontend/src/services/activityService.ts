import type { ActivityEntry, Pagination } from '../types';
import { api } from './api';

export interface ActivityParams {
  entity?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const activityService = {
  list: (params: ActivityParams) => api<{ data: ActivityEntry[]; pagination: Pagination }>('/activity-logs', { query: { ...params } }),
};
