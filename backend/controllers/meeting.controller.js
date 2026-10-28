import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { env, livekitConfigured, livekitCredentialsValid } from '../config/env.js';

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  callType: z.enum(['one-to-one', 'group']).default('group'),
  accessCode: z.string().min(4).max(32).optional(),
  waitingRoom: z.boolean().optional(),
  inviteeUsername: z
    .string()
    .regex(/^[a-z0-9_]{3,30}$/)
    .optional(),
  inviteeUsernames: z
    .array(z.string().regex(/^[a-z0-9_]{3,30}$/))
    .max(4)
    .optional(),
});

export async function createMeeting(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Title is required and must be under 120 characters' });
    }

    let rawUsernames = [];
    if (Array.isArray(parsed.data.inviteeUsernames) && parsed.data.inviteeUsernames.length > 0) {
      rawUsernames = parsed.data.inviteeUsernames;
    } else if (parsed.data.inviteeUsername) {
      rawUsernames = [parsed.data.inviteeUsername];
    }

    const uniqueUsernames = [
      ...new Set(
        rawUsernames
          .map((u) => u.toLowerCase().trim())
          .filter((u) => u && u !== req.user.username.toLowerCase())
      ),
    ];

    if (uniqueUsernames.length > 4) {
      return res.status(400).json({
        error: 'A private call can have at most 4 invited users (5 participants maximum including the host)',
      });
    }

    let invitedUsers = [];
    if (uniqueUsernames.length > 0) {
      invitedUsers = await User.find({
        username: { $in: uniqueUsernames },
        status: 'active',
        _id: { $ne: req.user._id },
      }).select('name username avatarUrl');

      if (invitedUsers.length !== uniqueUsernames.length) {
        return res.status(404).json({ error: 'One or more invited users could not be found' });
      }
    }

    const roomId = crypto.randomBytes(12).toString('base64url');
    const isOneToOne = parsed.data.callType === 'one-to-one';

    const meeting = await Meeting.create({
      roomId,
      liveKitRoomName: `meeting-${roomId}`,
      host: req.user._id,
      title: parsed.data.title,
      callType: parsed.data.callType,
      maxParticipants: isOneToOne ? 2 : 5,
      waitingRoom: isOneToOne ? true : (parsed.data.waitingRoom ?? false),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      invitedUsers: invitedUsers.map((u) => u._id),
      approvedUsers: [{ user: req.user._id }],
      accessCodeHash: parsed.data.accessCode
        ? await bcrypt.hash(parsed.data.accessCode, 10)
        : undefined,
    });

    const io = req.app.get('io');
    if (io && invitedUsers.length > 0) {
      for (const invitee of invitedUsers) {
        io.to(`user:${invitee._id}`).emit('meeting:invitation', {
          roomId,
          title: meeting.title,
          host: { name: req.user.name, username: req.user.username },
        });
      }
    }

    res.status(201).json({
      meeting: {
        id: meeting._id,
        roomId: meeting.roomId,
        title: meeting.title,
        callType: meeting.callType,
        maxParticipants: meeting.maxParticipants,
        waitingRoom: meeting.waitingRoom,
        requiresAccessCode: Boolean(meeting.accessCodeHash),
        expiresAt: meeting.expiresAt,
        host: {
          id: req.user._id,
          name: req.user.name,
          username: req.user.username,
          avatarUrl: req.user.avatarUrl,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMeeting(req, res, next) {
  try {
    const { roomId } = req.params;
    const meetingQuery = mongoose.isValidObjectId(roomId)
      ? { $or: [{ roomId }, { _id: roomId }] }
      : { roomId };

    const meeting = await Meeting.findOne(meetingQuery)
      .populate('host', 'name username avatarUrl')
      .populate('invitedUsers', 'name username avatarUrl');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.status === 'ended') {
      return res.status(410).json({ error: 'This meeting has ended' });
    }

    if (meeting.expiresAt && meeting.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This meeting link has expired' });
    }

    const currentUserId = req.user?._id?.toString();
    const isHost = currentUserId === meeting.host._id.toString();
    const isInvited = meeting.invitedUsers?.some(
      (u) => u._id.toString() === currentUserId
    );
    const isApproved = meeting.approvedUsers?.some(
      (entry) => entry.user?.toString() === currentUserId
    );

    res.json({
      meeting: {
        id: meeting._id,
        roomId: meeting.roomId,
        title: meeting.title,
        callType: meeting.callType,
        maxParticipants: meeting.maxParticipants,
        waitingRoom: meeting.waitingRoom,
        status: meeting.status,
        expiresAt: meeting.expiresAt,
        requiresAccessCode: Boolean(meeting.accessCodeHash),
        isHost,
        isInvited,
        isApproved,
        host: meeting.host,
        invitedUsers: meeting.invitedUsers,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createMediaToken(req, res, next) {
  try {
    const { roomId } = req.params;
    const { accessCode } = req.body || {};

    const meetingQuery = mongoose.isValidObjectId(roomId)
      ? { $or: [{ roomId }, { _id: roomId }] }
      : { roomId };

    const meeting = await Meeting.findOne(meetingQuery).select('+accessCodeHash');
    if (!meeting || meeting.status === 'ended') {
      return res.status(404).json({ error: 'Meeting not found or already ended' });
    }

    if (meeting.accessCodeHash) {
      const match = await bcrypt.compare(String(accessCode || ''), meeting.accessCodeHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid meeting access code' });
      }
    }

    const currentUserId = req.user?._id?.toString();
    const isHost = currentUserId === meeting.host.toString();
    const isApproved = meeting.approvedUsers?.some(
      (entry) => entry.user?.toString() === currentUserId
    );

    if (!isHost && meeting.waitingRoom && !isApproved) {
      return res.status(403).json({
        error: 'Approval required. Please wait in the lobby for host approval.',
        requiresApproval: true,
      });
    }

    if (!livekitConfigured() || !livekitCredentialsValid()) {
      return res.status(503).json({
        error: 'Media service is unavailable. Please check LiveKit server configuration.',
      });
    }

    const liveKitRoom = meeting.liveKitRoomName || `meeting-${meeting.roomId}`;
    const participantIdentity = `${req.user._id}-${Date.now().toString(36)}`;
    const participantName = req.user.username
      ? `${req.user.name} (@${req.user.username})`
      : req.user.name;

    const token = new AccessToken(env.livekitApiKey, env.livekitApiSecret, {
      identity: participantIdentity,
      name: participantName,
      metadata: JSON.stringify({
        userId: req.user._id,
        username: req.user.username,
        isHost,
      }),
      ttl: '6h',
    });

    token.addGrant({
      roomJoin: true,
      room: liveKitRoom,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwtToken = await token.toJwt();

    res.json({
      mode: 'livekit',
      token: jwtToken,
      url: env.livekitUrl,
      liveKitRoom,
      participantIdentity,
      isHost,
    });
  } catch (error) {
    next(error);
  }
}

export async function endMeeting(req, res, next) {
  try {
    const { roomId } = req.params;
    const meetingQuery = mongoose.isValidObjectId(roomId)
      ? { $or: [{ roomId }, { _id: roomId }] }
      : { roomId };

    const meeting = await Meeting.findOne(meetingQuery);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the host can end this meeting' });
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    await meeting.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`meeting:${meeting.roomId}`).emit('meeting:ended', {
        message: 'The host has ended this meeting.',
      });
    }

    if (livekitConfigured() && livekitCredentialsValid()) {
      try {
        const client = new RoomServiceClient(
          env.livekitUrl,
          env.livekitApiKey,
          env.livekitApiSecret
        );
        await client.deleteRoom(meeting.liveKitRoomName || `meeting-${meeting.roomId}`);
      } catch {}
    }

    res.json({ message: 'Meeting ended successfully' });
  } catch (error) {
    next(error);
  }
}
