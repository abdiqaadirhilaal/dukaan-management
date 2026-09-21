import { Router } from 'express';
import { listActivity } from '../controllers/activityLogController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('admin'), listActivity);

export default router;
