import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30, match: /^[a-z0-9_]+$/ },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'creator', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  avatarUrl: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return { id: this._id.toString(), name: this.name, username: this.username, email: this.email, role: this.role, status: this.status, avatarUrl: this.avatarUrl, bio: this.bio };
};

export default mongoose.model('User', userSchema);

