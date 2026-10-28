import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import { env } from '../config/env.js';

const activeRooms = new Map();
const pendingRequests = new Map();
const userSockets = new Map();

function cookieValue(header, name) {
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function installSocketAuth(io) {
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;
      const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const handshakeToken = socket.handshake.auth?.token;
      const cookieToken = cookieValue(socket.handshake.headers.cookie, env.cookieName);
      const token = handshakeToken || bearer || cookieToken;
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
    if (socket.user) {
      const sockets = userSockets.get(socket.user._id.toString()) || new Set();
      sockets.add(socket.id); userSockets.set(socket.user._id.toString(), sockets); socket.join(`user:${socket.user._id}`);
    }
    socket.on('meeting:join', async ({ roomId, guestId, sessionId, accessCode }) => {
      const meetingQuery = mongoose.isValidObjectId(roomId) ? { status: 'active', $or: [{ roomId }, { _id: roomId }] } : { roomId, status: 'active' };
      const meeting = await Meeting.findOne(meetingQuery);
      if (!meeting) return socket.emit('meeting:error', { error: 'Meeting not found or ended' });
      if (meeting.expiresAt && meeting.expiresAt <= new Date()) return socket.emit('meeting:error', { error: 'This private call has expired' });
      if (!socket.user) return socket.emit('meeting:error', { error: 'Sign in before joining this private meeting' });
      if (meeting.accessCodeHash && !(await bcrypt.compare(String(accessCode || ''), meeting.accessCodeHash))) return socket.emit('meeting:error', { error: 'The meeting password is incorrect' });
      const isGuest = !socket.user;
      const isHost = Boolean(socket.user && meeting.host.toString() === socket.user._id.toString());
      const isInvitedUser = Boolean(
        socket.user && meeting.invitedUsers?.some((id) => id.toString() === socket.user._id.toString())
      );
      const isInvitedViewer = Boolean(socket.user && meeting.invitedViewer?.toString() === socket.user._id.toString());
      const isInvited = isInvitedUser || isInvitedViewer;
      const hasInviteList =
        (meeting.invitedUsers && meeting.invitedUsers.length > 0) ||
        Boolean(meeting.invitedViewer);
      const isApproved = meeting.approvedUsers?.some((entry) => entry.user?.toString() === socket.user._id.toString());
      const needsApproval = !isHost && meeting.waitingRoom && !isApproved;

      if (hasInviteList && !isHost && !isInvited && !isApproved && !meeting.waitingRoom) {
        return socket.emit('meeting:error', { error: 'You are not invited to this private call' });
      }
      const room = activeRooms.get(roomId) || new Map();
      const requestKey = socket.user ? `user:${socket.user._id}` : `guest:${String(guestId || socket.id).slice(0, 100)}`;
      const requests = pendingRequests.get(roomId) || new Map();
      if (meeting.locked && !isHost) return socket.emit('meeting:error', { error: 'This meeting is locked' });
      for (const [socketId, participant] of room) {
        if ((socket.user && participant.userId === socket.user._id.toString()) || participant.requestKey === requestKey) {
          if (socketId === socket.id) continue;
          room.delete(socketId);
          io.sockets.sockets.get(socketId)?.disconnect(true);
        }
      }
      const admittedCount = [...room.values()].filter((item) => item.approved).length;
      if (!room.has(socket.id) && !isApproved && admittedCount >= meeting.maxParticipants) return socket.emit('meeting:error', { error: `This meeting is full (maximum ${meeting.maxParticipants || 5} participants)` });
      const participant = { socketId: socket.id, sessionId: String(sessionId || ''), requestKey, userId: socket.user?._id.toString() || null, name: socket.user ? (socket.user.username ? `${socket.user.name} (@${socket.user.username})` : socket.user.name) : 'Guest viewer', username: socket.user?.username, isHost, approved: !needsApproval };
      room.set(socket.id, participant); activeRooms.set(roomId, room); socket.join(`meeting:${roomId}`); socket.data.roomId = roomId;
      socket.data.sessionId = participant.sessionId;
      if (needsApproval) {
        const request = requests.get(requestKey) || { requestKey, name: participant.name, socketId: socket.id, notified: false };
        request.socketId = socket.id; request.name = participant.name; requests.set(requestKey, request); pendingRequests.set(roomId, requests);
        await Meeting.updateOne({ _id: meeting._id }, { $pull: { pendingJoinRequests: { user: socket.user._id } }, $push: { pendingJoinRequests: { user: socket.user._id, displayName: participant.name, requestedAt: new Date() } } });
        socket.data.approved = false; socket.emit('meeting:waiting', { message: 'Waiting for the owner to approve your private call request...' });
        io.to(`meeting:${roomId}`).emit('meeting:guest-request', { socketId: socket.id, requestKey, name: participant.name, reconnected: request.notified }); request.notified = true;
      } else {
        socket.data.approved = true; socket.emit('meeting:participants', { participants: [...room.values()].filter((item) => item.socketId !== socket.id && item.approved) });
        socket.to(`meeting:${roomId}`).emit('meeting:participant-joined', participant);
        io.to(`meeting:${roomId}`).emit('meeting:notification', { message: `${socket.user?.name || participant.name} joined the meeting` });
        for (const request of requests.values()) { request.notified = true; socket.emit('meeting:guest-request', { socketId: request.socketId, requestKey: request.requestKey, name: request.name }); }
        if (isHost) {
          const persisted = await Meeting.findById(meeting._id).select('pendingJoinRequests').lean();
          for (const request of persisted?.pendingJoinRequests || []) {
            const active = [...room.values()].find((item) => item.userId === request.user?.toString());
            if (!active) continue;
            const restored = { requestKey: `user:${request.user}`, socketId: active.socketId, name: request.displayName || active.name };
            requests.set(restored.requestKey, restored);
            socket.emit('meeting:guest-request', restored);
          }
          pendingRequests.set(roomId, requests);
        }
      }
    });

    socket.on('meeting:guest-approve', async ({ targetSocketId, targetUserId, requestKey }) => {
      const roomId = socket.data.roomId;
      const room = roomId && activeRooms.get(roomId);
      let target = targetSocketId ? room?.get(targetSocketId) : null;
      let actualSocketId = targetSocketId;
      if (!target && room) {
        for (const [sId, p] of room) {
          if ((targetUserId && p.userId === String(targetUserId)) || (requestKey && p.requestKey === requestKey)) {
            target = p;
            actualSocketId = sId;
            break;
          }
        }
      }
      if (!room || !target || !socket.user || (room.get(socket.id)?.isHost !== true) || target.approved) return;
      const meeting = await Meeting.findOne({ roomId, status: 'active' });
      const admittedCount = [...room.values()].filter((item) => item.approved).length;
      if (!meeting || admittedCount >= meeting.maxParticipants) return socket.emit('meeting:notification', { message: `This call is full (maximum ${meeting?.maxParticipants || 5} participants).` });
      target.approved = true;
      room.set(actualSocketId, target);
      const targetSocket = io.sockets.sockets.get(actualSocketId);
      pendingRequests.get(roomId)?.delete(target.requestKey);
      await Meeting.updateOne({ roomId, status: 'active' }, { $pull: { pendingJoinRequests: { user: target.userId } }, $addToSet: { approvedUsers: { user: target.userId } } });
      if (targetSocket) {
        targetSocket.data.approved = true;
        targetSocket.emit('meeting:approved');
        targetSocket.emit('meeting:participants', { participants: [...room.values()].filter((item) => item.socketId !== actualSocketId && item.approved) });
        targetSocket.broadcast.to(`meeting:${roomId}`).emit('meeting:participant-joined', target);
      }
      io.to(`meeting:${roomId}`).emit('meeting:notification', { message: `${target.name} joined the meeting` });
    });

    socket.on('meeting:guest-reject', ({ targetSocketId, targetUserId, requestKey }) => {
      const roomId = socket.data.roomId;
      const room = roomId && activeRooms.get(roomId);
      let target = targetSocketId ? room?.get(targetSocketId) : null;
      let actualSocketId = targetSocketId;
      if (!target && room) {
        for (const [sId, p] of room) {
          if ((targetUserId && p.userId === String(targetUserId)) || (requestKey && p.requestKey === requestKey)) {
            target = p;
            actualSocketId = sId;
            break;
          }
        }
      }
      if (!room || !target || !socket.user || room.get(socket.id)?.isHost !== true || target.approved) return;
      room.delete(actualSocketId);
      pendingRequests.get(roomId)?.delete(target.requestKey);
      io.sockets.sockets.get(actualSocketId)?.emit('meeting:rejected', { message: 'The host declined your request to join.' });
      io.sockets.sockets.get(actualSocketId)?.disconnect(true);
      Meeting.updateOne({ roomId }, { $pull: { pendingJoinRequests: { user: target.userId } } }).catch(() => {});
    });

    socket.on('meeting:signal', ({ targetSocketId, signal }) => {
      if (!socket.data.roomId || !socket.data.approved || !targetSocketId || !signal) return;
      const room = activeRooms.get(socket.data.roomId);
      if (!room?.has(targetSocketId)) return;
      io.to(targetSocketId).emit('meeting:signal', { fromSocketId: socket.id, signal });
    });

    socket.on('meeting:chat', ({ message }) => {
      if (!socket.data.roomId || !socket.data.approved || typeof message !== 'string' || !message.trim() || message.length > 500) return;
      io.to(`meeting:${socket.data.roomId}`).emit('meeting:chat', { id: `${socket.id}-${Date.now()}`, message: message.trim(), sender: socket.user?.name || 'Guest viewer', createdAt: new Date().toISOString() });
    });

    socket.on('meeting:reaction', ({ emoji }) => {
      const allowed = ['👍', '👏', '❤️', '😂', '🎉', '😮', '🔥'];
      if (!socket.data.roomId || !socket.data.approved || !allowed.includes(emoji)) return;
      io.to(`meeting:${socket.data.roomId}`).emit('meeting:reaction', { emoji, sender: socket.user?.name || 'Guest viewer', createdAt: new Date().toISOString() });
    });

    socket.on('meeting:kick', async ({ targetSocketId }) => {
      const roomId = socket.data.roomId;
      const room = activeRooms.get(roomId);
      const meeting = roomId ? await Meeting.findOne({ roomId }) : null;
      const target = room?.get(targetSocketId) || [...(room?.values() || [])].find((item) => item.userId === String(targetSocketId) || item.sessionId === String(targetSocketId));
      const targetId = target?.socketId;
      if (!targetId || !meeting || !socket.user || meeting.host.toString() !== socket.user._id.toString()) return;
      io.to(targetId).emit('meeting:removed', { message: 'You were removed by the host' });
      io.sockets.sockets.get(targetId)?.disconnect(true);
    });

    socket.on('meeting:mute', async ({ targetSocketId }) => {
      const roomId = socket.data.roomId;
      const room = roomId && activeRooms.get(roomId);
      const meeting = roomId ? await Meeting.findOne({ roomId }) : null;
      const target = room?.get(targetSocketId) || [...(room?.values() || [])].find((item) => item.userId === String(targetSocketId) || item.sessionId === String(targetSocketId));
      const targetId = target?.socketId;
      if (!targetId || !meeting || !socket.user || meeting.host.toString() !== socket.user._id.toString()) return;
      io.to(targetId).emit('meeting:force-muted', { message: 'The host muted your microphone' });
      io.to(`meeting:${roomId}`).emit('meeting:notification', { message: `${socket.user.name} muted a participant` });
    });

    socket.on('meeting:lock', async ({ locked }) => {
      const roomId = socket.data.roomId; const meeting = roomId ? await Meeting.findOne({ roomId }) : null;
      if (!meeting || !socket.user || meeting.host.toString() !== socket.user._id.toString()) return;
      meeting.locked = Boolean(locked); await meeting.save();
      io.to(`meeting:${roomId}`).emit('meeting:lock-changed', { locked: meeting.locked });
    });

    socket.on('disconnect', () => {
      if (socket.user) {
        const sockets = userSockets.get(socket.user._id.toString()); sockets?.delete(socket.id);
        if (sockets?.size) userSockets.set(socket.user._id.toString(), sockets); else userSockets.delete(socket.user._id.toString());
      }
      const roomId = socket.data.roomId; const room = roomId && activeRooms.get(roomId); if (!room) return;
      const participant = room.get(socket.id); room.delete(socket.id); if (!participant?.approved) { if (room.size) io.to(`meeting:${roomId}`).emit('meeting:guest-disconnected', { socketId: socket.id }); } else if (!room.size) activeRooms.delete(roomId); else io.to(`meeting:${roomId}`).emit('meeting:participant-left', { socketId: socket.id, name: participant?.name });
      if (participant?.sessionId) Meeting.updateOne({ roomId }, { $pull: { activeParticipants: { sessionId: participant.sessionId } } }).catch(() => {});
    });
  });
}
