import { env } from '../config/env.js';

export async function searchYouTube(req, res, next) {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) return res.status(400).json({ error: 'Search query is required' });
    if (!env.youtubeApiKey) return res.status(503).json({ error: 'YouTube search is not configured. Add YOUTUBE_API_KEY to backend/.env.' });

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '12',
      q: query,
      key: env.youtubeApiKey,
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const payload = await response.json();
    if (!response.ok) {
      const error = new Error(payload.error?.message || 'YouTube search failed');
      error.statusCode = response.status === 403 ? 503 : response.status;
      throw error;
    }

    const videos = (payload.items || []).map(({ id, snippet }) => ({
      id: id.videoId,
      title: snippet.title,
      description: snippet.description,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
    })).filter((video) => video.id);

    res.json({ videos });
  } catch (error) {
    next(error);
  }
}
