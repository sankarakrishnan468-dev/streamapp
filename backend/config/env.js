import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((url) => url.trim()).filter(Boolean),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamconnect',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  cookieName: process.env.COOKIE_NAME || 'streamconnect_token',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
};

env.frontendUrl = env.frontendUrls[0];

export function validateEnvironment() {
  if (env.nodeEnv === 'production') {
    const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
}
