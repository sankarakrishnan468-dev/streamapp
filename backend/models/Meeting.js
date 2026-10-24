import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  liveKitRoomName: { type: String, unique: true, sparse: true, index: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  invitedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  invitedViewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  callType: { type: String, enum: ['one-to-one', 'group'], default: 'group', index: true },
  accessCodeHash: { type: String, select: false },
  status: { type: String, enum: ['active', 'ended'], default: 'active', index: true },
  expiresAt: { type: Date, index: true },
  locked: { type: Boolean, default: false },
  waitingRoom: { type: Boolean, default: false },
  maxParticipants: { type: Number, min: 2, max: 5, default: 5, immutable: true },
  approvedUsers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date, default: Date.now },
  }],
  pendingJoinRequests: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    displayName: { type: String, trim: true, maxlength: 80 },
    requestedAt: { type: Date, default: Date.now },
  }],
  activeParticipants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
  }],
  endedAt: Date,
}, { timestamps: true });

export default mongoose.model('Meeting', meetingSchema);

