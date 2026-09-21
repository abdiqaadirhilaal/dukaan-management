import { Router } from 'express';
import { archiveSaleHandler, createSale, getSale, listSales } from '../controllers/saleController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listSales);
router.post('/', createSale);
router.get('/:id', getSale);
router.post('/:id/archive', authorize('admin'), archiveSaleHandler);

export default router;
