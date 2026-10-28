import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Eye,
  FileVideo,
  Mic,
  MicOff,
  Monitor,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Send,
  Square,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api, getApiError, getSocketOptions, rtcConfiguration, socketUrl } from '../../services/api.js';

export default function StreamStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const preview = useRef(null);
  const media = useRef(null);
  const fileVideoRef = useRef(null);
  const fileInputRef = useRef(null);
  const socket = useRef(null);
  const peers = useRef(new Map());
  const pendingIce = useRef(new Map());

  const [stream, setStream] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [count, setCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState('');
  const [videoSource, setVideoSource] = useState('camera'); // 'camera' | 'file' | 'screen'
  const [activeFileName, setActiveFileName] = useState('');
  const [filePlaying, setFilePlaying] = useState(false);

  function switchStreamTracks(newStream) {
    if (!newStream) return;
    const newVideoTrack = newStream.getVideoTracks()[0];
    const newAudioTrack = newStream.getAudioTracks()[0];

    peers.current.forEach((peer) => {
      const senders = peer.getSenders();
      if (newVideoTrack) {
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(newVideoTrack).catch(console.error);
        } else {
          peer.addTrack(newVideoTrack, newStream);
        }
      }
      if (newAudioTrack) {
        const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');
        if (audioSender) {
          audioSender.replaceTrack(newAudioTrack).catch(console.error);
        } else {
          peer.addTrack(newAudioTrack, newStream);
        }
      }
    });
  }

  async function createOffer(targetSocketId) {
    if (!media.current) return;
    const peer = new RTCPeerConnection(rtcConfiguration);
    peers.current.set(targetSocketId, peer);

    media.current.getTracks().forEach((track) => {
      peer.addTrack(track, media.current);
    });

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.current?.emit('stream:webrtc-ice', { targetSocketId, candidate });
      }
    };

    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.current?.emit('stream:webrtc-offer', { targetSocketId, description: peer.localDescription });
    } catch {
      setError('Unable to negotiate connection with incoming viewer.');
    }
  }

  useEffect(() => {
    let active = true;

    async function setup() {
      try {
        const { data } = await api.get(`/streams/${id}`);
        if (!active) return;
        setStream(data.stream);

        // Acquire initial camera/mic
        try {
          const streamMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          media.current = streamMedia;
          if (preview.current) {
            preview.current.srcObject = streamMedia;
          }
        } catch {
          setError('Camera/microphone preview is not available on this device.');
        }

        const client = io(socketUrl, getSocketOptions());
        socket.current = client;

        client.on('connect', () => {
          client.emit('stream:join', { streamId: id, mode: 'studio' });
        });

        client.on('stream:viewer-joined', ({ viewerId }) => {
          createOffer(viewerId);
        });

        client.on('stream:viewer-count', ({ count: next }) => setCount(next));
        client.on('stream:viewers', ({ viewers: next }) => setViewers(next || []));
        client.on('stream:chat', (item) => {
          setMessages((prev) => (prev.some((m) => m.id === item.id) ? prev : [...prev, item]));
        });

        client.on('stream:webrtc-answer', async ({ viewerId, description }) => {
          const peer = peers.current.get(viewerId);
          if (peer) {
            await peer.setRemoteDescription(description).catch(() => {});
            const pending = pendingIce.current.get(viewerId) || [];
            for (const cand of pending) {
              await peer.addIceCandidate(cand).catch(() => {});
            }
            pendingIce.current.delete(viewerId);
          }
        });

        client.on('stream:webrtc-ice', async ({ fromSocketId, candidate }) => {
          const peer = peers.current.get(fromSocketId);
          if (peer?.remoteDescription) {
            await peer.addIceCandidate(candidate).catch(() => {});
          } else {
            const list = pendingIce.current.get(fromSocketId) || [];
            list.push(candidate);
            pendingIce.current.set(fromSocketId, list);
          }
        });

        client.on('stream:error', (sErr) => setError(sErr.error));
      } catch (err) {
        setError(getApiError(err, 'Unable to initialize studio'));
      }
    }

    setup();

    return () => {
      active = false;
      media.current?.getTracks().forEach((t) => t.stop());
      peers.current.forEach((p) => p.close());
      socket.current?.disconnect();
    };
  }, [id]);

  async function setScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (preview.current) preview.current.srcObject = screenStream;
      media.current = screenStream;
      setVideoSource('screen');
      switchStreamTracks(screenStream);
      screenStream.getVideoTracks()[0].onended = () => resetToCamera();
    } catch {
      setError('Screen sharing was cancelled or unavailable.');
    }
  }

  async function resetToCamera() {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (preview.current) preview.current.srcObject = camStream;
      media.current = camStream;
      setVideoSource('camera');
      switchStreamTracks(camStream);
    } catch {}
  }

  function toggleMute() {
    if (!media.current) return;
    const next = !muted;
    media.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  function toggleCamera() {
    if (!media.current) return;
    const next = !cameraOff;
    media.current.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
  }

  function sendChat(e) {
    e.preventDefault();
    if (!message.trim()) return;
    socket.current?.emit('stream:chat', { message: message.trim() });
    setMessage('');
  }

  async function handleEndBroadcast() {
    if (window.confirm('Are you sure you want to end this live broadcast?')) {
      try {
        await api.post(`/streams/${id}/end`);
        navigate('/creator-dashboard');
      } catch (err) {
        setError(getApiError(err, 'Failed to end broadcast'));
      }
    }
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Studio Top Control Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem 1.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="live-badge"><Radio size={12} /> ON AIR</span>
            <h1 style={{ fontSize: '1.25rem', margin: 0 }}>{stream?.title || 'Creator Studio'}</h1>
          </div>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Category: {stream?.category || 'General'} · Status: {stream?.status || 'Active'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              fontWeight: '600',
            }}
          >
            <Users size={15} color="var(--accent-primary)" /> {count} Live Viewers
          </span>

          <button onClick={handleEndBroadcast} className="button danger" style={{ fontWeight: '700' }}>
            <Square size={14} fill="#fff" /> End Stream
          </button>
        </div>
      </div>

      {error && <div className="form-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* Main Studio Work Area */}
      <div className="stream-view-layout">
        {/* Left Column: Broadcaster Preview & Hardware Switching */}
        <div>
          <div className="stream-player-container">
            <video ref={preview} autoPlay muted playsInline />

            {/* Media Mode Pill */}
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-md)',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {videoSource === 'camera' && <Video size={13} color="#34d399" />}
              {videoSource === 'screen' && <Monitor size={13} color="#60a5fa" />}
              <span style={{ textTransform: 'capitalize' }}>Source: {videoSource}</span>
            </div>
          </div>

          {/* Broadcaster Device Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              marginTop: '1rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={toggleMute}
                className={`button ${muted ? 'danger' : 'secondary'}`}
                style={{ fontSize: '0.8rem' }}
              >
                {muted ? <MicOff size={15} /> : <Mic size={15} />}
                <span>{muted ? 'Unmute Mic' : 'Mute Mic'}</span>
              </button>

              <button
                onClick={toggleCamera}
                className={`button ${cameraOff ? 'danger' : 'secondary'}`}
                style={{ fontSize: '0.8rem' }}
              >
                {cameraOff ? <VideoOff size={15} /> : <Video size={15} />}
                <span>{cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {videoSource !== 'camera' ? (
                <button onClick={resetToCamera} className="button secondary" style={{ fontSize: '0.8rem' }}>
                  <Video size={15} /> Back to Camera
                </button>
              ) : (
                <button onClick={setScreenShare} className="button primary" style={{ fontSize: '0.8rem' }}>
                  <Monitor size={15} /> Present Screen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Chat Panel */}
        <aside className="stream-chat-card">
          <div className="chat-card-header">
            <span>Stream Chat & Activity</span>
            <small style={{ color: 'var(--text-muted)' }}>Moderator</small>
          </div>

          <div className="chat-card-body">
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <p>Chat will appear here</p>
                <small>Viewers can send messages to your stream.</small>
              </div>
            ) : (
              messages.map((item) => (
                <div key={item.id} style={{ fontSize: '0.85rem', lineHeight: '1.45', display: 'flex', gap: '0.5rem' }}>
                  <strong style={{ color: '#c084fc', fontSize: '0.8rem' }}>{item.sender}:</strong>
                  <span style={{ color: 'var(--text-primary)' }}>{item.message}</span>
                </div>
              ))
            )}
          </div>

          <form className="chat-card-input-box" onSubmit={sendChat}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Send a host announcement..."
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
