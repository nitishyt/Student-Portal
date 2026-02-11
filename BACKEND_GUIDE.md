# Backend Implementation Guide - Express.js + MySQL

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MySQL connection configuration
│   ├── models/
│   │   ├── User.js              # User model (Admin, Faculty, Parent, Student)
│   │   ├── Student.js           # Student details model
│   │   ├── Faculty.js           # Faculty details model
│   │   ├── Parent.js            # Parent details model
│   │   ├── Attendance.js        # Attendance records model
│   │   └── Result.js            # Results/grades model
│   ├── controllers/
│   │   ├── authController.js    # Login, logout, authentication
│   │   ├── studentController.js # Student CRUD operations
│   │   ├── facultyController.js # Faculty CRUD operations
│   │   ├── parentController.js  # Parent CRUD operations
│   │   ├── attendanceController.js # Attendance management
│   │   └── resultController.js  # Results management
│   ├── routes/
│   │   ├── authRoutes.js        # Authentication routes
│   │   ├── studentRoutes.js     # Student routes
│   │   ├── facultyRoutes.js     # Faculty routes
│   │   ├── parentRoutes.js      # Parent routes
│   │   ├── attendanceRoutes.js  # Attendance routes
│   │   └── resultRoutes.js      # Result routes
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication middleware
│   │   └── roleCheck.js         # Role-based access control
│   └── server.js                # Main server file
├── .env                         # Environment variables
└── package.json
```

## Step 1: Initialize Backend Project

```bash
cd backend
npm init -y
npm install express mysql2 cors dotenv bcryptjs jsonwebtoken
npm install --save-dev nodemon
```

## Step 2: Create .env File

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=student_portal
JWT_SECRET=your_secret_key_here
```

## Step 3: MySQL Database Schema

```sql
-- Create Database
CREATE DATABASE student_portal;
USE student_portal;

-- Users Table (for all user types)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'faculty', 'parent', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) UNIQUE NOT NULL,
    branch VARCHAR(50),
    standard VARCHAR(20),
    phone VARCHAR(15),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Faculty Table
CREATE TABLE faculty (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Parents Table
CREATE TABLE parents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    child_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Attendance Table
CREATE TABLE attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent') NOT NULL,
    marked_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id),
    UNIQUE KEY unique_attendance (student_id, date)
);

-- Results Table
CREATE TABLE results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    marks INT NOT NULL,
    max_marks INT DEFAULT 100,
    exam_date DATE,
    added_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id)
);

-- Insert default admin
INSERT INTO users (username, password, role) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 'admin');
```

## Step 4: Key Files to Create

### 1. src/config/database.js
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

### 2. src/server.js
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const parentRoutes = require('./routes/parentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const resultRoutes = require('./routes/resultRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/results', resultRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3. src/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
```

### 4. src/middleware/roleCheck.js
```javascript
module.exports = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};
```

## Step 5: API Endpoints Structure

### Authentication Routes
- POST /api/auth/login - Login for all user types
- POST /api/auth/logout - Logout
- GET /api/auth/me - Get current user info

### Student Routes (Admin only)
- GET /api/students - Get all students
- POST /api/students - Add new student
- GET /api/students/:id - Get student by ID
- PUT /api/students/:id - Update student
- DELETE /api/students/:id - Delete student

### Faculty Routes (Admin only)
- GET /api/faculty - Get all faculty
- POST /api/faculty - Add new faculty
- DELETE /api/faculty/:id - Delete faculty

### Parent Routes (Admin only)
- GET /api/parents - Get all parents
- POST /api/parents - Add new parent
- DELETE /api/parents/:id - Delete parent

### Attendance Routes (Admin, Faculty)
- GET /api/attendance/:studentId - Get attendance for student
- POST /api/attendance - Mark attendance
- PUT /api/attendance/:id - Update attendance

### Result Routes (Admin, Faculty)
- GET /api/results/:studentId - Get results for student
- POST /api/results - Add result
- DELETE /api/results/:id - Delete result

## Step 6: Update Frontend to Use Backend API

Create `src/utils/api.js` in frontend:
```javascript
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

## Step 7: Run the Application

### Backend:
```bash
cd backend
npm run dev
```

### Frontend:
```bash
npm run dev
```

## Database Update Operations

### To add data:
- Use Admin dashboard to add students, faculty, parents
- Data will be stored in MySQL database via API calls

### To update data:
- Modify records through Admin/Faculty dashboards
- Changes will be reflected in database immediately

### Direct Database Access:
```bash
mysql -u root -p
USE student_portal;

-- View all students
SELECT * FROM students;

-- View attendance
SELECT s.name, a.date, a.status 
FROM attendance a 
JOIN students s ON a.student_id = s.id;

-- View results
SELECT s.name, r.subject, r.marks 
FROM results r 
JOIN students s ON r.student_id = s.id;
```

## Next Steps:
1. Create backend folder structure
2. Install dependencies
3. Set up MySQL database
4. Create all controller and route files
5. Test API endpoints with Postman
6. Update frontend to use API instead of localStorage
