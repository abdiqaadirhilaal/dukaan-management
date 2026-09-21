import type { ReportData } from '../types';
import { api } from './api';

export const reportService = {
  summary: (from: string, to: string) => api<ReportData>('/reports/summary', { query: { from, to } }),
};
