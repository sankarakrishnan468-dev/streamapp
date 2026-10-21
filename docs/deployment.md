# StreamConnect deployment

This is the recommended production layout:

- Frontend: Vercel static site
- Backend: Render web service running Express and Socket.IO
- Database: MongoDB Atlas
- Video storage: Cloudflare R2 or Amazon S3
- DNS and HTTPS: Cloudflare DNS with the frontend and API custom domains
- Monitoring: provider logs, health checks, and an uptime monitor

## 1. Prepare the database

Create a production MongoDB Atlas cluster and a database user with a long random password. Restrict network access to the backend service where possible. Enable backups before importing production data. Atlas Cloud Backups support scheduled snapshots, and Continuous Cloud Backups support point-in-time recovery. See the [Atlas backup guidance](https://www.mongodb.com/docs/atlas/architecture/current/backups/).

Do not put `MONGODB_URI` in the frontend environment. Anything beginning with `VITE_` is bundled into browser JavaScript and is public.

## 2. Deploy the backend

Create a Render Web Service from this repository with:

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/health`

Set these backend environment variables in Render:

```text
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://app.example.com
MONGODB_URI=<production Atlas connection string>
JWT_SECRET=<long random secret>
JWT_EXPIRES_IN=15m
COOKIE_NAME=streamconnect_token
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

Socket.IO clients must use the public Render URL over HTTPS/WSS. The backend needs a WebSocket-capable web service; Render supports inbound WebSocket connections, but clients should reconnect after interruptions. See the [Render WebSocket documentation](https://render.com/docs/websocket).

## 3. Move video storage out of the server

The current local media implementation is suitable for development only. Render service files are ephemeral unless a persistent disk is attached, so uploads can disappear after deploys or restarts. Replace the local media service with an S3-compatible adapter before accepting production uploads.

Recommended storage variables:

```text
MEDIA_STORAGE=s3
S3_ENDPOINT=<R2 or S3 endpoint>
S3_REGION=auto
S3_BUCKET=<bucket name>
S3_ACCESS_KEY_ID=<access key>
S3_SECRET_ACCESS_KEY=<secret key>
MEDIA_PUBLIC_BASE_URL=https://media.example.com
```

Keep the bucket private where possible and return signed playback URLs for protected videos. Use a public CDN domain only for content intended to be public.

## 4. Deploy the frontend

Create a Vercel project with:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Set these frontend environment variables in Vercel:

```text
VITE_API_URL=https://api.example.com/api
VITE_SOCKET_URL=https://api.example.com
```

Vite exposes `VITE_` variables to the browser, so use them only for public URLs and non-secret configuration. See the [Vercel Vite deployment documentation](https://vercel.com/docs/frameworks/frontend/vite).

## 5. Domain and HTTPS

Use separate subdomains:

- `app.example.com` → Vercel frontend
- `api.example.com` → Render backend
- `media.example.com` → R2/S3 media domain

Configure `FRONTEND_URL` to exactly match the frontend origin. Do not use `*` for CORS when credentials or cookies are enabled.

## 6. Release checklist

- Rotate any credentials that were ever committed or pasted into frontend files.
- Confirm `.env`, uploads, and build output are ignored by Git.
- Run `npm test` from `backend`.
- Run `npm run build` from `frontend`.
- Test registration, login, logout, video upload, playback, delete, live chat, and meetings in production.
- Configure Atlas backups and test a restore before launch.
- Add uptime monitoring for `/api/health` and alerting for backend errors.
- Start with one backend instance; add a shared Socket.IO adapter before scaling to multiple instances.
