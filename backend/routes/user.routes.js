import { Router } from 'express';
import { getPublicProfile, searchUsers, updateProfile } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/search', requireAuth, searchUsers);
router.patch('/me', requireAuth, updateProfile);
router.get('/:username', getPublicProfile);
export default router;
