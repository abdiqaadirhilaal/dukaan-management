import { getDashboardData } from '../services/dashboardService';
import { asyncHandler } from '../utils/asyncHandler';

export const getDashboard = asyncHandler(async (_req, res) => {
  res.json(await getDashboardData());
});
