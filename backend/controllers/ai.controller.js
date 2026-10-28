import {
  generateVideoMetadata,
  generateSummaryAndChapters,
  moderateChatMessage,
  recommendVideosBasedOnHistory,
  isOpenAIConfigured,
} from '../services/ai.service.js';
import Video from '../models/Video.js';
import User from '../models/User.js';

export async function generateMetadataHandler(req, res, next) {
  try {
    const { prompt, currentTitle, category } = req.body || {};
    if (!isOpenAIConfigured()) {
      return res.status(503).json({
        error: 'OpenAI API key is missing. Please add OPENAI_API_KEY in backend/.env',
      });
    }

    const metadata = await generateVideoMetadata({ prompt, currentTitle, category });
    res.json({ metadata });
  } catch (error) {
    next(error);
  }
}

export async function generateSummaryHandler(req, res, next) {
  try {
    const { videoId, text } = req.body || {};

    let contentToSummarize = text;
    let videoTitle = 'Video';
    let duration = 'Unknown';

    if (videoId) {
      const video = await Video.findById(videoId);
      if (video) {
        videoTitle = video.title;
        duration = `${Math.round(video.duration || 0)}s`;
        contentToSummarize = text || video.description || video.title;
      }
    }

    if (!contentToSummarize || !contentToSummarize.trim()) {
      return res.status(400).json({ error: 'Text or video transcript is required' });
    }

    if (!isOpenAIConfigured()) {
      return res.status(503).json({
        error: 'OpenAI API key is missing. Please add OPENAI_API_KEY in backend/.env',
      });
    }

    const analysis = await generateSummaryAndChapters({
      text: contentToSummarize,
      videoTitle,
      duration,
    });

    res.json({ analysis });
  } catch (error) {
    next(error);
  }
}

export async function recommendVideosHandler(req, res, next) {
  try {
    const user = await User.findById(req.user._id).populate('watchHistory.video');
    const watchHistory = (user?.watchHistory || [])
      .map((item) => item.video)
      .filter(Boolean);

    const candidateVideos = await Video.find({ status: 'ready', visibility: 'public' })
      .populate('creator', 'name username avatarUrl')
      .limit(30)
      .lean();

    const recommended = await recommendVideosBasedOnHistory({
      watchHistory,
      candidateVideos,
    });

    res.json({ recommendations: recommended.slice(0, 12) });
  } catch (error) {
    next(error);
  }
}

export async function moderateChatHandler(req, res, next) {
  try {
    const { message } = req.body || {};
    const moderation = await moderateChatMessage(message);
    res.json({ moderation });
  } catch (error) {
    next(error);
  }
}

