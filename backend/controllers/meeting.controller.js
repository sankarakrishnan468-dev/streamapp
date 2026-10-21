import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import Meeting from '../models/Meeting.js';

const createSchema = z.object({ title: z.string().trim().min(1).max(120), accessCode: z.string().min(4).max(32).optional(), waitingRoom: z.boolean().optional() });

export async function createMeeting(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Title is required and must be under 120 characters' });
    const roomId = crypto.randomBytes(12).toString('base64url');
    const meeting = await Meeting.create({ roomId, host: req.user._id, title: parsed.data.title, waitingRoom: parsed.data.waitingRoom ?? false, accessCodeHash: parsed.data.accessCode ? await bcrypt.hash(parsed.data.accessCode, 10) : undefined });
    res.status(201).json({ meeting: { id: meeting._id, roomId, title: meeting.title, maxParticipants: meeting.maxParticipants, inviteUrl: `/meetings/${roomId}` } });
  } catch (error) { next(error); }
}

export async function getMeeting(req, res, next) {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId }).populate('host', 'name username avatarUrl');
    if (!meeting || meeting.status === 'ended') return res.status(404).json({ error: 'Meeting not found or ended' });
    res.json({ meeting: { id: meeting._id, roomId: meeting.roomId, title: meeting.title, host: meeting.host, isHost: meeting.host._id.toString() === req.user._id.toString(), locked: meeting.locked, waitingRoom: meeting.waitingRoom, maxParticipants: meeting.maxParticipants } });
  } catch (error) { next(error); }
}

export async function endMeeting(req, res, next) {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (meeting.host.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Only the host can end this meeting' });
    meeting.status = 'ended'; meeting.endedAt = new Date(); await meeting.save();
    res.json({ status: 'ended' });
  } catch (error) { next(error); }
}
