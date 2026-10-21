import LiveStream from '../models/LiveStream.js';

const viewers = new Map();
const blocked = new Map();
const reactions = new Map();
const room = (id) => `stream:${id}`;
const audience = (active) => [...active.values()].filter((entry) => !entry.isStreamer);
const streamerSockets = (active) => [...active.values()].filter((entry) => entry.isStreamer).map((entry) => entry.socketId);

export function installStreamSockets(io) {
  io.on('connection', (socket) => {
    socket.on('stream:join', async ({ streamId, mode = 'viewer' }) => {
      const stream = await LiveStream.findById(streamId);
      if (!stream || !['live', 'paused'].includes(stream.status)) return socket.emit('stream:error', { error: 'Stream is not live' });
      if (blocked.get(streamId)?.has(socket.user?._id?.toString())) return socket.emit('stream:error', { error: 'You are blocked from this stream chat' });
      const active = viewers.get(streamId) || new Map();
      const isStreamer = mode === 'studio' && Boolean(socket.user?._id && stream.owner.toString() === socket.user._id.toString());
      if (mode === 'studio' && !isStreamer) return socket.emit('stream:error', { error: 'Only the stream owner can open the studio' });
      if (!active.has(socket.id) && !isStreamer && audience(active).length >= stream.viewerLimit) return socket.emit('stream:error', { error: 'This stream has reached its 50 viewer limit' });
      active.set(socket.id, { socketId: socket.id, name: socket.user?.name || 'Guest', isStreamer, joinedAt: new Date() }); viewers.set(streamId, active); socket.join(room(streamId)); socket.data.streamId = streamId; socket.data.isStreamer = isStreamer;
      emitPresence(io, streamId, active); emitReactions(io, streamId);
      if (isStreamer) audience(active).forEach((viewer) => io.to(socket.id).emit('stream:viewer-joined', { viewerId: viewer.socketId }));
      else streamerSockets(active).forEach((streamerId) => io.to(streamerId).emit('stream:viewer-joined', { viewerId: socket.id }));
    });
    socket.on('stream:webrtc-offer', ({ targetSocketId, description }) => relaySignal(io, socket, targetSocketId, 'stream:webrtc-offer', { streamerId: socket.id, description }));
    socket.on('stream:webrtc-answer', ({ targetSocketId, description }) => relaySignal(io, socket, targetSocketId, 'stream:webrtc-answer', { viewerId: socket.id, description }));
    socket.on('stream:webrtc-ice', ({ targetSocketId, candidate }) => relaySignal(io, socket, targetSocketId, 'stream:webrtc-ice', { fromSocketId: socket.id, candidate }));
    socket.on('stream:chat', ({ message }) => { if (!socket.data.streamId || typeof message !== 'string' || !message.trim() || message.length > 500) return; io.to(room(socket.data.streamId)).emit('stream:chat', { id: `${socket.id}-${Date.now()}`, sender: socket.user?.name || 'Guest', message: message.trim(), createdAt: new Date().toISOString() }); });
    socket.on('stream:reaction', ({ reaction }) => { const streamId = socket.data.streamId; if (!streamId || !['like', 'dislike', null].includes(reaction)) return; const current = reactions.get(streamId) || new Map(); if (reaction === null) current.delete(socket.id); else current.set(socket.id, reaction); if (current.size) reactions.set(streamId, current); else reactions.delete(streamId); emitReactions(io, streamId); });
    socket.on('stream:remove-chat', async ({ messageId }) => { const stream = socket.data.streamId && await LiveStream.findById(socket.data.streamId); if (!stream || !socket.user || stream.owner.toString() !== socket.user._id.toString()) return; io.to(room(stream._id.toString())).emit('stream:chat-removed', { messageId }); });
    socket.on('stream:block-user', async ({ userId }) => { const stream = socket.data.streamId && await LiveStream.findById(socket.data.streamId); if (!stream || !socket.user || stream.owner.toString() !== socket.user._id.toString() || !userId) return; const list = blocked.get(stream._id.toString()) || new Set(); list.add(String(userId)); blocked.set(stream._id.toString(), list); io.to(room(stream._id.toString())).emit('stream:user-blocked', { userId: String(userId) }); });
    socket.on('stream:leave', () => removeViewer(io, socket));
    socket.on('disconnect', () => removeViewer(io, socket));
  });
}

function relaySignal(io, socket, targetSocketId, event, payload) { if (!socket.data.streamId || !targetSocketId || !payload) return; const active = viewers.get(socket.data.streamId); if (!active?.has(targetSocketId)) return; io.to(targetSocketId).emit(event, payload); }
function emitPresence(io, streamId, active) { io.to(room(streamId)).emit('stream:viewer-count', { count: audience(active).length }); io.to(room(streamId)).emit('stream:viewers', { viewers: audience(active) }); }
function emitReactions(io, streamId) { const current = reactions.get(streamId) || new Map(); io.to(room(streamId)).emit('stream:reactions', { likes: [...current.values()].filter((value) => value === 'like').length, dislikes: [...current.values()].filter((value) => value === 'dislike').length }); }
function removeViewer(io, socket) { const id = socket.data.streamId; const active = id && viewers.get(id); if (!active) return; active.delete(socket.id); reactions.get(id)?.delete(socket.id); if (!active.size) { viewers.delete(id); reactions.delete(id); } else { emitPresence(io, id, active); emitReactions(io, id); } socket.data.streamId = null; }
