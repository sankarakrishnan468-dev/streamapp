import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  AlertCircle,
  Copy,
  Expand,
  Flag,
  Heart,
  LoaderCircle,
  MessageSquare,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Send,
  Share2,
  ThumbsDown,
  ThumbsUp,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { Link, useParams } from 'react-router-dom';
import { api, getApiError, getSocketOptions, rtcConfiguration, socketUrl } from '../../services/api.js';
import ShareModal from '../../components/ShareModal.jsx';

export default function StreamViewer() {
  const { id } = useParams();
  const video = useRef(null);
  const socket = useRef(null);
  const hls = useRef(null);
  const peer = useRef(null);
  const pendingIce = useRef([]);

  const [connection, setConnection] = useState('connecting');
  const [stream, setStream] = useState(null);
  const [count, setCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [buffering, setBuffering] = useState(true);
  const [reactions, setReactions] = useState({ likes: 0, dislikes: 0 });
  const [myReaction, setMyReaction] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [chatReported, setChatReported] = useState(false);

  useEffect(() => {
    let client;
    let disposed = false;

    async function load() {
      try {
        const { data } = await api.get(`/streams/${id}`);
        if (disposed) return;
        setStream(data.stream);

        client = io(socketUrl, getSocketOptions());
        socket.current = client;

        client.on('connect', () => {
          setConnection('connected');
          client.emit('stream:join', { streamId: id, mode: 'viewer' });
        });

        client.on('disconnect', () => {
          setConnection('offline');
        });

        client.on('connect_error', () => {
          setConnection('offline');
          setError('Chat and live status offline. Check backend server.');
        });

        client.on('stream:viewer-count', ({ count: next }) => setCount(next));
        client.on('stream:chat', (item) => {
          setMessages((items) => (items.some((m) => m.id === item.id) ? items : [...items, item]));
        });
        client.on('stream:reactions', (next) => setReactions(next));
        client.on('stream:error', (item) => setError(item.error));

        client.on('stream:webrtc-offer', async ({ streamerId, description }) => {
          const connectionPeer = new RTCPeerConnection(rtcConfiguration);
          peer.current?.close();
          peer.current = connectionPeer;

          connectionPeer.ontrack = (event) => {
            const remoteStream = event.streams && event.streams[0] ? event.streams[0] : null;
            if (video.current) {
              if (remoteStream) {
                video.current.srcObject = remoteStream;
              } else {
                if (!(video.current.srcObject instanceof MediaStream)) {
                  video.current.srcObject = new MediaStream();
                }
                if (!video.current.srcObject.getTracks().some((t) => t.id === event.track.id)) {
                  video.current.srcObject.addTrack(event.track);
                }
              }
              hls.current?.destroy();
              setBuffering(false);
              video.current.play().catch(() => {});
            }
          };

          connectionPeer.onconnectionstatechange = () => {
            if (['failed', 'disconnected'].includes(connectionPeer.connectionState)) {
              setError('Live video stream disconnected. Click reconnect to resume.');
            }
          };

          connectionPeer.onicecandidate = ({ candidate }) => {
            if (candidate) client.emit('stream:webrtc-ice', { targetSocketId: streamerId, candidate });
          };

          try {
            await connectionPeer.setRemoteDescription(description);
            for (const candidate of pendingIce.current) {
              await connectionPeer.addIceCandidate(candidate).catch(() => {});
            }
            pendingIce.current = [];
            const answer = await connectionPeer.createAnswer();
            await connectionPeer.setLocalDescription(answer);
            client.emit('stream:webrtc-answer', { targetSocketId: streamerId, description: connectionPeer.localDescription });
          } catch {
            setError('Unable to negotiate real-time media connection.');
          }
        });

        client.on('stream:webrtc-ice', async ({ candidate }) => {
          if (!peer.current?.remoteDescription) {
            pendingIce.current.push(candidate);
          } else {
            await peer.current.addIceCandidate(candidate).catch(() => {});
          }
        });
      } catch (e) {
        setError(getApiError(e, 'Unable to load stream details'));
      }
    }

    load();

    return () => {
      disposed = true;
      peer.current?.close();
      socket.current?.disconnect();
      hls.current?.destroy();
    };
  }, [id]);

  function reconnect() {
    setError('');
    setBuffering(true);
    socket.current?.emit('stream:join', { streamId: id, mode: 'viewer' });
  }

  function sendChat(e) {
    e.preventDefault();
    if (!message.trim()) return;
    socket.current?.emit('stream:chat', { message: message.trim() });
    setMessage('');
  }

  function react(type) {
    const next = myReaction === type ? null : type;
    setMyReaction(next);
    socket.current?.emit('stream:reaction', { reaction: next });
  }

  function togglePlay() {
    if (!video.current) return;
    if (video.current.paused) {
      video.current.play();
      setPlaying(true);
    } else {
      video.current.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    if (!video.current) return;
    const next = !muted;
    video.current.muted = next;
    setMuted(next);
  }

  function handleVolume(e) {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (video.current) {
      video.current.volume = val;
      video.current.muted = val === 0;
      setMuted(val === 0);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      video.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {showShare && (
        <ShareModal
          url={window.location.href}
          title={stream?.title || 'Live Stream'}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Main YouTube Live Style Layout */}
      <div className="stream-view-layout">
        {/* Left Column: Player & Streamer Metadata */}
        <div>
          <div className="stream-player-container">
            <video
              ref={video}
              autoPlay
              playsInline
              muted={muted}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />

            {/* Custom Interactive Player Overlays */}
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                zIndex: 10,
              }}
            >
              <span className="live-badge">
                <Radio size={12} /> LIVE
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(8px)',
                  fontSize: '0.75rem',
                  color: '#ffffff',
                }}
              >
                <Users size={13} /> {count} viewers
              </span>
            </div>

            {/* Bottom Controls Bar */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                padding: '2.5rem 1rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                zIndex: 10,
              }}
            >
              <button
                onClick={togglePlay}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
              >
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  onClick={toggleMute}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
                >
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolume}
                  style={{ width: '80px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={reconnect}
                  title="Reconnect video stream"
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex' }}
                >
                  <RefreshCw size={18} />
                </button>
                <button
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
                >
                  <Expand size={20} />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="form-error"
              style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>{error}</span>
              <button className="button ghost" onClick={reconnect} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                Reconnect
              </button>
            </div>
          )}

          {/* Stream Information Box */}
          <div className="stream-meta-box">
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.85rem' }}>
              {stream?.title || 'Live Stream Broadcast'}
            </h1>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="avatar-small" style={{ width: '2.5rem', height: '2.5rem', fontSize: '1rem' }}>
                  {stream?.owner?.name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>{stream?.owner?.name || 'Creator'}</strong>
                  <small style={{ color: 'var(--text-muted)' }}>@{stream?.owner?.username || 'streamer'}</small>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => react('like')}
                  className={`button ${myReaction === 'like' ? 'primary' : 'secondary'}`}
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <ThumbsUp size={15} /> {reactions.likes || 0}
                </button>
                <button
                  onClick={() => react('dislike')}
                  className={`button ${myReaction === 'dislike' ? 'primary' : 'secondary'}`}
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <ThumbsDown size={15} />
                </button>
                <button
                  onClick={() => setShowShare(true)}
                  className="button secondary"
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <Share2 size={15} /> Share
                </button>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  color: 'var(--accent-secondary)',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                }}
              >
                {stream?.category || 'Live Streaming'}
              </span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                {stream?.description || 'No description provided for this broadcast.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: YouTube Live Style Chat Drawer */}
        <aside className="stream-chat-card">
          <div className="chat-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} color="var(--accent-primary)" />
              <span>Live Chat</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Top chat</span>
          </div>

          <div className="chat-card-body">
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <p>Welcome to live chat!</p>
                <small>Messages appear here in real-time.</small>
              </div>
            ) : (
              messages.map((item) => (
                <div key={item.id} style={{ fontSize: '0.85rem', lineHeight: '1.45', display: 'flex', gap: '0.5rem' }}>
                  <span
                    style={{
                      width: '1.5rem',
                      height: '1.5rem',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary-light)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      flexShrink: 0,
                    }}
                  >
                    {item.sender?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <div>
                    <strong style={{ color: '#c084fc', marginRight: '0.4rem', fontSize: '0.8rem' }}>
                      {item.sender}
                    </strong>
                    <span style={{ color: 'var(--text-primary)' }}>{item.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <form className="chat-card-input-box" onSubmit={sendChat}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Chat as viewer..."
                maxLength={300}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  padding: '0.65rem 0.85rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                className="button primary"
                disabled={!message.trim()}
                style={{ padding: '0.65rem 0.9rem' }}
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
