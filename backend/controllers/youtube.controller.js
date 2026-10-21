import { z } from 'zod';
import { env } from '../config/env.js';

const querySchema = z.object({ q: z.string().trim().min(1).max(100), pageToken: z.string().optional() });

export async function searchYouTube(req, res, next) {
  try {
    if (!env.youtubeApiKey) return res.status(503).json({ error: 'YouTube search is not configured yet' });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Enter a search term' });
    const params = new URLSearchParams({ key: env.youtubeApiKey, part: 'snippet', q: parsed.data.q, type: 'video', maxResults: '12', safeSearch: 'moderate', videoEmbeddable: 'true' });
    if (parsed.data.pageToken) params.set('pageToken', parsed.data.pageToken);
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const payload = await response.json();
    if (!response.ok) return res.status(response.status >= 500 ? 502 : response.status).json({ error: payload.error?.message || 'YouTube search failed' });
    res.json({ nextPageToken: payload.nextPageToken || '', videos: payload.items.map((item) => ({ id: item.id.videoId, title: item.snippet.title, description: item.snippet.description, channelTitle: item.snippet.channelTitle, publishedAt: item.snippet.publishedAt, thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '', url: `https://www.youtube.com/watch?v=${item.id.videoId}` })) });
  } catch (error) { next(error); }
}
