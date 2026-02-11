# Backend Implementation Guide - Student Portal

## Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Base64 in database (for small files) or AWS S3/Cloudinary (recommended for production)

## File Upload Strategy

### Option 1: Base64 in Database (Simple, Good for Development)
- **Pros**: Easy to implement, no external dependencies
- **Cons**: Increases database size, slower queries for large files
- **Recommended Limit**: 5MB per file
- **Best for**: Development, small-scale applications

### Option 2: AWS S3 / Cloudinary (Recommended for Production)
- **Pros**: Fast, scalable, doesn't bloat database
- **Cons**: Requires external service setup, costs money
- **Recommended Limit**: 10-50MB per file
- **Best for**: Production, large-scale applications

### Current Implementation: Base64 with 5MB Limit
- Frontend validates: 3MB limit (user-friendly)
- Backend accepts: Up to 5MB (safety buffer)
- MySQL LONGTEXT: Can store up to 4GB (more than enough)

## Database Schema

### 1. users table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'faculty', 'student', 'parent') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. students table
```sql
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) UNIQUE NOT NULL,
    branch ENUM('DS', 'AIML', 'IT', 'COMPS') NOT NULL,
    standard ENUM('FE', 'SE', 'TE', 'BE') NOT NULL,
    phone VARCHAR(10) NOT NULL,
    parent_username VARCHAR(50),
    parent_password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3. faculties table
```sql
CREATE TABLE faculties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4. attendance table
```sql
CREATE TABLE attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    subject VARCHAR(100) NOT NULL,
    status ENUM('present', 'absent') NOT NULL,
    marked_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id),
    INDEX idx_student_date (student_id, date)
);
```

### 5. results table
```sql
CREATE TABLE results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    marks INT NOT NULL CHECK (marks >= 0 AND marks <= 100),
    pdf_file LONGTEXT,
    pdf_filename VARCHAR(255),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_student (student_id)
);
```

## Backend Setup

### 1. Initialize Project
```bash
mkdir student-portal-backend
cd student-portal-backend
npm init -y
npm install express mysql2 bcryptjs jsonwebtoken cors dotenv body-parser
npm install --save-dev nodemon
```

### 2. Project Structure
```
student-portal-backend/
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── studentController.js
│   ├── facultyController.js
│   ├── attendanceController.js
│   └── resultController.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   ├── students.js
│   ├── faculties.js
│   ├── attendance.js
│   └── results.js
├── .env
├── server.js
└── package.json
```

### 3. Environment Variables (.env)
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=student_portal
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Database Configuration (config/db.js)
```javascript
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();
```

### 5. Authentication Middleware (middleware/auth.js)
```javascript
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden.' });
    }
    next();
  };
};

module.exports = { auth, authorize };
```

### 6. Main Server File (server.js)
```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const facultyRoutes = require('./routes/faculties');
const attendanceRoutes = require('./routes/attendance');
const resultRoutes = require('./routes/results');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increased to 10MB for file uploads
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/results', resultRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## API Endpoints

### Authentication Routes (routes/auth.js)
```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Get user
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ? AND role = ?',
      [username, role]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get additional info based on role
    let userData = { id: user.id, username: user.username, role: user.role };

    if (role === 'student' || role === 'parent') {
      const [students] = await db.query(
        'SELECT id FROM students WHERE user_id = ?',
        [user.id]
      );
      if (students.length > 0) {
        userData.studentId = students[0].id;
      }
    }

    // Generate token
    const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Student Routes (routes/students.js)
```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

// Get all students (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { branch, standard } = req.query;
    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (branch) {
      query += ' AND branch = ?';
      params.push(branch);
    }
    if (standard) {
      query += ' AND standard = ?';
      params.push(standard);
    }

    const [students] = await db.query(query, params);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [students] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(students[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add student
router.post('/', auth, authorize('admin', 'faculty'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { name, rollNo, branch, standard, phone } = req.body;

    // Create student user
    const username = rollNo.toLowerCase();
    const password = name.toLowerCase().replace(/\s+/g, '') + '123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await connection.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'student']
    );

    // Create parent user
    const parentUsername = 'parent_' + rollNo.toLowerCase();
    const parentHashedPassword = await bcrypt.hash(password, 10);

    await connection.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [parentUsername, parentHashedPassword, 'parent']
    );

    // Create student record
    const [studentResult] = await connection.query(
      'INSERT INTO students (user_id, name, roll_no, branch, standard, phone, parent_username, parent_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userResult.insertId, name, rollNo, branch, standard, phone, parentUsername, password]
    );

    await connection.commit();

    res.status(201).json({
      id: studentResult.insertId,
      name,
      rollNo,
      branch,
      standard,
      phone,
      username,
      password,
      parentUsername,
      parentPassword: password
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Delete student
router.delete('/:id', auth, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Attendance Routes (routes/attendance.js)
```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

