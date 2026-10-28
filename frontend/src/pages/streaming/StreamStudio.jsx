import { useEffect, useRef, useState } from 'react';
import { Eye, FileVideo, Mic, MicOff, Monitor, Pause, Play, RefreshCw, Square, UserMinus, Video } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [videoSource, setVideoSource] = useState('camera'); // 'camera' | 'file' | 'screen'
  const [activeFileName, setActiveFileName] = useState('');
  const [filePlaying, setFilePlaying] = useState(false);

  // Helper to replace outgoing tracks on all active peer connections
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

    media.current = newStream;
    if (preview.current) {
      preview.current.srcObject = newStream;
      preview.current.play().catch(() => {});
    }
  }

  // Switch back to Camera
  async function switchToCamera() {
    try {
      if (fileVideoRef.current) {
        fileVideoRef.current.pause();
        fileVideoRef.current.src = '';
      }
      const camStream = await captureMedia();
      switchStreamTracks(camStream);
      setVideoSource('camera');
      setActiveFileName('');
    } catch (err) {
      setError(mediaError(err));
    }
  }

  // Handle local video file upload (MP4, WebM, etc.)
  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const videoEl = fileVideoRef.current;
      if (!videoEl) return;

      const fileUrl = URL.createObjectURL(file);
      videoEl.src = fileUrl;
      videoEl.loop = true;
      videoEl.muted = false;

      await videoEl.play();

      let streamFromFile;
      if (typeof videoEl.captureStream === 'function') {
        streamFromFile = videoEl.captureStream();
      } else if (typeof videoEl.mozCaptureStream === 'function') {
        streamFromFile = videoEl.mozCaptureStream();
      } else {
        throw new Error('Your browser does not support captureStream from video elements.');
      }

      switchStreamTracks(streamFromFile);
      setVideoSource('file');
      setActiveFileName(file.name);
      setFilePlaying(true);
    } catch (err) {
      setError('Unable to stream video file: ' + (err.message || 'Browser support limitation'));
    }
  }

  // Handle Screen Share as stream source
  async function handleScreenShare() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen sharing is not supported by your browser.');
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true,
      });

      // When user clicks browser stop sharing button
      const screenTrack = screenStream.getVideoTracks()[0];
      if (screenTrack) {
        screenTrack.onended = () => {
          switchToCamera();
        };
      }

      switchStreamTracks(screenStream);
      setVideoSource('screen');
      setActiveFileName('Screen Share');
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setError('Could not start screen sharing: ' + err.message);
      }
    }
  }

  function toggleFilePlayPause() {
    if (!fileVideoRef.current) return;
    if (fileVideoRef.current.paused) {
      fileVideoRef.current.play();
      setFilePlaying(true);
    } else {
      fileVideoRef.current.pause();
      setFilePlaying(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const { data } = await api.get(`/streams/${id}`);
        if (!active) return;
        setStream(data.stream);

        try {
          media.current = await captureMedia();
          if (preview.current) preview.current.srcObject = media.current;
        } catch (cameraError) {
          setError(mediaError(cameraError));
          return;
        }

        const client = io(socketUrl, getSocketOptions());
        socket.current = client;

        client.on('connect', () => {
          console.log('[StreamStudio Socket] Connected:', client.id);
          client.emit('stream:join', { streamId: id, mode: 'studio' });
        });

        client.on('connect_error', (err) => {
          console.error('[StreamStudio Socket] Connect error:', err.message);
          setError('Live connection is offline. Check that the backend is running.');
        });

        client.on('stream:error', ({ error: nextError }) => {
          setError(nextError || 'Stream connection failed.');
        });

        client.on('stream:viewer-count', ({ count: next }) => setCount(next));
        client.on('stream:viewers', ({ viewers: next }) => setViewers(next));
        client.on('stream:chat', (item) => {
          setMessages((items) => items.some((m) => m.id === item.id) ? items : [...items, item]);
        });

        client.on('stream:viewer-joined', async ({ viewerId }) => {
          if (!media.current) return;
          peers.current.get(viewerId)?.close();
          const peer = new RTCPeerConnection(rtcConfiguration);
          peers.current.set(viewerId, peer);
          pendingIce.current.delete(viewerId);

          media.current.getTracks().forEach((track) => peer.addTrack(track, media.current));

          peer.onicecandidate = ({ candidate }) => {
            if (candidate) client.emit('stream:webrtc-ice', { targetSocketId: viewerId, candidate });
          };

          peer.onconnectionstatechange = () => {
            if (['failed', 'closed'].includes(peer.connectionState)) {
              peer.close();
              peers.current.delete(viewerId);
            }
          };

          try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            client.emit('stream:webrtc-offer', { targetSocketId: viewerId, description: peer.localDescription });
          } catch {
            setError('Unable to create a connection for this viewer.');
          }
        });

        client.on('stream:webrtc-answer', async ({ viewerId, description }) => {
          const connection = peers.current.get(viewerId);
          if (!connection || connection.signalingState !== 'have-local-offer') return;
          await connection.setRemoteDescription(description);
          await flushIce(connection, pendingIce.current.get(viewerId));
          pendingIce.current.delete(viewerId);
        });

        client.on('stream:webrtc-ice', async ({ fromSocketId, candidate }) => {
          const connection = peers.current.get(fromSocketId);
          if (!connection || !connection.remoteDescription) {
            const list = pendingIce.current.get(fromSocketId) || [];
            list.push(candidate);
            pendingIce.current.set(fromSocketId, list);
            return;
          }
          await connection.addIceCandidate(candidate).catch(() => {});
        });
      } catch (requestError) {
        if (active) setError(getApiError(requestError, 'Unable to load this stream studio.'));
      }
    }

    init();
    return () => {
      active = false;
      peers.current.forEach((peer) => peer.close());
      peers.current.clear();
      pendingIce.current.clear();
      socket.current?.disconnect();
      media.current?.getTracks().forEach((track) => track.stop());
      if (fileVideoRef.current) {
        fileVideoRef.current.pause();
        fileVideoRef.current.src = '';
      }
    };
  }, [id]);

  async function changeState(next) {
    try {
      const { data } = await api.patch(`/streams/${id}/state`, { status: next });
      setStream(data.stream);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to update stream status.'));
    }
  }

  async function end() {
    try {
      await api.post(`/streams/${id}/end`);
      socket.current?.disconnect();
      navigate('/live');
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to end this stream.'));
    }
  }

  function send(event) {
    event.preventDefault();
    if (message.trim()) {
      socket.current?.emit('stream:chat', { message });
      setMessage('');
    }
  }

  return (
    <div className="meeting-room">
      <header className="meeting-header">
        <div>
          <strong>{stream?.title || 'Stream studio'}</strong>
          <small>
            <Eye size={14} /> {count} connected viewers · status: {stream?.status || 'loading'}
            {activeFileName && <span> · Playing: <strong>{activeFileName}</strong></span>}
          </small>
        </div>
        <div className="call-controls">
          <button
            className="control"
            onClick={() => changeState(stream?.status === 'paused' ? 'live' : 'paused')}
            disabled={!stream || stream.status === 'ended'}
          >
            {stream?.status === 'paused' ? <Play /> : <Pause />}
            <span>{stream?.status === 'paused' ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            className="control danger"
            onClick={end}
            disabled={!stream || stream.status === 'ended'}
          >
            <Square />
            <span>End</span>
          </button>
        </div>
      </header>

      {error && <div className="meeting-error">{error}</div>}

      {/* Hidden HTML5 video element for rendering uploaded video file into MediaStream */}
      <video
        ref={fileVideoRef}
        playsInline
        style={{ display: 'none' }}
        onEnded={() => setFilePlaying(false)}
      />

      <section className="call-layout">
        <div>
          <div style={{ position: 'relative' }}>
            <video className="stream-player" ref={preview} autoPlay muted playsInline />
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              display: 'flex',
              gap: '6px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              alignItems: 'center',
              zIndex: 10
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: videoSource === 'camera' ? '#10b981' : '#6366f1'
              }} />
              <span>Source: <strong>{videoSource.toUpperCase()}</strong> {activeFileName ? `(${activeFileName})` : ''}</span>
            </div>
          </div>

          <div className="participant-list" style={{ marginTop: '1rem' }}>
            <strong>Viewer list ({viewers.length}/50)</strong>
            {viewers.map((viewer) => (
              <span key={viewer.socketId}>
                <UserMinus size={14} />
                {viewer.name}
              </span>
            ))}
          </div>
        </div>

        <aside className="chat-panel">
          <h3>Live chat</h3>
          <div className="chat-messages">
            {messages.map((item) => (
              <div key={item.id}>
                <strong>{item.sender}</strong>
                <span>{item.message}</span>
              </div>
            ))}
          </div>
          <form onSubmit={send}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Moderate chat"
            />
            <button>Send</button>
          </form>
        </aside>
      </section>

      {/* Stream Controls Bar */}
      <div className="call-controls" style={{ marginTop: '1.5rem', background: '#18181b', padding: '0.8rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Switch Source Controls */}
        <button
          className={`control ${videoSource === 'camera' ? 'active' : ''}`}
          onClick={switchToCamera}
          title="Switch to Webcam"
        >
          <Video size={18} /> Camera
        </button>

        {/* Upload & Play Custom Video File */}
        <input
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <button
          className={`control ${videoSource === 'file' ? 'active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          title="Play custom video file (MP4/WebM) on stream"
        >
          <FileVideo size={18} /> {videoSource === 'file' ? 'Change Video File' : 'Play Video File'}
        </button>

        {/* If video file is active, show pause/play button */}
        {videoSource === 'file' && (
          <button className="control" onClick={toggleFilePlayPause}>
            {filePlaying ? <Pause size={18} /> : <Play size={18} />}
            {filePlaying ? 'Pause File' : 'Resume File'}
          </button>
        )}

        {/* Screen Share */}
        <button
          className={`control ${videoSource === 'screen' ? 'active' : ''}`}
          onClick={handleScreenShare}
          title="Share screen or browser tab into stream"
        >
          <Monitor size={18} /> Share Screen
        </button>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', margin: '0 8px' }} />

        {/* Microphone mute toggle */}
        <button
          className="control"
          onClick={() => {
            const next = !muted;
            media.current?.getAudioTracks().forEach((track) => {
              track.enabled = !next;
            });
            setMuted(next);
          }}
          disabled={!media.current?.getAudioTracks().length}
        >
          {muted ? <MicOff size={18} /> : <Mic size={18} />} {muted ? 'Unmute' : 'Mute'} Audio
        </button>
      </div>
    </div>
  );
}

async function flushIce(connection, candidates = []) { for (const candidate of candidates) await connection.addIceCandidate(candidate).catch(() => {}); }

async function captureMedia() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('MEDIA_UNAVAILABLE');
  try { return await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); } catch (error) {
    // Some systems expose one device but reject the combined request.
    const tracks = [];
    try { tracks.push(...(await navigator.mediaDevices.getUserMedia({ video: true, audio: false })).getVideoTracks()); } catch {}
    try { tracks.push(...(await navigator.mediaDevices.getUserMedia({ video: false, audio: true })).getAudioTracks()); } catch {}
    if (tracks.some((track) => track.kind === 'video')) return new MediaStream(tracks);
    tracks.forEach((track) => track.stop());
    const unavailable = new Error('VIDEO_UNAVAILABLE'); unavailable.name = 'NotFoundError'; throw unavailable;
    throw error;
  }
}

function mediaError(error) {
  if (!navigator.mediaDevices?.getUserMedia || (!window.isSecureContext && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname))) return 'Camera access requires HTTPS or localhost. Open the frontend using http://localhost:5173 or enable HTTPS.';
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'Camera or microphone permission was denied. Allow access for this site in the browser address-bar permissions, then reload the studio.';
  if (error?.message === 'VIDEO_UNAVAILABLE') return 'No camera was available. Connect or enable a camera, close other apps using it, and reload the studio.';
  if (error?.name === 'NotFoundError') return 'No camera or microphone was found. Connect a device and reload the studio.';
  if (error?.name === 'NotReadableError') return 'The camera or microphone is already being used by another application. Close it and reload the studio.';
  return 'The browser could not open your camera or microphone. Check device permissions and use HTTPS or localhost.';
}
