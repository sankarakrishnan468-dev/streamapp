import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema({
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  progressSeconds: { type: Number, default: 0, min: 0 },
  watchedAt: { type: Date, default: Date.now },
}, { timestamps: true });

watchHistorySchema.index({ video: 1, user: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, watchedAt: -1 });

export default mongoose.model('WatchHistory', watchHistorySchema);
