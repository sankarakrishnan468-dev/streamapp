import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Copy, Mic, MicOff, MonitorUp, PhoneOff, Send, Share2, UserMinus, Users } from 'lucide-react';
import { ParticipantEvent, Room, RoomEvent, Track } from 'livekit-client';
import { io } from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getApiError, getSocketOptions, socketUrl } from '../../services/api.js';
import ShareModal from '../../components/ShareModal.jsx';

const EMOJIS = ['👍', '👏', '❤️', '😂', '🎉', '🔥'];

function MediaTile({ participant, local = false, refreshKey }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    let currentVideoTrack = null;
    let currentAudioTrack = null;

    function updateTracks() {
      const publications = [...participant.trackPublications.values()];
      const videoPub =
        publications.find((item) => item.source === Track.Source.ScreenShare && item.track) ||
        publications.find((item) => item.source === Track.Source.Camera && item.track);
      const audioPub = publications.find(
        (item) => item.source === Track.Source.Microphone && item.track
      );

      const nextVideoTrack = videoPub?.track || null;
      const nextAudioTrack = audioPub?.track || null;

      if (nextVideoTrack !== currentVideoTrack) {
        if (currentVideoTrack && videoRef.current) {
          try { currentVideoTrack.detach(videoRef.current); } catch {}
        }
        currentVideoTrack = nextVideoTrack;
        if (nextVideoTrack && videoRef.current) {
          try {
            nextVideoTrack.attach(videoRef.current);
            videoRef.current.muted = local;
            videoRef.current.play().catch(() => {});
          } catch {}
          setHasVideo(!videoPub?.isMuted);
        } else {
          setHasVideo(false);
        }
      } else if (videoPub) {
        setHasVideo(!videoPub.isMuted && Boolean(nextVideoTrack));
        if (nextVideoTrack && videoRef.current && !videoPub.isMuted) {
          videoRef.current.play().catch(() => {});
        }
      } else {
        setHasVideo(false);
      }

      if (!local) {
        if (nextAudioTrack !== currentAudioTrack) {
          if (currentAudioTrack && audioRef.current) {
            try { currentAudioTrack.detach(audioRef.current); } catch {}
          }
          currentAudioTrack = nextAudioTrack;
          if (nextAudioTrack && audioRef.current) {
            try {
              nextAudioTrack.attach(audioRef.current);
              audioRef.current.autoplay = true;
              audioRef.current.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
            } catch {}
          }
        }
      }
    }

    updateTracks();

    const handleTrackSubscribed = () => updateTracks();
    const handleTrackUnsubscribed = () => updateTracks();
    const handleTrackPublished = () => updateTracks();
    const handleTrackUnpublished = () => updateTracks();
    const handleTrackMuted = () => updateTracks();
    const handleTrackUnmuted = () => updateTracks();
    const handleSpeakingChanged = (speaking) => setIsSpeaking(speaking);

    participant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
    participant.on(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    participant.on(ParticipantEvent.TrackPublished, handleTrackPublished);
    participant.on(ParticipantEvent.TrackUnpublished, handleTrackUnpublished);
    participant.on(ParticipantEvent.LocalTrackPublished, handleTrackPublished);
    participant.on(ParticipantEvent.LocalTrackUnpublished, handleTrackUnpublished);
    participant.on(ParticipantEvent.TrackMuted, handleTrackMuted);
    participant.on(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
    participant.on(ParticipantEvent.IsSpeakingChanged, handleSpeakingChanged);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
      participant.off(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      participant.off(ParticipantEvent.TrackPublished, handleTrackPublished);
      participant.off(ParticipantEvent.TrackUnpublished, handleTrackUnpublished);
      participant.off(ParticipantEvent.LocalTrackPublished, handleTrackPublished);
      participant.off(ParticipantEvent.LocalTrackUnpublished, handleTrackUnpublished);
      participant.off(ParticipantEvent.TrackMuted, handleTrackMuted);
      participant.off(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
      participant.off(ParticipantEvent.IsSpeakingChanged, handleSpeakingChanged);

      if (currentVideoTrack && videoRef.current) {
        try { currentVideoTrack.detach(videoRef.current); } catch {}
      }
      if (currentAudioTrack && audioRef.current) {
        try { currentAudioTrack.detach(audioRef.current); } catch {}
      }
    };
  }, [participant, local, refreshKey]);

  function playAudioManually() {
    if (audioRef.current) {
      audioRef.current.play().then(() => setAudioBlocked(false)).catch(() => {});
    }
  }

  const name = participant.name || participant.identity || 'Participant';
  const publications = [...participant.trackPublications.values()];
  const mic = publications.find((item) => item.source === Track.Source.Microphone);
  const camera = publications.find((item) => item.source === Track.Source.Camera);

  return (
    <div className={`video-tile ${hasVideo ? 'has-video' : 'no-video'}`} onClick={audioBlocked ? playAudioManually : undefined}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={local}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          position: 'absolute',
          inset: 0,
          zIndex: hasVideo ? 2 : 0,
          opacity: hasVideo ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
      {!hasVideo && (
        <div className="video-placeholder" style={{ zIndex: 1, width: '100%', height: '100%' }}>
          <strong>{name.slice(0, 1).toUpperCase()}</strong>
          <span>Camera off</span>
        </div>
      )}
      {!local && <audio ref={audioRef} autoPlay />}
      {audioBlocked && !local && (
        <button
          className="button ghost"
          style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 3, fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          onClick={(e) => { e.stopPropagation(); playAudioManually(); }}
        >
          🔊 Click to unmute
        </button>
      )}
      <span className="participant-label">
        {name}
        {local ? ' (You)' : ''}
        {isSpeaking || participant.isSpeaking ? ' · Speaking' : ''}
        {mic?.isMuted ? ' · Muted' : ''}
        {!hasVideo || camera?.isMuted ? ' · Camera off' : ''}
      </span>
    </div>
  );
}

export default function MeetingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const roomRef = useRef(null);
  const socketRef = useRef(null);
  const meetingRef = useRef(null);
  const sessionId = useRef(crypto.randomUUID().replaceAll('-', ''));
  const leaving = useRef(false);
  const connecting = useRef(false);
  const nonHostJoined = useRef(false);

  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [pending, setPending] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState('');
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showShare, setShowShare] = useState(false);

  const refreshParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    setParticipants([...room.remoteParticipants.values()]);
    setRefreshKey((value) => value + 1);
  }, []);

  async function connectMedia() {
    if (roomRef.current || leaving.current || connecting.current) return;
    connecting.current = true;
    try {
      setStatus('requesting LiveKit token');
      const code = meetingRef.current?.requiresAccessCode
        ? window.prompt('Enter the meeting password') || ''
        : '';
      const { data } = await api.post(`/meetings/${roomId}/media-token`, {
        sessionId: sessionId.current,
        accessCode: code,
      });

      if (data.mode !== 'livekit' || !data.url || !data.token) {
        throw new Error(
          'LiveKit is not configured on the server. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to backend/.env.'
        );
      }

      // adaptiveStream: false prevents track pausing on small meetings (max 5 participants)
      const room = new Room({ adaptiveStream: false, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, refreshParticipants);
      room.on(RoomEvent.ParticipantDisconnected, refreshParticipants);
      room.on(RoomEvent.TrackSubscribed, refreshParticipants);
      room.on(RoomEvent.TrackUnsubscribed, refreshParticipants);
      room.on(RoomEvent.TrackPublished, refreshParticipants);
      room.on(RoomEvent.TrackUnpublished, refreshParticipants);
      room.on(RoomEvent.TrackMuted, refreshParticipants);
      room.on(RoomEvent.TrackUnmuted, refreshParticipants);
      room.on(RoomEvent.LocalTrackPublished, refreshParticipants);
      room.on(RoomEvent.LocalTrackUnpublished, refreshParticipants);
      room.on(RoomEvent.ActiveSpeakersChanged, refreshParticipants);
      room.on(RoomEvent.Reconnecting, () => {
        console.warn('[MeetingRoom LiveKit] Reconnecting…');
        setStatus('reconnecting');
        setError('Connection interrupted. Reconnecting…');
      });
      room.on(RoomEvent.Reconnected, () => {
        console.log('[MeetingRoom LiveKit] Reconnected successfully');
        setStatus('connected');
        setError('');
        refreshParticipants();
      });
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('[MeetingRoom LiveKit] Connection state:', state);
        setStatus(state);
        if (state === 'disconnected') setError('LiveKit connection lost. Please check your network.');
      });

      await room.connect(data.url, data.token, { autoSubscribe: true });

      let cameraReady = false;
      let microphoneReady = false;
      let micErr = null;

      try {
        await room.localParticipant.setCameraEnabled(true);
        cameraReady = true;
        setCameraOff(false);
      } catch (camErr) {
        console.warn('[MeetingRoom] Camera acquisition warning:', camErr);
        setCameraOff(true);
      }

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        microphoneReady = true;
        setMuted(false);
      } catch (err) {
        console.warn('[MeetingRoom] Microphone acquisition warning:', err);
        setMuted(true);
        micErr = err;
      }

      setStatus('connected');
      refreshParticipants();

      if (!cameraReady && !microphoneReady) {
        setError('Connected without camera or microphone. Check browser and system permissions, then use the controls below to retry.');
      } else if (!cameraReady) {
        setError('Connected without camera. Check camera permissions or connect a camera, then use Camera on to retry.');
      } else if (!microphoneReady) {
        const errName = micErr?.name;
        const reason = errName === 'NotAllowedError' ? 'permission' : 'device';
        const msg =
          errName === 'NotAllowedError'
            ? 'Microphone access was denied. Allow it in your browser settings, then click Retry Microphone.'
            : errName === 'NotReadableError'
            ? 'Microphone is in use by another app. Close it and click Retry Microphone.'
            : 'No microphone detected. Connect a microphone, then click Retry Microphone.';
        setMicError(reason);
        setError(msg);
      }
    } catch (requestError) {
      await roomRef.current?.disconnect().catch(() => {});
      roomRef.current = null;
      setStatus('failed');
      const message =
        requestError.name === 'NotAllowedError'
          ? 'Camera and microphone permission was denied. Allow access in the browser and try again.'
          : getApiError(requestError, requestError.message || 'Unable to connect to the private call.');
      setError(message);
    } finally {
      connecting.current = false;
    }
  }

  useEffect(() => {
    let alive = true;
    async function start() {
      leaving.current = false;
      try {
        const { data } = await api.get(`/meetings/${roomId}`);
        if (!alive) return;
        meetingRef.current = data.meeting;
        setMeeting(data.meeting);

        const socket = io(socketUrl, getSocketOptions());
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('[MeetingRoom Socket] Connected:', socket.id);
          socket.emit('meeting:join', { roomId, sessionId: sessionId.current });
        });
        socket.on('connect_error', (event) => {
          console.error('[MeetingRoom Socket] Connect error:', event.message);
          setStatus('disconnected');
          setError(event.message || 'Meeting events are unavailable.');
        });
        socket.on('disconnect', (reason) => {
          console.warn('[MeetingRoom Socket] Disconnected:', reason);
        });
        socket.on('meeting:error', ({ error: nextError }) => {
          setStatus('denied');
          setError(nextError || 'Unable to join this meeting.');
        });
        socket.on('meeting:waiting', ({ message: nextMessage }) => {
          setWaiting(true);
          setStatus('waiting for approval');
          setError(nextMessage);
        });
        socket.on('meeting:approved', () => {
          setWaiting(false);
          setError('The host approved your request.');
          connectMedia();
        });
        socket.on('meeting:participants', () => {
          if (!data.meeting.isHost && !nonHostJoined.current) {
            nonHostJoined.current = true;
            connectMedia();
          }
        });
        socket.on('meeting:ended', ({ message: nextMessage }) => {
          setStatus('ended');
          setError(nextMessage || 'This meeting has ended.');
          roomRef.current?.disconnect().catch(() => {});
          roomRef.current = null;
        });
        socket.on('meeting:force-muted', ({ message: nextMessage }) => {
          roomRef.current?.localParticipant.setMicrophoneEnabled(false);
          setMuted(true);
          setError(nextMessage || 'Your microphone was muted by the host.');
        });
        socket.on('meeting:rejected', ({ message: nextMessage }) => {
          setStatus('rejected');
          setError(nextMessage || 'The host rejected your request.');
        });
        socket.on('meeting:guest-request', (request) => {
          setPending((items) =>
            items.some((item) => item.requestKey === request.requestKey) ? items : [...items, request]
          );
        });
        socket.on('meeting:participant-left', ({ name }) => {
          setMessages((items) => [
            ...items,
            { id: `${Date.now()}-${name}`, sender: 'System', message: `${name || 'Participant'} left` },
          ]);
        });
        socket.on('meeting:chat', (item) => {
          setMessages((items) =>
            items.some((current) => current.id === item.id) ? items : [...items, item]
          );
        });
        socket.on('meeting:reaction', (item) => {
          setMessages((items) => [
            ...items,
            { id: `${item.createdAt}-${item.sender}`, sender: item.sender, message: item.emoji },
          ]);
        });
        socket.on('meeting:removed', ({ message: nextMessage }) => {
          setError(nextMessage);
          leave();
        });

        // If host, meeting has no waiting room, or viewer is already approved, connect media immediately
        if (data.meeting.isHost || !data.meeting.waitingRoom || data.meeting.isApproved) {
          connectMedia();
        }
      } catch (requestError) {
        if (alive) {
          setStatus('denied');
          setError(
            requestError.response?.status === 401
              ? 'Sign in before joining this private meeting.'
              : getApiError(requestError, 'Unable to load the meeting.')
          );
        }
      }
    }

    start();
    return () => {
      alive = false;
      leave(false);
    };
  }, [roomId]);

  function approve(request) {
    socketRef.current?.emit('meeting:guest-approve', {
      targetSocketId: request.socketId,
      targetUserId: request.userId,
      requestKey: request.requestKey,
    });
    setPending((items) => items.filter((item) => item.requestKey !== request.requestKey));
  }

  function reject(request) {
    socketRef.current?.emit('meeting:guest-reject', {
      targetSocketId: request.socketId,
      targetUserId: request.userId,
      requestKey: request.requestKey,
    });
    setPending((items) => items.filter((item) => item.requestKey !== request.requestKey));
  }

  async function retryMicrophone() {
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(true);
      setMuted(false);
      setMicError('');
      setError('');
      refreshParticipants();
    } catch (requestError) {
      setError(
        requestError.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow it in browser settings, then click Retry Microphone.'
          : 'No microphone found on this device. Connect one and click Retry Microphone.'
      );
    }
  }

  async function toggleMicrophone() {
    const next = !muted;
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
      setMicError('');
      setError('');
      refreshParticipants();
    } catch (requestError) {
      setError(
        requestError.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow it in the browser and try again.'
          : 'No microphone is available on this device.'
      );
    }
  }

  async function toggleCamera() {
    const next = !cameraOff;
    try {
      await roomRef.current?.localParticipant.setCameraEnabled(!next);
      setCameraOff(next);
      setError('');
      refreshParticipants();
    } catch (requestError) {
      setError(
        requestError.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow it in the browser and try again.'
          : 'No camera is available on this device.'
      );
    }
  }

  async function toggleScreenShare() {
    try {
      const next = !sharing;
      await roomRef.current?.localParticipant.setScreenShareEnabled(next, { audio: true });
      setSharing(next);
      refreshParticipants();
    } catch {
      setError('Screen sharing was cancelled or is not supported.');
    }
  }

  function sendChat(event) {
    event.preventDefault();
    if (message.trim()) {
      socketRef.current?.emit('meeting:chat', { message: message.trim() });
      setMessage('');
    }
  }

  async function endMeeting() {
    try {
      await api.post(`/meetings/${roomId}/end`);
      leave();
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to end the meeting.'));
    }
  }

  async function leave(redirect = true) {
    if (leaving.current) return;
    leaving.current = true;
    try {
      if (roomRef.current?.localParticipant) {
        for (const publication of roomRef.current.localParticipant.trackPublications.values()) {
          if (publication.track) {
            try { publication.track.stop(); } catch {}
          }
        }
      }
    } catch {}
    await api.post(`/meetings/${roomId}/leave`, { sessionId: sessionId.current }).catch(() => {});
    await roomRef.current?.disconnect().catch(() => {});
    roomRef.current = null;
    socketRef.current?.disconnect();
    if (redirect) navigate('/meetings');
  }

  const allParticipants = roomRef.current
    ? [roomRef.current.localParticipant, ...participants]
    : [];
  const requestKey = (request) => request.requestKey || request.socketId || request.name;

  return (
    <div className="meeting-room">
      {showShare && (
        <ShareModal
          url={window.location.href}
          title={meeting?.title || 'Private meeting'}
          onClose={() => setShowShare(false)}
        />
      )}
      <header className="meeting-header">
        <div>
          <strong>{meeting?.title || 'Private meeting'}</strong>
          <small>
            Host: {meeting?.host?.name || 'Meeting host'} · {status} ·{' '}
            {allParticipants.length}/{meeting?.maxParticipants || 5} participants
          </small>
          <small>Room ID: {roomId}</small>
        </div>
        <button className="button ghost" onClick={() => setShowShare(true)}>
          <Share2 size={16} /> Share invite
        </button>
      </header>

      {error && (
        <div className="meeting-error" role="alert">
          <span>{error}</span>
          {micError && roomRef.current && (
            <button
              className="button ghost"
              style={{ marginLeft: '0.75rem', flexShrink: 0 }}
              onClick={retryMicrophone}
            >
              ↺ Retry Microphone
            </button>
          )}
        </div>
      )}

      {waiting && (
        <div className="meeting-waiting" role="status">
          Waiting for the host to approve your request…
        </div>
      )}

      {meeting?.isHost && pending.length > 0 && (
        <section className="meeting-requests">
          <strong>People waiting to join</strong>
          {pending.map((request) => (
            <div key={requestKey(request)}>
              <span>{request.name} wants to join</span>
              <button className="button primary" onClick={() => approve(request)}>
                Approve
              </button>
              <button className="button ghost" onClick={() => reject(request)}>
                Reject
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="call-layout">
        <div className="video-grid">
          {allParticipants.map((participant) => (
            <MediaTile
              key={participant.identity}
              participant={participant}
              local={participant === roomRef.current?.localParticipant}
              refreshKey={refreshKey}
            />
          ))}
        </div>

        <aside className="chat-panel">
          <h3>
            <Users size={16} /> In-call chat
          </h3>
          <div className="chat-messages">
            {messages.map((item) => (
              <div key={item.id}>
                <strong>{item.sender}</strong>
                <span>{item.message}</span>
              </div>
            ))}
          </div>
          <div className="reaction-bar">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => socketRef.current?.emit('meeting:reaction', { emoji })}
              >
                {emoji}
              </button>
            ))}
          </div>
          <form onSubmit={sendChat}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Message the group"
            />
            <button aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </aside>
      </section>

      <footer className="call-controls">
        <button className="control" onClick={toggleMicrophone} disabled={!roomRef.current}>
          {muted ? <MicOff /> : <Mic />}
          <span>{muted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button className="control" onClick={toggleCamera} disabled={!roomRef.current}>
          {cameraOff ? <CameraOff /> : <Camera />}
          <span>{cameraOff ? 'Camera on' : 'Camera off'}</span>
        </button>
        <button className="control" onClick={toggleScreenShare} disabled={!roomRef.current}>
          <MonitorUp />
          <span>{sharing ? 'Stop sharing' : 'Share screen'}</span>
        </button>
        {meeting?.isHost && (
          <button className="control danger" onClick={endMeeting}>
            <PhoneOff />
            <span>End meeting</span>
          </button>
        )}
        <button className="control danger" onClick={() => leave()}>
          <PhoneOff />
          <span>Leave</span>
        </button>
      </footer>

      {meeting?.isHost && participants.length > 0 && (
        <div className="participant-list">
          {participants.map((participant) => (
            <span key={participant.identity}>
              <button
                onClick={() =>
                  socketRef.current?.emit('meeting:mute', { targetSocketId: participant.identity.split('_')[0] })
                }
              >
                <MicOff size={14} /> Mute {participant.name || 'Participant'}
              </button>
              <button
                onClick={() =>
                  socketRef.current?.emit('meeting:kick', { targetSocketId: participant.identity.split('_')[0] })
                }
              >
                <UserMinus size={14} /> Remove
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
