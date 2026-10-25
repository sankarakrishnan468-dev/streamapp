import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5001),
  frontendUrls: (process.env.FRONTEND_URL || 'http://[10.58.19.157]', 'http://localhost:5173').split(',').map((url) => url.trim()).filter(Boolean),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamconnect',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  cookieName: process.env.COOKIE_NAME || 'streamconnect_token',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  turnUrl: process.env.TURN_URL || '',
  turnUsername: process.env.TURN_USERNAME || '',
  turnPassword: process.env.TURN_PASSWORD || '',
  livekitUrl: process.env.LIVEKIT_URL || '',
  livekitApiKey: process.env.LIVEKIT_API_KEY || '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET || '',
};

env.frontendUrl = env.frontendUrls[0];

export function validateEnvironment() {
  if (env.nodeEnv === 'production') {
    const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
  const livekitValues = [env.livekitUrl, env.livekitApiKey, env.livekitApiSecret];
  if (livekitValues.some(Boolean) && !livekitValues.every(Boolean)) {
    throw new Error('LiveKit configuration is incomplete. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET together.');
  }
  if (env.nodeEnv === 'production' && livekitConfigured() && !livekitCredentialsValid()) {
    throw new Error('LiveKit API credentials contain invalid characters. Copy the API key and secret exactly from LiveKit Cloud as plain ASCII text.');
  }
  if (env.nodeEnv === 'production' && !livekitConfigured()) {
    throw new Error('Missing production LiveKit configuration: LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are required.');
  }
}

export function livekitConfigured() {
  return Boolean(env.livekitUrl && env.livekitApiKey && env.livekitApiSecret);
}

export function livekitCredentialsValid() {
  return livekitConfigured() && [env.livekitApiKey, env.livekitApiSecret].every((value) => /^[\x21-\x7E]+$/.test(value));
}

