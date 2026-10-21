import { z } from 'zod';
import Video from '../models/Video.js';
import VideoComment from '../models/VideoComment.js';
import VideoLike from '../models/VideoLike.js';
import SavedVideo from '../models/SavedVideo.js';
import WatchHistory from '../models/WatchHistory.js';
import { deleteVideoFile, uploadVideoFile } from '../services/media/local.service.js';

const idFilter = (id) => ({ _id: id, moderationStatus: 'visible', status: 'ready' });
const metadataSchema = z.object({ title: z.string().trim().min(1).max(140), description: z.string().max(5000).optional().default(''), category: z.string().trim().max(60).optional().default('General'), visibility: z.enum(['public', 'unlisted', 'private']).default('public'), tags: z.array(z.string().trim().max(30)).max(20).optional().default([]) });

export async function listVideos(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1); const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50); const search = String(req.query.search || '').trim();
    const filter = { visibility: 'public', moderationStatus: 'visible', status: 'ready' }; if (search) filter.$text = { $search: search }; if (req.query.category) filter.category = String(req.query.category);
    const [videos, total] = await Promise.all([Video.find(filter).populate('owner', 'name username avatarUrl').sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 }).skip((page - 1) * limit).limit(limit), Video.countDocuments(filter)]);
    res.json({ videos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
}

export async function listOwnedVideos(req, res, next) { try { const videos = await Video.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(100); res.json({ videos }); } catch (error) { next(error); } }

export async function getVideo(req, res, next) { try { const video = await Video.findOne(idFilter(req.params.id)).populate('owner', 'name username avatarUrl bio'); if (!video) return res.status(404).json({ error: 'Video not found' }); await Video.updateOne({ _id: video._id }, { $inc: { views: 1 } }); res.json({ video }); } catch (error) { next(error); } }

export async function uploadRecordedVideo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a video file to upload' });
    const parsed = metadataSchema.safeParse({ ...req.body, tags: typeof req.body.tags === 'string' ? req.body.tags.split(',') : req.body.tags });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
    const result = await uploadVideoFile(req.file.buffer, req.file.originalname);
    const video = await Video.create({ owner: req.user._id, ...parsed.data, playbackUrl: `${req.protocol}://${req.get('host')}/media/${result.public_id}`, storagePublicId: result.public_id, durationSeconds: 0 });
    res.status(201).json({ video });
  } catch (error) { next(error); }
}

export async function deleteVideo(req, res, next) { try { const video = await Video.findById(req.params.id); if (!video) return res.status(404).json({ error: 'Video not found' }); if (video.owner.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Only the creator can delete this video' }); await deleteVideoFile(video.storagePublicId); await Promise.all([VideoComment.deleteMany({ video: video._id }), VideoLike.deleteMany({ video: video._id }), SavedVideo.deleteMany({ video: video._id }), WatchHistory.deleteMany({ video: video._id }), video.deleteOne()]); res.status(204).end(); } catch (error) { next(error); } }

export async function toggleLike(req, res, next) { try { const video = await Video.findOne(idFilter(req.params.id)); if (!video) return res.status(404).json({ error: 'Video not found' }); const existing = await VideoLike.findOne({ video: video._id, user: req.user._id }); if (existing) { await existing.deleteOne(); await Video.updateOne({ _id: video._id, likesCount: { $gt: 0 } }, { $inc: { likesCount: -1 } }); } else { await VideoLike.create({ video: video._id, user: req.user._id }); await Video.updateOne({ _id: video._id }, { $inc: { likesCount: 1 } }); } const updated = await Video.findById(video._id).select('likesCount'); res.json({ liked: !existing, likesCount: updated.likesCount }); } catch (error) { next(error); } }

export async function listComments(req, res, next) { try { const comments = await VideoComment.find({ video: req.params.id, moderationStatus: 'visible' }).populate('author', 'name username avatarUrl').sort({ createdAt: -1 }).limit(100); res.json({ comments }); } catch (error) { next(error); } }
export async function createComment(req, res, next) { try { const parsed = z.object({ body: z.string().trim().min(1).max(1000), parent: z.string().optional().nullable() }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Comment must contain 1–1000 characters' }); const video = await Video.findOne(idFilter(req.params.id)); if (!video) return res.status(404).json({ error: 'Video not found' }); const comment = await VideoComment.create({ video: video._id, author: req.user._id, ...parsed.data }); await Video.updateOne({ _id: video._id }, { $inc: { commentsCount: 1 } }); res.status(201).json({ comment: await comment.populate('author', 'name username avatarUrl') }); } catch (error) { next(error); } }

export async function toggleSaved(req, res, next) { try { const video = await Video.findOne(idFilter(req.params.id)); if (!video) return res.status(404).json({ error: 'Video not found' }); const existing = await SavedVideo.findOne({ video: video._id, user: req.user._id }); if (existing) await existing.deleteOne(); else await SavedVideo.create({ video: video._id, user: req.user._id }); res.json({ saved: !existing }); } catch (error) { next(error); } }
export async function listSaved(req, res, next) { try { const saved = await SavedVideo.find({ user: req.user._id }).populate({ path: 'video', populate: { path: 'owner', select: 'name username avatarUrl' } }).sort({ createdAt: -1 }); res.json({ videos: saved.map((item) => item.video).filter(Boolean) }); } catch (error) { next(error); } }
export async function saveHistory(req, res, next) { try { const progressSeconds = Math.max(Number(req.body.progressSeconds) || 0, 0); const video = await Video.findOne(idFilter(req.params.id)); if (!video) return res.status(404).json({ error: 'Video not found' }); await WatchHistory.findOneAndUpdate({ video: video._id, user: req.user._id }, { progressSeconds, watchedAt: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true }); res.status(204).end(); } catch (error) { next(error); } }
export async function listHistory(req, res, next) { try { const history = await WatchHistory.find({ user: req.user._id }).populate({ path: 'video', populate: { path: 'owner', select: 'name username avatarUrl' } }).sort({ watchedAt: -1 }).limit(100); res.json({ history }); } catch (error) { next(error); } }
