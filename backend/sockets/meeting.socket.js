import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import { env } from '../config/env.js';

const activeRooms = new Map(); // roomId -> Map(socketId -> participantData)
const pendingRequests = new Map(); // roomId -> Map(userId -> requestData)

function parseCookie(header, name) {
  return header
    ?.split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function installSocketAuth(io) {
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;
      const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const handshakeToken = socket.handshake.auth?.token;
      const cookieToken = parseCookie(socket.handshake.headers.cookie, env.cookieName);
      const token = handshakeToken || bearer || cookieToken;

      if (!token) {
        socket.user = null;
        return next();
      }

      const payload = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(payload.sub);
      if (!user || user.status !== 'active') {
        return next(new Error('Inactive or invalid account'));
      }
      socket.user = user;
      next();
    } catch {
      socket.user = null;
      next();
    }
  });
}

export function installMeetingSockets(io) {
  io.on('connection', (socket) => {
    if (socket.user) {
      socket.join(`user:${socket.user._id}`);
    }

    // --- JOIN FLOW ---
    socket.on('meeting:join', async ({ roomId, accessCode }) => {
      try {
        if (!socket.user) {
          return socket.emit('meeting:error', { error: 'Please sign in to join this meeting' });
        }

        const meetingQuery = mongoose.isValidObjectId(roomId)
          ? { $or: [{ roomId }, { _id: roomId }] }
          : { roomId };

        const meeting = await Meeting.findOne(meetingQuery).select('+accessCodeHash');
        if (!meeting || meeting.status === 'ended') {
          return socket.emit('meeting:error', { error: 'Meeting not found or already ended' });
        }

        if (meeting.expiresAt && meeting.expiresAt <= new Date()) {
          return socket.emit('meeting:error', { error: 'This meeting link has expired' });
        }

        if (meeting.accessCodeHash) {
          const match = await bcrypt.compare(String(accessCode || ''), meeting.accessCodeHash);
          if (!match) {
            return socket.emit('meeting:error', { error: 'Incorrect meeting access code' });
          }
        }

        const currentUserId = socket.user._id.toString();
        const isHost = meeting.host.toString() === currentUserId;
        const isApproved = meeting.approvedUsers?.some(
          (u) => u.user?.toString() === currentUserId
        );
        const isInvited = meeting.invitedUsers?.some(
          (id) => id.toString() === currentUserId
        );

        if (meeting.invitedUsers?.length > 0 && !isHost && !isInvited && !isApproved && !meeting.waitingRoom) {
          return socket.emit('meeting:error', { error: 'You are not invited to this private meeting' });
        }

        const room = activeRooms.get(meeting.roomId) || new Map();
        const admittedCount = [...room.values()].filter((p) => p.isApproved).length;

        if (!isApproved && admittedCount >= meeting.maxParticipants) {
          return socket.emit('meeting:error', {
            error: `This meeting is at full capacity (maximum ${meeting.maxParticipants} participants)`,
          });
        }

        const participantData = {
          socketId: socket.id,
          userId: currentUserId,
          name: socket.user.name,
          username: socket.user.username,
          avatarUrl: socket.user.avatarUrl,
          isHost,
          isApproved: isHost || !meeting.waitingRoom || isApproved,
        };

        socket.data.roomId = meeting.roomId;
        socket.data.userId = currentUserId;
        socket.join(`meeting:${meeting.roomId}`);
        room.set(socket.id, participantData);
        activeRooms.set(meeting.roomId, room);

        const requests = pendingRequests.get(meeting.roomId) || new Map();

        if (!participantData.isApproved) {
          requests.set(currentUserId, {
            userId: currentUserId,
            socketId: socket.id,
            name: socket.user.name,
            username: socket.user.username,
            avatarUrl: socket.user.avatarUrl,
            requestedAt: new Date(),
          });
          pendingRequests.set(meeting.roomId, requests);

          socket.emit('meeting:waiting', {
            message: 'Waiting for the host to let you into the meeting...',
          });

          io.to(`meeting:${meeting.roomId}`).emit('meeting:guest-request', {
            userId: currentUserId,
            socketId: socket.id,
            name: socket.user.name,
            username: socket.user.username,
          });
        } else {
          socket.emit('meeting:ready', {
            isHost,
            participants: [...room.values()].filter((p) => p.isApproved),
          });

          socket.to(`meeting:${meeting.roomId}`).emit('meeting:participant-joined', participantData);

          if (isHost) {
            socket.emit('meeting:pending-list', {
              requests: Array.from(requests.values()),
            });
          }
        }
      } catch (err) {
        socket.emit('meeting:error', { error: 'Failed to join meeting' });
      }
    });

    // --- HOST APPROVAL CONTROLS ---
    socket.on('meeting:host-approve', async ({ targetUserId }) => {
      try {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const meeting = await Meeting.findOne({ roomId });
        if (!meeting || meeting.host.toString() !== socket.user?._id?.toString()) return;

        await Meeting.updateOne(
          { _id: meeting._id, 'approvedUsers.user': { $ne: targetUserId } },
          { $push: { approvedUsers: { user: targetUserId } } }
        );

        const requests = pendingRequests.get(roomId);
        const reqData = requests?.get(targetUserId);
        if (reqData) {
          requests.delete(targetUserId);
          const room = activeRooms.get(roomId);
          const targetParticipant = room?.get(reqData.socketId);
          if (targetParticipant) {
            targetParticipant.isApproved = true;
          }

          io.to(reqData.socketId).emit('meeting:approved', {
            message: 'Host approved your request. Joining now...',
          });
          io.to(`meeting:${roomId}`).emit('meeting:participant-approved', {
            userId: targetUserId,
            name: reqData.name,
          });
        }
      } catch {}
    });

    socket.on('meeting:host-reject', async ({ targetUserId }) => {
      try {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const meeting = await Meeting.findOne({ roomId });
        if (!meeting || meeting.host.toString() !== socket.user?._id?.toString()) return;

        const requests = pendingRequests.get(roomId);
        const reqData = requests?.get(targetUserId);
        if (reqData) {
          requests.delete(targetUserId);
          io.to(reqData.socketId).emit('meeting:rejected', {
            message: 'The host has declined your request to join.',
          });
        }
      } catch {}
    });

    // --- MODERATION CONTROLS ---
    socket.on('meeting:mute-participant', ({ targetUserId }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      io.to(`meeting:${roomId}`).emit('meeting:request-mute', { targetUserId });
    });

    socket.on('meeting:remove-participant', async ({ targetUserId }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const meeting = await Meeting.findOne({ roomId });
      if (!meeting || meeting.host.toString() !== socket.user?._id?.toString()) return;

      const room = activeRooms.get(roomId);
      if (room) {
        for (const [sId, p] of room.entries()) {
          if (p.userId === targetUserId) {
            io.to(sId).emit('meeting:removed', {
              message: 'You have been removed from the meeting by the host.',
            });
            room.delete(sId);
            break;
          }
        }
      }
      io.to(`meeting:${roomId}`).emit('meeting:participant-left', { userId: targetUserId });
    });

    // --- CHAT & REACTIONS ---
    socket.on('meeting:chat', ({ message }) => {
      const roomId = socket.data.roomId;
      if (!roomId || !message?.trim()) return;

      io.to(`meeting:${roomId}`).emit('meeting:chat', {
        id: `${Date.now()}-${socket.user?._id}`,
        sender: socket.user?.name || 'Participant',
        userId: socket.user?._id,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('meeting:reaction', ({ emoji }) => {
      const roomId = socket.data.roomId;
      if (!roomId || !emoji) return;

      io.to(`meeting:${roomId}`).emit('meeting:reaction', {
        sender: socket.user?.name || 'Participant',
        emoji,
        createdAt: Date.now(),
      });
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = activeRooms.get(roomId);
      if (room) {
        const participant = room.get(socket.id);
        room.delete(socket.id);
        if (room.size === 0) {
          activeRooms.delete(roomId);
        }

        if (participant) {
          socket.to(`meeting:${roomId}`).emit('meeting:participant-left', {
            userId: participant.userId,
            name: participant.name,
          });
        }
      }

      if (socket.user) {
        const requests = pendingRequests.get(roomId);
        requests?.delete(socket.user._id.toString());
      }
    });
  });
}
