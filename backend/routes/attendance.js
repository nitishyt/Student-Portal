const express = require('express');
const router = express.Router();
const { verifyToken, authorize, checkStudentOwnership } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

// IDOR protection: checkStudentOwnership ensures students/parents can only see their own data
router.get('/student/:studentId', verifyToken, checkStudentOwnership('studentId'), attendanceController.getByStudent);
router.post('/', verifyToken, authorize('admin', 'faculty'), attendanceController.mark);
router.get('/stats/:studentId', verifyToken, checkStudentOwnership('studentId'), attendanceController.stats);

module.exports = router;
