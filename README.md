# StreamConnect

A full-stack modern video streaming, live broadcasting, and WebRTC private meeting platform built with the MERN stack (MongoDB, Express, React, Node.js), Socket.IO, and LiveKit Cloud.

---

## ✨ Features

### 🔒 1. Private Video Meetings & Calling
- **Call Types:** One-to-one calls (2 participants) and group calls (up to 5 participants).
- **WebRTC Powered:** Ultra-low latency audio/video powered by **LiveKit Cloud**.
- **Host Waiting Room:** Host approval workflow before participants can join.
- **In-Call Controls:** Mute microphone, toggle camera, screen sharing with system audio.
- **Moderation:** Host can mute participants, remove/kick attendees, and end meeting for all.
- **Interactive:** Real-time in-call text chat and floating emoji reactions.
- **Security:** Access code / password protection, invite-only lists, and authenticated participant verification.

### 📡 2. Live Broadcast Studio & Viewer
- **Live Broadcasting:** Broadcast camera and microphone stream to viewers with WebRTC.
- **Audience Management:** Live viewer counters and active attendee list.
- **Live Chat & Reactions:** Real-time interactive comments and animated emoji reactions.
- **Shareable Links:** Instant share link and QR-ready invite modal.

### 🎬 3. Video Hosting & On-Demand Playback
- **Video Uploads:** Upload and publish MP4/WebM videos with custom metadata and thumbnails.
- **Video Player:** Custom video controls, volume sliders, fullscreen mode, and HLS streaming support.
- **Watch History & Analytics:** Tracks user watch history and view counts.

### 🔍 4. YouTube Integration
- Search and stream YouTube videos directly within the StreamConnect interface using the YouTube Data API.

### 🛡️ 5. Authentication & Security
- **JWT Authentication:** Secure JWTs stored in `httpOnly` cookies with `SameSite=None` cross-origin support.
- **Password Security:** Salted hashing with `bcryptjs`.
- **Validation & Defense:** Strict request validation using `zod`, HTTP security headers via `helmet`, and DDoS/abuse rate limiting.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, React Router 7, Socket.io-client, LiveKit Client SDK, Lucide Icons, Axios, HLS.js |
| **Backend** | Node.js (ES Modules), Express 4, Socket.IO 4, Mongoose (MongoDB ODM), LiveKit Server SDK, Multer, Helmet, Zod |
| **Real-time & Signaling** | WebSockets (Socket.IO) & WebRTC (LiveKit Cloud SFU) |
| **Database** | MongoDB (Local MongoDB or MongoDB Atlas Cloud) |
| **Hosting Options** | Frontend: **Netlify** / **Vercel** · Backend: **Render** · Database: **MongoDB Atlas** |

---

## 📁 Project Structure

```text
streamconnect/
├── backend/                  # Express & Socket.IO API server
│   ├── config/               # Environment configuration & database connection
│   ├── controllers/          # Business logic (auth, meetings, streams, videos)
│   ├── middleware/           # Auth validation, error handling, rate limiters
│   ├── models/               # Mongoose schemas (User, Meeting, LiveStream, Video)
│   ├── routes/               # Express REST routes
│   ├── sockets/              # Socket.IO handlers for meetings and live streams
│   ├── uploads/              # Local storage for uploaded videos and media
│   └── server.js             # Server entry point
├── frontend/                 # React single-page application (Vite)
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, Modals, Tiles)
│   │   ├── pages/            # Application pages (Meetings, Streaming, Studio, Auth)
│   │   ├── services/         # Axios API client and Socket.IO connection
│   │   ├── App.jsx           # Routing and application shell
│   │   └── main.jsx          # React DOM entry point
│   ├── netlify.toml          # Netlify SPA routing configuration
│   └── vercel.json           # Vercel SPA routing configuration
├── docs/
│   └── deployment.md         # Complete ₹0 / $0 step-by-step production deployment guide
└── package.json              # Root package script runner (concurrently)
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or later)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) URI.
- [Git](https://git-scm.com/)

### 1. Clone the Repository
```powershell
git clone <repository-url>
cd "video streaming app"
```

### 2. Install Dependencies
Install all root, backend, and frontend dependencies:
```powershell
# Root dependencies
npm install

# Backend dependencies
npm --prefix backend install

# Frontend dependencies
npm --prefix frontend install
```

### 3. Configure Environment Variables

#### Backend (`backend/.env`)
Create a `.env` file inside the `backend/` directory:
```env
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/streamconnect
JWT_SECRET=development-only-change-me-to-a-secure-secret
JWT_EXPIRES_IN=15m
COOKIE_NAME=streamconnect_token
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# LiveKit Credentials (for private calls)
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=<your-api-key>
LIVEKIT_API_SECRET=<your-api-secret>

# Optional YouTube Search Integration
YOUTUBE_API_KEY=<your-youtube-data-v3-api-key>
```

#### Frontend (`frontend/.env`)
Create a `.env` file inside the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

### 4. Run the Application
Run both backend and frontend concurrently with a single command from the root directory:
```powershell
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5001](http://localhost:5001)
- **API Health Check:** [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 🧪 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs backend (`node --watch`) and frontend (`vite`) concurrently. |
| `npm run build` | Builds the frontend production bundle into `frontend/dist/`. |
| `npm test` | Runs the backend automated test suite (`node --test`). |

---

## 🌐 Production Deployment (100% Free / ₹0 Cost)

For a complete step-by-step walkthrough on how to deploy this project online for the public without spending a single rupee:

👉 **Read the comprehensive guide in [`docs/deployment.md`](./docs/deployment.md)**

### Deployment Overview:
- **Database:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (M0 Free Cluster - 512MB storage forever)
- **Backend:** [Render](https://render.com) (Free Node.js Web Service with persistent WebSocket support)
- **Frontend:** [Netlify](https://www.netlify.com) or [Vercel](https://vercel.com) (Free high-speed CDN for React SPA)
- **WebRTC:** [LiveKit Cloud](https://livekit.io/cloud) (Free tier with 50 GB monthly bandwidth)
- **Keep-Alive:** [UptimeRobot](https://uptimerobot.com) (Free ping monitor to prevent free server sleep)

---

## 📄 License

This project is licensed under the MIT License.
