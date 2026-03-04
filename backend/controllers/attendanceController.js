const Attendance = require('../models/Attendance');

// ─── GET attendance for a student ────────────────────────────────────
exports.getByStudent = async (req, res) => {
  try {
    const { month, year } = req.query;
    const studentId = req.params.studentId;

    if (!studentId || !studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.json([]);
    }

    const filter = { studentId };

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(filter).sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Mark attendance ─────────────────────────────────────────────────
exports.mark = async (req, res) => {
  try {
    const { studentId, date, time, subject, status } = req.body;

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
    res.status(500).json({ error: error.message });
  }
};

// ─── Attendance stats ────────────────────────────────────────────────
exports.stats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    const attendance = await Attendance.find({
      studentId: req.params.studentId,
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
    res.status(500).json({ error: error.message });
  }
};
