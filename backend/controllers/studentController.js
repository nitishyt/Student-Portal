const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');

// ─── GET all students ────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { branch, standard } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (standard) filter.standard = standard;

    const students = await Student.find(filter).sort({ rollNo: 1 });

    const studentsWithCreds = students.map((s) => {
      const obj = s.toObject();
      obj.id = obj._id;
      if (!obj.username) {
        const firstName = obj.name.split(' ')[0].toLowerCase();
        obj.username = firstName + obj.rollNo.toString().toLowerCase();
      }
      if (!obj.parentUsername) {
        const firstName = obj.name.split(' ')[0].toLowerCase();
        obj.parentUsername = 'p' + firstName + obj.rollNo.toString().toLowerCase();
      }
      // NEVER return plain-text passwords
      delete obj.password;
      delete obj.parentPassword;
      return obj;
    });

    res.json(studentsWithCreds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── GET student by ID ──────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const obj = student.toObject();
    delete obj.password;
    delete obj.parentPassword;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── CREATE student ──────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, rollNo, branch, standard, phone } = req.body;

    const firstName = name.split(' ')[0].toLowerCase();
    const username = firstName + rollNo.toString().toLowerCase();
    const rawPassword = firstName + branch.toLowerCase() + rollNo.toString().toLowerCase();
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    // Create student user account
    const user = new User({ username, password: hashedPassword, role: 'student' });
    await user.save();

    // Create parent user account
    const parentUsername = 'p' + username;
    const parentUser = new User({ username: parentUsername, password: hashedPassword, role: 'parent' });
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

    res.status(201).json({
      id: student._id,
      name,
      rollNo,
      branch,
      standard,
      phone,
      username,
      parentUsername
      // Passwords are NOT returned
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── DELETE student + cascade ────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await User.findByIdAndDelete(student.userId);
    await User.deleteOne({ username: student.parentUsername, role: 'parent' });
    await Attendance.deleteMany({ studentId: req.params.id });
    await Result.deleteMany({ studentId: req.params.id });

    res.json({ message: 'Student and all related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