// Get attendance for student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = 'SELECT * FROM attendance WHERE student_id = ?';
    const params = [req.params.studentId];

    if (month && year) {
      query += ' AND MONTH(date) = ? AND YEAR(date) = ?';
      params.push(month, year);
    }

    const [attendance] = await db.query(query + ' ORDER BY date DESC, time DESC', params);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark attendance
router.post('/', auth, authorize('faculty'), async (req, res) => {
  try {
    const { studentId, date, time, subject, status } = req.body;

    const [result] = await db.query(
      'INSERT INTO attendance (student_id, date, time, subject, status, marked_by) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, date, time, subject, status, req.user.id]
    );

    res.status(201).json({
      id: result.insertId,
      studentId,
      date,
      time,
      subject,
      status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance statistics
router.get('/stats/:studentId', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const [stats] = await db.query(
      `SELECT 
        COUNT(DISTINCT date) as total_days,
        COUNT(DISTINCT CASE WHEN status = 'present' THEN date END) as present_days
      FROM attendance 
      WHERE student_id = ? 
        AND MONTH(date) = ? 
        AND YEAR(date) = ?
        AND DAYOFWEEK(date) != 1`,
      [req.params.studentId, currentMonth, currentYear]
    );

    const percentage = stats[0].total_days > 0 
      ? ((stats[0].present_days / stats[0].total_days) * 100).toFixed(1)
      : 0;

    res.json({
      total: stats[0].total_days,
      present: stats[0].present_days,
      absent: stats[0].total_days - stats[0].present_days,
      percentage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Results Routes (routes/results.js)
```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

// File size validation middleware
const validateFileSize = (req, res, next) => {
  if (req.body.pdfFile) {
    // Base64 string size in bytes (approximate)
    const sizeInBytes = (req.body.pdfFile.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 5) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
  }
  next();
};

// Get results for student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT * FROM results WHERE student_id = ? ORDER BY created_at DESC',
      [req.params.studentId]
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add result with file validation
router.post('/', auth, authorize('faculty'), validateFileSize, async (req, res) => {
  try {
    const { studentId, subject, marks, pdfFile, pdfFilename } = req.body;

    const [result] = await db.query(
      'INSERT INTO results (student_id, subject, marks, pdf_file, pdf_filename, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, subject, marks, pdfFile || null, pdfFilename || null, req.user.id]
    );

    res.status(201).json({
      id: result.insertId,
      studentId,
      subject,
      marks,
      pdfFilename,
      date: new Date().toLocaleDateString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete result
router.delete('/:id', auth, authorize('faculty'), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM results WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Faculty Routes (routes/faculties.js)
```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

// Get all faculties
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const [faculties] = await db.query('SELECT * FROM faculties');
    res.json(faculties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add faculty
router.post('/', auth, authorize('admin'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { name, username, password, subject, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await connection.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'faculty']
    );

    const [facultyResult] = await connection.query(
      'INSERT INTO faculties (user_id, name, subject, email) VALUES (?, ?, ?, ?)',
      [userResult.insertId, name, subject, email]
    );

    await connection.commit();

    res.status(201).json({
      id: facultyResult.insertId,
      name,
      username,
      subject,
      email
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Delete faculty
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM faculties WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## Frontend Integration

### 1. Create API Service (src/utils/api.js)
```javascript
const API_URL = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const api = {
  // Auth
  login: async (username, password, role) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });
    return res.json();
  },

  // Students
  getStudents: async (branch = '', standard = '') => {
    const params = new URLSearchParams();
    if (branch) params.append('branch', branch);
    if (standard) params.append('standard', standard);
    
    const res = await fetch(`${API_URL}/students?${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  },

  addStudent: async (studentData) => {
    const res = await fetch(`${API_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(studentData)
    });
    return res.json();
  },

  deleteStudent: async (id) => {
    const res = await fetch(`${API_URL}/students/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  },

  // Attendance
  getAttendance: async (studentId, month, year) => {
    const params = new URLSearchParams({ month, year });
    const res = await fetch(`${API_URL}/attendance/student/${studentId}?${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  },

  markAttendance: async (attendanceData) => {
    const res = await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(attendanceData)
    });
    return res.json();
  },

  getAttendanceStats: async (studentId, month, year) => {
    const params = new URLSearchParams({ month, year });
    const res = await fetch(`${API_URL}/attendance/stats/${studentId}?${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  },

  // Results
  getResults: async (studentId) => {
    const res = await fetch(`${API_URL}/results/student/${studentId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  },

  addResult: async (resultData) => {
    // Validate file size on frontend (3MB limit for user experience)
    if (resultData.pdfFile) {
      const sizeInBytes = (resultData.pdfFile.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      if (sizeInMB > 3) {
        throw new Error('File size exceeds 3MB limit');
      }
    }

    const res = await fetch(`${API_URL}/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(resultData)
    });
    return res.json();
  },

  deleteResult: async (id) => {
    const res = await fetch(`${API_URL}/results/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  },

  // Faculties
  getFaculties: async () => {
    const res = await fetch(`${API_URL}/faculties`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  },

  addFaculty: async (facultyData) => {
    const res = await fetch(`${API_URL}/faculties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(facultyData)
    });
    return res.json();
  },

  deleteFaculty: async (id) => {
    const res = await fetch(`${API_URL}/faculties/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return res.json();
  }
};

export default api;
```

## Running the Backend

### 1. Create Database
```sql
CREATE DATABASE student_portal;
USE student_portal;

-- Run all CREATE TABLE statements from above

-- Insert default admin
INSERT INTO users (username, password, role) 
VALUES ('admin', '$2a$10$XQqP5K9V5K9V5K9V5K9V5O', 'admin');
-- Password: admin123 (hash it properly using bcrypt)
```

### 2. Start Backend Server
```bash
cd student-portal-backend
npm run dev
```

### 3. Update Frontend to Use API
Replace localStorage calls with API calls in your React components.

## Benefits of Backend Implementation

✅ **Real-time sync** across all devices
✅ **Centralized data** management
✅ **Better security** with JWT authentication
✅ **Scalable** architecture
✅ **Easy filtering** with SQL queries
✅ **Data persistence** even after browser clear
✅ **Multi-device access** for students and parents
✅ **Backup and recovery** capabilities

This backend will enable your application to work across multiple devices with real-time data synchronization!

## File Upload Details

### Current Setup (Base64 in Database)

**Frontend Validation:**
```javascript
// In FacultyDashboard.jsx - handleAddResult function
if (file.type !== 'application/pdf') {
  alert('Please upload only PDF files');
  return;
}
if (file.size > 3 * 1024 * 1024) { // 3MB limit
  alert('File size must be less than 3MB');
  return;
}
```

**Backend Validation:**
- Body parser limit: 10MB (server.js)
- File size middleware: 5MB (routes/results.js)
- Database LONGTEXT: Up to 4GB capacity

**How It Works:**
1. User selects PDF file (max 3MB)
2. Frontend converts to Base64 string using FileReader
3. Base64 string sent to backend in JSON
4. Backend validates size (max 5MB)
5. Stored in MySQL LONGTEXT column
6. Retrieved as Base64 and converted back to PDF for download

### Recommended Limits

| Environment | File Size Limit | Reason |
|-------------|----------------|--------|
| Development | 3-5MB | Fast testing, small database |
| Production (Base64) | 5-10MB | Balance between size and performance |
| Production (S3) | 50MB+ | External storage, no database impact |

### Upgrading to AWS S3 (Optional - For Production)

If you need larger files or better performance:

**Install AWS SDK:**
```bash
npm install aws-sdk multer multer-s3
```

**Configure S3 Upload:**
```javascript
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'student-portal-results',
    key: function (req, file, cb) {
      cb(null, `results/${Date.now()}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  }
});

// Use in route
router.post('/', auth, authorize('faculty'), upload.single('pdf'), async (req, res) => {
  // req.file.location contains S3 URL
  // Store URL in database instead of Base64
});
```

**Benefits of S3:**
- ✅ Handle files up to 50MB+
- ✅ Faster database queries
- ✅ CDN integration for fast downloads
- ✅ Automatic backups
- ✅ Pay only for storage used (~$0.023/GB/month)

### MySQL Configuration for Large Files

If using Base64 and getting errors, increase MySQL limits:

```sql
-- Check current limits
SHOW VARIABLES LIKE 'max_allowed_packet';

-- Increase to 50MB (in my.cnf or my.ini)
[mysqld]
max_allowed_packet=50M

-- Restart MySQL service
```

### Performance Tips

1. **Lazy Loading**: Don't load PDF data in list queries
```javascript
// List results without PDF data
SELECT id, student_id, subject, marks, pdf_filename, created_at 
FROM results WHERE student_id = ?;

// Get PDF only when downloading
SELECT pdf_file FROM results WHERE id = ?;
```

2. **Compression**: Compress Base64 before storing (optional)
```javascript
const zlib = require('zlib');
const compressed = zlib.gzipSync(Buffer.from(base64String));
```

3. **Caching**: Cache frequently accessed files
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour
```
