const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const resultController = require('../controllers/resultController');

router.get('/student/:studentId', verifyToken, resultController.getByStudent);
router.post('/', verifyToken, authorize('admin', 'faculty'), resultController.create);
router.delete('/:id', verifyToken, authorize('admin', 'faculty'), resultController.remove);

module.exports = router;
