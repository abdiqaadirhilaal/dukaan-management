import { Router } from 'express';
import { listDebts } from '../controllers/debtController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, listDebts);

export default router;
