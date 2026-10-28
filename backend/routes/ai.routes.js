import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Video from '../models/Video.js';
import {
  generateMetadataHandler,
  generateSummaryHandler,
  recommendVideosHandler,
  moderateChatHandler,
} from '../controllers/ai.controller.js';

const router = Router();

router.post('/moderate-chat', moderateChatHandler);
router.use(requireAuth);
router.post('/generate-metadata', generateMetadataHandler);
router.post('/summarize', generateSummaryHandler);
router.get('/recommendations', recommendVideosHandler);

export default router;

