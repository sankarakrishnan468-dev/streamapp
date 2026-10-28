import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CameraOff,
  Captions,
  Check,
  Clock,
  Copy,
  Hand,
  LogOut,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  MoreVertical,
  PhoneOff,
  Send,
  Settings,
  Share2,
  Smile,
  UserCheck,
  UserX,
  Users,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { ParticipantEvent, Room, RoomEvent, Track } from 'livekit-client';
import { io } from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getApiError, getSocketOptions, socketUrl } from '../../services/api.js';
import ShareModal from '../../components/ShareModal.jsx';

const EMOJIS = ['👍', '👏', '❤️', '🔥', '🎉', '👋'];

function ParticipantTile({
  participant,
  local = false,
  isHostTile = false,
  isCurrentHost,
  handRaised = false,
  onMute,
  onRemove,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let currentVideo = null;
    let currentAudio = null;

    function syncTracks() {
      const pubs = [...participant.trackPublications.values()];
      const screenPub = pubs.find((p) => p.source === Track.Source.ScreenShare && p.track);
      const camPub = pubs.find((p) => p.source === Track.Source.Camera && p.track);
      const activeVideoPub = screenPub || camPub;
      const micPub = pubs.find((p) => p.source === Track.Source.Microphone && p.track);

      setIsMuted(Boolean(micPub?.isMuted || !micPub));

      const vTrack = activeVideoPub?.track || null;
      if (vTrack !== currentVideo) {
        if (currentVideo && videoRef.current) {
          try { currentVideo.detach(videoRef.current); } catch {}
        }
        currentVideo = vTrack;
        if (vTrack && videoRef.current) {
          try {
            vTrack.attach(videoRef.current);
            videoRef.current.muted = local;
            videoRef.current.play().catch(() => {});
          } catch {}
          setHasVideo(!activeVideoPub?.isMuted);
        } else {
          setHasVideo(false);
        }
      } else if (activeVideoPub) {
        setHasVideo(!activeVideoPub.isMuted && Boolean(vTrack));
      }

      if (!local) {
        const aTrack = micPub?.track || null;
        if (aTrack !== currentAudio) {
          if (currentAudio && audioRef.current) {
            try { currentAudio.detach(audioRef.current); } catch {}
          }
          currentAudio = aTrack;
          if (aTrack && audioRef.current) {
            try {
              aTrack.attach(audioRef.current);
              audioRef.current.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
            } catch {}
          }
        }
      }
    }

    syncTracks();

    const onUpdate = () => syncTracks();
    const onSpeaking = (speaking) => setIsSpeaking(speaking);

    participant.on(ParticipantEvent.TrackSubscribed, onUpdate);
    participant.on(ParticipantEvent.TrackUnsubscribed, onUpdate);
    participant.on(ParticipantEvent.TrackPublished, onUpdate);
    participant.on(ParticipantEvent.TrackUnpublished, onUpdate);
    participant.on(ParticipantEvent.LocalTrackPublished, onUpdate);
    participant.on(ParticipantEvent.LocalTrackUnpublished, onUpdate);
    participant.on(ParticipantEvent.TrackMuted, onUpdate);
    participant.on(ParticipantEvent.TrackUnmuted, onUpdate);
    participant.on(ParticipantEvent.IsSpeakingChanged, onSpeaking);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, onUpdate);
      participant.off(ParticipantEvent.TrackUnsubscribed, onUpdate);
      participant.off(ParticipantEvent.TrackPublished, onUpdate);
      participant.off(ParticipantEvent.TrackUnpublished, onUpdate);
      participant.off(ParticipantEvent.LocalTrackPublished, onUpdate);
      participant.off(ParticipantEvent.LocalTrackUnpublished, onUpdate);
      participant.off(ParticipantEvent.TrackMuted, onUpdate);
      participant.off(ParticipantEvent.TrackUnmuted, onUpdate);
      participant.off(ParticipantEvent.IsSpeakingChanged, onSpeaking);

      if (currentVideo && videoRef.current) {
        try { currentVideo.detach(videoRef.current); } catch {}
      }
      if (currentAudio && audioRef.current) {
        try { currentAudio.detach(audioRef.current); } catch {}
      }
    };
  }, [participant, local]);

  const name = participant.name || participant.identity || 'Participant';
  let metadata = {};
  try {
    metadata = JSON.parse(participant.metadata || '{}');
  } catch {}

  const displayName = local ? `${name} (You)` : name;

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '1rem',
        backgroundColor: '#18181b',
        border: isSpeaking ? '2px solid #3b82f6' : '1px solid #27272a',
        boxShadow: isSpeaking ? '0 0 16px rgba(59,130,246,0.35)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '16 / 9',
        width: '100%',
        minHeight: '220px',
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
      }}
    >
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
          opacity: hasVideo ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      {!hasVideo && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #27272a 0%, #18181b 100%)',
            color: '#a1a1aa',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '4.5rem',
              height: '4.5rem',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#ffffff',
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Camera off
          </span>
        </div>
      )}

      {!local && <audio ref={audioRef} autoPlay />}

      {audioBlocked && !local && (
        <button
          onClick={() => audioRef.current?.play().then(() => setAudioBlocked(false))}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            backgroundColor: '#f59e0b',
            color: '#000',
            fontSize: '0.75rem',
            fontWeight: '600',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Volume2 size={13} /> Click to unmute
        </button>
      )}

      {/* Hand Raised Badge */}
      {handRaised && (
        <div
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.35rem 0.65rem',
            backgroundColor: '#eab308',
            color: '#000',
            fontSize: '0.75rem',
            fontWeight: '700',
            borderRadius: '9999px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <Hand size={14} /> Raised Hand
        </div>
      )}

      {/* Name and audio status badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '0.75rem',
          left: '0.75rem',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          backgroundColor: 'rgba(9, 9, 11, 0.75)',
          backdropFilter: 'blur(8px)',
          fontSize: '0.75rem',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <span>{displayName}</span>
        {isMuted ? <MicOff size={13} color="#f87171" /> : <Mic size={13} color="#34d399" />}
        {isHostTile && (
          <span
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              fontSize: '0.65rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '0.25rem',
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            Host
          </span>
        )}
      </div>

      {/* Host Moderation Menu */}
      {isCurrentHost && !local && (
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 20 }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              padding: '0.4rem',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                marginTop: '0.25rem',
                width: '9.5rem',
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                zIndex: 30,
              }}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onMute?.(metadata.userId);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  color: '#e4e4e7',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                <MicOff size={13} color="#fbbf24" /> Mute mic
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onRemove?.(metadata.userId);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  color: '#f87171',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                <UserX size={13} /> Remove user
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MeetingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const roomRef = useRef(null);
  const socketRef = useRef(null);
  const mediaStreamPreviewRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mainContainerRef = useRef(null);

  // States
  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [status, setStatus] = useState('lobby'); // 'lobby', 'waiting', 'connected', 'reconnecting', 'ended'
  const [error, setError] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'participants'

  // Device selectors & hardware states
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [videoInputDevices, setVideoInputDevices] = useState([]);
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Google Meet Features
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState(new Set()); // set of userIds
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionsText, setCaptionsText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Device Enumeration & Safe Media Initializer
  async function loadDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      const cams = devices.filter((d) => d.kind === 'videoinput');
      setAudioInputDevices(mics);
      setVideoInputDevices(cams);
      if (mics.length > 0 && !selectedAudioId) setSelectedAudioId(mics[0].deviceId);
      if (cams.length > 0 && !selectedVideoId) setSelectedVideoId(cams[0].deviceId);
    } catch {}
  }

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices?.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  // Safe Camera & Mic Preview for Lobby
  useEffect(() => {
    let active = true;
    async function startLobbyPreview() {
      try {
        if (mediaStreamPreviewRef.current) {
          mediaStreamPreviewRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamPreviewRef.current = null;
        }

        // Try requesting both camera and mic gracefully
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
            audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
          });
          setCamEnabled(true);
          setMicEnabled(true);
        } catch (bothErr) {
          // If video fails (no camera), fallback to audio-only
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
            });
            setMicEnabled(true);
            setCamEnabled(false);
          } catch (audioErr) {
            // Neither or permission denied
            setCamEnabled(false);
            setMicEnabled(false);
          }
        }

        if (!active) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (stream) {
          mediaStreamPreviewRef.current = stream;
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Lobby preview initialization:', err);
      }
    }

    if (status === 'lobby') {
      startLobbyPreview();
    }

    return () => {
      active = false;
      if (mediaStreamPreviewRef.current) {
        mediaStreamPreviewRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamPreviewRef.current = null;
      }
    };
  }, [status, selectedVideoId, selectedAudioId]);

  // 2. Fetch Meeting Metadata
  useEffect(() => {
    let alive = true;
    async function fetchMeetingDetails() {
      try {
        const { data } = await api.get(`/meetings/${roomId}`);
        if (alive) {
          setMeeting(data.meeting);
          // If the user is the host, auto-join socket signaling immediately so they can receive admission requests
          if (data.meeting?.isHost) {
            handleJoinMeeting();
          }
        }
      } catch (err) {
        if (alive) {
          setError(getApiError(err, 'Could not find this meeting'));
        }
      }
    }
    fetchMeetingDetails();
    return () => { alive = false; };
  }, [roomId]);

  // Handle preview camera/mic toggling
  const togglePreviewCam = async () => {
    if (mediaStreamPreviewRef.current) {
      const vTrack = mediaStreamPreviewRef.current.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setCamEnabled(vTrack.enabled);
        return;
      }
    }
    // Attempt to acquire video if not present
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const newVTrack = videoStream.getVideoTracks()[0];
      if (mediaStreamPreviewRef.current) {
        mediaStreamPreviewRef.current.addTrack(newVTrack);
      } else {
        mediaStreamPreviewRef.current = videoStream;
      }
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = mediaStreamPreviewRef.current;
      }
      setCamEnabled(true);
    } catch {}
  };

  const togglePreviewMic = async () => {
    if (mediaStreamPreviewRef.current) {
      const aTrack = mediaStreamPreviewRef.current.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setMicEnabled(aTrack.enabled);
        return;
      }
    }
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const newATrack = audioStream.getAudioTracks()[0];
      if (mediaStreamPreviewRef.current) {
        mediaStreamPreviewRef.current.addTrack(newATrack);
      } else {
        mediaStreamPreviewRef.current = audioStream;
      }
      setMicEnabled(true);
    } catch {}
  };

  const syncParticipants = useCallback(() => {
    if (!roomRef.current) return;
    setParticipants([...roomRef.current.remoteParticipants.values()]);
  }, []);

  // 3. Connect to LiveKit SFU Room
  async function connectLiveKit() {
    try {
      if (mediaStreamPreviewRef.current) {
        mediaStreamPreviewRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamPreviewRef.current = null;
      }

      const { data } = await api.post(`/meetings/${roomId}/media-token`);
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, syncParticipants);
      room.on(RoomEvent.ParticipantDisconnected, syncParticipants);
      room.on(RoomEvent.TrackSubscribed, syncParticipants);
      room.on(RoomEvent.TrackUnsubscribed, syncParticipants);
      room.on(RoomEvent.TrackPublished, syncParticipants);
      room.on(RoomEvent.TrackUnpublished, syncParticipants);
      room.on(RoomEvent.TrackMuted, syncParticipants);
      room.on(RoomEvent.TrackUnmuted, syncParticipants);
      room.on(RoomEvent.ActiveSpeakersChanged, syncParticipants);

      room.on(RoomEvent.Reconnecting, () => setStatus('reconnecting'));
      room.on(RoomEvent.Reconnected, () => {
        setStatus('connected');
        syncParticipants();
      });

      await room.connect(data.url, data.token);

      // Safe media publishing
      if (camEnabled) {
        try {
          await room.localParticipant.setCameraEnabled(true);
        } catch {}
      }
      if (micEnabled) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch {}
      }

      setStatus('connected');
      syncParticipants();
    } catch (err) {
      setError(getApiError(err, 'Failed to connect to media session. Verify server LiveKit credentials.'));
    }
  }

  // 4. Socket.IO Meeting Signaling
  const handleJoinMeeting = () => {
    const socket = io(socketUrl, {
      ...getSocketOptions(),
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.emit('meeting:join', { roomId });

    socket.on('meeting:waiting', () => {
      setStatus('waiting');
    });

    socket.on('meeting:ready', () => {
      connectLiveKit();
    });

    socket.on('meeting:approved', () => {
      connectLiveKit();
    });

    socket.on('meeting:rejected', (data) => {
      setError(data.message || 'Host declined your request to join.');
      setStatus('lobby');
    });

    socket.on('meeting:guest-request', (reqData) => {
      setPendingRequests((prev) => {
        if (prev.some((r) => r.userId === reqData.userId)) return prev;
        return [...prev, reqData];
      });
    });

    socket.on('meeting:pending-list', ({ requests }) => {
      setPendingRequests(requests || []);
    });

    socket.on('meeting:participant-approved', ({ userId }) => {
      setPendingRequests((prev) => prev.filter((r) => r.userId !== userId));
    });

    socket.on('meeting:request-mute', () => {
      if (roomRef.current?.localParticipant) {
        roomRef.current.localParticipant.setMicrophoneEnabled(false);
        setMicEnabled(false);
      }
    });

    socket.on('meeting:hand-toggle', ({ userId, raised }) => {
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (raised) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    socket.on('meeting:removed', ({ message }) => {
      setError(message);
      leaveMeeting(false);
    });

    socket.on('meeting:ended', ({ message }) => {
      setError(message);
      setStatus('ended');
      leaveMeeting(false);
    });

    socket.on('meeting:chat', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('meeting:reaction', (reaction) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${reaction.createdAt}-${reaction.sender}`,
          sender: reaction.sender,
          message: reaction.emoji,
          isReaction: true,
        },
      ]);
    });

    socket.on('meeting:error', ({ error: sErr }) => {
      setError(sErr);
    });
  };

  // Host Action: Approve participant
  const handleApprove = (userId) => {
    socketRef.current?.emit('meeting:host-approve', { targetUserId: userId });
    setPendingRequests((prev) => prev.filter((r) => r.userId !== userId));
  };

  // Host Action: Reject participant
  const handleReject = (userId) => {
    socketRef.current?.emit('meeting:host-reject', { targetUserId: userId });
    setPendingRequests((prev) => prev.filter((r) => r.userId !== userId));
  };

  const toggleMic = async () => {
    if (!roomRef.current) return;
    const nextState = !micEnabled;
    try {
      if (nextState) {
        // Check if an audio input device actually exists before requesting
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMic = devices.some((d) => d.kind === 'audioinput');
        if (!hasMic) {
          setError('No microphone found on your device.');
          return;
        }
      }
      await roomRef.current.localParticipant.setMicrophoneEnabled(nextState);
      setMicEnabled(nextState);
      setError('');
      syncParticipants();
    } catch (e) {
      console.warn('Mic toggle error:', e);
      if (e.name === 'NotFoundError' || e.message?.includes('not found')) {
        setError('Microphone not detected. Please connect an audio input device.');
      } else if (e.name === 'NotAllowedError') {
        setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
      } else {
        setError('Unable to toggle microphone.');
      }
    }
  };

  const toggleCam = async () => {
    if (!roomRef.current) return;
    const nextState = !camEnabled;
    try {
      if (nextState) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCam = devices.some((d) => d.kind === 'videoinput');
        if (!hasCam) {
          setError('No camera found on your device.');
          return;
        }
      }
      await roomRef.current.localParticipant.setCameraEnabled(nextState);
      setCamEnabled(nextState);
      setError('');
      syncParticipants();
    } catch (e) {
      console.warn('Camera toggle error:', e);
      if (e.name === 'NotFoundError' || e.message?.includes('not found')) {
        setError('Camera not detected. Please connect a webcam.');
      } else if (e.name === 'NotAllowedError') {
        setError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else {
        setError('Unable to toggle camera.');
      }
    }
  };

  const toggleScreen = async () => {
    if (!roomRef.current) return;
    const nextState = !screenSharing;
    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(nextState);
      setScreenSharing(nextState);
      syncParticipants();
    } catch {
      setScreenSharing(false);
    }
  };

  // Hand Raise Control
  const toggleHandRaise = () => {
    const next = !handRaised;
    setHandRaised(next);
    const userId = meeting?.host?._id;
    socketRef.current?.emit('meeting:hand-toggle', { raised: next });
  };

  // Captions (Live Speech Recognition API)
  const toggleCaptions = () => {
    const next = !captionsEnabled;
    setCaptionsEnabled(next);
    if (next) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join(' ');
          setCaptionsText(transcript);
        };
        recognition.start();
        recognition.onerror = () => setCaptionsEnabled(false);
      } else {
        setCaptionsText('Live captions are supported in Chrome/Edge browsers.');
      }
    } else {
      setCaptionsText('');
    }
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mainContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current?.emit('meeting:chat', { message: chatInput });
    setChatInput('');
  };

  const sendReaction = (emoji) => {
    socketRef.current?.emit('meeting:reaction', { emoji });
  };

  const leaveMeeting = async (redirect = true) => {
    if (roomRef.current) {
      try { roomRef.current.disconnect(); } catch {}
      roomRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (redirect) navigate('/meetings');
  };

  const handleEndMeeting = async () => {
    try {
      await api.post(`/meetings/${roomId}/end`);
      leaveMeeting();
    } catch (err) {
      setError(getApiError(err, 'Failed to end meeting'));
    }
  };

  const allParticipants = roomRef.current
    ? [roomRef.current.localParticipant, ...participants]
    : [];

  // --- LOBBY / PRE-JOIN VIEW ---
  if (status === 'lobby') {
    return (
      <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '34rem', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '1.25rem', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', color: '#60a5fa' }}>
              Google Meet Experience
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', marginTop: '0.25rem' }}>{meeting?.title || 'Private Meeting'}</h1>
            <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '0.25rem' }}>
              Host: {meeting?.host?.name || 'Loading...'} · Maximum {meeting?.maxParticipants || 5} participants
            </p>
          </div>

          {/* Lobby Media Preview Box */}
          <div style={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: '0.875rem', overflow: 'hidden', backgroundColor: '#09090b', border: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: camEnabled ? 1 : 0 }}
            />
            {!camEnabled && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#71717a', gap: '0.5rem' }}>
                <CameraOff size={36} />
                <span style={{ fontSize: '0.8rem' }}>Camera is turned off or not detected</span>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={togglePreviewMic}
                style={{
                  padding: '0.75rem',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: micEnabled ? 'rgba(39, 39, 42, 0.85)' : '#e11d48',
                  color: '#ffffff',
                }}
              >
                {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                type="button"
                onClick={togglePreviewCam}
                style={{
                  padding: '0.75rem',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: camEnabled ? 'rgba(39, 39, 42, 0.85)' : '#e11d48',
                  color: '#ffffff',
                }}
              >
                {camEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
              </button>
            </div>
          </div>

          {/* Device Selection Pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '0.25rem' }}>Microphone</label>
              <select
                value={selectedAudioId}
                onChange={(e) => setSelectedAudioId(e.target.value)}
                style={{ width: '100%', backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '0.5rem', padding: '0.5rem', color: '#ffffff' }}
              >
                {audioInputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '0.25rem' }}>Camera</label>
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                style={{ width: '100%', backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '0.5rem', padding: '0.5rem', color: '#ffffff' }}
              >
                {videoInputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.75rem', color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => navigate('/meetings')}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #3f3f46', backgroundColor: 'transparent', color: '#d4d4d8', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleJoinMeeting}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
            >
              Ask to Join / Join Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- WAITING ROOM SCREEN ---
  if (status === 'waiting') {
    return (
      <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '28rem', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '1.25rem', padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ width: '4.5rem', height: '4.5rem', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
            <Clock size={36} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>Waiting for host approval</h2>
            <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '0.5rem', lineHeight: '1.4' }}>
              Someone in the call will let you in soon. You requested to enter <strong>{meeting?.title}</strong>.
            </p>
          </div>
          <button
            onClick={() => leaveMeeting(true)}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '0.75rem', border: '1px solid #3f3f46', backgroundColor: 'transparent', color: '#d4d4d8', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
          >
            Leave Waiting Room
          </button>
        </div>
      </div>
    );
  }

  // --- ACTIVE CALL VIEW (GOOGLE MEET STYLE) ---
  return (
    <div
      ref={mainContainerRef}
      style={{
        position: 'relative',
        height: 'calc(100vh - 4.5rem)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#09090b',
        color: '#f4f4f5',
        overflow: 'hidden',
      }}
    >
      {showShare && (
        <ShareModal
          url={window.location.href}
          title={meeting?.title || 'Private meeting'}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Top Header Bar */}
      <header
        style={{
          height: '3.5rem',
          padding: '0 1.25rem',
          borderBottom: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(24, 24, 27, 0.6)',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '0.6rem', height: '0.6rem', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <h2 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>{meeting?.title || 'Meeting'}</h2>
          <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
            ({allParticipants.length}/{meeting?.maxParticipants || 5})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => setShowShare(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '0.5rem',
              border: '1px solid #3f3f46',
              backgroundColor: 'transparent',
              color: '#d4d4d8',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <Share2 size={13} /> Invite
          </button>
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '0.45rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#a1a1aa',
              cursor: 'pointer',
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={() => {
              setActiveTab('participants');
              setSideDrawerOpen(!sideDrawerOpen || activeTab !== 'participants');
            }}
            style={{
              position: 'relative',
              padding: '0.45rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: sideDrawerOpen && activeTab === 'participants' ? '#27272a' : 'transparent',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Users size={16} />
            {pendingRequests.length > 0 && (
              <span style={{ position: 'absolute', top: '0.2rem', right: '0.2rem', width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('chat');
              setSideDrawerOpen(!sideDrawerOpen || activeTab !== 'chat');
            }}
            style={{
              padding: '0.45rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: sideDrawerOpen && activeTab === 'chat' ? '#27272a' : 'transparent',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </header>

      {/* Host Pending Admission Banner */}
      {meeting?.isHost && pendingRequests.length > 0 && (
        <div style={{ backgroundColor: '#172554', borderBottom: '1px solid #1e40af', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 }}>
          <span style={{ fontSize: '0.8rem', color: '#bfdbfe' }}>
            <strong>{pendingRequests[0].name}</strong> wants to join this meeting.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleApprove(pendingRequests[0].userId)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.8rem', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.75rem', fontWeight: '600', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
            >
              <UserCheck size={13} /> Admit
            </button>
            <button
              onClick={() => handleReject(pendingRequests[0].userId)}
              style={{ padding: '0.35rem 0.8rem', backgroundColor: '#374151', color: '#fff', fontSize: '0.75rem', fontWeight: '600', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
            >
              Deny
            </button>
          </div>
        </div>
      )}

      {/* Main Video View & Side Panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <main style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: allParticipants.length <= 1 ? '50rem' : '70rem',
              display: 'grid',
              gridTemplateColumns: allParticipants.length <= 1 ? '1fr' : allParticipants.length === 2 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {allParticipants.map((p) => (
              <ParticipantTile
                key={p.identity}
                participant={p}
                local={p === roomRef.current?.localParticipant}
                isHostTile={Boolean(
                  (p.metadata && JSON.parse(p.metadata || '{}').isHost) ||
                  (meeting?.host?._id && String(meeting.host._id) === String(p.metadata ? JSON.parse(p.metadata || '{}').userId : ''))
                )}
                isCurrentHost={Boolean(meeting?.isHost)}
                handRaised={raisedHands.has(p.metadata ? JSON.parse(p.metadata || '{}').userId : null)}
                onMute={(targetUserId) => socketRef.current?.emit('meeting:mute-participant', { targetUserId })}
                onRemove={(targetUserId) => socketRef.current?.emit('meeting:remove-participant', { targetUserId })}
              />
            ))}
          </div>

          {/* Live Captions Overlay */}
          {captionsEnabled && captionsText && (
            <div
              style={{
                marginTop: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: '0.6rem 1.25rem',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                color: '#fef08a',
                maxWidth: '40rem',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {captionsText}
            </div>
          )}
        </main>

        {/* Side Drawer: Chat & Participants */}
        {sideDrawerOpen && (
          <aside
            style={{
              width: '20rem',
              borderLeft: '1px solid #27272a',
              backgroundColor: '#18181b',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid #27272a' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveTab('chat')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: activeTab === 'chat' ? '#27272a' : 'transparent',
                    color: activeTab === 'chat' ? '#ffffff' : '#a1a1aa',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  In-call Chat
                </button>
                <button
                  onClick={() => setActiveTab('participants')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: activeTab === 'participants' ? '#27272a' : 'transparent',
                    color: activeTab === 'participants' ? '#ffffff' : '#a1a1aa',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  People ({allParticipants.length})
                </button>
              </div>
              <button onClick={() => setSideDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {activeTab === 'chat' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {messages.map((m) => (
                    <div key={m.id} style={{ fontSize: '0.75rem' }}>
                      {m.isReaction ? (
                        <span style={{ display: 'inline-block', padding: '0.25rem 0.6rem', borderRadius: '9999px', backgroundColor: '#27272a' }}>
                          {m.sender} reacted {m.message}
                        </span>
                      ) : (
                        <div>
                          <strong style={{ color: '#93c5fd' }}>{m.sender}: </strong>
                          <span style={{ color: '#f4f4f5' }}>{m.message}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ padding: '0.4rem 0.75rem', borderTop: '1px solid #27272a', display: 'flex', justifyContent: 'space-between' }}>
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer' }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <form onSubmit={sendChatMessage} style={{ padding: '0.75rem', borderTop: '1px solid #27272a', display: 'flex', gap: '0.5rem' }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send a message to everyone"
                    style={{ flex: 1, backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.75rem' }}
                  />
                  <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
                    <Send size={14} />
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {meeting?.isHost && pendingRequests.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.05em' }}>
                      Waiting to Join ({pendingRequests.length})
                    </span>
                    {pendingRequests.map((req) => (
                      <div key={req.userId} style={{ padding: '0.5rem', backgroundColor: '#27272a', borderRadius: '0.5rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', color: '#e4e4e7' }}>{req.name}</span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button onClick={() => handleApprove(req.userId)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.35rem', cursor: 'pointer', fontSize: '0.7rem' }}>Admit</button>
                          <button onClick={() => handleReject(req.userId)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '0.35rem', cursor: 'pointer', fontSize: '0.7rem' }}>Deny</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '0.05em' }}>
                    In Call ({allParticipants.length})
                  </span>
                  {allParticipants.map((p) => {
                    const isLocal = p === roomRef.current?.localParticipant;
                    return (
                      <div key={p.identity} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.75rem', borderBottom: '1px solid #27272a' }}>
                        <span>{p.name || p.identity} {isLocal ? '(You)' : ''}</span>
                        {p.isSpeaking && <span style={{ color: '#34d399', fontSize: '0.65rem' }}>Speaking</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Floating Google Meet Bottom Control Bar */}
      <footer
        style={{
          height: '4.5rem',
          backgroundColor: '#18181b',
          borderTop: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '0 1rem',
          zIndex: 10,
        }}
      >
        <button
          onClick={toggleMic}
          title={micEnabled ? 'Turn off microphone' : 'Turn on microphone'}
          style={{
            padding: '0.75rem',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: micEnabled ? '#27272a' : '#e11d48',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={toggleCam}
          title={camEnabled ? 'Turn off camera' : 'Turn on camera'}
          style={{
            padding: '0.75rem',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: camEnabled ? '#27272a' : '#e11d48',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          {camEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
        </button>

        <button
          onClick={toggleCaptions}
          title={captionsEnabled ? 'Turn off captions' : 'Turn on captions'}
          style={{
            padding: '0.75rem',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: captionsEnabled ? '#2563eb' : '#27272a',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <Captions size={20} />
        </button>

        <button
          onClick={toggleHandRaise}
          title={handRaised ? 'Lower hand' : 'Raise hand'}
          style={{
            padding: '0.75rem',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: handRaised ? '#eab308' : '#27272a',
            color: handRaised ? '#000000' : '#ffffff',
            cursor: 'pointer',
          }}
        >
          <Hand size={20} />
        </button>

        <button
          onClick={toggleScreen}
          title={screenSharing ? 'Stop presenting' : 'Present now'}
          style={{
            padding: '0.75rem',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: screenSharing ? '#2563eb' : '#27272a',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <MonitorUp size={20} />
        </button>

        {meeting?.isHost ? (
          <button
            onClick={handleEndMeeting}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: '#e11d48',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              marginLeft: '0.75rem',
            }}
          >
            <PhoneOff size={18} /> End Call for All
          </button>
        ) : (
          <button
            onClick={() => leaveMeeting(true)}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: '#e11d48',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              marginLeft: '0.75rem',
            }}
          >
            <PhoneOff size={18} /> Leave Call
          </button>
        )}
      </footer>
    </div>
  );
}
