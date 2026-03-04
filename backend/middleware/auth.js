const jwt = require('jsonwebtoken');

// ─── verifyToken ─────────────────────────────────────────────────────
// Extracts Bearer token from Authorization header, verifies it,
// and attaches the decoded payload ({ id, role }) to req.user.
const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }
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

// Backwards-compatible alias
const auth = verifyToken;

module.exports = { auth, verifyToken, isAdmin, authorize };
