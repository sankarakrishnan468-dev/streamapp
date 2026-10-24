import mongoose from 'mongoose';

const liveStreamSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, default: '', maxlength: 2000 },
  category: { type: String, default: 'General', trim: true, maxlength: 60, index: true },
  thumbnailUrl: { type: String, default: '' },
  playbackUrl: { type: String, default: '' },
  visibility: { type: String, enum: ['public', 'unlisted'], default: 'public', index: true },
  status: { type: String, enum: ['scheduled', 'live', 'paused', 'ended'], default: 'live', index: true },
  health: { type: String, enum: ['unknown', 'good', 'warning', 'error'], default: 'unknown' },
  provider: { type: String, default: 'external-hls' },
  viewerLimit: { type: Number, default: 100, min: 1, max: 100 },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
}, { timestamps: true });

export default mongoose.model('LiveStream', liveStreamSchema);
