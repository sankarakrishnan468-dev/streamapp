import { env } from '../config/env.js';

// In-memory cache with 15-minute TTL to preserve YouTube API quota
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  // Simple LRU-style cap to prevent unbound memory growth
  if (cache.size > 200) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * GET /api/youtube/search
 * Query params: q (query), pageToken, category, order, eventType (completed | live | upcoming)
 */
export async function searchYouTube(req, res, next) {
  try {
    const query = String(req.query.q || '').trim();
    const pageToken = String(req.query.pageToken || '').trim();
    const order = String(req.query.order || 'relevance').trim();
    const eventType = String(req.query.eventType || '').trim(); // 'live' | ''
    const category = String(req.query.category || '').trim();

    if (!env.youtubeApiKey) {
      return res.status(503).json({
        error: 'YouTube API key is missing. Add YOUTUBE_API_KEY to your Render / backend environment variables.',
      });
    }

    const cacheKey = `search:${query}:${pageToken}:${order}:${eventType}:${category}`;
    const cachedResult = getCached(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const searchQuery = [query, category].filter(Boolean).join(' ');

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '16',
      videoEmbeddable: 'true',
      order: order,
      key: env.youtubeApiKey,
    });

    if (searchQuery) params.set('q', searchQuery);
    if (pageToken) params.set('pageToken', pageToken);
    if (eventType === 'live') params.set('eventType', 'live');

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const payload = await response.json();

    if (!response.ok) {
      const errMessage = payload.error?.message || 'YouTube search request failed';
      const error = new Error(errMessage);
      error.statusCode = response.status === 403 ? 503 : response.status;
      throw error;
    }

    const videos = (payload.items || [])
      .map(({ id, snippet }) => ({
        id: id?.videoId,
        title: snippet?.title || 'YouTube Video',
        description: snippet?.description || '',
        channelTitle: snippet?.channelTitle || 'YouTube Channel',
        channelId: snippet?.channelId || '',
        publishedAt: snippet?.publishedAt || '',
        liveBroadcastContent: snippet?.liveBroadcastContent || 'none',
        thumbnailUrl:
          snippet?.thumbnails?.high?.url ||
          snippet?.thumbnails?.medium?.url ||
          snippet?.thumbnails?.default?.url ||
          '',
      }))
      .filter((v) => v.id);

    const result = {
      videos,
      nextPageToken: payload.nextPageToken || null,
      prevPageToken: payload.prevPageToken || null,
      totalResults: payload.pageInfo?.totalResults || videos.length,
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/youtube/popular
 * Returns trending/popular videos
 */
export async function getPopularYouTube(req, res, next) {
  try {
    const pageToken = String(req.query.pageToken || '').trim();
    const regionCode = String(req.query.regionCode || 'US').trim();

    if (!env.youtubeApiKey) {
      return res.status(503).json({
        error: 'YouTube API key is missing. Add YOUTUBE_API_KEY to your Render / backend environment variables.',
      });
    }

    const cacheKey = `popular:${regionCode}:${pageToken}`;
    const cachedResult = getCached(cacheKey);
    if (cachedResult) return res.json(cachedResult);

    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      chart: 'mostPopular',
      maxResults: '16',
      videoEmbeddable: 'true',
      regionCode,
      key: env.youtubeApiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
    const payload = await response.json();

    if (!response.ok) {
      const error = new Error(payload.error?.message || 'Failed to fetch trending videos');
      error.statusCode = response.status === 403 ? 503 : response.status;
      throw error;
    }

    const videos = (payload.items || []).map((item) => ({
      id: item.id,
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      views: item.statistics?.viewCount || '0',
      likeCount: item.statistics?.likeCount || '0',
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
    }));

    const result = {
      videos,
      nextPageToken: payload.nextPageToken || null,
      prevPageToken: payload.prevPageToken || null,
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/youtube/videos/:id
 * Fetches single video details, statistics, and related videos
 */
export async function getYouTubeVideoDetails(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Video ID is required' });

    if (!env.youtubeApiKey) {
      return res.status(503).json({
        error: 'YouTube API key is missing. Add YOUTUBE_API_KEY to your backend environment variables.',
      });
    }

    const cacheKey = `video:${id}`;
    const cachedResult = getCached(cacheKey);
    if (cachedResult) return res.json(cachedResult);

    // 1. Fetch Video Metadata
    const params = new URLSearchParams({
      part: 'snippet,statistics,status',
      id,
      key: env.youtubeApiKey,
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
    const payload = await response.json();

    if (!response.ok) {
      const error = new Error(payload.error?.message || 'Failed to fetch video details');
      error.statusCode = response.status === 403 ? 503 : response.status;
      throw error;
    }

    const item = payload.items?.[0];
    if (!item) {
      return res.status(404).json({ error: 'Video not found or is private' });
    }

    // Check embed permission
    const embeddable = item.status?.embeddable !== false;

    const video = {
      id: item.id,
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelTitle: item.snippet?.channelTitle || '',
      channelId: item.snippet?.channelId || '',
      publishedAt: item.snippet?.publishedAt || '',
      tags: item.snippet?.tags || [],
      views: item.statistics?.viewCount || '0',
      likes: item.statistics?.likeCount || '0',
      commentCount: item.statistics?.commentCount || '0',
      embeddable,
      thumbnailUrl:
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        '',
    };

    // 2. Fetch related / contextual videos
    let relatedVideos = [];
    try {
      const relatedParams = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        videoEmbeddable: 'true',
        maxResults: '8',
        q: video.title.split(' ').slice(0, 4).join(' '),
        key: env.youtubeApiKey,
      });
      const relResp = await fetch(`https://www.googleapis.com/youtube/v3/search?${relatedParams}`);
      if (relResp.ok) {
        const relData = await relResp.json();
        relatedVideos = (relData.items || [])
          .filter((i) => i.id?.videoId && i.id.videoId !== id)
          .map((i) => ({
            id: i.id.videoId,
            title: i.snippet.title,
            channelTitle: i.snippet.channelTitle,
            thumbnailUrl: i.snippet.thumbnails?.medium?.url || i.snippet.thumbnails?.default?.url,
            publishedAt: i.snippet.publishedAt,
          }));
      }
    } catch {
      // ignore related videos failure
    }

    const result = { video, relatedVideos };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
