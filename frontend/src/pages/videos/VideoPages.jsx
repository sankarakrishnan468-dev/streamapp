import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  Clock,
  ExternalLink,
  Heart,
  List,
  Play,
  Scissors,
  Search,
  Send,
  Sparkles,
  Upload,
  Video as VideoIcon,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, getApiError } from '../../services/api.js';
import { Shell } from '../../App.jsx';

function VideoCard({ video }) {
  return (
    <article className="video-card">
      <Link to={`/videos/${video._id}`}>
        <div className="video-thumb">
          {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : <VideoIcon size={30} />}
        </div>
        <h3>{video.title}</h3>
      </Link>
      <p>{video.owner?.name || video.creator?.name || 'Creator'} · {video.views || 0} views</p>
      <small>{video.category}</small>
    </article>
  );
}

export function VideoExplore() {
  const [params, setParams] = useSearchParams();
  const [videos, setVideos] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [search, setSearch] = useState(params.get('search') || '');
  const [error, setError] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(event) {
    event?.preventDefault();
    const query = search.trim();
    setParams(query ? { search: query } : {});
    setError('');
    setYoutubeError('');
    setLoading(true);
    try {
      const [localResponse, youtubeResponse] = await Promise.all([
        api.get('/videos', { params: { search: query } }),
        query ? api.get('/youtube/search', { params: { q: query } }) : Promise.resolve({ data: { videos: [] } }),
      ]);
      setVideos(localResponse.data.videos);
      setYoutubeVideos(youtubeResponse.data.videos);
    } catch (requestError) {
      if (requestError.response?.config?.url?.includes('/youtube/')) {
        setYoutubeError(getApiError(requestError, 'YouTube search is unavailable'));
      } else {
        setError(getApiError(requestError, 'Unable to load videos'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Load AI recommended videos based on user watch history
    api.get('/ai/recommendations')
      .then(({ data }) => setRecommendations(data.recommendations || []))
      .catch(() => {});
  }, []);

  return (
    <Shell>
      <section className="page-heading">
        <div>
          <div className="eyebrow">VIDEO LIBRARY</div>
          <h1>Explore videos</h1>
        </div>
        <form className="search-form" onSubmit={load}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search StreamConnect and YouTube"
          />
          <button className="button primary" disabled={loading}>
            <Search size={16} />
          </button>
        </form>
      </section>

      {error && <div className="form-error">{error}</div>}

      {/* AI Recommendations Section */}
      {!search && recommendations.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="#a855f7" />
            <h2 style={{ margin: 0 }}>Recommended For You (AI)</h2>
          </div>
          <div className="video-grid">
            {recommendations.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        </section>
      )}

      <div className="section-heading">
        <h2>StreamConnect videos</h2>
      </div>
      <div className="video-grid">
        {videos.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
      {!videos.length && !loading && (
        <div className="placeholder">
          <p>No public StreamConnect videos found.</p>
        </div>
      )}

      {search && (
        <>
          <div className="section-heading">
            <h2>YouTube results</h2>
          </div>
          {youtubeError && <div className="form-error">{youtubeError}</div>}
          <div className="youtube-grid">
            {youtubeVideos.map((video) => (
              <Link className="youtube-card" to={`/youtube/${video.id}`} state={{ video }} key={video.id}>
                <div className="video-thumb">
                  <img src={video.thumbnailUrl} alt="" />
                </div>
                <strong>{video.title}</strong>
                <small>
                  {video.channelTitle} · <Play size={12} />
                </small>
              </Link>
            ))}
          </div>
          {!youtubeVideos.length && !youtubeError && !loading && (
            <div className="placeholder">
              <p>No YouTube videos found.</p>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

export function YouTubePlayer() {
  const { id } = useParams();
  const location = useLocation();
  const video = location.state?.video;
  return (
    <Shell>
      <div className="video-page">
        <div className="youtube-player">
          <iframe
            src={`https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`}
            title={video?.title || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <h1>{video?.title || 'YouTube video'}</h1>
        {video?.channelTitle && <p>{video.channelTitle}</p>}
        <a className="button ghost" href={`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Open on YouTube
        </a>
      </div>
    </Shell>
  );
}

export function VideoUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    tags: '',
    visibility: 'public',
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(() => setAuthenticated(true))
      .catch(() => setError('Please sign in before uploading a video.'))
      .finally(() => setCheckingAuth(false));
  }, []);

  if (checkingAuth) return <Shell><div className="placeholder">Checking your session...</div></Shell>;
  if (!authenticated) {
    return (
      <Shell>
        <div className="auth-card">
          <div className="feature-icon"><Upload /></div>
          <h1>Sign in to upload</h1>
          <p>You need an active account session before you can publish a video.</p>
          <div className="form-error">{error}</div>
          <Link className="button primary" to="/login">Sign in</Link>
        </div>
      </Shell>
    );
  }

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // AI Metadata Generation (Title, Description, Tags)
  async function generateWithAi() {
    if (!aiPrompt && !form.title) {
      setError('Please provide a video topic or draft title for AI generation.');
      return;
    }
    setAiGenerating(true);
    setError('');
    try {
      const { data } = await api.post('/ai/generate-metadata', {
        prompt: aiPrompt || form.title,
        currentTitle: form.title,
        category: form.category,
      });
      if (data.metadata) {
        setForm((prev) => ({
          ...prev,
          title: data.metadata.title || prev.title,
          description: data.metadata.description || prev.description,
          tags: Array.isArray(data.metadata.tags) ? data.metadata.tags.join(', ') : prev.tags,
          category: data.metadata.category || prev.category,
        }));
      }
    } catch (err) {
      setError(getApiError(err, 'AI metadata generation failed. Check backend OpenAI API key.'));
    } finally {
      setAiGenerating(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) return setError('Choose a video file first');
    setStatus('Uploading…');
    setProgress(0);
    setError('');
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append('video', file);
    try {
      const { data } = await api.post('/videos', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      navigate(`/videos/${data.video._id}`);
    } catch (requestError) {
      setStatus('');
      setError(getApiError(requestError, 'Upload failed'));
    }
  }

  return (
    <Shell>
      <div className="auth-card upload-card">
        <div className="feature-icon"><Upload /></div>
        <h1>Upload a video</h1>
        <p>Videos are stored locally and delivered from the media server.</p>

        {/* AI Assistant Section */}
        <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontWeight: '700', fontSize: '0.85rem' }}>
            <Sparkles size={16} /> AI Title & Description Assistant
          </div>
          <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0.35rem 0 0.75rem' }}>
            Type your topic or draft notes, and let GPT-4o generate click-worthy titles, descriptions, and tags.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Building a live streaming app in React and Node.js..."
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff', fontSize: '0.8rem' }}
            />
            <button
              type="button"
              onClick={generateWithAi}
              disabled={aiGenerating}
              className="button primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#a855f7', borderColor: '#a855f7', fontSize: '0.75rem' }}
            >
              <Sparkles size={14} /> {aiGenerating ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>
        </div>

        <form className="meeting-form" onSubmit={submit}>
          <label>
            Video file
            <input type="file" accept="video/*" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
          </label>
          <label>
            Title
            <input name="title" value={form.title} onChange={update} required maxLength="140" />
          </label>
          <label>
            Description
            <textarea name="description" value={form.description} onChange={update} rows="5" />
          </label>
          <label>
            Category
            <input name="category" value={form.category} onChange={update} />
          </label>
          <label>
            Tags
            <input name="tags" value={form.tags} onChange={update} placeholder="react, tutorial, coding" />
          </label>
          <label>
            Visibility
            <select name="visibility" value={form.visibility} onChange={update}>
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </label>
          {error && <div className="form-error">{error}</div>}
          {status && <div className="success-message">{status} {progress > 0 && `${progress}%`}</div>}
          <button className="button primary" disabled={Boolean(status)}>
            <Upload size={16} /> Upload video
          </button>
        </form>
      </div>
    </Shell>
  );
}

export function VideoPlayer() {
  const { id } = useParams();
  const video = useRef(null);
  const [item, setItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // AI Summary, Chapters & Clips state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ai'

  useEffect(() => {
    Promise.all([api.get(`/videos/${id}`), api.get(`/videos/${id}/comments`)])
      .then(([videoResponse, commentsResponse]) => {
        setItem(videoResponse.data.video);
        setComments(commentsResponse.data.comments);
      })
      .catch((requestError) => setError(getApiError(requestError, 'Unable to load video')));
  }, [id]);

  function recordHistory() {
    api.post(`/videos/${id}/history`, { progressSeconds: video.current?.currentTime || 0 }).catch(() => {});
  }

  async function like() {
    try {
      const { data } = await api.post(`/videos/${id}/like`);
      setLiked(data.liked);
      setItem((current) => ({ ...current, likesCount: data.likesCount }));
    } catch (requestError) {
      setError(getApiError(requestError, 'Sign in to like videos'));
    }
  }

  async function save() {
    try {
      const { data } = await api.post(`/videos/${id}/save`);
      setSaved(data.saved);
    } catch (requestError) {
      setError(getApiError(requestError, 'Sign in to save videos'));
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`/videos/${id}/comments`, { body: comment });
      setComments((current) => [data.comment, ...current]);
      setComment('');
    } catch (requestError) {
      setError(getApiError(requestError, 'Sign in to comment'));
    }
  }

  // Generate AI Summary and Chapters
  async function generateSummary() {
    setAiLoading(true);
    try {
      const { data } = await api.post('/ai/summarize', { videoId: id });
      setAiAnalysis(data.analysis);
      setActiveTab('ai');
    } catch (err) {
      setError(getApiError(err, 'Failed to generate summary. Ensure OPENAI_API_KEY is configured in backend/.env'));
    } finally {
      setAiLoading(false);
    }
  }

  // Seek video player to timestamp (e.g. "02:15")
  function seekTo(timestampStr) {
    if (!video.current || !timestampStr) return;
    const parts = timestampStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    video.current.currentTime = seconds;
    video.current.play().catch(() => {});
  }

  if (!item) return <Shell><div className="placeholder">{error || 'Loading video…'}</div></Shell>;

  return (
    <Shell>
      <div className="video-page">
        <video
          className="video-player"
          controls
          poster={item.thumbnailUrl}
          src={item.playbackUrl}
          ref={video}
          onPause={recordHistory}
          onEnded={recordHistory}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
          <h1 style={{ margin: 0 }}>{item.title}</h1>
          <button
            type="button"
            onClick={generateSummary}
            disabled={aiLoading}
            className="button ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', borderColor: '#a855f7' }}
          >
            <Sparkles size={16} /> {aiLoading ? 'Analyzing…' : 'AI Summary & Chapters'}
          </button>
        </div>

        {/* Tab switchers */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #27272a', margin: '1rem 0' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '0.5rem 0',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : 'none',
              background: 'none',
              color: activeTab === 'overview' ? '#ffffff' : '#a1a1aa',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Description
          </button>
          {aiAnalysis && (
            <button
              onClick={() => setActiveTab('ai')}
              style={{
                padding: '0.5rem 0',
                border: 'none',
                borderBottom: activeTab === 'ai' ? '2px solid #a855f7' : 'none',
                background: 'none',
                color: activeTab === 'ai' ? '#c084fc' : '#a1a1aa',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Sparkles size={14} /> AI Analysis
            </button>
          )}
        </div>

        {activeTab === 'overview' ? (
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{item.description}</p>
        ) : (
          aiAnalysis && (
            <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={18} /> Executive Summary
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#d4d4d8', lineHeight: '1.6' }}>{aiAnalysis.summary}</p>

              {aiAnalysis.keyTakeaways?.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Key Takeaways</h4>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: '#e4e4e7' }}>
                    {aiAnalysis.keyTakeaways.map((point, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.chapters?.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <List size={14} /> Interactive Chapters (Click to Seek)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {aiAnalysis.chapters.map((ch, idx) => (
                      <button
                        key={idx}
                        onClick={() => seekTo(ch.timestamp)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#27272a',
                          border: '1px solid #3f3f46',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ color: '#38bdf8', fontWeight: '700' }}>{ch.timestamp}</span>
                        <span style={{ truncate: true }}>{ch.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {aiAnalysis.highlightMoments?.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Scissors size={14} /> AI Short Clips & Highlights
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {aiAnalysis.highlightMoments.map((clip, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: 'rgba(168, 85, 247, 0.1)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          color: '#e4e4e7',
                        }}
                      >
                        <span style={{ color: '#c084fc', fontWeight: '700' }}>{clip.startTime} - {clip.endTime}: </span>
                        <span>{clip.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        <div className="video-actions">
          <button className="control" onClick={like}>
            <Heart size={17} fill={liked ? 'currentColor' : 'none'} /> {item.likesCount || 0} Like
          </button>
          <button className="control" onClick={save}>
            <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
          </button>
          <Link to={`/creator/${item.owner?.username}`} className="button ghost">
            {item.owner?.name || 'Creator'}
          </Link>
        </div>

        {error && <div className="form-error">{error}</div>}

        <section className="comments">
          <h2>Comments</h2>
          <form onSubmit={submit}>
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment" />
            <button className="button primary"><Send size={16} /></button>
          </form>
          {comments.map((entry) => (
            <article className="comment" key={entry._id}>
              <strong>{entry.author?.name}</strong>
              <p>{entry.body}</p>
            </article>
          ))}
        </section>
      </div>
    </Shell>
  );
}

export function SavedVideos() {
  return <VideoCollection endpoint="/videos/saved" title="Saved videos" />;
}

export function WatchHistory() {
  return <VideoCollection endpoint="/videos/history" title="Watch history" history />;
}

export function CreatorChannel() {
  const { username } = useParams();
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/users/${username}`)
      .then(({ data }) => setChannel(data))
      .catch((requestError) => setError(getApiError(requestError, 'Creator not found')));
  }, [username]);

  if (error) return <Shell><div className="placeholder">{error}</div></Shell>;
  if (!channel) return <Shell><div className="placeholder">Loading creator…</div></Shell>;

  return (
    <Shell>
      <section className="channel-header">
        <div className="avatar">{channel.user.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <div className="eyebrow">CREATOR CHANNEL</div>
          <h1>{channel.user.name}</h1>
          <p>@{channel.user.username} · {channel.user.bio || 'Sharing videos on StreamConnect.'}</p>
        </div>
      </section>
      <div className="video-grid">
        {channel.videos.map((video) => (
          <VideoCard key={video._id} video={{ ...video, owner: channel.user }} />
        ))}
      </div>
    </Shell>
  );
}

function VideoCollection({ endpoint, title, history = false }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(endpoint)
      .then(({ data }) =>
        setItems(history ? data.history.map((entry) => entry.video).filter(Boolean) : data.videos)
      )
      .catch((requestError) => setError(getApiError(requestError, 'Sign in to view this list')));
  }, [endpoint, history]);

  return (
    <Shell>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR LIBRARY</div>
          <h1>{title}</h1>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="video-grid">
        {items.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
      {!items.length && !error && (
        <div className="placeholder">
          <p>Your list is empty.</p>
        </div>
      )}
    </Shell>
  );
}
