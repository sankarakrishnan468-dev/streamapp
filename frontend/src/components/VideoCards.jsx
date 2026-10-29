import { Link } from 'react-router-dom';
import { Eye, Play, Radio, User } from 'lucide-react';

/**
 * Modern Video Card for local StreamConnect videos
 */
export function VideoCard({ video }) {
  if (!video) return null;
  const videoId = video._id || video.id;
  const creatorName = video.owner?.name || video.creator?.name || 'Creator';
  const views = Number(video.views || 0).toLocaleString();
  const category = video.category || 'General';

  return (
    <article className="stream-card group">
      <Link to={`/videos/${videoId}`} className="stream-thumb block relative overflow-hidden rounded-xl bg-surface-elevated">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`thumb-fallback flex items-center justify-center ${video.thumbnailUrl ? 'hidden' : ''}`}>
          <Play size={32} className="text-secondary opacity-70" />
        </div>
        {video.duration ? (
          <span className="duration-tag absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
            {video.duration}
          </span>
        ) : null}
      </Link>
      
      <div className="stream-card-body mt-3">
        <h3 className="stream-card-title font-semibold text-base leading-snug line-clamp-2">
          <Link to={`/videos/${videoId}`} title={video.title} className="hover:text-primary transition-colors">
            {video.title}
          </Link>
        </h3>
        
        <div className="stream-meta flex items-center justify-between text-xs text-secondary mt-1.5">
          <span className="creator-tag flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-surface-elevated flex items-center justify-center text-[10px]">
              {creatorName[0]?.toUpperCase()}
            </span>
            {creatorName}
          </span>
          <span className="views-tag">{views} views</span>
        </div>
        
        <div className="mt-2">
          <span className="category-pill text-[11px] px-2 py-0.5 rounded-full bg-surface-elevated text-secondary border border-subtle">
            {category}
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * Modern Live Stream Card with LIVE badge and pulse indicator
 */
export function LiveStreamCard({ stream }) {
  if (!stream) return null;
  const streamId = stream._id || stream.id;
  const streamerName = stream.owner?.name || stream.creator?.name || 'Broadcaster';
  const viewerCount = stream.viewerCount || (stream.viewers ? stream.viewers.length : 0);
  const isLive = stream.status === 'live';

  return (
    <article className="stream-card group">
      <Link to={`/live/${streamId}`} className="stream-thumb block relative overflow-hidden rounded-xl bg-surface-elevated">
        {stream.thumbnailUrl ? (
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`thumb-fallback flex items-center justify-center ${stream.thumbnailUrl ? 'hidden' : ''}`}>
          <Radio size={34} className="text-red-500 opacity-80" />
        </div>

        {isLive ? (
          <div className="live-badge-overlay absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600/90 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        ) : (
          <div className="offline-badge-overlay absolute top-2.5 left-2.5 bg-black/70 text-slate-300 text-[11px] px-2 py-0.5 rounded">
            OFFLINE
          </div>
        )}

        {isLive && (
          <div className="viewer-badge-overlay absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/80 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm">
            <Eye size={12} />
            <span>{viewerCount}</span>
          </div>
        )}
      </Link>

      <div className="stream-card-body mt-3">
        <h3 className="stream-card-title font-semibold text-base leading-snug line-clamp-2">
          <Link to={`/live/${streamId}`} title={stream.title} className="hover:text-red-500 transition-colors">
            {stream.title}
          </Link>
        </h3>
        
        <div className="stream-meta flex items-center justify-between text-xs text-secondary mt-1.5">
          <span className="creator-tag flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-surface-elevated flex items-center justify-center text-[10px]">
              {streamerName[0]?.toUpperCase()}
            </span>
            {streamerName}
          </span>
          <span className="category-tag text-[11px] text-slate-400">
            {stream.category || 'Streaming'}
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * Modern YouTube Result Card
 */
export function YouTubeVideoCard({ video }) {
  if (!video) return null;
  return (
    <Link
      to={`/youtube/${video.id}`}
      state={{ video }}
      className="youtube-card group flex flex-col rounded-xl overflow-hidden bg-surface border border-subtle hover:border-red-500/50 transition-all duration-200"
    >
      <div className="video-thumb relative aspect-video bg-surface-elevated overflow-hidden">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="youtube-badge absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          YouTube
        </span>
      </div>
      <div className="card-body p-3 flex flex-col flex-1">
        <h3 className="font-medium text-sm line-clamp-2 leading-snug text-primary group-hover:text-red-400 transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-secondary mt-1">{video.channelTitle}</p>
      </div>
    </Link>
  );
}

