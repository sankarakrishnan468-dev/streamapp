import { z } from 'zod';
import LiveStream from '../models/LiveStream.js';

const emptyToUndefined = (value) => value === '' ? undefined : value;
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const streamSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(140, 'Title must be 140 characters or fewer'),
  description: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
  category: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  thumbnailUrl: optionalUrl,
  playbackUrl: optionalUrl,
  visibility: z.enum(['public', 'unlisted']).default('public'),
});

export async function createStream(req, res, next) { try { const parsed = streamSchema.safeParse(req.body); if (!parsed.success) { const details = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`); return res.status(400).json({ error: details.join('; ') }); } const stream = await LiveStream.create({ owner: req.user._id, ...parsed.data }); res.status(201).json({ stream }); } catch (e) { next(e); } }
export async function listLiveStreams(req, res, next) { try { const streams = await LiveStream.find({ status: 'live', visibility: 'public' }).populate('owner', 'name username avatarUrl').sort({ startedAt: -1 }).limit(50); res.json({ streams }); } catch (e) { next(e); } }
export async function listOwnedStreams(req, res, next) { try { const streams = await LiveStream.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(100); res.json({ streams }); } catch (e) { next(e); } }
export async function getStream(req, res, next) { try { const stream = await LiveStream.findById(req.params.id).populate('owner', 'name username avatarUrl'); if (!stream) return res.status(404).json({ error: 'Stream not found' }); res.json({ stream }); } catch (e) { next(e); } }
export async function endStream(req, res, next) { try { const stream = await LiveStream.findById(req.params.id); if (!stream) return res.status(404).json({ error: 'Stream not found' }); if (stream.owner.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Only the streamer can end this broadcast' }); stream.status = 'ended'; stream.endedAt = new Date(); await stream.save(); res.json({ stream }); } catch (e) { next(e); } }
export async function updateStreamState(req, res, next) { try { const stream = await LiveStream.findById(req.params.id); if (!stream) return res.status(404).json({ error: 'Stream not found' }); if (stream.owner.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Only the streamer can control this broadcast' }); const nextStatus = req.body.status; if (!['live', 'paused'].includes(nextStatus)) return res.status(400).json({ error: 'Status must be live or paused' }); stream.status = nextStatus; await stream.save(); res.json({ stream }); } catch (e) { next(e); } }
export async function streamHealth(req, res, next) { try { const stream = await LiveStream.findById(req.params.id).select('owner status health playbackUrl provider'); if (!stream) return res.status(404).json({ error: 'Stream not found' }); if (stream.owner.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Only the streamer can view stream health' }); res.json({ health: stream.health, status: stream.status, hasPlaybackUrl: Boolean(stream.playbackUrl), provider: stream.provider }); } catch (e) { next(e); } }
