import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import Meeting from "../models/Meeting.js";
import User from "../models/User.js";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env, livekitConfigured, livekitCredentialsValid } from "../config/env.js";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  callType: z.enum(["one-to-one", "group"]).default("group"),
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
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Title is required and must be under 120 characters" });

    // Collect usernames to invite (up to 4 invitees for a 5-person call including host)
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
        error: "A private call can have at most 4 invited users (5 participants maximum including the host)",
      });
    }

    let invitedUsers = [];
    if (uniqueUsernames.length > 0) {
      invitedUsers = await User.find({
        username: { $in: uniqueUsernames },
        status: "active",
        _id: { $ne: req.user._id },
      }).select("name username avatarUrl");

      if (invitedUsers.length !== uniqueUsernames.length) {
        return res
          .status(404)
          .json({ error: "One or more invited users could not be found" });
      }
    }

    const roomId = crypto.randomBytes(12).toString("base64url");
    const meeting = await Meeting.create({
      roomId,
      liveKitRoomName: `streamconnect-${roomId}`,
      host: req.user._id,
      invitedUsers: invitedUsers.map((u) => u._id),
      invitedViewer: invitedUsers[0]?._id || undefined,
      title: parsed.data.title,
      callType: parsed.data.callType,
      maxParticipants: parsed.data.callType === "one-to-one" ? 2 : 5,
      waitingRoom: parsed.data.callType === "one-to-one" ? true : (parsed.data.waitingRoom ?? false),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      approvedUsers: [{ user: req.user._id }],
      accessCodeHash: parsed.data.accessCode
        ? await bcrypt.hash(parsed.data.accessCode, 10)
        : undefined,
    });

    const io = req.app.get("io");
    if (io && invitedUsers.length > 0) {
      for (const invitee of invitedUsers) {
        io.to(`user:${invitee._id}`).emit("meeting:invitation", {
          roomId,
          title: meeting.title,
          host: { name: req.user.name, username: req.user.username },
        });
      }
    }

    res.status(201).json({
      meeting: {
        id: meeting._id,
        roomId,
        title: meeting.title,
        maxParticipants: meeting.maxParticipants,
        callType: meeting.callType,
        invitedUsers,
        inviteUrl: `/meetings/${roomId}`,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMeeting(req, res, next) {
  try {
    const identifier = req.params.roomId;
    const query = mongoose.isValidObjectId(identifier)
      ? { $or: [{ roomId: identifier }, { _id: identifier }] }
      : { roomId: identifier };
    const meeting = await Meeting.findOne(query)
      .select("+accessCodeHash")
      .populate("host", "name username avatarUrl")
      .populate("invitedUsers", "name username avatarUrl")
      .populate("invitedViewer", "name username avatarUrl");
    if (!meeting || meeting.status === "ended")
      return res.status(404).json({ error: "Meeting not found or ended" });
    if (meeting.expiresAt && meeting.expiresAt <= new Date()) {
      if (meeting.status !== "ended") await Meeting.updateOne({ _id: meeting._id, status: "active" }, { $set: { status: "ended", endedAt: new Date() } });
      return res.status(410).json({ error: "This private call has expired" });
    }

    const currentUserId = req.user._id.toString();
    const isHost = meeting.host._id.toString() === currentUserId;
    const isInvitedUser = meeting.invitedUsers?.some(
      (u) => u._id.toString() === currentUserId
    );
    const isInvitedViewer =
      meeting.invitedViewer?._id.toString() === currentUserId;
    const isApprovedUser = meeting.approvedUsers?.some(
      (entry) => entry.user?.toString() === currentUserId
    );
    const hasInviteList =
      (meeting.invitedUsers && meeting.invitedUsers.length > 0) ||
      Boolean(meeting.invitedViewer);
    if (hasInviteList && !isHost && !isInvitedUser && !isInvitedViewer && !isApprovedUser && !meeting.waitingRoom)
      return res
        .status(403)
        .json({ error: "You are not invited to this private call" });

    res.json({
      meeting: {
        id: meeting._id,
        roomId: meeting.roomId,
        title: meeting.title,
        host: meeting.host,
        invitedUsers: meeting.invitedUsers || [],
        invitedViewer: meeting.invitedViewer,
        isHost,
        isInvited: isInvitedUser || isInvitedViewer,
        isApproved: isHost || Boolean(isApprovedUser),
        locked: meeting.locked,
        waitingRoom: meeting.waitingRoom,
        requiresAccessCode: Boolean(meeting.accessCodeHash),
        maxParticipants: meeting.maxParticipants || 5,
        callType: meeting.callType || (meeting.maxParticipants === 2 ? "one-to-one" : "group"),
        status: meeting.status,
        expiresAt: meeting.expiresAt,
        activeParticipantCount: meeting.activeParticipants?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getGuestMeeting(req, res, next) {
  try {
    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
      status: "active",
    }).populate("host", "name username avatarUrl");
    if (!meeting)
      return res.status(404).json({ error: "Meeting not found or ended" });
    if (meeting.expiresAt && meeting.expiresAt <= new Date()) return res.status(410).json({ error: "This private call has expired" });
    res.json({
      meeting: {
        id: meeting._id,
        roomId: meeting.roomId,
        title: meeting.title,
        host: meeting.host,
        isHost: false,
        waitingRoom: meeting.waitingRoom,
        requiresAccessCode: Boolean(meeting.accessCodeHash),
        maxParticipants: meeting.maxParticipants,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function endMeeting(req, res, next) {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    if (meeting.host.toString() !== req.user._id.toString())
      return res
        .status(403)
        .json({ error: "Only the host can end this meeting" });
    meeting.status = "ended";
    meeting.activeParticipants = [];
    meeting.endedAt = new Date();
    await meeting.save();
    if (livekitConfigured()) {
      try {
        const serviceUrl = env.livekitUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
        const livekit = new RoomServiceClient(serviceUrl, env.livekitApiKey, env.livekitApiSecret);
        await livekit.deleteRoom(meeting.liveKitRoomName || meeting.roomId);
      } catch (error) {
        console.error('Unable to delete LiveKit room during meeting end', error.message);
      }
    }
    const io = req.app.get("io");
    const room = io?.sockets?.adapter?.rooms?.get(`meeting:${meeting.roomId}`);
    io?.to(`meeting:${meeting.roomId}`).emit("meeting:ended", { message: "This meeting has ended" });
    for (const socketId of room || []) io?.sockets?.sockets?.get(socketId)?.disconnect(true);
    res.json({ status: "ended" });
  } catch (error) {
    next(error);
  }
}

function meetingQuery(identifier) {
  return mongoose.isValidObjectId(identifier)
    ? { $or: [{ roomId: identifier }, { _id: identifier }] }
    : { roomId: identifier };
}

export async function createMediaToken(req, res, next) {
  try {
    if (!livekitCredentialsValid()) return res.status(503).json({ error: 'Private calling has invalid LiveKit configuration. Copy LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET exactly from the same LiveKit project, then restart the server.' });
    const meeting = await Meeting.findOne({
      ...meetingQuery(req.params.roomId),
      status: "active",
    });
    if (!meeting)
      return res.status(404).json({ error: "Meeting not found or ended" });
    if (meeting.expiresAt && meeting.expiresAt <= new Date()) return res.status(410).json({ error: "This private call has expired" });

    const userId = req.user._id.toString();
    const isHost = meeting.host.toString() === userId;
    const isInvitedUser = meeting.invitedUsers?.some(
      (id) => id.toString() === userId
    );
    const isInvitedViewer = meeting.invitedViewer?.toString() === userId;
    const hasInviteList =
      (meeting.invitedUsers && meeting.invitedUsers.length > 0) ||
      Boolean(meeting.invitedViewer);

    const isApproved = meeting.approvedUsers?.some((entry) => entry.user.toString() === userId);
    if (hasInviteList && !isHost && !isInvitedUser && !isInvitedViewer && !isApproved && !meeting.waitingRoom)
      return res
        .status(403)
        .json({ error: "You are not invited to this private call" });

    if (meeting.locked && !isHost)
      return res.status(423).json({ error: "This meeting is locked" });

    if (!isHost && !isApproved && meeting.waitingRoom)
      return res.status(403).json({ error: "The host must approve your request before you can join" });

    if (
      meeting.accessCodeHash &&
      !(await bcrypt.compare(
        String(req.body?.accessCode || ""),
        meeting.accessCodeHash,
      ))
    )
      return res
        .status(403)
        .json({ error: "The meeting password is incorrect" });

    const sessionId =
      typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(sessionId))
      return res
        .status(400)
        .json({ error: "A valid meeting session is required" });

    await Meeting.updateOne(
      { _id: meeting._id },
      { $pull: { activeParticipants: { user: req.user._id } } },
    );

    const admitted = await Meeting.findOneAndUpdate(
      {
        _id: meeting._id,
        status: "active",
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$activeParticipants", []] } },
            "$maxParticipants",
          ],
        },
      },
      {
        $push: {
          activeParticipants: {
            user: req.user._id,
            sessionId,
            joinedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!admitted)
      return res.status(409).json({
        error: `This meeting is full (maximum ${meeting.maxParticipants} participants)`,
      });

    const participantIdentity = `${userId}_${sessionId}`;
    const token = new AccessToken(env.livekitApiKey, env.livekitApiSecret, {
      identity: participantIdentity,
      name: req.user.name || req.user.username || "Participant",
      ttl: "30m",
    });
    token.addGrant({
      roomJoin: true,
      room: meeting.liveKitRoomName || meeting.roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    return res.json({
      mode: "livekit",
      token: await token.toJwt(),
      url: env.livekitUrl,
      roomId: meeting.roomId,
      liveKitRoomName: meeting.liveKitRoomName || meeting.roomId,
      isHost,
      maxParticipants: meeting.maxParticipants,
    });
  } catch (error) {
    return next(error);
  }
}

export async function leaveMeeting(req, res, next) {
  try {
    const sessionId =
      typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    await Meeting.updateOne(
      { ...meetingQuery(req.params.roomId) },
      {
        $pull: {
          activeParticipants: { $or: [{ user: req.user._id }, { sessionId }] },
        },
      },
    );
    return res.json({ status: "left" });
  } catch (error) {
    return next(error);
  }
}
