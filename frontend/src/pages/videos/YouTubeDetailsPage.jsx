import { useEffect, useState } from 'react';
import {
  ExternalLink,
  Eye,
  Heart,
  Share2,
  Sparkles,
  ThumbsUp,
  User,
  Youtube,
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Shell } from '../../App.jsx';
import { api, getApiError } from '../../services/api.js';
import { ErrorMessage, LoadingSpinner } from '../../components/CommonUI.jsx';
import ShareModal from '../../components/ShareModal.jsx';

export default function YouTubeDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const stateVideo = location.state?.video;

  const [video, setVideo] = useState(stateVideo || null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(!stateVideo);
  const [error, setError] = useState('');
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadDetails() {
      try {
        setError('');
        const { data } = await api.get(`/youtube/videos/${id}`);
        if (!active) return;
        setVideo(data.video);
        setRelated(data.relatedVideos || []);
      } catch (err) {
        if (!active) return;
        // If state video was passed from explore list, keep showing it even if extra details endpoint fails
        if (!stateVideo) {
          setError(
            getApiError(
              err,
              'Unable to load YouTube video details. Ensure YOUTUBE_API_KEY is configured on your server.'
            )
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetails();
    return () => {
      active = false;
    };
  }, [id]);

  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <Shell>
      {showShare && (
        <ShareModal
          url={watchUrl}
          title={video?.title || 'YouTube Video'}
          onClose={() => setShowShare(false)}
        />
      )}

      {error && !video && <ErrorMessage message={error} />}

      {loading ? (
        <LoadingSpinner message="Loading video..." />
      ) : video ? (
        <div className="stream-view-layout">
          {/* Main Left: 16:9 Official YouTube Embedded Player */}
          <div>
            <div className="stream-player-container">
              {video.embeddable === false ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#f8fafc',
                  }}
                >
                  <Youtube size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Embedding Disabled by Owner</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '420px', margin: '0.5rem 0 1.25rem' }}>
                    The creator has disabled playback outside of YouTube. You can watch it directly on their official platform.
                  </p>
                  <a href={watchUrl} target="_blank" rel="noreferrer" className="button primary">
                    <ExternalLink size={16} /> Watch on YouTube
                  </a>
                </div>
              ) : (
                <iframe
                  src={embedUrl}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                  }}
                />
              )}
            </div>

            {/* Video Metadata Box */}
            <div className="stream-meta-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem', lineHeight: 1.35 }}>
                    {video.title}
                  </h1>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                    {video.views && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Eye size={14} /> {Number(video.views).toLocaleString()} views
                      </span>
                    )}
                    {video.publishedAt && (
                      <span>
                        {new Date(video.publishedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* External Actions */}
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button onClick={() => setShowShare(true)} className="button ghost" style={{ fontSize: '0.82rem' }}>
                    <Share2 size={15} /> Share
                  </button>
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="button primary"
                    style={{ fontSize: '0.82rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                  >
                    <ExternalLink size={15} /> Watch on YouTube
                  </a>
                </div>
              </div>

              {/* Channel Strip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 0',
                  margin: '1.25rem 0',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  <Youtube size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                    {video.channelTitle}
                  </div>
                  <small style={{ color: '#94a3b8' }}>Official YouTube Creator</small>
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div
                  style={{
                    backgroundColor: '#181b28',
                    padding: '1rem 1.25rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.88rem',
                    color: '#cbd5e1',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  {video.description}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Contextual & Related YouTube Videos */}
          <aside className="stream-chat-card">
            <div className="chat-card-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Youtube size={16} color="#ef4444" /> Related Videos
              </span>
            </div>

            <div className="chat-card-body" style={{ gap: '0.75rem' }}>
              {related.length > 0 ? (
                related.map((rel) => (
                  <Link
                    key={rel.id}
                    to={`/youtube/${rel.id}`}
                    state={{ video: rel }}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.5rem',
                      borderRadius: '0.625rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      textDecoration: 'none',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
                  >
                    <div
                      style={{
                        width: '120px',
                        aspectRatio: '16 / 9',
                        borderRadius: '0.4rem',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: '#090a0f',
                      }}
                    >
                      <img
                        src={rel.thumbnailUrl}
                        alt={rel.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#f8fafc',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {rel.title}
                      </div>
                      <small style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                        {rel.channelTitle}
                      </small>
                    </div>
                  </Link>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', margin: 'auto', fontSize: '0.85rem' }}>
                  <Youtube size={28} style={{ opacity: 0.4, margin: '0 auto 0.5rem' }} />
                  <p>Explore more videos from the YouTube Explore page.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </Shell>
  );
}

