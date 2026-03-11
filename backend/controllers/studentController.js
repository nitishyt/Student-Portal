const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');

const SALT_ROUNDS = 12;

// ─── Helper: generate a secure random password ──────────────────────
const generateSecurePassword = () => crypto.randomBytes(10).toString('base64url'); // ~13 chars

// ─── GET all students ────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { branch, standard } = req.query;
    const filter = {};
    if (branch && ['DS', 'AIML', 'IT', 'COMPS'].includes(branch)) filter.branch = branch;
    if (standard && ['FE', 'SE', 'TE', 'BE'].includes(standard)) filter.standard = standard;

    const students = await Student.find(filter).sort({ rollNo: 1 });

    const isAdmin = req.user && req.user.role === 'admin';
    const studentsWithCreds = students.map((s) => {
      const obj = s.toObject();
      obj.id = obj._id;
      // NEVER return plain-text passwords
      delete obj.password;
      delete obj.parentPassword;
      // Only admin sees usernames
      if (!isAdmin) {
        delete obj.username;
        delete obj.parentUsername;
      }
      return obj;
    });

    res.json(studentsWithCreds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
};

// ─── GET student by ID ──────────────────────────────────────────────
// IDOR protection: ownership is checked via checkStudentOwnership middleware
// on the route or by verifying req.user here as a defence-in-depth measure.
exports.getById = async (req, res) => {
  try {
    const studentId = req.params.id;
    if (!studentId || !studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // ─── IDOR check (defence-in-depth) ───────────────────────────
    const { id: userId, role } = req.user;
    if (!['admin', 'faculty'].includes(role)) {
      if (role === 'student' && String(student.userId) !== String(userId)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      if (role === 'parent') {
        const parentUser = await User.findById(userId).select('username');
        if (!parentUser || student.parentUsername !== parentUser.username) {
          return res.status(403).json({ error: 'Access denied.' });
        }
      }
    }

    const obj = student.toObject();
    delete obj.password;
    delete obj.parentPassword;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student.' });
  }
};

// ─── CREATE student ──────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, rollNo, branch, standard, phone } = req.body;

    // Input validation
    if (!name || !rollNo || !branch || !standard || !phone) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!['DS', 'AIML', 'IT', 'COMPS'].includes(branch)) {
      return res.status(400).json({ error: 'Invalid branch.' });
    }
    if (!['FE', 'SE', 'TE', 'BE'].includes(standard)) {
      return res.status(400).json({ error: 'Invalid standard.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must be exactly 10 digits.' });
    }

    const firstName = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const username = firstName + rollNo.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

    // ─── Secure random passwords (not predictable) ───────────────
    const studentRawPassword = generateSecurePassword();
    const parentRawPassword = generateSecurePassword();
    const studentHashedPassword = await bcrypt.hash(studentRawPassword, SALT_ROUNDS);
    const parentHashedPassword = await bcrypt.hash(parentRawPassword, SALT_ROUNDS);

    // Create student user account
    const user = new User({ username, password: studentHashedPassword, role: 'student', mustChangePassword: true });
    await user.save();

    // Create parent user account
    const parentUsername = 'p' + username;
    const parentUser = new User({ username: parentUsername, password: parentHashedPassword, role: 'parent', mustChangePassword: true });
    await parentUser.save();

    const student = new Student({
      userId: user._id,
      name,
      rollNo,
      branch,
      standard,
      phone,
      username,
      parentUsername
    });
    await student.save();

    // Return one-time passwords so admin can share them with the student & parent.
    // These are NOT stored in plain text anywhere — only the bcrypt hash is persisted.
    res.status(201).json({
      id: student._id,
      name,
      rollNo,
      branch,
      standard,
      phone,
      username,
      parentUsername,
      _oneTimePassword: studentRawPassword,
      _oneTimeParentPassword: parentRawPassword
    });
  } catch (error) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A student with this roll number or username already exists.' });
    }
    res.status(500).json({ error: 'Failed to create student.' });
  }
};

// ─── RESET student password ──────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { target } = req.body; // 'student' or 'parent'
    if (!studentId || !studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }
    if (!['student', 'parent'].includes(target)) {
      return res.status(400).json({ error: 'Target must be "student" or "parent".' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const username = target === 'student' ? student.username : student.parentUsername;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: `${target} user account not found.` });

    const newRawPassword = generateSecurePassword();
    const newHashedPassword = await bcrypt.hash(newRawPassword, SALT_ROUNDS);
    user.password = newHashedPassword;
    user.mustChangePassword = true;
    await user.save();

    res.json({ username, newPassword: newRawPassword });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
};

// ─── DELETE student + cascade ────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const studentId = req.params.id;
    if (!studentId || !studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }

    const student = await Student.findByIdAndDelete(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await User.findByIdAndDelete(student.userId);
    await User.deleteOne({ username: student.parentUsername, role: 'parent' });
    await Attendance.deleteMany({ studentId: studentId });
    await Result.deleteMany({ studentId: studentId });

    res.json({ message: 'Student and all related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student.' });
  }
};
