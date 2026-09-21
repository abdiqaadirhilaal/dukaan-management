import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePassword, login, me } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in a few minutes.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);

export default router;
