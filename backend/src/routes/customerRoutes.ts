import { Router } from 'express';
import {
  createCustomer,
  getCustomer,
  listCustomers,
  setCustomerStatus,
  updateCustomer,
} from '../controllers/customerController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate); // admin + cashier

router.get('/', listCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.patch('/:id/status', authorize('admin'), setCustomerStatus);

export default router;
