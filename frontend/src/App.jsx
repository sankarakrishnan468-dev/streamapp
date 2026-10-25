import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Clock3,
  Compass,
  Home as HomeIcon,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  Search,
  Settings,
  Sparkles,
  Upload,
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
import { api, getApiError, socketUrl } from "./services/api.js";
import StreamCreate from "./pages/streaming/StreamCreate.jsx";
import StreamViewer from "./pages/streaming/StreamViewer.jsx";
import StreamStudio from "./pages/streaming/StreamStudio.jsx";
import ProfileSettings from "./pages/ProfileSettings.jsx";
import {
  CreatorChannel,
  SavedVideos,
  VideoExplore,
  VideoPlayer,
  VideoUpload,
  YouTubePlayer,
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
  { to: "/explore", label: "Explore Videos", icon: Compass },
  { to: "/live", label: "Live Streams", icon: Radio },
  { to: "/meetings", label: "Private Meetings", icon: Users },
];
const creatorNavigation = [
  { to: "/live/create", label: "Create Live Stream", icon: Radio },
  { to: "/videos/upload", label: "Upload Video", icon: Upload },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/videos/history", label: "Watch History", icon: Clock3 },
  { to: "/videos/saved", label: "Saved Videos", icon: Bookmark },
];

export function Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [user, setUser] = useState(null);
  const [invitation, setInvitation] = useState(null);
  useEffect(() => {
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null));
  }, [location.pathname]);
  // Key socket on stable user _id only — not the full user object —
  // so navigation (which re-fetches user) does NOT tear down the socket.
  const userId = user?._id ?? null;
  useEffect(() => {
    if (!userId) { setInvitation(null); return undefined; }
    const client = io(socketUrl, { withCredentials: true });
    client.on("meeting:invitation", setInvitation);
    return () => client.disconnect();
  }, [userId]);
  async function logout() {
    await api.post("/auth/logout").catch(() => {});
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
  return (
    <div
      className={`app-layout${collapsed ? " sidebar-collapsed" : ""}${drawer ? " drawer-open" : ""}`}
    >
      <div className="mobile-bar">
        <button
          className="icon-button"
          onClick={() => setDrawer(true)}
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Radio size={17} />
          </span>
          StreamConnect
        </Link>
      </div>
      {drawer && (
        <button
          className="drawer-backdrop"
          onClick={() => setDrawer(false)}
          aria-label="Close navigation"
        />
      )}
      {invitation && <div className="meeting-invitation" role="status"><span><strong>{invitation.host?.name || "A user"}</strong> invited you to <strong>{invitation.title}</strong>.</span><Link className="button primary" to={`/meetings/${invitation.roomId}`} onClick={() => setInvitation(null)}>Join call</Link><button className="button ghost" onClick={() => setInvitation(null)}>Dismiss</button></div>}
      <aside className="sidebar">
        <div className="sidebar-head">
          <Link className="brand" to="/" onClick={() => setDrawer(false)}>
            <span className="brand-mark">
              <Radio size={17} />
            </span>
            <span>StreamConnect</span>
          </Link>
          <button
            className="icon-button sidebar-toggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
          <button
            className="icon-button drawer-close"
            onClick={() => setDrawer(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <Link
          className="new-meeting"
          to="/meetings"
          onClick={() => setDrawer(false)}
        >
          <Plus size={17} />
          <span>New Meeting</span>
        </Link>
        <nav className="side-nav">
          <div className="side-label">Workspace</div>
          {mainNavigation.map(navLink)}
          <div className="side-label">Create & Library</div>
          {creatorNavigation.map(navLink)}
        </nav>
        <div className="sidebar-extra">
          <div className="side-label">Recent</div>
          <Link className="mini-link" to="/meetings">
            <Users size={15} />
            <span>Recent meetings</span>
          </Link>
          <Link className="mini-link" to="/videos/history">
            <Clock3 size={15} />
            <span>Recently watched</span>
          </Link>
          <Link className="mini-link" to="/creator-dashboard">
            <Radio size={15} />
            <span>My streams</span>
          </Link>
          <Link className="mini-link" to="/videos/saved">
            <Bookmark size={15} />
            <span>My playlists</span>
          </Link>
        </div>
        <div className="sidebar-footer">
          <Link className="profile-mini" to="/profile">
            <span className="avatar-small">
              {user?.name?.slice(0, 1).toUpperCase() || "G"}
            </span>
            <span className="profile-copy">
              <strong>{user?.name || "Guest user"}</strong>
              <small>
                {user?.username
                  ? `@${user.username}`
                  : "Sign in to personalize"}
              </small>
            </span>
          </Link>
          <div className="footer-actions">
            <Link className="mini-link" to="/profile">
              <Settings size={16} />
              <span>Account settings</span>
            </Link>
            <div className="theme-row">
              <span>
                <Sparkles size={16} /> Theme
              </span>
              <ThemeToggle />
            </div>
            {user ? (
              <button className="mini-link logout-button" onClick={logout}>
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            ) : (
              <Link className="mini-link" to="/login">
                <LogOut size={16} />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </aside>
      <div className="app-content">
        <header className="content-header">
          <div className="breadcrumb">
            {location.pathname === "/" ? "Workspace" : "StreamConnect"}{" "}
            <span>/</span>{" "}
            {location.pathname === "/"
              ? "Home"
              : location.pathname.split("/").filter(Boolean).join(" / ")}
          </div>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Search"
              onClick={() => navigate("/explore")}
            >
              <Search size={19} />
            </button>
            <Link className="button primary header-cta" to="/live/create">
              <Radio size={16} /> Go live
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [streams, setStreams] = useState([]);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api.get("/streams/live"),
      api.get("/videos", { params: { limit: 8 } }),
    ])
      .then(([live, library]) => {
        setStreams(live.data.streams);
        setVideos(library.data.videos);
      })
      .catch((requestError) =>
        setError(getApiError(requestError, "Unable to load your workspace")),
      );
  }, []);
  function search(event) {
    event.preventDefault();
    navigate(
      `/explore${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ""}`,
    );
  }
  return (
    <Shell>
      <div className="home-page">
        <section className="welcome-panel">
          <div>
            <div className="eyebrow">
              <span className="pulse" /> YOUR CREATOR WORKSPACE
            </div>
            <h1>
              Make space for
              <br />
              <em>great moments.</em>
            </h1>
            <p>
              Meet privately, go live, and build your video library in one calm,
              connected workspace.
            </p>
            <div className="hero-actions">
              <Link className="button primary large" to="/meetings">
                <Users size={17} /> Create meeting
              </Link>
              <Link className="button ghost large" to="/live/create">
                <Radio size={17} /> Go live
              </Link>
            </div>
          </div>
          <div className="welcome-orb">
            <Radio size={54} />
          </div>
        </section>
        <form className="home-search" onSubmit={search}>
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search videos, creators, and streams"
          />
          <button className="button primary">Search</button>
        </form>
        {error && <div className="form-error">{error}</div>}
        <SectionHeading title="Currently live" action="View all" to="/live" />
        {streams.length ? (
          <div className="live-strip">
            {streams.slice(0, 4).map((stream) => (
              <Link
                className="live-card"
                to={`/live/${stream._id}`}
                key={stream._id}
              >
                <div className="live-card-image">
                  {stream.thumbnailUrl ? (
                    <img src={stream.thumbnailUrl} alt="" />
                  ) : (
                    <Radio size={28} />
                  )}
                  <span className="live-pill">LIVE</span>
                </div>
                <strong>{stream.title}</strong>
                <small>
                  {stream.owner?.name || "Creator"} · {stream.category}
                </small>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyPanel
            icon={<Radio size={22} />}
            text="No one is live right now. Start a broadcast and invite your audience."
            action="Start a live stream"
            to="/live/create"
          />
        )}
        <SectionHeading
          title="Recommended videos"
          action="Explore library"
          to="/explore"
        />
        <VideoGrid videos={videos.slice(0, 4)} />
        <div className="home-columns">
          <div>
            <SectionHeading
              title="Recent meetings"
              action="All meetings"
              to="/meetings"
            />
            <EmptyPanel
              compact
              icon={<Users size={20} />}
              text="Your recent meeting activity will appear here."
              action="New meeting"
              to="/meetings"
            />
          </div>
          <div>
            <SectionHeading
              title="Recently uploaded"
              action="Manage videos"
              to="/videos/manage"
            />
            <VideoGrid videos={videos.slice(4, 8)} compact />
          </div>
        </div>
        <SectionHeading
          title="Continue watching"
          action="Watch history"
          to="/videos/history"
        />
        <EmptyPanel
          compact
          icon={<Clock3 size={20} />}
          text="Pick up where you left off across your video library."
          action="Open history"
          to="/videos/history"
        />
      </div>
    </Shell>
  );
}
function SectionHeading({ title, action, to }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      <Link to={to}>
        {action} <ArrowRight size={14} />
      </Link>
    </div>
  );
}
function VideoGrid({ videos, compact = false }) {
  if (!videos.length)
    return (
      <EmptyPanel
        compact={compact}
        icon={<Video size={20} />}
        text="No videos here yet."
        action="Explore videos"
        to="/explore"
      />
    );
  return (
    <div className={`home-video-grid${compact ? " compact" : ""}`}>
      {videos.map((video) => (
        <Link
          className="home-video-card"
          to={`/videos/${video._id}`}
          key={video._id}
        >
          <div className="home-thumb">
            {video.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt="" />
            ) : (
              <Video size={25} />
            )}
          </div>
          <strong>{video.title}</strong>
          <small>
            {video.owner?.name || "Creator"} · {video.views || 0} views
          </small>
        </Link>
      ))}
    </div>
  );
}
function EmptyPanel({ icon, text, action, to, compact = false }) {
  return (
    <div className={`empty-panel${compact ? " compact" : ""}`}>
      <span className="empty-icon">{icon}</span>
      <div>
        <p>{text}</p>
        <Link className="button ghost" to={to}>
          {action}
        </Link>
      </div>
    </div>
  );
}
function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [status, setStatus] = useState({ loading: false, error: "" });
  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "" });
    try {
      await api.post(`/auth/${mode}`, form);
      navigate("/dashboard");
    } catch (error) {
      setStatus({
        loading: false,
        error: getApiError(error, "Unable to complete request"),
      });
    }
  }
  return (
    <Shell>
      <div className="auth-card">
        <div className="eyebrow">SECURE ACCOUNT</div>
        <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
        <p>
          {isRegister
            ? "Join StreamConnect and start sharing."
            : "Sign in to continue to your workspace."}
        </p>
        <form onSubmit={submit}>
          {isRegister && (
            <>
              <label>
                Name
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  required
                  minLength="2"
                />
              </label>
              <label>
                Username
                <input
                  name="username"
                  value={form.username}
                  onChange={update}
                  required
                  pattern="[a-z0-9_]{3,30}"
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={update}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={update}
              required
              minLength="8"
            />
          </label>
          {status.error && (
            <div className="form-error" role="alert">
              {status.error}
            </div>
          )}
          <button
            className="button primary submit-button"
            disabled={status.loading}
          >
            {isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to StreamConnect?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>
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
      <div className="placeholder">
        <div className="feature-icon">
          <Video />
        </div>
        <h1>{title}</h1>
        <p>This workspace is wired for the next implementation phase.</p>
      </div>
    </Shell>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route
        path="/profile"
        element={
          <Shell>
            <ProfileSettings />
          </Shell>
        }
      />
      <Route path="/explore" element={<VideoExplore />} />
      <Route path="/videos/upload" element={<VideoUpload />} />
      <Route path="/videos/manage" element={<VideoManagement />} />
      <Route path="/videos/:id" element={<VideoPlayer />} />
      <Route path="/youtube/:id" element={<YouTubePlayer />} />
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
      <Route path="/live/:id/studio" element={<StreamStudio />} />
      <Route path="/live/:id" element={<StreamViewer />} />
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
