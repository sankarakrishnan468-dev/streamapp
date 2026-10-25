import http from 'node:http';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server as SocketServer } from 'socket.io';
import { env, validateEnvironment } from './config/env.js';
import { connectDatabase } from './config/database.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import { installMeetingSockets, installSocketAuth } from './sockets/meeting.socket.js';
import streamRoutes from './routes/stream.routes.js';
import userRoutes from './routes/user.routes.js';
import videoRoutes from './routes/video.routes.js';
import youtubeRoutes from './routes/youtube.routes.js';
import { installStreamSockets } from './sockets/stream.socket.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

validateEnvironment();

export function getCorsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (env.frontendUrls.includes(origin)) return callback(null, true);
  if (env.nodeEnv !== 'production') {
    try {
      const parsed = new URL(origin);
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname.startsWith('192.168.') ||
        parsed.hostname.startsWith('10.') ||
        parsed.hostname.startsWith('172.')
      ) {
        return callback(null, true);
      }
    } catch {
      // ignore
    }
  }
  return callback(null, false);
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  const allowedOrigins = [
    'https://lively-caramel-4dddfe.netlify.app',
    'http://localhost:5173',
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn('[CORS BLOCKED]', origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use('/media', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(path.resolve('uploads')));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/streams', streamRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/youtube', youtubeRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export function createServer() {
  const app = createApp();
  const httpServer = http.createServer(app);
  const io = new SocketServer(httpServer, { cors: { origin: getCorsOrigin, credentials: true } });
  installSocketAuth(io);
  installMeetingSockets(io);
  installStreamSockets(io);
  app.set('io', io);
  return { app, httpServer, io };
}

const isMainModule = process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url;

if (isMainModule && process.env.NODE_ENV !== 'test') {
  const { httpServer } = createServer();
  httpServer.listen(env.port, () => console.log(`StreamConnect API listening on port ${env.port}`));
  connectDatabase().catch((error) => console.error('Database connection failed; API is running in degraded mode', error.message));
}
