import { Router } from 'express';
import {
  createMeeting,
  createMediaToken,
  endMeeting,
  getMeeting,
} from '../controllers/meeting.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/', createMeeting);
router.get('/:roomId', getMeeting);
router.post('/:roomId/media-token', createMediaToken);
router.post('/:roomId/end', endMeeting);

export default router;
