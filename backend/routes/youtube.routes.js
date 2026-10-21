import { Router } from 'express';
import { searchYouTube } from '../controllers/youtube.controller.js';

const router = Router();
router.get('/search', searchYouTube);
export default router;
