const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, authorize } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

// All student routes require authentication
router.get('/', verifyToken, authorize('admin', 'faculty'), studentController.getAll);
router.get('/:id', verifyToken, studentController.getById);
router.post('/', verifyToken, isAdmin, studentController.create);
router.delete('/:id', verifyToken, isAdmin, studentController.remove);

module.exports = router;
