import { Router } from 'express';
import { createStream, endStream, getStream, listLiveStreams, listOwnedStreams, streamHealth, updateStreamState } from '../controllers/stream.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/live', listLiveStreams);
router.get('/mine', requireAuth, listOwnedStreams);
router.get('/:id', getStream);
router.post('/', requireAuth, createStream);
router.post('/:id/end', requireAuth, endStream);
router.patch('/:id/state', requireAuth, updateStreamState);
router.get('/:id/health', requireAuth, streamHealth);
export default router;
