const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Faculty = require('../models/Faculty');
const User = require('../models/User');

const SALT_ROUNDS = 12;
const generateSecurePassword = () => crypto.randomBytes(10).toString('base64url');

// ─── GET all faculties ───────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const faculties = await Faculty.find();
    const isAdmin = req.user && req.user.role === 'admin';

    const result = faculties.map((f) => {
      const obj = f.toObject();
      delete obj.password;
      if (!isAdmin) {
        delete obj.username;
      }
      return obj;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch faculties.' });
  }
};

// ─── CREATE faculty ──────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, username, subject, email } = req.body;

    if (!name || !username || !subject || !email) {
      return res.status(400).json({ error: 'Name, username, subject, and email are required.' });
    }
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-50 alphanumeric characters or underscores.' });
    }

    // Generate secure random password — admin cannot choose it
    const rawPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    const user = new User({
      username,
      password: hashedPassword,
      role: 'faculty',
      mustChangePassword: true
    });
    await user.save();

    const faculty = new Faculty({ userId: user._id, name, username, subject, email });
    await faculty.save();

    // Return one-time password so admin can share it
    res.status(201).json({
      id: faculty._id,
      name,
      username,
      subject,
      email,
      _oneTimePassword: rawPassword
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Failed to create faculty.' });
  }
};

// ─── RESET faculty password ──────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const facultyId = req.params.id;
    if (!facultyId || !facultyId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid faculty ID' });
    }

    const faculty = await Faculty.findById(facultyId);
    if (!faculty) return res.status(404).json({ error: 'Faculty not found' });

    const user = await User.findOne({ username: faculty.username });
    if (!user) return res.status(404).json({ error: 'Faculty user account not found.' });

    const newRawPassword = generateSecurePassword();
    const newHashedPassword = await bcrypt.hash(newRawPassword, SALT_ROUNDS);
    user.password = newHashedPassword;
    user.mustChangePassword = true;
    await user.save();

    res.json({ username: faculty.username, newPassword: newRawPassword });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
};

// ─── DELETE faculty ──────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const facultyId = req.params.id;
    if (!facultyId || !facultyId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid faculty ID' });
    }

    const faculty = await Faculty.findByIdAndDelete(facultyId);
    if (!faculty) return res.status(404).json({ error: 'Faculty not found' });

    await User.findByIdAndDelete(faculty.userId);
    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete faculty.' });
  }
};
