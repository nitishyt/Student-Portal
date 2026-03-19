const express = require('express');
const router = express.Router();
const { verifyToken, authorize, checkStudentOwnership } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

// ─── Fixed routes (MUST come before dynamic :studentId routes) ────────
// ─── Download monthly attendance (CSV) ──────────────────────────────
// Only admin and faculty can access this endpoint
// Query params: month, year, branch, standard
router.get('/download/monthly', verifyToken, authorize('admin', 'faculty'), attendanceController.downloadMonthlyAttendance);

// ─── Admin view attendance (JSON) ────────────────────────────────────
// Only admin can access this endpoint
// Query params: branch, year, month
router.get('/admin-view', verifyToken, authorize('admin'), attendanceController.adminViewAttendance);

// ─── Dynamic routes (with :studentId parameter) ─────────────────────
// IDOR protection: checkStudentOwnership ensures students/parents can only see their own data
router.get('/student/:studentId', verifyToken, checkStudentOwnership('studentId'), attendanceController.getByStudent);
router.post('/', verifyToken, authorize('admin', 'faculty'), attendanceController.mark);
router.delete('/:studentId', verifyToken, authorize('admin', 'faculty'), attendanceController.deleteAttendance);
router.get('/stats/:studentId', verifyToken, checkStudentOwnership('studentId'), attendanceController.stats);

module.exports = router;
