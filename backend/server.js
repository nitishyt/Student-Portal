const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const connectDB = require('./config/db');
require('dotenv').config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── Validate critical env vars ──────────────────────────────────────
const requiredSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of requiredSecrets) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} is not set in environment variables.`);
    process.exit(1);
  }
  if (process.env[key].length < 64) {
    console.error(`FATAL: ${key} is too short. Use at least 64 characters.`);
    process.exit(1);
  }
}

if (!process.env.MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is not set in environment variables.');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const facultyRoutes = require('./routes/faculties');
const attendanceRoutes = require('./routes/attendance');
const resultRoutes = require('./routes/results');

const app = express();

// ─── Connect to MongoDB ──────────────────────────────────────────────
connectDB();

// ─── Security: Helmet (with CSP + HSTS) ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: IS_PRODUCTION ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  } : false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ─── Security: Rate limiting ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// ─── Security: CORS ──────────────────────────────────────────────────
const allowedOrigins = [];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Allow all onrender.com subdomains (for Render deployments)
allowedOrigins.push(/^https:\/\/.*\.onrender\.com$/);
// Allow localhost for development
allowedOrigins.push(/^http:\/\/localhost(:\d+)?$/);
allowedOrigins.push(/^http:\/\/127\.0\.0\.1(:\d+)?$/);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Body parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ─── Cookie parser (for refresh token cookie) ───────────────────────
app.use(cookieParser());

// ─── Security: NoSQL injection prevention ────────────────────────────
// express-mongo-sanitize is incompatible with Express 5 (req.query is read-only),
// so we sanitize req.body and req.params manually.
const sanitize = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
  }
  return obj;
};
app.use((req, _res, next) => {
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  next();
});

// ─── Security: HTTP parameter pollution prevention ───────────────────
app.use(hpp());

// ─── Apply rate limiters ─────────────────────────────────────────────
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/results', resultRoutes);

// ─── Health check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK' });
});

// ─── Global error handler (never leak internals) ────────────────────
app.use((err, _req, res, _next) => {
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
