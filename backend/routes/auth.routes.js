import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { error: 'Too many login attempts. Try again later.' } });
router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
export default router;

