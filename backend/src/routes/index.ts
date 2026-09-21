import { Router } from 'express';
import activityLogRoutes from './activityLogRoutes';
import authRoutes from './authRoutes';
import customerRoutes from './customerRoutes';
import dashboardRoutes from './dashboardRoutes';
import debtRoutes from './debtRoutes';
import paymentRoutes from './paymentRoutes';
import productRoutes from './productRoutes';
import reportRoutes from './reportRoutes';
import saleRoutes from './saleRoutes';
import userRoutes from './userRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/sales', saleRoutes);
router.use('/payments', paymentRoutes);
router.use('/debts', debtRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);
router.use('/activity-logs', activityLogRoutes);

export default router;
