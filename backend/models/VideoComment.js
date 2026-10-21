import mongoose from 'mongoose';

const videoCommentSchema = new mongoose.Schema({
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 1000 },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoComment', default: null },
  moderationStatus: { type: String, enum: ['visible', 'hidden', 'removed'], default: 'visible' },
}, { timestamps: true });

export default mongoose.model('VideoComment', videoCommentSchema);
