import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Calendar,
  Clock3,
  Compass,
  Home as HomeIcon,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  Search,
  Settings,
  Sparkles,
  Sun,
  Upload,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { io } from "socket.io-client";
import MeetingCreate from "./pages/meetings/MeetingCreate.jsx";
import MeetingRoom from "./pages/meetings/MeetingRoom.jsx";
import MeetingViewer from "./pages/meetings/MeetingViewer.jsx";
import { Navbar, Sidebar } from "./components/Navbar.jsx";
import { api, clearStoredToken, getApiError, getSocketOptions, getStoredToken, setStoredToken, socketUrl } from "./services/api.js";
import StreamCreate from "./pages/streaming/StreamCreate.jsx";
import StreamViewer from "./pages/streaming/StreamViewer.jsx";
import StreamStudio from "./pages/streaming/StreamStudio.jsx";
import ProfileSettings from "./pages/ProfileSettings.jsx";
import YouTubeExplore from "./pages/videos/YouTubeExplore.jsx";
import YouTubeDetailsPage from "./pages/videos/YouTubeDetailsPage.jsx";
import {
  CreatorChannel,
  SavedVideos,
  VideoExplore,
  VideoPlayer,
  VideoUpload,
  WatchHistory,
} from "./pages/videos/VideoPages.jsx";
import {
  AdminDashboard,
  CreatorDashboard,
  LiveBrowse,
  Notifications,
  ThemeToggle,
  UserDashboard,
  VideoManagement,
} from "./pages/AppPages.jsx";

const mainNavigation = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/live", label: "Live Streams", icon: Radio },
  { to: "/explore", label: "Explore Videos", icon: Compass },
  { to: "/meetings", label: "Private Meetings", icon: Users },
];

