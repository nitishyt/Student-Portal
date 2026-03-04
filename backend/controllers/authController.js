const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

// ─── Constants ───────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes
const SALT_ROUNDS = 12;
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRY = '1d';

// ─── Helper: sign JWT with explicit algorithm + tokenVersion ─────────
const signToken = (user) => {
  const payload = { id: user._id, role: user.role, v: user.tokenVersion || 0 };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: JWT_EXPIRY
  });
};

// ─── Register (public) ──────────────────────────────────────────────
// Frontend sends: { username, email, password }
// Backend ALWAYS sets role = "student" — role is NEVER accepted from the client.
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user — role is always "student" by default
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: 'student' // NEVER accept role from frontend
    });
    await user.save();

    // Generate token
    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// ─── Login ───────────────────────────────────────────────────────────
// Frontend sends: { username, password }
// Backend looks up user, compares password, returns JWT.
// The "role" dropdown on the frontend is used ONLY for routing after login;
// the actual role comes from the database.
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role } = req.body;

    // If role is supplied we use it as a lookup hint (existing app behaviour)
    // but the authoritative role is always what is stored in the DB.
    const query = { username };
    if (role) query.role = role;

    const user = await User.findOne(query).select('+password +failedLoginAttempts +lockUntil +tokenVersion');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ─── Account lockout check ───────────────────────────────────
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMs = user.lockUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return res.status(423).json({
        error: `Account temporarily locked. Try again in ${remainingMin} minute(s).`
      });
    }

    // bcrypt compare
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      // ─── Increment failed attempts ─────────────────────────────
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const update = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        update.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        update.failedLoginAttempts = 0; // reset counter, lock takes over
      }
      await User.updateOne({ _id: user._id }, { $set: update });

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ─── Successful login: reset failed attempts ─────────────────
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      await User.updateOne({ _id: user._id }, {
        $set: { failedLoginAttempts: 0, lockUntil: null }
      });
    }

    // Build user data (password is NEVER included)
    let userData = { id: user._id, username: user.username, role: user.role };

    // Enrich with linked profile info
    if (user.role === 'student') {
      const student = await Student.findOne({ userId: user._id });
      if (student) userData.studentId = student._id;
    } else if (user.role === 'parent') {
      const student = await Student.findOne({ parentUsername: user.username });
      if (student) userData.studentId = student._id;
    } else if (user.role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: user._id });
      if (faculty) userData.subject = faculty.subject;
    }

    // Create JWT — payload contains id + role + tokenVersion (from DB, not from client)
    const token = signToken(user);

    res.json({ token, user: userData });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// ─── Verify current session ─────────────────────────────────────────
exports.verify = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ valid: false, error: 'User not found' });

    res.json({
      valid: true,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Session expired or invalid' });
  }
};
