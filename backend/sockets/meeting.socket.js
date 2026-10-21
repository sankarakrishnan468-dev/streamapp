import jwt from 'jsonwebtoken';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import { env } from '../config/env.js';

const activeRooms = new Map();

function cookieValue(header, name) {
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function installSocketAuth(io) {
  io.use(async (socket, next) => {
    try {
      const token = cookieValue(socket.handshake.headers.cookie, env.cookieName);
      if (!token) { socket.user = null; return next(); }
      const payload = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(payload.sub);
      if (!user || user.status !== 'active') return next(new Error('Inactive account'));
      socket.user = user;
      next();
    } catch { socket.user = null; next(); }
  });
}

export function installMeetingSockets(io) {
  io.on('connection', (socket) => {
    socket.on('meeting:join', async ({ roomId }) => {
      if (!socket.user) return socket.emit('meeting:error', { error: 'Authentication required' });
      const meeting = await Meeting.findOne({ roomId, status: 'active' });
      if (!meeting) return socket.emit('meeting:error', { error: 'Meeting not found or ended' });
      const room = activeRooms.get(roomId) || new Map();
      if (!room.has(socket.id) && room.size >= meeting.maxParticipants) return socket.emit('meeting:error', { error: 'This meeting is full (maximum 5 participants)' });
      if (meeting.locked && meeting.host.toString() !== socket.user._id.toString()) return socket.emit('meeting:error', { error: 'This meeting is locked' });
      const participant = { socketId: socket.id, userId: socket.user._id.toString(), name: socket.user.name, isHost: meeting.host.toString() === socket.user._id.toString() };
      room.set(socket.id, participant); activeRooms.set(roomId, room); socket.join(`meeting:${roomId}`); socket.data.roomId = roomId;
      socket.emit('meeting:participants', { participants: [...room.values()].filter((item) => item.socketId !== socket.id) });
      socket.to(`meeting:${roomId}`).emit('meeting:participant-joined', participant);
      io.to(`meeting:${roomId}`).emit('meeting:notification', { message: `${socket.user.name} joined the meeting` });
    });

    socket.on('meeting:signal', ({ targetSocketId, signal }) => {
      if (!socket.data.roomId || !targetSocketId || !signal) return;
      const room = activeRooms.get(socket.data.roomId);
      if (!room?.has(targetSocketId)) return;
      io.to(targetSocketId).emit('meeting:signal', { fromSocketId: socket.id, signal });
    });

    socket.on('meeting:chat', ({ message }) => {
      if (!socket.data.roomId || typeof message !== 'string' || !message.trim() || message.length > 500) return;
      io.to(`meeting:${socket.data.roomId}`).emit('meeting:chat', { id: `${socket.id}-${Date.now()}`, message: message.trim(), sender: socket.user.name, createdAt: new Date().toISOString() });
    });

    socket.on('meeting:reaction', ({ emoji }) => {
      const allowed = ['👍', '👏', '❤️', '😂', '🎉', '😮', '🔥'];
      if (!socket.data.roomId || !allowed.includes(emoji)) return;
      io.to(`meeting:${socket.data.roomId}`).emit('meeting:reaction', { emoji, sender: socket.user.name, createdAt: new Date().toISOString() });
    });

    socket.on('meeting:kick', async ({ targetSocketId }) => {
      const roomId = socket.data.roomId; const room = activeRooms.get(roomId); const meeting = roomId ? await Meeting.findOne({ roomId }) : null;
      if (!room?.has(targetSocketId) || !meeting || !socket.user || meeting.host.toString() !== socket.user._id.toString()) return;
      io.to(targetSocketId).emit('meeting:removed', { message: 'You were removed by the host' });
      io.sockets.sockets.get(targetSocketId)?.disconnect(true);
    });

    socket.on('meeting:mute', async ({ targetSocketId }) => {
      const roomId = socket.data.roomId; const room = roomId && activeRooms.get(roomId); const meeting = roomId ? await Meeting.findOne({ roomId }) : null;
      if (!room?.has(targetSocketId) || !meeting || !socket.user || meeting.host.toString() !== socket.user._id.toString()) return;
      io.to(targetSocketId).emit('meeting:force-muted', { message: 'The host muted your microphone' });
      io.to(`meeting:${roomId}`).emit('meeting:notification', { message: `${socket.user.name} muted a participant` });
    });

    socket.on('meeting:lock', async ({ locked }) => {
      const roomId = socket.data.roomId; const meeting = roomId ? await Meeting.findOne({ roomId }) : null;
      if (!meeting || !socket.user || meeting.host.toString() !== socket.user._id.toString()) return;
      meeting.locked = Boolean(locked); await meeting.save();
      io.to(`meeting:${roomId}`).emit('meeting:lock-changed', { locked: meeting.locked });
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId; const room = roomId && activeRooms.get(roomId); if (!room) return;
      const participant = room.get(socket.id); room.delete(socket.id); if (!room.size) activeRooms.delete(roomId); else io.to(`meeting:${roomId}`).emit('meeting:participant-left', { socketId: socket.id, name: participant?.name });
    });
  });
}
