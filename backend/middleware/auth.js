const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');

// ─── verifyToken ─────────────────────────────────────────────────────
// Extracts Bearer token from Authorization header, verifies it with
// explicit algorithm, checks tokenVersion for revocation, and attaches
// the decoded payload ({ id, role }) to req.user.
const verifyToken = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'] // Prevent algorithm confusion attacks
    });

    // ─── Token revocation check ────────────────────────────────────
    const user = await User.findById(decoded.id).select('tokenVersion role');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    if (typeof decoded.v === 'number' && decoded.v !== user.tokenVersion) {
      return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    }

    req.user = { id: decoded.id, role: user.role }; // Always use role from DB
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ─── isAdmin ─────────────────────────────────────────────────────────
// Must be used AFTER verifyToken.
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

// ─── authorize (flexible role check) ─────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden.' });
    }
    next();
  };
};

// ─── checkStudentOwnership ───────────────────────────────────────────
// Ensures that students/parents can only access their own data.
// Admins and faculty can access any student. Must be used AFTER verifyToken.
const checkStudentOwnership = (paramName = 'studentId') => {
  return async (req, res, next) => {
    try {
      const targetStudentId = req.params[paramName];
      const { id: userId, role } = req.user;

      // Admins and faculty can access any student's data
      if (['admin', 'faculty'].includes(role)) {
        return next();
      }

      if (!targetStudentId || !targetStudentId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'Invalid student ID.' });
      }

      const student = await Student.findById(targetStudentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      // Students: must own the record (linked via userId)
      if (role === 'student') {
        if (String(student.userId) !== String(userId)) {
          return res.status(403).json({ error: 'Access denied. You can only view your own data.' });
        }
        return next();
      }

      // Parents: must be linked to the student
      if (role === 'parent') {
        const parentUser = await User.findById(userId).select('username');
        if (!parentUser || student.parentUsername !== parentUser.username) {
          return res.status(403).json({ error: 'Access denied. You can only view your child\'s data.' });
        }
        return next();
      }

      return res.status(403).json({ error: 'Access forbidden.' });
    } catch (error) {
      return res.status(500).json({ error: 'Authorization check failed.' });
    }
  };
};

// Backwards-compatible alias
const auth = verifyToken;

module.exports = { auth, verifyToken, isAdmin, authorize, checkStudentOwnership };
