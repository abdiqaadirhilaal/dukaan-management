import type { DashboardData } from '../types';
import { api } from './api';

export const dashboardService = {
  get: () => api<DashboardData>('/dashboard'),
};
