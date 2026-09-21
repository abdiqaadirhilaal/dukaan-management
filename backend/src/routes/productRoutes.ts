import { Router } from 'express';
import {
  adjustStock,
  createProduct,
  getProduct,
  listCategories,
  listProducts,
  setProductStatus,
  updateProduct,
} from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listProducts); // cashier: read-only, cost price hidden
router.get('/categories', listCategories);
router.get('/:id', getProduct);

router.post('/', authorize('admin'), createProduct);
router.put('/:id', authorize('admin'), updateProduct);
router.patch('/:id/status', authorize('admin'), setProductStatus);
router.post('/:id/stock', authorize('admin'), adjustStock);

export default router;
