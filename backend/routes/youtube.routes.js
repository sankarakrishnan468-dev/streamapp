import { Router } from 'express';
import {
  searchYouTube,
  getPopularYouTube,
  getYouTubeVideoDetails,
} from '../controllers/youtube.controller.js';

const router = Router();

router.get('/search', searchYouTube);
router.get('/popular', getPopularYouTube);
router.get('/videos/:id', getYouTubeVideoDetails);

export default router;
