const express = require('express');
const router = express.Router();
const { verifyToken, authorize, checkStudentOwnership } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

// IDOR protection: checkStudentOwnership ensures students/parents can only see their own data
router.get('/student/:studentId', verifyToken, checkStudentOwnership('studentId'), attendanceController.getByStudent);
router.post('/', verifyToken, authorize('admin', 'faculty'), attendanceController.mark);
router.delete('/:studentId', verifyToken, authorize('admin', 'faculty'), attendanceController.deleteAttendance);
router.get('/stats/:studentId', verifyToken, checkStudentOwnership('studentId'), attendanceController.stats);

// ─── Download monthly attendance (CSV) ──────────────────────────────
// Only admin and faculty can access this endpoint
// Query params: month, year, branch, standard
router.get('/download/monthly', verifyToken, authorize('admin', 'faculty'), attendanceController.downloadMonthlyAttendance);

module.exports = router;
