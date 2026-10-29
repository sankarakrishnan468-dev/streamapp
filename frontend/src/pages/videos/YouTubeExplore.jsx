import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Eye,
  Flame,
  Gamepad2,
  GraduationCap,
  Laptop,
  Music,
  Play,
  Radio,
  Search,
  Sparkles,
  TrendingUp,
  X,
  Youtube,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shell } from '../../App.jsx';
import { api, getApiError } from '../../services/api.js';
import { EmptyState, ErrorMessage, LoadingSpinner } from '../../components/CommonUI.jsx';

const YOUTUBE_CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'popular', label: 'Trending', icon: Flame },
  { id: 'live', label: 'Live Now', icon: Radio },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'technology', label: 'Technology', icon: Laptop },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'music', label: 'Music', icon: Music },
];

export default function YouTubeExplore() {
  const [params, setParams] = useSearchParams();
  const [videos, setVideos] = useState([]);
  const [activeTab, setActiveTab] = useState(params.get('category') || 'popular');
  const [search, setSearch] = useState(params.get('q') || '');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [prevPageToken, setPrevPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  async function fetchVideos(token = '', isPaging = false) {
    if (isPaging) setLoadingMore(true);
    else setLoading(true);
    setError('');

    try {
      let endpoint = '/youtube/search';
      const queryParams = {
        pageToken: token,
        order: sortBy,
      };

      if (activeTab === 'popular' && !search.trim()) {
        endpoint = '/youtube/popular';
      } else if (activeTab === 'live') {
        queryParams.eventType = 'live';
        queryParams.q = search.trim() || 'live stream';
      } else if (activeTab !== 'all' && activeTab !== 'popular') {
        queryParams.q = search.trim() ? `${search.trim()} ${activeTab}` : activeTab;
      } else if (search.trim()) {
        queryParams.q = search.trim();
      } else {
        // 'all' default query
        queryParams.q = 'trending';
      }

      const { data } = await api.get(endpoint, { params: queryParams });
      setVideos(data.videos || []);
      setNextPageToken(data.nextPageToken || null);
      setPrevPageToken(data.prevPageToken || null);
    } catch (err) {
      setError(
        getApiError(
          err,
          'Unable to load YouTube videos. Ensure YOUTUBE_API_KEY is configured on your server.'
        )
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchVideos();
  }, [activeTab, sortBy]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (search.trim()) {
      setParams({ q: search.trim() });
    } else {
      setParams({});
    }
    fetchVideos();
  }

  function handleCategoryChange(catId) {
    setActiveTab(catId);
    if (catId === 'popular') setSearch('');
    setParams(catId !== 'popular' ? { category: catId } : {});
  }

  return (
    <Shell>
      {/* YouTube Hero Banner */}
      <section
        style={{
          background:
            'radial-gradient(circle at 85% 15%, rgba(239, 68, 68, 0.15) 0%, transparent 60%), linear-gradient(135deg, #12141e 0%, #171b29 100%)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '2rem 2.25rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#ef4444',
            }}
          >
            <Youtube size={17} /> Official YouTube Data API v3
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#f8fafc',
              margin: '0.4rem 0 0.25rem',
            }}
          >
            Explore YouTube
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
            Discover trending videos, watch livestreams, and search public content directly inside StreamConnect.
          </p>
        </div>

        {/* Global Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#090a0f',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '9999px',
            padding: '0.35rem 0.5rem 0.35rem 1rem',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Search size={16} style={{ color: '#94a3b8', marginRight: '0.5rem', shrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search YouTube videos..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                fetchVideos();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                marginRight: '0.35rem',
              }}
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            className="button primary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '9999px' }}
          >
            Search
          </button>
        </form>
      </section>

      {/* Category Pills Strip & Sorting */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {YOUTUBE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected
                    ? '1px solid #ef4444'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.15)' : '#141722',
                  color: isSelected ? '#fca5a5' : '#cbd5e1',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={isSelected ? '#ef4444' : '#94a3b8'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sorting Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              backgroundColor: '#141722',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.5rem',
              color: '#f8fafc',
              fontSize: '0.8rem',
              padding: '0.4rem 0.75rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="relevance">Relevance</option>
            <option value="date">Most Recent</option>
            <option value="viewCount">View Count</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Loading Skeleton / Video Grid */}
      {loading ? (
        <LoadingSpinner message="Searching YouTube videos..." />
      ) : videos.length > 0 ? (
        <>
          <div className="video-grid">
            {videos.map((vid) => (
              <YouTubeCard key={vid.id} video={vid} />
            ))}
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '3rem',
            }}
          >
            {prevPageToken && (
              <button
                className="button secondary"
                onClick={() => fetchVideos(prevPageToken, true)}
                disabled={loadingMore}
              >
                Previous Page
              </button>
            )}
            {nextPageToken && (
              <button
                className="button primary"
                onClick={() => fetchVideos(nextPageToken, true)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading next...' : 'Next Page'}
              </button>
            )}
          </div>
        </>
      ) : (
        !error && (
          <EmptyState
            title="No YouTube videos found"
            description="Try searching with a different keyword or choose another category filter above."
          />
        )
      )}
    </Shell>
  );
}

function YouTubeCard({ video }) {
  const publishedDate = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const isLive = video.liveBroadcastContent === 'live';

  return (
    <article className="stream-card group">
      <Link
        to={`/youtube/${video.id}`}
        state={{ video }}
        className="stream-thumb block relative overflow-hidden rounded-xl bg-surface-elevated"
      >
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Red YouTube / Live badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
          {isLive ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              YOUTUBE LIVE
            </>
          ) : (
            'YOUTUBE'
          )}
        </div>

        {video.views && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/80 text-white text-[11px] px-2 py-0.5 rounded backdrop-blur-sm">
            <Eye size={11} />
            <span>{Number(video.views).toLocaleString()}</span>
          </div>
        )}
      </Link>

      <div className="stream-card-body mt-3">
        <h3 className="stream-card-title font-semibold text-base leading-snug line-clamp-2">
          <Link
            to={`/youtube/${video.id}`}
            state={{ video }}
            title={video.title}
            className="hover:text-red-500 transition-colors"
          >
            {video.title}
          </Link>
        </h3>

        <div className="stream-meta flex items-center justify-between text-xs text-secondary mt-1.5">
          <span className="creator-tag text-slate-300 truncate font-medium">
            {video.channelTitle}
          </span>
          <span className="text-[11px] text-slate-500 shrink-0">{publishedDate}</span>
        </div>
      </div>
    </article>
  );
}

