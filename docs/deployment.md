# StreamConnect: Complete Zero-Cost (₹0 / $0) Production Deployment Guide

This guide walks you through deploying the complete **StreamConnect** application online so anyone in the world can access it, create accounts, stream video, and join private calls.

You will **not spend a single rupee or dollar**. Every tool and service used in this guide provides a generous, 100% free tier with no credit card required.

---

## Architecture at a Glance (100% Free Stack)

| Component | Provider | Cost | Why We Use It |
| :--- | :--- | :--- | :--- |
| **Code Storage** | **GitHub** | **Free** | Stores your repository and connects auto-deploys. |
| **Database** | **MongoDB Atlas (M0)** | **Free forever** | 512 MB cloud database (no credit card required). |
| **Backend API & Sockets** | **Render (Web Service)** | **Free** | Runs Express + persistent WebSockets (Socket.IO). |
| **Frontend UI** | **Vercel** | **Free forever** | Ultra-fast global CDN for React + Vite single-page app. |
| **WebRTC Video/Audio** | **LiveKit Cloud** | **Free (50 GB/mo)** | Handles ultra-low latency video/audio for calls. |
| **Keep-Alive Monitor** | **UptimeRobot** | **Free** | Prevents the free backend from sleeping when inactive. |

> [!IMPORTANT]
> ### Why Can't the Backend Run on Vercel?
> You may have wondered: *"Can I deploy both frontend and backend on Vercel?"*
> - **Frontend:** Vercel is the best platform in the world for the React frontend.
> - **Backend:** StreamConnect uses **Socket.IO** (WebSockets) for real-time video signaling, waiting rooms, live viewer counts, and in-call chat. Vercel runs on **Serverless Functions**, which terminate immediately after an HTTP response and **do not support persistent WebSockets**. 
> - **Render.com** provides a **100% free Node.js Web Service** that keeps persistent WebSocket connections open 24/7, which is why we deploy the backend on Render and the frontend on Vercel.

---

## 0. The Truth About Your Database: Is It Local or Cloud?

Right now, if you look inside your `backend/.env` file:
```text
MONGODB_URI=mongodb://127.0.0.1:27017/streamconnect
```
* **`127.0.0.1` means Localhost.** Your database is currently running **locally on your laptop only**.
* If you deployed your backend right now, the online server would fail to start because it cannot reach your laptop's local disk.
* **To fix this:** We will create a free **MongoDB Atlas cloud database** in Step 2. That will give you a cloud URL (`mongodb+srv://...`) accessible securely by your online backend.

---

## Phase 1: Push Your Code to GitHub (Free)

Before deploying to Render and Vercel, your code must be on GitHub.

### 1.1 Verify `.gitignore`
Make sure sensitive credentials (`.env`) and heavy folders (`node_modules`, `uploads`) are never committed to GitHub. The root `.gitignore` already protects your `.env` files.

