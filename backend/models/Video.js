import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, default: '', maxlength: 5000 },
  category: { type: String, default: 'General', trim: true, maxlength: 60, index: true },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
  visibility: { type: String, enum: ['public', 'unlisted', 'private'], default: 'public', index: true },
  playbackUrl: { type: String, required: true },
  thumbnailUrl: { type: String, default: '' },
  storagePublicId: { type: String, default: '' },
  durationSeconds: { type: Number, default: 0 },
  views: { type: Number, default: 0, min: 0 },
  likesCount: { type: Number, default: 0, min: 0 },
  commentsCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'ready', index: true },
  moderationStatus: { type: String, enum: ['visible', 'hidden', 'removed'], default: 'visible', index: true },
}, { timestamps: true });

videoSchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Video', videoSchema);
