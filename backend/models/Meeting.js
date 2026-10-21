import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  accessCodeHash: { type: String, select: false },
  status: { type: String, enum: ['active', 'ended'], default: 'active', index: true },
  locked: { type: Boolean, default: false },
  waitingRoom: { type: Boolean, default: false },
  maxParticipants: { type: Number, default: 5, immutable: true },
  endedAt: Date,
}, { timestamps: true });

export default mongoose.model('Meeting', meetingSchema);

