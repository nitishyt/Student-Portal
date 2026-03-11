const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const facultyController = require('../controllers/facultyController');

router.get('/', verifyToken, isAdmin, facultyController.getAll);
router.post('/', verifyToken, isAdmin, facultyController.create);
router.post('/:id/reset-password', verifyToken, isAdmin, facultyController.resetPassword);
router.delete('/:id', verifyToken, isAdmin, facultyController.remove);

module.exports = router;
