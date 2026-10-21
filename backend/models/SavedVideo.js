import mongoose from 'mongoose';

const savedVideoSchema = new mongoose.Schema({
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

savedVideoSchema.index({ video: 1, user: 1 }, { unique: true });

export default mongoose.model('SavedVideo', savedVideoSchema);