const creatorNavigation = [
  { to: "/live/create", label: "Go Live", icon: Radio },
  { to: "/videos/upload", label: "Upload Video", icon: Upload },
  { to: "/creator-dashboard", label: "My Studio", icon: Video },
  { to: "/videos/history", label: "Watch History", icon: Clock3 },
  { to: "/videos/saved", label: "Saved Playlists", icon: Bookmark },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export function Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [user, setUser] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [topSearch, setTopSearch] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    // Only verify session if a stored token exists or cookies are active
    const token = getStoredToken();
    if (!token && !document.cookie.includes('streamconnect_session')) {
      setUser(null);
      return;
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        if (data.token) setStoredToken(data.token);
      })
      .catch(() => {
        clearStoredToken();
        setUser(null);
      });
  }, [location.pathname]);

  const userId = user?._id ?? null;
  useEffect(() => {
    if (!userId) { setInvitation(null); return undefined; }
    const client = io(socketUrl, getSocketOptions());
    client.on("meeting:invitation", setInvitation);
    return () => client.disconnect();
  }, [userId]);

  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    clearStoredToken();
    setUser(null);
    navigate("/");
  }

  const active = (to) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const navLink = (item) => (
    <Link
      key={item.to}
      to={item.to}
      onClick={() => setDrawer(false)}
      className={`side-link${active(item.to) ? " active" : ""}`}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} />
      <span>{item.label}</span>
    </Link>
  );

  const handleTopSearch = (e) => {
    e.preventDefault();
    if (topSearch.trim()) {
      navigate(`/explore?search=${encodeURIComponent(topSearch.trim())}`);
    }
  };

  return (
    <div className="app-layout">
      {/* Real-time Meeting Invitation Banner */}
      {invitation && (
        <div
          style={{
            position: "fixed",
            top: "1rem",
            right: "1rem",
            zIndex: 100,
            backgroundColor: "rgba(30, 27, 75, 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(139, 92, 246, 0.5)",
            borderRadius: "0.875rem",
            padding: "1rem 1.25rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
          role="status"
        >
          <div style={{ fontSize: "0.85rem" }}>
            <strong style={{ color: "#c084fc" }}>{invitation.host?.name || "A creator"}</strong> invited you to{" "}
            <strong>{invitation.title}</strong>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              className="button primary"
              to={`/meetings/${invitation.roomId}`}
              onClick={() => setInvitation(null)}
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
            >
              Join Call
            </Link>
            <button
              className="button ghost"
              onClick={() => setInvitation(null)}
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar user={user} onLogout={logout} />

      {/* Main Content Area with Header */}
      <div className="app-content">
        <Navbar user={user} onLogout={logout} />
        <main>{children}</main>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState([]);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/streams/live"),
      api.get("/videos", { params: { limit: 8 } }),
    ])
      .then(([live, library]) => {
        setStreams(live.data.streams || []);
        setVideos(library.data.videos || []);
      })
      .catch((err) => setError(getApiError(err, "Unable to load dashboard feed")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <div className="home-page">
        {/* Modern Welcome Banner */}
        <section className="welcome-hero">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent-secondary)" }}>
              <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: "var(--accent-live)", boxShadow: "0 0 8px var(--accent-live)" }} />
              Real-time Video Platform
            </div>
            <h1>
              Stream live, meet privately,
              <br />
              <em>connect effortlessly.</em>
            </h1>
            <p>
              High-definition interactive live streaming, secure WebRTC Google Meet-style private calls, and smart AI video analytics.
            </p>
            <div className="hero-actions">
              <Link className="button primary large" to="/live/create">
                <Radio size={18} /> Start Streaming
              </Link>
              <Link className="button secondary large" to="/meetings">
                <Users size={18} /> Create Meeting
              </Link>
              <Link className="button ghost large" to="/explore">
                <Compass size={18} /> Explore Videos
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Access Control Dashboard Cards */}
        <div className="quick-action-grid">
          <Link to="/live/create" className="quick-action-card">
            <div className="quick-action-icon"><Radio size={20} /></div>
            <h3>Broadcast Live</h3>
            <p>Stream directly with real-time chat, viewer counts, and reactions.</p>
          </Link>

          <Link to="/meetings" className="quick-action-card">
            <div className="quick-action-icon"><Users size={20} /></div>
            <h3>Private Meetings</h3>
            <p>Host approval, waiting rooms, screen sharing, and mute controls.</p>
          </Link>

          <Link to="/videos/upload" className="quick-action-card">
            <div className="quick-action-icon"><Upload size={20} /></div>
            <h3>Upload Video</h3>
            <p>Publish recorded content with automated AI title, description & chapters.</p>
          </Link>

          <Link to="/creator-dashboard" className="quick-action-card">
            <div className="quick-action-icon"><Video size={20} /></div>
            <h3>Creator Studio</h3>
            <p>Monitor your active broadcasts, subscribers, and video library analytics.</p>
          </Link>
        </div>

        {error && <div className="form-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

        {/* Live Now Strip */}
        <section style={{ marginBottom: "2.5rem" }}>
          <div className="section-heading">
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span className="live-badge">LIVE NOW</span>
              <h2>Featured Live Streams</h2>
            </div>
            <Link to="/live">Browse All Streams ΓåÆ</Link>
          </div>

          {streams.length > 0 ? (
            <div className="live-strip">
              {streams.map((stream) => (
                <article className="video-card" key={stream._id}>
                  <Link to={`/live/${stream._id}`}>
                    <div className="video-thumb">
                      {stream.thumbnailUrl ? (
                        <img src={stream.thumbnailUrl} alt={stream.title} />
                      ) : (
                        <Radio size={36} />
                      )}
                      <span className="live-badge" style={{ position: "absolute", bottom: "0.5rem", left: "0.5rem" }}>
                        LIVE
                      </span>
                    </div>
                    <h3>{stream.title}</h3>
                  </Link>
                  <p>{stream.owner?.name || "Creator"} ┬╖ {stream.category || "General"}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><Radio size={24} /></div>
              <h3>No Active Live Streams</h3>
              <p>Be the first to go live and share your stream with the community.</p>
              <Link to="/live/create" className="button primary" style={{ marginTop: "0.5rem" }}>
                <Radio size={16} /> Go Live Now
              </Link>
            </div>
          )}
        </section>

        {/* Recommended Videos */}
        <section>
          <div className="section-heading">
            <h2>Recommended Videos</h2>
            <Link to="/explore">View More Videos ΓåÆ</Link>
          </div>

          {videos.length > 0 ? (
            <div className="video-grid">
              {videos.map((video) => (
                <article className="video-card" key={video._id}>
                  <Link to={`/videos/${video._id}`}>
                    <div className="video-thumb">
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} />
                      ) : (
                        <Video size={36} />
                      )}
                    </div>
                    <h3>{video.title}</h3>
                  </Link>
                  <p>{video.owner?.name || "Creator"} ┬╖ {video.views || 0} views</p>
                  <small>{video.category || "General"}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><Video size={24} /></div>
              <h3>No Videos Uploaded Yet</h3>
              <p>Upload a video to build your channel and share content with viewers.</p>
              <Link to="/videos/upload" className="button primary" style={{ marginTop: "0.5rem" }}>
                <Upload size={16} /> Upload Video
              </Link>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

function AuthForm({ mode = "login" }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, error: "" });

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "" });
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      if (data.token) setStoredToken(data.token);
      navigate("/");
    } catch (requestError) {
      setStatus({
        loading: false,
        error: getApiError(requestError, isRegister ? "Registration failed" : "Sign in failed"),
      });
    }
  }

  return (
    <Shell>
      <div className="auth-card">
        <div className="brand-mark" style={{ margin: "0 auto 1.25rem" }}>
          <Radio size={20} />
        </div>
        <h2 style={{ textAlign: "center" }}>{isRegister ? "Join StreamConnect" : "Welcome Back"}</h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          {isRegister ? "Create an account to stream, meet, and upload." : "Sign in to access your studio and meetings."}
        </p>

        <form className="meeting-form" onSubmit={submit}>
          {isRegister && (
            <>
              <label>
                Full Name
                <input name="name" value={form.name} onChange={update} required placeholder="Jane Doe" />
              </label>
              <label>
                Username
                <input name="username" value={form.username} onChange={update} required pattern="[a-z0-9_]{3,30}" placeholder="janedoe" />
              </label>
            </>
          )}
          <label>
            Email Address
            <input type="email" name="email" value={form.email} onChange={update} required placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={update} required minLength={8} placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó" />
          </label>

          {status.error && <div className="form-error">{status.error}</div>}

          <button className="button primary" disabled={status.loading} style={{ width: "100%", marginTop: "0.5rem" }}>
            {status.loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "1.5rem" }}>
          {isRegister ? "Already have an account?" : "New to StreamConnect?"}{" "}
          <Link to={isRegister ? "/login" : "/register"} style={{ color: "var(--accent-secondary)", fontWeight: "700" }}>
            {isRegister ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    </Shell>
  );
}

function Placeholder({ title }) {
  return (
    <Shell>
      <div className="empty-state" style={{ margin: "4rem auto", maxWidth: "480px" }}>
        <div className="empty-state-icon"><Video size={28} /></div>
        <h2>{title}</h2>
        <p>This workspace feature is configured and ready for implementation.</p>
        <Link to="/" className="button secondary">Return to Home</Link>
      </div>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route path="/profile" element={<ProfileSettings />} />
      <Route path="/explore" element={<VideoExplore />} />
      <Route path="/youtube" element={<YouTubeExplore />} />
      <Route path="/videos/upload" element={<VideoUpload />} />
      <Route path="/videos/manage" element={<VideoManagement />} />
      <Route path="/videos/:id" element={<VideoPlayer />} />
      <Route path="/youtube/:id" element={<YouTubeDetailsPage />} />
      <Route path="/videos/saved" element={<SavedVideos />} />
      <Route path="/videos/history" element={<WatchHistory />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/creator/:username" element={<CreatorChannel />} />
      <Route path="/live" element={<LiveBrowse />} />
      <Route
        path="/live/create"
        element={
          <Shell>
            <StreamCreate />
          </Shell>
        }
      />
      <Route
        path="/live/:id/studio"
        element={
          <Shell>
            <StreamStudio />
          </Shell>
        }
      />
      <Route
        path="/live/:id"
        element={
          <Shell>
            <StreamViewer />
          </Shell>
        }
      />
      <Route path="/creator-dashboard" element={<CreatorDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route
        path="/meetings"
        element={
          <Shell>
            <MeetingCreate />
          </Shell>
        }
      />
      <Route path="/meetings/:roomId" element={<MeetingRoom />} />
      <Route path="/meetings/:roomId/viewer" element={<MeetingViewer />} />
      <Route path="/dashboard" element={<UserDashboard />} />
      <Route path="*" element={<Placeholder title="Page not found" />} />
    </Routes>
  );
}
