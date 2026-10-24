import { z } from 'zod';
import User from '../models/User.js';
import Video from '../models/Video.js';

const profileSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), username: z.string().regex(/^[a-z0-9_]{3,30}$/).optional(), bio: z.string().max(500).optional() }).strict();

export async function updateProfile(req, res, next) {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Name, username, or bio is invalid' });
    if (parsed.data.username && parsed.data.username !== req.user.username) {
      const exists = await req.user.constructor.exists({ username: parsed.data.username, _id: { $ne: req.user._id } });
      if (exists) return res.status(409).json({ error: 'Username is already in use' });
    }
    Object.assign(req.user, parsed.data); await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (error) { next(error); }
}

export async function getPublicProfile(req, res, next) {
  try {
    const user = await User.findOne({ username: req.params.username, status: 'active' }).select('name username avatarUrl bio createdAt');
    if (!user) return res.status(404).json({ error: 'Creator not found' });
    const videos = await Video.find({ owner: user._id, visibility: 'public', status: 'ready', moderationStatus: 'visible' }).sort({ createdAt: -1 }).limit(50);
    res.json({ user, videos });
  } catch (error) { next(error); }
}

export async function searchUsers(req, res, next) {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query || query.length < 1) {
      return res.json({ users: [] });
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const users = await User.find({
      status: 'active',
      _id: { $ne: req.user._id },
      $or: [{ username: regex }, { name: regex }],
    })
      .select('name username avatarUrl')
      .limit(10);
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
}

