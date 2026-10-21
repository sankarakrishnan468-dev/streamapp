import { Router } from 'express';
import { getPublicProfile, updateProfile } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.patch('/me', requireAuth, updateProfile);
router.get('/:username', getPublicProfile);
export default router;
