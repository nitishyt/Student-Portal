const bcrypt = require('bcryptjs');
const Faculty = require('../models/Faculty');
const User = require('../models/User');

// ─── GET all faculties ───────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const faculties = await Faculty.find();

    const result = await Promise.all(
      faculties.map(async (f) => {
        const obj = f.toObject();
        if (!obj.username) {
          const user = await User.findById(obj.userId);
          if (user) obj.username = user.username;
        }
        // NEVER return plain-text passwords
        delete obj.password;
        return obj;
      })
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── CREATE faculty ──────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, username, password, subject, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({ username, password: hashedPassword, role: 'faculty' });
    await user.save();

    const faculty = new Faculty({ userId: user._id, name, username, subject, email });
    await faculty.save();

    res.status(201).json({
      id: faculty._id,
      name,
      username,
      subject,
      email
      // Password is NOT returned
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    console.error('Faculty delete error:', error);
    res.status(500).json({ error: error.message });
  }
};
