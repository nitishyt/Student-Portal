const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { parseAsync, transforms } = require('json2csv');

// ─── Helper function: Get number of days in month ─────────────────────
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// ─── Helper function: Get month name from number ────────────────────
const getMonthName = (monthNum) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNum - 1] || '';
};

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

// ─── Download Monthly Attendance (CSV) ───────────────────────────────
// Requires: admin or faculty role
// Input: month (1-12), year (e.g., 2024), branch (DS/AIML/IT/COMPS), standard (FE/SE/TE/BE)
// Output: CSV file with attendance matrix (rows=students, cols=dates)
exports.downloadMonthlyAttendance = async (req, res) => {
  try {
    const { month, year, branch, standard } = req.query;
    const facultyUserId = req.user.id; // Authenticated faculty user ID

    // ─── Input validation ───────────────────────────────────────
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!month || !year || !branch || !standard) {
      return res.status(400).json({
        error: 'Missing required parameters: month, year, branch, standard'
      });
    }

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12.' });
    }

    if (yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: 'Year must be between 2000 and 2100.' });
    }

    const validBranches = ['DS', 'AIML', 'IT', 'COMPS'];
    const validStandards = ['FE', 'SE', 'TE', 'BE'];

    if (!validBranches.includes(branch)) {
      return res.status(400).json({
        error: `Branch must be one of: ${validBranches.join(', ')}`
      });
    }

    if (!validStandards.includes(standard)) {
      return res.status(400).json({
        error: `Standard must be one of: ${validStandards.join(', ')}`
      });
    }

    // ─── Get faculty's subject ──────────────────────────────────
    const faculty = await Faculty.findOne({ userId: facultyUserId });
    
    if (!faculty) {
      return res.status(403).json({
        error: 'Faculty profile not found. Only faculty members can download attendance.'
      });
    }

    const facultySubject = faculty.subject;

    // ─── Fetch all students for the class ────────────────────
    const students = await Student.find({ branch, standard }).sort({ rollNo: 1 });

    if (students.length === 0) {
      return res.status(404).json({
        error: 'No students found for the given branch and standard.'
      });
    }

    // ─── Generate date range for the month ──────────────────
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const daysInMonth = getDaysInMonth(yearNum, monthNum);
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${daysInMonth}`;

    // ─── Fetch all attendance for the month ──────────────────
    const attendance = await Attendance.find({
      studentId: { $in: students.map(s => s._id) },
      date: { $gte: startDate, $lte: endDate }
    });

    // ─── Transform attendance data into a map for quick lookup
    // Only count lectures for this faculty's subject
    const attendanceMap = {};
    attendance.forEach((record) => {
      const key = `${record.studentId.toString()}_${record.date}`;
      // Filter lectures to only this faculty's subject
      const subjectLectures = record.lectures.filter(l => l.subject === facultySubject);
      // If any lecture for this subject is marked present, mark day as present; otherwise absent
      const status = subjectLectures.some(l => l.status === 'present') ? 'P' : 'A';
      // Only set attendance map if there are lectures for this subject
      if (subjectLectures.length > 0) {
        attendanceMap[key] = status;
      }
    });

    // ─── Build data rows (matrix format) ────────────────────
    const rows = [];
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const row = {
        'Student Name': student.name,
        'Roll No': student.rollNo
      };

      // Add columns for each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const date = new Date(yearNum, monthNum - 1, day); // monthNum is 1-12, Date constructor uses 0-11
        const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

        // ─── Priority Logic ──────────────────────────────────
        // 1. If weekend (Saturday or Sunday) → Mark as H
        // 2. Else if attendance record exists for this subject → Mark as P or A
        // 3. Else → Leave empty (not marked)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Sunday (0) or Saturday (6)
          row[String(day)] = 'H';
        } else {
          // Weekday - check attendance record for this subject
          const key = `${student._id.toString()}_${dateStr}`;
          row[String(day)] = attendanceMap[key] || '';
        }
      }

      rows.push(row);
    }

    // ─── Generate CSV using json2csv ────────────────────────
    const fields = ['Student Name', 'Roll No', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1))];

    const csv = await parseAsync(rows, { fields });

    // ─── Build CSV with headers showing class and subject info ──────────
    const monthName = getMonthName(monthNum);
    const csvContent = [
      `Class: ${standard} | Branch: ${branch}`,
      `Subject: ${facultySubject}`,
      `Month: ${monthName} | Year: ${yearNum}`,
      'P = Present | A = Absent | H = Holiday (Weekend) | (Empty) = Not Marked',
      '',
      csv
    ].join('\n');

    // ─── Send CSV as downloadable file ──────────────────────
    const fileName = `Attendance_${standard}_${branch}_${facultySubject}_${monthName}_${yearNum}.csv`;
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ error: 'Failed to generate attendance report.' });
  }
};

// ─── DELETE attendance record ────────────────────────────────────────
// Allows faculty to delete attendance they marked for a student
// Input: studentId (param), date (body), subject (body), time (body)
exports.deleteAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date, subject, time } = req.body;
    const facultyUserId = req.user.id;

    // ─── Input validation ────────────────────────────────────────
    if (!studentId || !studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Subject is required.' });
    }

    if (!time || typeof time !== 'string') {
      return res.status(400).json({ error: 'Time is required.' });
    }

    // ─── Get faculty's subject (for permission check) ──────────
    const faculty = await Faculty.findOne({ userId: facultyUserId });

    if (!faculty) {
      return res.status(403).json({ error: 'Faculty profile not found.' });
    }

    // ─── Faculty can only delete their own subject's attendance ──
    if (req.user.role === 'faculty' && faculty.subject !== subject) {
      return res.status(403).json({
        error: 'You can only delete attendance for your own subject.'
      });
    }

    // ─── Find attendance record ──────────────────────────────────
    const attendance = await Attendance.findOne({ studentId, date });

    if (!attendance) {
      return res.status(404).json({
        error: 'No attendance record found for this student on this date.'
      });
    }

    // ─── Find and remove the specific lecture ───────────────────
    const lectureIndex = attendance.lectures.findIndex(
      l => l.subject === subject && l.time === time
    );

    if (lectureIndex === -1) {
      return res.status(404).json({
        error: 'Lecture record not found for this subject and time.'
      });
    }

    // Remove the lecture
    attendance.lectures.splice(lectureIndex, 1);

    // If no lectures left for this date, delete the entire attendance record
    if (attendance.lectures.length === 0) {
      await Attendance.findByIdAndDelete(attendance._id);
      return res.json({ message: 'Attendance record deleted successfully' });
    }

    // Otherwise, save the updated attendance record
    await attendance.save();
    res.json({ message: 'Attendance deleted successfully', attendance });

  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Failed to delete attendance.' });
  }
};

// ─── Admin View Attendance (JSON) ───────────────────────────────────
// Returns attendance data as JSON for admin dashboard viewer
// Requires: admin role
// Input: branch, year, month
// Output: JSON array with student attendance matrix
exports.adminViewAttendance = async (req, res) => {
  try {
    const { branch, year, month } = req.query;

    // ─── Input validation ───────────────────────────────────────
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!month || !year || !branch) {
      return res.status(400).json({
        error: 'Missing required parameters: branch, year, month'
      });
    }

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12.' });
    }

    if (yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: 'Year must be between 2000 and 2100.' });
    }

    const validBranches = ['DS', 'AIML', 'IT', 'COMPS'];
    if (!validBranches.includes(branch)) {
      return res.status(400).json({
        error: `Branch must be one of: ${validBranches.join(', ')}`
      });
    }

    // ─── Fetch all students for the branch ───────────────────
    const students = await Student.find({ branch }).sort({ rollNo: 1 });

    if (students.length === 0) {
      return res.status(404).json({
        error: 'No students found for the given branch.'
      });
    }

    // ─── Generate date range for the month ──────────────────
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const daysInMonth = getDaysInMonth(yearNum, monthNum);
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${daysInMonth}`;

    // ─── Fetch all attendance for the month ──────────────────
    const attendance = await Attendance.find({
      studentId: { $in: students.map(s => s._id) },
      date: { $gte: startDate, $lte: endDate }
    });

    // ─── Transform attendance data into a map for quick lookup
    // Count any lecture on a date as present
    const attendanceMap = {};
    attendance.forEach((record) => {
      const key = `${record.studentId.toString()}_${record.date}`;
      // If any lecture is marked present on this date, count as present
      const status = record.lectures.some(l => l.status === 'present') ? 'P' : 'A';
      attendanceMap[key] = status;
    });

    // ─── Build response data ─────────────────────────────────
    const result = students.map((student) => {
      const attendanceObj = {};

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const key = `${student._id.toString()}_${dateStr}`;
        attendanceObj[day] = attendanceMap[key] || '-';
      }

      return {
        name: student.name,
        rollNo: student.rollNo,
        attendance: attendanceObj
      };
    });

    res.json(result);

  } catch (error) {
    console.error('Error fetching admin attendance view:', error);
    res.status(500).json({ error: 'Failed to fetch attendance data.' });
  }
};
