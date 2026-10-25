import { Router } from 'express';
import { createMeeting, createMediaToken, endMeeting, getGuestMeeting, getMeeting, leaveMeeting } from '../controllers/meeting.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/:roomId/guest', getGuestMeeting);
router.post('/', createMeeting);
router.get('/:roomId', getMeeting);
router.post('/:roomId/media-token', createMediaToken);
router.post('/:roomId/leave', leaveMeeting);
router.post('/:roomId/end', endMeeting);
export default router;
