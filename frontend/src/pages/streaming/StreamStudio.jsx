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
  Upload,
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
  const videoFilePlayer = useRef(null);
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
  const [videoSource, setVideoSource] = useState('camera'); // 'camera' | 'screen' | 'video'
  const [myVideos, setMyVideos] = useState([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [selectedVideoTitle, setSelectedVideoTitle] = useState('');
  const [isPlayingVideoFile, setIsPlayingVideoFile] = useState(false);

  // Switch active tracks on all connected viewer WebRTC peer connections
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

  // Load stream data, local videos, and setup WebRTC socket
  useEffect(() => {
    let active = true;

    async function setup() {
      try {
        const [{ data: streamData }, { data: videoData }] = await Promise.all([
          api.get(`/streams/${id}`),
          api.get('/videos/mine').catch(() => ({ data: { videos: [] } })),
        ]);

        if (!active) return;
        setStream(streamData.stream);
        setMyVideos(videoData.videos || []);

        // Hardware detection and camera setup
        try {
          if (!navigator.mediaDevices?.getUserMedia) {
            setError('Media devices are not supported in this browser.');
          } else {
            const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
            const hasVideo = devices.some((d) => d.kind === 'videoinput');
            const hasAudio = devices.some((d) => d.kind === 'audioinput');

            if (!hasVideo && !hasAudio) {
              setError('No physical camera or mic found. You can present your Screen or play Uploaded Videos below.');
            } else {
              let streamMedia = null;
              try {
                streamMedia = await navigator.mediaDevices.getUserMedia({
                  video: hasVideo,
                  audio: hasAudio,
                });
              } catch {
                if (hasVideo) {
                  try {
                    streamMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                  } catch {}
                }
                if (!streamMedia && hasAudio) {
                  try {
                    streamMedia = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                  } catch {}
                }
              }

              if (streamMedia) {
                media.current = streamMedia;
                if (preview.current) {
                  preview.current.srcObject = streamMedia;
                }
                setError('');
              }
            }
          }
        } catch (mediaErr) {
          setError('Camera/mic could not be started. You can use Screen Share or Video Playback.');
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

  // 1. Share Screen (System screen, window, or tab)
  async function handleScreenShare() {
    setError('');
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError('Screen sharing is not supported by your browser or environment.');
        return;
      }

      let screenStream = null;
      try {
        // Attempt sharing with audio
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true,
        });
      } catch (audioErr) {
        // If audio sharing is unsupported or refused by OS, fallback to video-only display media
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });
      }

      if (preview.current) preview.current.srcObject = screenStream;
      media.current = screenStream;
      setVideoSource('screen');
      switchStreamTracks(screenStream);

      // Handle user clicking native "Stop sharing" button
      screenStream.getVideoTracks()[0].onended = () => {
        handleBackToCamera();
      };
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        // User clicked "Cancel" on the browser screen-picker popup
        // Keep current stream intact and don't treat cancellation as a hard error
        setError('');
      } else {
        setError(err.message || 'Screen sharing is unavailable.');
      }
    }
  }

  // 2. Play Uploaded or Local Video File Directly on Stream
  function handlePlayVideoOnStream(videoUrl, title) {
    if (!videoUrl || !videoFilePlayer.current) return;
    setError('');
    setSelectedVideoUrl(videoUrl);
    setSelectedVideoTitle(title || 'Video Player');

    const vElem = videoFilePlayer.current;
    vElem.src = videoUrl;
    vElem.play().then(() => {
      // Capture live stream from the HTML5 video element
      let capturedStream = null;
      if (typeof vElem.captureStream === 'function') {
        capturedStream = vElem.captureStream();
      } else if (typeof vElem.mozCaptureStream === 'function') {
        capturedStream = vElem.mozCaptureStream();
      }

      if (capturedStream) {
        if (preview.current) preview.current.srcObject = capturedStream;
        media.current = capturedStream;
        setVideoSource('video');
        setIsPlayingVideoFile(true);
        switchStreamTracks(capturedStream);

        capturedStream.getVideoTracks()[0].onended = () => {
          setIsPlayingVideoFile(false);
        };
      }
    }).catch((err) => {
      setError('Unable to play video source on live stream.');
    });
  }

  // 3. Play Local MP4/WebM file from user's hard drive
  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      handlePlayVideoOnStream(fileUrl, file.name);
    }
  }

  // 4. Return Back to Camera
  async function handleBackToCamera() {
    try {
      if (videoFilePlayer.current) {
        videoFilePlayer.current.pause();
      }
      setIsPlayingVideoFile(false);
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (preview.current) preview.current.srcObject = camStream;
      media.current = camStream;
      setVideoSource('camera');
      switchStreamTracks(camStream);
    } catch {
      setVideoSource('camera');
    }
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
      {/* Hidden helper video element for capturing canvas/video tracks */}
      <video
        ref={videoFilePlayer}
        playsInline
        style={{ display: 'none' }}
        onEnded={() => setIsPlayingVideoFile(false)}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="video/mp4,video/webm,video/ogg"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

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
        {/* Left Column: Broadcaster Preview & Media Sources */}
        <div>
          <div className="stream-player-container">
            <video ref={preview} autoPlay muted playsInline />

            {/* Media Source Indicator */}
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                backgroundColor: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-md)',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {videoSource === 'camera' && <Video size={13} color="#34d399" />}
              {videoSource === 'screen' && <Monitor size={13} color="#60a5fa" />}
              {videoSource === 'video' && <Play size={13} color="#f43f5e" />}
              <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                Broadcasting: {videoSource === 'video' ? `Video (${selectedVideoTitle})` : videoSource}
              </span>
            </div>
          </div>

          {/* Broadcaster Source Controls */}
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
            {/* Mic & Camera Toggles */}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={toggleMute}
                className={`button ${muted ? 'danger' : 'secondary'}`}
                style={{ fontSize: '0.8rem' }}
              >
                {muted ? <MicOff size={15} /> : <Mic size={15} />}
                <span>{muted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                onClick={toggleCamera}
                className={`button ${cameraOff ? 'danger' : 'secondary'}`}
                style={{ fontSize: '0.8rem' }}
              >
                {cameraOff ? <VideoOff size={15} /> : <Video size={15} />}
                <span>{cameraOff ? 'Cam Off' : 'Cam On'}</span>
              </button>
            </div>

            {/* Source Switchers: Camera / Screen / Video */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {videoSource !== 'camera' && (
                <button onClick={handleBackToCamera} className="button ghost" style={{ fontSize: '0.8rem' }}>
                  <Video size={15} /> Back to Camera
                </button>
              )}

              <button
                onClick={handleScreenShare}
                className={`button ${videoSource === 'screen' ? 'primary' : 'secondary'}`}
                style={{ fontSize: '0.8rem' }}
              >
                <Monitor size={15} /> Share Screen
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="button secondary"
                style={{ fontSize: '0.8rem' }}
                title="Play an MP4 file from your computer"
              >
                <Upload size={15} /> Play Local Video
              </button>
            </div>
          </div>

          {/* Video Library Strip: Play your uploaded videos on stream */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              marginTop: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileVideo size={16} color="#818cf8" /> Play Your Uploaded Videos on Stream
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {myVideos.length} uploaded videos available
              </span>
            </div>

            {myVideos.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.75rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {myVideos.map((vid) => (
                  <div
                    key={vid._id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {vid.title}
                    </div>
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', margin: '0.2rem 0 0.5rem' }}>
                      {vid.category || 'Video'} · {vid.views || 0} views
                    </small>
                    <button
                      onClick={() => handlePlayVideoOnStream(vid.playbackUrl, vid.title)}
                      className="button primary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Play size={12} fill="#fff" /> Broadcast Video
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                You haven't uploaded any videos yet. You can use <strong>Play Local Video</strong> above to select an MP4 file from your device, or upload one in Creator Studio.
              </div>
            )}
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
