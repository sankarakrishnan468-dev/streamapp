import { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Film,
  Moon,
  Plus,
  Radio,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Video as VideoIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, getApiError } from '../services/api.js';
import { Shell } from '../App.jsx';
import { LiveStreamCard, VideoCard } from '../components/VideoCards.jsx';
import { EmptyState, ErrorMessage, LoadingSpinner } from '../components/CommonUI.jsx';

export function CreatorDashboard() {
  const [streams, setStreams] = useState([]);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    Promise.all([api.get('/streams/mine'), api.get('/videos/mine')])
      .then(([streamResponse, videoResponse]) => {
        setStreams(streamResponse.data.streams || []);
        setVideos(videoResponse.data.videos || []);
      })
      .catch((requestError) => setError(getApiError(requestError, 'Sign in to view the creator dashboard')))
      .finally(() => setLoading(false));
  }, []);

  const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
  const liveCount = streams.filter((s) => s.status === 'live').length;

  return (
    <Shell>
      {/* Studio Header Banner */}
      <section
        style={{
          background: 'radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 60%), linear-gradient(135deg, #121520 0%, #1a1e2f 100%)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '2rem 2.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a855f7' }}>
            <Sparkles size={14} /> Creator Studio
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0 0.25rem', color: '#f8fafc' }}>
            Channel Analytics & Studio
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Manage broadcasts, review uploaded videos, and monitor performance in real-time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="button primary" to="/live/create" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Radio size={16} /> Go Live
          </Link>
          <Link className="button secondary" to="/videos/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={16} /> Upload Video
          </Link>
        </div>
      </section>

      {/* Analytics KPI Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}
      >
        <KpiCard icon={<Film color="#818cf8" />} title="Uploaded Videos" value={videos.length} change="Total library" />
        <KpiCard icon={<Eye color="#38bdf8" />} title="Total Video Views" value={totalViews.toLocaleString()} change="All-time engagement" />
        <KpiCard icon={<Radio color="#ef4444" />} title="Active Live Streams" value={liveCount} change={liveCount > 0 ? "Broadcasting now" : "All streams offline"} isLive={liveCount > 0} />
        <KpiCard icon={<Users color="#a855f7" />} title="Subscribers" value="1.2K" change="+12% this month" />
      </div>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <LoadingSpinner message="Loading your studio assets..." />
      ) : (
        <>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === 'all' ? '#a855f7' : '#94a3b8',
                fontWeight: activeTab === 'all' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderBottom: activeTab === 'all' ? '2px solid #a855f7' : 'none',
              }}
            >
              All Assets ({streams.length + videos.length})
            </button>
            <button
              onClick={() => setActiveTab('streams')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === 'streams' ? '#a855f7' : '#94a3b8',
                fontWeight: activeTab === 'streams' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderBottom: activeTab === 'streams' ? '2px solid #a855f7' : 'none',
              }}
            >
              Broadcasts ({streams.length})
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === 'videos' ? '#a855f7' : '#94a3b8',
                fontWeight: activeTab === 'videos' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderBottom: activeTab === 'videos' ? '2px solid #a855f7' : 'none',
              }}
            >
              Videos ({videos.length})
            </button>
          </div>

          {/* Broadcasts Section */}
          {(activeTab === 'all' || activeTab === 'streams') && (
            <section style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Live Broadcasts ({streams.length})
                </h2>
                <Link to="/live/create" className="button ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}>
                  <Plus size={14} /> New Stream
                </Link>
              </div>

              {streams.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {streams.map((stream) => (
                    <div
                      key={stream._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem',
                        backgroundColor: '#141722',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                        <div
                          style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '0.5rem',
                            backgroundColor: stream.status === 'live' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: stream.status === 'live' ? '#ef4444' : '#94a3b8',
                          }}
                        >
                          <Radio size={20} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {stream.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <span style={{ textTransform: 'uppercase', color: stream.status === 'live' ? '#ef4444' : '#94a3b8', fontWeight: 700, fontSize: '0.72rem' }}>
                              ● {stream.status}
                            </span>
                            <span>·</span>
                            <span>{stream.category || 'General'}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Link className="button ghost" to={`/live/${stream._id}/studio`} style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
                          Open Studio
                        </Link>
                        <Link className="button secondary" to={`/live/${stream._id}`} style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No broadcasts yet" description="Start a live broadcast to stream to your audience." />
              )}
            </section>
          )}

          {/* Uploaded Videos Section */}
          {(activeTab === 'all' || activeTab === 'videos') && (
            <section style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Uploaded Videos ({videos.length})
                </h2>
                <Link to="/videos/upload" className="button ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}>
                  <Plus size={14} /> Upload Video
                </Link>
              </div>

              {videos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {videos.map((video) => (
                    <div
                      key={video._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem',
                        backgroundColor: '#141722',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                        <div
                          style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '0.5rem',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#818cf8',
                          }}
                        >
                          <Film size={20} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {video.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <span style={{ textTransform: 'uppercase', color: '#10b981', fontWeight: 600, fontSize: '0.72rem' }}>
                              {video.visibility || 'Public'}
                            </span>
                            <span>·</span>
                            <span>{video.views || 0} views</span>
                            <span>·</span>
                            <span>{video.category || 'General'}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Link className="button ghost" to={`/videos/${video._id}`} style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
                          Watch
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No uploaded videos" description="Publish your first video to share it with your community." />
              )}
            </section>
          )}
        </>
      )}
    </Shell>
  );
}

function KpiCard({ icon, title, value, change, isLive }) {
  return (
    <div
      style={{
        backgroundColor: '#141722',
        borderRadius: '0.875rem',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '1.25rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>{title}</span>
        <div style={{ padding: '0.4rem', borderRadius: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: isLive ? '#ef4444' : '#f8fafc', marginBottom: '0.35rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.78rem', color: isLive ? '#ef4444' : '#64748b', fontWeight: isLive ? 600 : 400 }}>
        {change}
      </div>
    </div>
  );
}

export function LiveBrowse() {
  const [streams, setStreams] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/streams/live')
      .then(({ data }) => setStreams(data.streams || []))
      .catch((requestError) => setError(getApiError(requestError, 'Unable to load live streams')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <section className="page-heading">
        <div>
          <div className="eyebrow">LIVE BROADCASTS</div>
          <h1>Live Streams</h1>
        </div>
      </section>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <LoadingSpinner message="Discovering live streams..." />
      ) : streams.length > 0 ? (
        <div className="video-grid">
          {streams.map((stream) => (
            <LiveStreamCard key={stream._id} stream={stream} />
          ))}
        </div>
      ) : (
        !error && (
          <EmptyState
            title="No public streams are live right now"
            description="Be the first to go live and share your stream with the community!"
            action={
              <Link to="/live/create" className="button primary">
                <Radio size={16} /> Start a Stream
              </Link>
            }
          />
        )
      )}
    </Shell>
  );
}

export function UserDashboard() {
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>Your Dashboard</h1>
        </div>
      </section>
      <div className="dashboard-grid">
        <DashboardCard
          to="/videos/upload"
          icon={<Upload />}
          title="Upload Video"
          text="Publish high-definition recorded videos to your channel."
        />
        <DashboardCard
          to="/live/create"
          icon={<Radio />}
          title="Go Live"
          text="Create a real-time broadcast with viewer chat and interactive reactions."
        />
        <DashboardCard
          to="/meetings"
          icon={<VideoIcon />}
          title="Create Meeting"
          text="Host private Google Meet-style video calls with up to 5 people."
        />
        <DashboardCard
          to="/videos/history"
          icon={<Clock />}
          title="Watch History"
          text="Resume videos you recently watched."
        />
      </div>
    </Shell>
  );
}

export function VideoManagement() {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/videos/mine')
      .then(({ data }) => setVideos(data.videos || []))
      .catch((requestError) => setError(getApiError(requestError, 'Sign in to manage videos')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <section className="page-heading">
        <div>
          <div className="eyebrow">VIDEO MANAGEMENT</div>
          <h1>Your Videos</h1>
        </div>
        <Link className="button primary" to="/videos/upload">
          <Upload size={16} /> Upload Video
        </Link>
      </section>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <LoadingSpinner message="Fetching your videos..." />
      ) : videos.length > 0 ? (
        <section className="management-section">
          <div className="flex flex-col gap-3">
            {videos.map((video) => (
              <div className="management-row" key={video._id}>
                <div>
                  <div className="font-medium text-primary">{video.title}</div>
                  <small className="text-secondary">{video.status} · {video.views || 0} views</small>
                </div>
                <Link className="button ghost" to={`/videos/${video._id}`}>
                  Open
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : (
        !error && (
          <EmptyState
            title="You haven't uploaded any videos yet"
            description="Share your video clips, gameplay, tutorials, or music."
            action={
              <Link className="button primary" to="/videos/upload">
                <Upload size={16} /> Upload Video
              </Link>
            }
          />
        )
      )}
    </Shell>
  );
}

export function Notifications() {
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <div className="eyebrow">UPDATES</div>
          <h1>Notifications</h1>
        </div>
      </section>
      <EmptyState
        title="All caught up!"
        description="Notifications will appear here when creators you follow go live or publish new videos."
      />
    </Shell>
  );
}

export function AdminDashboard() {
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <div className="eyebrow">ADMINISTRATION</div>
          <h1>Admin Dashboard</h1>
        </div>
      </section>
      <EmptyState
        title="Admin portal"
        description="Platform analytics and moderation tools will be displayed here."
      />
    </Shell>
  );
}

function DashboardCard({ to, icon, title, text }) {
  return (
    <Link className="dashboard-card" to={to}>
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </Link>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('streamconnect-theme') !== 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('streamconnect-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
