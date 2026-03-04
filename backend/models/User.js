const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Never return password unless explicitly selected
  },
  role: {
    type: String,
    enum: ['admin', 'faculty', 'student', 'parent'],
    default: 'student',
    required: true
  },
  // ─── Security: Token revocation ──────────────────────────────────
  // Increment on logout / password change to invalidate all existing JWTs.
  tokenVersion: { type: Number, default: 0 },
  // ─── Security: Brute-force protection ────────────────────────────
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Virtual: is the account currently locked?
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Never return sensitive fields in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  delete obj.tokenVersion;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
