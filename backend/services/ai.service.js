import OpenAI from 'openai';
import { env } from '../config/env.js';

let openaiClient = null;

function getClient() {
  if (!openaiClient && env.openaiApiKey) {
    openaiClient = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return openaiClient;
}

export function isOpenAIConfigured() {
  return Boolean(env.openaiApiKey);
}

/**
 * Generate high-engagement video title, SEO description, tags, and category.
 */
export async function generateVideoMetadata({ prompt, currentTitle, category }) {
  const client = getClient();
  if (!client) {
    throw new Error('OpenAI API key is not configured in backend/.env');
  }

  const systemMessage = `You are an expert video content strategist and SEO specialist. Return ONLY a valid JSON object with the following fields:
- "title": A catchy, click-worthy video title under 80 characters.
- "description": A structured, engaging 2-3 paragraph description with timestamps placeholder and relevant hashtags.
- "tags": An array of 5-8 relevant SEO tags.
- "category": Recommended video category.`;

  const userContent = `Video topic / rough idea: ${prompt || currentTitle || 'Gaming and technology stream'}
Current category: ${category || 'General'}`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return JSON.parse(completion.choices[0].message.content);
}

/**
 * Generate concise video summary and chapter timestamps from a transcript or description.
 */
export async function generateSummaryAndChapters({ text, videoTitle, duration }) {
  const client = getClient();
  if (!client) {
    throw new Error('OpenAI API key is not configured in backend/.env');
  }

  const systemMessage = `You are an AI video assistant. Analyze the video transcript or content and return a JSON object with:
- "summary": A concise 2-3 paragraph summary highlighting the main points.
- "keyTakeaways": An array of 3-5 bullet points.
- "chapters": An array of objects with "timestamp" (format MM:SS or HH:MM:SS) and "title" (concise chapter name).
- "highlightMoments": An array of recommended short clip suggestions with "startTime", "endTime", and "reason".`;

  const userContent = `Title: ${videoTitle || 'Untitled Video'}
Duration: ${duration || 'Unknown'}
Content / Transcript:
${text.slice(0, 15000)}`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  });

  return JSON.parse(completion.choices[0].message.content);
}

/**
 * Real-time chat moderation: checks if a chat message is spam, inappropriate, or toxic.
 */
export async function moderateChatMessage(message) {
  if (!message || !message.trim()) return { flagged: false };
  const client = getClient();

  // If OpenAI is not configured or in offline mode, fall back to heuristic moderation
  if (!client) {
    const spamRegex = /(https?:\/\/[^\s]+|free\s+crypto|earn\s+money|discord\.gg\/)/i;
    const toxicRegex = /\b(nazi|terrorist|scam|kill\s+yourself)\b/i;
    const flagged = spamRegex.test(message) || toxicRegex.test(message);
    return { flagged, reason: flagged ? 'Contains prohibited words or links' : null };
  }

  try {
    const moderation = await client.moderations.create({ input: message });
    const result = moderation.results[0];
    return {
      flagged: result.flagged,
      categories: result.categories,
    };
  } catch (err) {
    console.warn('[AI Moderation Error]:', err.message);
    return { flagged: false };
  }
}

/**
 * Recommend videos based on watch history and preferences.
 */
export async function recommendVideosBasedOnHistory({ watchHistory, candidateVideos }) {
  if (!candidateVideos || candidateVideos.length === 0) return [];
  const client = getClient();

  // If OpenAI is not set, rank by matching categories & views
  if (!client || !watchHistory || watchHistory.length === 0) {
    const watchedCategories = new Set(watchHistory?.map((h) => h.category).filter(Boolean));
    return candidateVideos.sort((a, b) => {
      const aMatch = watchedCategories.has(a.category) ? 1 : 0;
      const bMatch = watchedCategories.has(b.category) ? 1 : 0;
      return bMatch - aMatch || (b.views || 0) - (a.views || 0);
    });
  }

  try {
    const historyTitles = watchHistory.slice(0, 10).map((h) => `${h.title} (${h.category})`).join('; ');
    const candidateList = candidateVideos.slice(0, 25).map((v) => ({ id: v._id || v.id, title: v.title, category: v.category }));

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a video recommendation algorithm. Return a JSON object with "recommendedIds": an array of candidate video IDs ranked in order of highest predicted interest based on the user watch history.',
        },
        {
          role: 'user',
          content: `User watch history: ${historyTitles}\nCandidates: ${JSON.stringify(candidateList)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const recommendedIds = new Set(parsed.recommendedIds || []);
    return candidateVideos.sort((a, b) => {
      const aIndex = parsed.recommendedIds?.indexOf(String(a._id || a.id));
      const bIndex = parsed.recommendedIds?.indexOf(String(b._id || b.id));
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
  } catch (err) {
    return candidateVideos;
  }
}

