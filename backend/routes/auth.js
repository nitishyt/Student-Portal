const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

// Fallback secret for development if environment variable is missing
const JWT_SECRET = process.env.JWT_SECRET || 'student_portal_secret_key_2025_fallback';

router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const user = await User.findOne({ username, role });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let userData = { id: user._id, username: user.username, role: user.role };

    if (role === 'student') {
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        userData.studentId = student._id;
      }
    } else if (role === 'parent') {
      const student = await Student.findOne({ parentUsername: user.username });
      if (student) {
        userData.studentId = student._id;
      }
    } else if (role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: user._id });
      if (faculty) {
        userData.subject = faculty.subject;
      }
    }

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
