import { Router } from 'express';
import { archivePayment, createPayment, listPayments } from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listPayments);
router.post('/', createPayment);
router.post('/:id/archive', authorize('admin'), archivePayment);

export default router;
