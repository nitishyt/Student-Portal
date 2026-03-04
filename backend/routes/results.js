const express = require('express');
const router = express.Router();
const { verifyToken, authorize, checkStudentOwnership } = require('../middleware/auth');
const resultController = require('../controllers/resultController');

// IDOR protection: checkStudentOwnership ensures students/parents can only see their own results
router.get('/student/:studentId', verifyToken, checkStudentOwnership('studentId'), resultController.getByStudent);
// Higher body limit for PDF uploads (2MB); the global limit is 1MB
router.post('/', verifyToken, authorize('admin', 'faculty'), express.json({ limit: '2mb' }), resultController.create);
router.delete('/:id', verifyToken, authorize('admin', 'faculty'), resultController.remove);

module.exports = router;
