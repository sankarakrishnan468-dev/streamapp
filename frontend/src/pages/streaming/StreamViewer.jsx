import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Expand, LoaderCircle, Pause, Play, RefreshCw, Send, Share2, ThumbsDown, ThumbsUp, Users, Volume2, VolumeX } from 'lucide-react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { api, getApiError, getSocketOptions, rtcConfiguration, socketUrl } from '../../services/api.js';
import ShareModal from '../../components/ShareModal.jsx';

export default function StreamViewer() {
  const { id } = useParams(); const video = useRef(null); const socket = useRef(null); const hls = useRef(null); const peer = useRef(null); const pendingIce = useRef([]); const [connection, setConnection] = useState('connecting');
  const [stream, setStream] = useState(null); const [count, setCount] = useState(0); const [messages, setMessages] = useState([]); const [message, setMessage] = useState('');
  const [error, setError] = useState(''); const [playing, setPlaying] = useState(false); const [muted, setMuted] = useState(true); const [volume, setVolume] = useState(1); const [buffering, setBuffering] = useState(true);
  const [reactions, setReactions] = useState({ likes: 0, dislikes: 0 }); const [myReaction, setMyReaction] = useState(null); const [showShare, setShowShare] = useState(false); const [shared, setShared] = useState(false);

  useEffect(() => {
    let client; let disposed = false;
    async function load() {
      try {
        const { data } = await api.get(`/streams/${id}`); if (disposed) return; setStream(data.stream);
        client = io(socketUrl, getSocketOptions()); socket.current = client;
        client.on('connect', () => { setConnection('connected'); client.emit('stream:join', { streamId: id, mode: 'viewer' }); }); client.on('disconnect', () => setConnection('offline')); client.on('connect_error', () => { setConnection('offline'); setError('Viewer connection is offline. Check that the backend is running.'); }); client.on('stream:viewer-count', ({ count: next }) => setCount(next)); client.on('stream:chat', (item) => setMessages((items) => [...items, item])); client.on('stream:reactions', (next) => setReactions(next)); client.on('stream:error', (item) => setError(item.error));
        client.on('stream:webrtc-offer', async ({ streamerId, description }) => { const connectionPeer = new RTCPeerConnection(rtcConfiguration); peer.current?.close(); peer.current = connectionPeer; connectionPeer.ontrack = ({ streams }) => { if (video.current && streams[0]) { video.current.srcObject = streams[0]; hls.current?.destroy(); setBuffering(false); video.current.play().catch(() => setError('Video is ready. Press Play or unmute to start playback.')); } }; connectionPeer.onconnectionstatechange = () => { if (['failed', 'disconnected'].includes(connectionPeer.connectionState)) setError('Live connection was lost. Press reconnect to try again.'); }; connectionPeer.onicecandidate = ({ candidate }) => candidate && client.emit('stream:webrtc-ice', { targetSocketId: streamerId, candidate }); try { await connectionPeer.setRemoteDescription(description); for (const candidate of pendingIce.current) await connectionPeer.addIceCandidate(candidate).catch(() => {}); pendingIce.current = []; const answer = await connectionPeer.createAnswer(); await connectionPeer.setLocalDescription(answer); client.emit('stream:webrtc-answer', { targetSocketId: streamerId, description: connectionPeer.localDescription }); } catch { setError('Unable to negotiate the live video connection.'); } });
        client.on('stream:webrtc-ice', async ({ candidate }) => { if (!peer.current?.remoteDescription) { pendingIce.current.push(candidate); return; } await peer.current.addIceCandidate(candidate).catch(() => {}); });
        client.on('stream:status', ({ status }) => { setStream((current) => current ? { ...current, status } : current); if (status === 'paused') setError('The streamer has paused this broadcast.'); else setError(''); });
        client.on('stream:ended', () => { setStream((current) => current ? { ...current, status: 'ended' } : current); setError('This broadcast has ended.'); peer.current?.close(); });
        if (data.stream.playbackUrl) attachPlayback(data.stream.playbackUrl);
      } catch (requestError) { if (!disposed) setError(getApiError(requestError, 'Unable to load stream.')); }
    }
    load();
    return () => { disposed = true; hls.current?.destroy(); peer.current?.close(); client?.emit('stream:leave'); client?.disconnect(); };
  }, [id]);

  function attachPlayback(url) {
    const element = video.current; if (!element) return;
    setBuffering(true); setError('');
    if (element.canPlayType('application/vnd.apple.mpegurl')) element.src = url;
    else if (Hls.isSupported()) { hls.current?.destroy(); const instance = new Hls({ enableWorker: true, lowLatencyMode: true }); hls.current = instance; instance.loadSource(url); instance.attachMedia(element); instance.on(Hls.Events.MANIFEST_PARSED, () => { element.play().catch(() => {}); }); instance.on(Hls.Events.ERROR, (_, info) => { if (info.fatal) setError('Playback lost. Press reconnect to try again.'); }); }
    else setError('This browser cannot play HLS video.');
  }

  async function togglePlayback() { const element = video.current; if (!element) return; if (element.paused) { try { await element.play(); setError(''); } catch { element.muted = true; setMuted(true); try { await element.play(); setError(''); } catch { setError('Playback was blocked. Allow autoplay or press Play again.'); } } } else element.pause(); }
  function toggleMute() { const next = !muted; if (video.current) video.current.muted = next; setMuted(next); }
  function changeVolume(event) { const next = Number(event.target.value); if (video.current) { video.current.volume = next; video.current.muted = next === 0; } setVolume(next); setMuted(next === 0); }
  function fullscreen() { const element = video.current; if (!element) return; if (document.fullscreenElement) document.exitFullscreen(); else element.requestFullscreen?.(); }
  function send(event) { event.preventDefault(); if (connection !== 'connected') return setError('You are not connected to the live stream.'); if (message.trim()) { socket.current?.emit('stream:chat', { message }); setMessage(''); } }
  function react(next) { if (connection !== 'connected') return setError('You are not connected to the live stream.'); const value = myReaction === next ? null : next; setMyReaction(value); socket.current?.emit('stream:reaction', { reaction: value }); }
  function share() {
    setShowShare(true);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      }).catch(() => {});
    }
  }

  const ended = stream?.status === 'ended';
  return <div className="meeting-room">{showShare && <ShareModal url={window.location.href} title={stream?.title || 'Live stream'} onClose={() => setShowShare(false)} />}<header className="meeting-header"><div><strong>{stream?.title || 'Live stream'}</strong><small>{stream?.owner?.name || 'Creator'} · {stream?.category || 'General'} · <Users size={14} /> {count} connected viewers</small></div><span className="live-badge"><RadioIcon /> LIVE</span></header>{error && <div className="meeting-error">{error}</div>}{ended ? <div className="placeholder"><h1>Stream ended</h1><p>This broadcast has ended.</p></div> : <section className="call-layout"><div><div className="video-shell"><video className="stream-player" autoPlay muted={muted} playsInline poster={stream?.thumbnailUrl} ref={video} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} /><div className="video-controls"><button className="control" onClick={togglePlayback} aria-label={playing ? 'Pause live video' : 'Play live video'}>{playing ? <Pause /> : <Play />}</button><button className="control" onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'}>{muted ? <VolumeX /> : <Volume2 />}</button><input aria-label="Volume" className="volume-slider" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={changeVolume} /><button className="control" onClick={fullscreen} aria-label="Fullscreen"><Expand /></button>{buffering && <span className="buffering"><LoaderCircle size={16} /> Buffering…</span>}<button className="control" onClick={() => stream?.playbackUrl && attachPlayback(stream.playbackUrl)} aria-label="Reconnect"><RefreshCw /></button></div></div><div className="reaction-bar" aria-label="Stream reactions"><button className={myReaction === 'like' ? 'active' : ''} onClick={() => react('like')}><ThumbsUp size={16} /> Like {reactions.likes}</button><button className={myReaction === 'dislike' ? 'active' : ''} onClick={() => react('dislike')}><ThumbsDown size={16} /> Dislike {reactions.dislikes}</button><button onClick={share}>{shared ? <Copy size={16} /> : <Share2 size={16} />} {shared ? 'Link copied' : 'Share'}</button></div><h3>{stream?.description}</h3></div><aside className="chat-panel"><h3>Live comments</h3><div className="chat-messages">{messages.map((item) => <div key={item.id}><strong>{item.sender}</strong><span>{item.message}</span></div>)}</div><form onSubmit={send}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a comment" /><button aria-label="Send comment"><Send size={16} /></button></form></aside></section>}</div>;
}

function RadioIcon() { return <span aria-hidden="true">●</span>; }