### 1.2 Create a GitHub Repository
1. Log in to [github.com](https://github.com).
2. Click the **+** icon in the top right → **New repository**.
3. Name it: `streamconnect` (or any name you prefer).
4. Set visibility to **Private** (recommended) or **Public**.
5. Do **not** check "Add a README" or ".gitignore" (you already have them).
6. Click **Create repository**.

### 1.3 Push Code from Your Computer
Open PowerShell in the project root directory (`d:\video streaming app`) and run:

```powershell
# 1. Initialize git (if not already done)
git init

# 2. Add all project files
git add .

# 3. Commit your changes
git commit -m "Prepare StreamConnect for production deployment"

# 4. Set the branch name to main
git branch -M main

# 5. Link to your GitHub repo (replace with your actual GitHub URL)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/streamconnect.git

# 6. Push to GitHub
git push -u origin main
```

---

## Phase 2: Create a Free Cloud Database on MongoDB Atlas

MongoDB Atlas hosts your database in the cloud for free forever (512 MB storage, which easily holds tens of thousands of users and meetings).

### Step 2.1: Register on MongoDB Atlas
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up (Free, no credit card required).
2. Complete the quick onboarding questionnaire.

### Step 2.2: Deploy a Free M0 Cluster
1. When asked to pick a plan, select the **M0 Free** (Shared) tier.
2. Choose a cloud provider and region closest to you (e.g. AWS / `ap-south-1` Mumbai or whatever is nearest).
3. Cluster Name: leave as `Cluster0` or name it `streamconnect-db`.
4. Click **Create Deployment**.

### Step 2.3: Create Database User Credentials
1. In the "Security Quickstart" prompt:
   - **Username**: e.g., `streamadmin`
   - **Password**: Click **Autogenerate Secure Password** or type a strong password (e.g. `StreamApp2026Secure!`).
   - ⚠️ **COPY AND SAVE THIS USERNAME AND PASSWORD** in a notepad. You will need it in a moment!
2. Click **Create User**.

### Step 2.4: Set Network Access (Allow Render to Connect)
1. In the same prompt under "Where would you like to connect from?":
   - Select **Cloud Environment** or scroll to IP Access List.
   - Enter IP Address: `0.0.0.0/0`
   - Description: `Allow all (Render cloud backend)`
   - Click **Add Entry**.
   *(Note: Because Render free tier uses dynamic IP addresses, `0.0.0.0/0` with user authentication is the standard practice).*

### Step 2.5: Copy Your Cloud Connection String
1. Click **Choose a connection method** (or go to **Clusters** → click **Connect**).
2. Select **Drivers** (Node.js).
3. Under step 3 ("Add your connection string into your application code"), copy the URI. It looks like:
   ```text
   mongodb+srv://streamadmin:<db_password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
4. Replace `<db_password>` with your real password, and insert `/streamconnect` right before the `?`:
   ```text
   mongodb+srv://streamadmin:StreamApp2026Secure!@cluster0.xxxx.mongodb.net/streamconnect?retryWrites=true&w=majority
   ```
5. Save this URI. This is your production `MONGODB_URI`.

---

## Phase 3: Deploy the Backend on Render (100% Free)

Render runs your Express + Socket.IO server on a free Web Service with automatic HTTPS and WebSocket support.

### Step 3.1: Sign Up on Render
1. Visit [render.com](https://render.com) and click **Get Started**.
2. Sign in with your **GitHub** account so Render can access your repository.

### Step 3.2: Create a New Web Service
1. On your Render dashboard, click **New +** → **Web Service**.
2. Select **Build and deploy from a Git repository**.
3. Find your `streamconnect` repository and click **Connect**.

### Step 3.3: Configure the Web Service Settings
Fill in these exact settings:

| Field | Value | Explanation |
| :--- | :--- | :--- |
| **Name** | `streamconnect-api` | Your unique backend service name. |
| **Region** | Singapore / Frankfurt / Oregon | Pick the region closest to your users. |
| **Branch** | `main` | Deploys automatically when you push code. |
| **Root Directory** | `backend` | **Crucial:** Tells Render to run inside `backend/`. |
| **Runtime** | `Node` | Node.js environment. |
| **Build Command** | `npm install` | Installs backend dependencies. |
| **Start Command** | `npm start` | Runs `node server.js`. |
| **Instance Type** | **Free ($0/month)** | Free tier instance. |

Scroll down to **Advanced** and set:
- **Health Check Path**: `/api/health`

### Step 3.4: Add Backend Environment Variables
In the **Environment Variables** section on Render, click **Add Environment Variable** for each of these:

```text
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://streamadmin:YOUR_PASSWORD@cluster0.xxxx.mongodb.net/streamconnect?retryWrites=true&w=majority
JWT_SECRET=supersecretrandomstringthatisatleast32characterslong12345
JWT_EXPIRES_IN=7d
COOKIE_NAME=streamconnect_token
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
FRONTEND_URL=https://temporary-placeholder.com
LIVEKIT_URL=wss://video-streaming-app-agcv8vck.livekit.cloud
LIVEKIT_API_KEY=APIcquBgdrsHZjn
LIVEKIT_API_SECRET=enk4AtwEKzUfhVqxnh9erBWZhvtnBEaiuF7Jdcxv6u7B
YOUTUBE_API_KEY=AIzaSyDI1FxC8rxIpjNiDQpailIj-59q9EGpbE8
```

> [!NOTE]
> * You can copy your `LIVEKIT_*` and `YOUTUBE_API_KEY` directly from your local `backend/.env` file.
> * We set `FRONTEND_URL` to a placeholder for now. We will update it in Phase 5 right after deploying the frontend on Vercel.
> * `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` are required so the browser sends authentication cookies between Vercel (`.vercel.app`) and Render (`.onrender.com`).

### Step 3.5: Deploy
1. Click **Create Web Service**.
2. Render will build and deploy your backend. It takes 2-3 minutes.
3. Once the logs show:
   ```text
   Database connected successfully
   Server listening on port 10000
   ```
4. Copy your backend URL at the top of the Render page (e.g., `https://streamconnect-api.onrender.com`).
5. Open `https://streamconnect-api.onrender.com/api/health` in your browser. You should see:
   ```json
   {"status":"healthy","database":"connected","timestamp":"..."}
   ```

---

## Phase 4: Deploy the Frontend on Vercel (100% Free)

Vercel provides ultra-fast global hosting for the React + Vite frontend with automatic SSL and continuous deployment.

### Step 4.1: Sign Up on Vercel
1. Go to [vercel.com](https://vercel.com) and click **Sign Up**.
2. Select **Continue with GitHub** (use the same GitHub account).

### Step 4.2: Import Your Repository
1. On your Vercel Dashboard, click **Add New…** → **Project**.
2. Find your `streamconnect` repo and click **Import**.

### Step 4.3: Configure the Vercel Build Settings
Under the Project Configuration section:
1. **Framework Preset**: `Vite` (Vercel will detect it automatically).
2. **Root Directory**: Click **Edit** and select `frontend` (Click **Continue**).
3. **Build Command**: `npm run build` (default).
4. **Output Directory**: `dist` (default).

### Step 4.4: Add Frontend Environment Variables
Expand the **Environment Variables** section on Vercel and add:

| Key | Value (Use your Render Backend URL from Phase 3) |
| :--- | :--- |
| `VITE_API_URL` | `https://streamconnect-api.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://streamconnect-api.onrender.com` |

*(Make sure there is no trailing slash at the end of `VITE_SOCKET_URL`)*.

### Step 4.5: Deploy
1. Click **Deploy**.
2. Vercel will install dependencies, build the React app, and deploy it to a global CDN in ~60 seconds.
3. When finished, Vercel will display congratulations with your live URL:
   `https://streamconnect-frontend.vercel.app` (or similar).

---

## Phase 5: Connect Backend & Frontend (CORS & Cookies)

Now that your frontend has its permanent live URL, you must tell the backend to trust requests from it.

1. Go back to your [Render Dashboard](https://dashboard.render.com).
2. Select your `streamconnect-api` Web Service.
3. Click **Environment** in the left sidebar.
4. Find the `FRONTEND_URL` variable.
5. Change its value from the temporary placeholder to your **exact Vercel frontend URL**:
   ```text
   FRONTEND_URL=https://streamconnect-frontend.vercel.app
   ```
   *(Do NOT put a trailing slash `/` at the end).*
6. Click **Save Changes**.
7. Render will automatically redeploy with the updated setting.

---

## Phase 6: Keep the Free Backend Awake 24/7 (UptimeRobot)

Render's free tier spins down (sleeps) if no requests are received for 15 minutes. The next visitor might experience a 30-50 second delay while the server wakes up.

You can prevent this completely for free using **UptimeRobot**:

1. Go to [uptimerobot.com](https://uptimerobot.com) and create a free account (no credit card).
2. Click **Add New Monitor**.
3. **Monitor Type**: `HTTP(s)`
4. **Friendly Name**: `StreamConnect Backend`
5. **URL (or IP)**: `https://streamconnect-api.onrender.com/api/health`
6. **Monitoring Interval**: `Every 10 minutes` (or 5 minutes).
7. Click **Create Monitor**.

UptimeRobot will now ping your backend every few minutes, keeping it warm and responsive 24/7!

---

## Phase 7: Verification & Testing Checklist

Once both services are deployed, test your live platform:

1. **Visit the Frontend:**
   - Open your Vercel URL: `https://streamconnect-frontend.vercel.app`
2. **User Registration & Login:**
   - Click **Sign in** → **Create an account**.
   - Create a test user (e.g. `creator1`).
   - Confirm you are logged in and your avatar/name appears in the header.
3. **Private Video Call:**
   - Go to **Private Meetings** (`/meetings`).
   - Create a call and copy the meeting room link.
   - Open an Incognito window on your phone or computer, register a second account (e.g. `viewer2`), and join the call.
   - Verify camera, microphone, screen share, and live in-call chat work smoothly across devices.
4. **Live Streaming Studio:**
   - Go to **Go live** (`/live/create`).
   - Start a stream and open the viewer link in another tab or device.
   - Test reactions and live comments.

---

## Troubleshooting Common Deployment Gotchas

### 1. "Network Error" or "Unable to connect to backend"
* Check if your backend is currently waking up from sleep on Render (open `https://YOUR-BACKEND.onrender.com/api/health` in a new tab to see if it responds).
* Ensure `VITE_API_URL` in Vercel ends with `/api` and has no trailing slash.

### 2. "CORS error" or Login Fails Silently
* Ensure `FRONTEND_URL` in Render matches your Vercel URL *character-for-character* (including `https://` and without a trailing `/`).
* Ensure `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` are set in Render's environment variables.

### 3. Page Refresh on `/meetings` or `/live/:id` shows 404 on Vercel
* This happens if single-page routing rewrite is missing.
* We have already included `frontend/vercel.json` with the rewrite rule:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
  This ensures any route refreshes properly in the browser.

### 4. Video Uploads disappearing after backend restart
* On Render's free tier, local disk storage (`uploads/`) is temporary (ephemeral). When Render restarts or deploys new code, local files reset.
* For permanent zero-cost video storage, you can later connect **Cloudflare R2** (which offers **10 GB free cloud storage** with $0 egress fees) using the S3 configuration options in `docs/architecture.md`.

---

## Summary Checklist to Launch Today

- [ ] Push code to GitHub (`git push -u origin main`).
- [ ] Create free M0 cluster on MongoDB Atlas and set IP access to `0.0.0.0/0`.
- [ ] Deploy backend on Render (`Root Directory: backend`, `npm install`, `npm start`).
- [ ] Deploy frontend on Vercel (`Root Directory: frontend`, `VITE_API_URL`, `VITE_SOCKET_URL`).
- [ ] Update `FRONTEND_URL` on Render with your Vercel URL.
- [ ] Set up free UptimeRobot ping on `/api/health` to keep Render awake.
- [ ] Share your Vercel URL with friends and start streaming!
