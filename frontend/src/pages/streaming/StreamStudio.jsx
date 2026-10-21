import { useEffect, useRef, useState } from 'react';
import { Eye, Mic, MicOff, Pause, Play, Square, UserMinus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api, getApiError, socketUrl } from '../../services/api.js';

export default function StreamStudio() {
  const { id } = useParams(); const navigate = useNavigate();
  const preview = useRef(null); const media = useRef(null); const socket = useRef(null); const peers = useRef(new Map());
  const [stream, setStream] = useState(null); const [viewers, setViewers] = useState([]); const [count, setCount] = useState(0); const [messages, setMessages] = useState([]); const [message, setMessage] = useState(''); const [muted, setMuted] = useState(false); const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const { data } = await api.get(`/streams/${id}`); if (!active) return; setStream(data.stream);
        try { media.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); if (preview.current) preview.current.srcObject = media.current; } catch { setError('Camera or microphone access was denied. Viewers will not receive video.'); }
        const client = io(socketUrl, { withCredentials: true }); socket.current = client;
        client.on('connect', () => client.emit('stream:join', { streamId: id, mode: 'studio' }));
        client.on('connect_error', () => setError('Live connection is offline. Check that the backend is running.'));
        client.on('stream:error', ({ error: nextError }) => setError(nextError || 'Stream connection failed.'));
        client.on('stream:viewer-count', ({ count: next }) => setCount(next)); client.on('stream:viewers', ({ viewers: next }) => setViewers(next)); client.on('stream:chat', (item) => setMessages((items) => [...items, item]));
        client.on('stream:viewer-joined', async ({ viewerId }) => {
          if (!media.current) return;
          const peer = new RTCPeerConnection(); peers.current.set(viewerId, peer);
          media.current.getTracks().forEach((track) => peer.addTrack(track, media.current));
          peer.onicecandidate = ({ candidate }) => candidate && client.emit('stream:webrtc-ice', { targetSocketId: viewerId, candidate });
          const offer = await peer.createOffer(); await peer.setLocalDescription(offer); client.emit('stream:webrtc-offer', { targetSocketId: viewerId, description: peer.localDescription });
        });
        client.on('stream:webrtc-answer', async ({ viewerId, description }) => { await peers.current.get(viewerId)?.setRemoteDescription(description); });
        client.on('stream:webrtc-ice', async ({ fromSocketId, candidate }) => { await peers.current.get(fromSocketId)?.addIceCandidate(candidate).catch(() => {}); });
      } catch (requestError) { if (active) setError(getApiError(requestError, 'Unable to load this stream studio.')); }
    }
    init();
    return () => { active = false; peers.current.forEach((peer) => peer.close()); peers.current.clear(); socket.current?.disconnect(); media.current?.getTracks().forEach((track) => track.stop()); };
  }, [id]);

  async function changeState(next) { try { const { data } = await api.patch(`/streams/${id}/state`, { status: next }); setStream(data.stream); } catch (requestError) { setError(getApiError(requestError, 'Unable to update stream status.')); } }
  async function end() { try { await api.post(`/streams/${id}/end`); socket.current?.disconnect(); navigate('/live'); } catch (requestError) { setError(getApiError(requestError, 'Unable to end this stream.')); } }
  function send(event) { event.preventDefault(); if (message.trim()) { socket.current?.emit('stream:chat', { message }); setMessage(''); } }

  return <div className="meeting-room"><header className="meeting-header"><div><strong>{stream?.title || 'Stream studio'}</strong><small><Eye size={14} /> {count} connected viewers Â· status: {stream?.status || 'loading'}</small></div><div className="call-controls"><button className="control" onClick={() => changeState(stream?.status === 'paused' ? 'live' : 'paused')} disabled={!stream || stream.status === 'ended'}>{stream?.status === 'paused' ? <Play /> : <Pause />}<span>{stream?.status === 'paused' ? 'Resume' : 'Pause'}</span></button><button className="control danger" onClick={end} disabled={!stream || stream.status === 'ended'}><Square /><span>End</span></button></div></header>{error && <div className="meeting-error">{error}</div>}<section className="call-layout"><div><video className="stream-player" ref={preview} autoPlay muted playsInline /><div className="participant-list"><strong>Viewer list ({viewers.length}/50)</strong>{viewers.map((viewer) => <span key={viewer.socketId}><UserMinus size={14} />{viewer.name}</span>)}</div></div><aside className="chat-panel"><h3>Live chat</h3><div className="chat-messages">{messages.map((item) => <div key={item.id}><strong>{item.sender}</strong><span>{item.message}</span></div>)}</div><form onSubmit={send}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Moderate chat" /><button>Send</button></form></aside></section><button className="control" onClick={() => { const next = !muted; media.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); setMuted(next); }} disabled={!media.current?.getAudioTracks().length}>{muted ? <MicOff /> : <Mic />} {muted ? 'Unmute' : 'Mute'} microphone</button></div>;
}
