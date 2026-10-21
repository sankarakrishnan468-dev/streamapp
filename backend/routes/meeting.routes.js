import { Router } from 'express';
import { createMeeting, endMeeting, getMeeting } from '../controllers/meeting.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.post('/', createMeeting);
router.get('/:roomId', getMeeting);
router.post('/:roomId/end', endMeeting);
export default router;
