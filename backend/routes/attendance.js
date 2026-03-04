const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

router.get('/student/:studentId', verifyToken, attendanceController.getByStudent);
router.post('/', verifyToken, authorize('admin', 'faculty'), attendanceController.mark);
router.get('/stats/:studentId', verifyToken, attendanceController.stats);

module.exports = router;
