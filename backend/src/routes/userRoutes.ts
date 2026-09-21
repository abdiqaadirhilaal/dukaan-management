import { Router } from 'express';
import { createUser, listUsers, resetPassword, updateUser } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.post('/:id/reset-password', resetPassword);

export default router;
