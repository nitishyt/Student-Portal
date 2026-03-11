const crypto = require('crypto');
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
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── Helper: sign access token (short-lived) ────────────────────────
const signAccessToken = (user) => {
  const payload = { id: user._id, role: user.role, v: user.tokenVersion || 0 };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
};

// ─── Helper: sign refresh token (long-lived) ────────────────────────
const signRefreshToken = (user) => {
  const payload = { id: user._id, v: user.tokenVersion || 0 };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: REFRESH_TOKEN_EXPIRY
  });
};

// ─── Helper: set refresh token as httpOnly cookie ────────────────────
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/api/auth'
  });
};

// ─── Helper: clear refresh cookie ───────────────────────────────────
const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/api/auth'
  });
};

// ─── Helper: hash a refresh token for DB storage ────────────────────
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ─── Register (public) ──────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: 'student' // NEVER accept role from frontend
    });
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Store hashed refresh token in DB
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: hashToken(refreshToken) } });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      token: accessToken,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// ─── Login ───────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role } = req.body;

    // Always query by username only to prevent enumeration via role hint
    const user = await User.findOne({ username }).select(
      '+password +failedLoginAttempts +lockUntil +tokenVersion +mustChangePassword'
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If client sent a role hint and it doesn't match, still return same error
    if (role && user.role !== role) {
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

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const update = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        update.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        update.failedLoginAttempts = 0;
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

    // Build user data
    let userData = { id: user._id, username: user.username, role: user.role };

    if (user.mustChangePassword) {
      userData.mustChangePassword = true;
    }

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

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Store hashed refresh token in DB
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: hashToken(refreshToken) } });

    setRefreshCookie(res, refreshToken);

    res.json({ token: accessToken, user: userData });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};

// ─── Refresh access token ────────────────────────────────────────────
exports.refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        algorithms: [JWT_ALGORITHM]
      });
    } catch (err) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id).select('+refreshToken +tokenVersion');
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    // Verify token version matches (revocation check)
    if (typeof decoded.v === 'number' && decoded.v !== user.tokenVersion) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Token has been revoked.' });
    }

    // Verify stored hash matches the presented token
    if (!user.refreshToken || user.refreshToken !== hashToken(token)) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh token mismatch. Please log in again.' });
    }

    // Issue new tokens (rotate refresh token)
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    await User.updateOne({ _id: user._id }, { $set: { refreshToken: hashToken(newRefreshToken) } });

    setRefreshCookie(res, newRefreshToken);

    res.json({ token: newAccessToken });
  } catch (error) {
    res.status(500).json({ error: 'Server error during token refresh' });
  }
};

// ─── Logout ──────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    // Increment tokenVersion to invalidate all existing JWTs for this user
    await User.updateOne(
      { _id: req.user.id },
      { $inc: { tokenVersion: 1 }, $set: { refreshToken: null } }
    );

    clearRefreshCookie(res);

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during logout' });
  }
};

// ─── Change password ─────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password +tokenVersion');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password, clear mustChangePassword flag, increment tokenVersion to revoke old tokens
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword, mustChangePassword: false, refreshToken: null },
        $inc: { tokenVersion: 1 }
      }
    );

    clearRefreshCookie(res);

    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during password change' });
  }
};

// ─── Verify current session ─────────────────────────────────────────
exports.verify = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ valid: false, error: 'User not found' });

    const userData = { id: user._id, username: user.username, role: user.role };

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

    res.json({ valid: true, user: userData });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Session expired or invalid' });
  }
};
