const Attendance = require('../models/Attendance');

// ─── GET attendance for a student ────────────────────────────────────
// IDOR protection is handled by checkStudentOwnership middleware on routes.
exports.getByStudent = async (req, res) => {
  try {
    const { month, year } = req.query;
    const studentId = req.params.studentId;

    if (!studentId || !studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.json([]);
    }

    const filter = { studentId };

    // Validate month/year are numbers before using in query
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const endDate = `${y}-${String(m).padStart(2, '0')}-31`;
        filter.date = { $gte: startDate, $lte: endDate };
      }
    }

    const attendance = await Attendance.find(filter).sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    console.error('Attendance error:', error.message);
    res.status(500).json({ error: 'Failed to fetch attendance.' });
  }
};

// ─── Mark attendance ─────────────────────────────────────────────────
exports.mark = async (req, res) => {
  try {
    const { studentId, date, time, subject, status } = req.body;

    // ─── Input validation ────────────────────────────────────────
    if (!studentId || !String(studentId).match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    if (!time || typeof time !== 'string') {
      return res.status(400).json({ error: 'Time is required.' });
    }
    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Subject is required.' });
    }
    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "present" or "absent".' });
    }

    let attendance = await Attendance.findOne({ studentId, date });

    if (attendance) {
      attendance.lectures.push({ time, subject, status, markedBy: req.user.id });
      await attendance.save();
    } else {
      attendance = new Attendance({
        studentId,
        date,
        lectures: [{ time, subject, status, markedBy: req.user.id }]
      });
      await attendance.save();
    }

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark attendance.' });
  }
};

// ─── Attendance stats ────────────────────────────────────────────────
// IDOR protection is handled by checkStudentOwnership middleware on routes.
exports.stats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    const studentId = req.params.studentId;
    if (!studentId || !studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }

    const attendance = await Attendance.find({
      studentId,
      date: { $gte: startDate, $lte: endDate }
    });

    let totalDays = 0;
    let presentDays = 0;

    attendance.forEach((record) => {
      const date = new Date(record.date);
      if (date.getDay() !== 0) {
        totalDays++;
        const hasPresent = record.lectures.some((l) => l.status === 'present');
        if (hasPresent) presentDays++;
      }
    });

    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

    res.json({
      total: totalDays,
      present: presentDays,
      absent: totalDays - presentDays,
      percentage
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance stats.' });
  }
};
