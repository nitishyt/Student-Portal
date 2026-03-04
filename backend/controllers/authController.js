const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

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
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user — role is always "student" by default
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: 'student' // NEVER accept role from frontend
    });
    await user.save();

    // Generate token
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error);
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

    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // bcrypt compare
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
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

    // Create JWT — payload contains id + role (from DB, not from client)
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
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
