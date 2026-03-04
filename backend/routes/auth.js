const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

// ─── POST /api/auth/register ─────────────────────────────────────────
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Must be a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  authController.register
);

// ─── POST /api/auth/login ────────────────────────────────────────────
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.login
);

// ─── GET /api/auth/verify ────────────────────────────────────────────
router.get('/verify', verifyToken, authController.verify);

module.exports = router;
