import { Router } from 'express';
import { getSummary } from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/summary', authenticate, authorize('admin'), getSummary);

export default router;
