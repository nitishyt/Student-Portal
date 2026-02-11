# Backend Setup - Step by Step

## Step 1: Create Backend Folder (1 minute)

```bash
# Navigate to your project root
cd C:\Users\nitis\OneDrive\Desktop\react-student-portal

# Create backend folder
mkdir backend
cd backend
```

## Step 2: Initialize Node.js Project (1 minute)

```bash
npm init -y
```

## Step 3: Install Dependencies (2 minutes)

```bash
npm install express mongoose bcryptjs jsonwebtoken cors dotenv body-parser
npm install --save-dev nodemon
```

## Step 4: Update package.json (1 minute)

Open `backend/package.json` and add scripts:

```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "Student Portal Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node test-connection.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.0.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

## Step 5: Create Folder Structure

```bash
# In backend folder
mkdir config models routes middleware
```

Your structure should be:
```
backend/
├── config/
├── models/
├── routes/
├── middleware/
├── .env
├── server.js
├── test-connection.js
└── package.json
```

## Step 6: Create .env File

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/student_portal
JWT_SECRET=student_portal_secret_key_2025_change_in_production
```

## Step 7: Create Database Config

Create `backend/config/db.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

## Step 8: Create Auth Middleware

Create `backend/middleware/auth.js`:

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

## Step 9: Create Mongoose Models

### Create `backend/models/User.js`:

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'faculty', 'student', 'parent'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
```

### Create `backend/models/Student.js`:

```javascript
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true },
  branch: { type: String, enum: ['DS', 'AIML', 'IT', 'COMPS'], required: true },
  standard: { type: String, enum: ['FE', 'SE', 'TE', 'BE'], required: true },
  phone: { type: String, required: true },
  parentUsername: { type: String },
  parentPassword: { type: String },
  createdAt: { type: Date, default: Date.now }
});

studentSchema.index({ branch: 1, standard: 1 });
studentSchema.index({ rollNo: 1 });

module.exports = mongoose.model('Student', studentSchema);
```

### Create `backend/models/Faculty.js`:

```javascript
const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Faculty', facultySchema);
```

### Create `backend/models/Attendance.js`:

```javascript
const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  time: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent'], required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: String, required: true },
  lectures: [lectureSchema],
  createdAt: { type: Date, default: Date.now }
});

attendanceSchema.index({ studentId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
```

### Create `backend/models/Result.js`:

```javascript
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true },
  marks: { type: Number, required: true, min: 0, max: 100 },
  pdfFile: { type: String },
  pdfFilename: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

resultSchema.index({ studentId: 1 });

module.exports = mongoose.model('Result', resultSchema);
```

## Step 10: Create API Routes

### Create `backend/routes/auth.js`:

```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');

router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const user = await User.findOne({ username, role });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let userData = { id: user._id, username: user.username, role: user.role };

    if (role === 'student' || role === 'parent') {
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        userData.studentId = student._id;
      }
    }

    const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Create `backend/routes/students.js`:

```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { branch, standard } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (standard) filter.standard = standard;

    const students = await Student.find(filter).sort({ rollNo: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const { name, rollNo, branch, standard, phone } = req.body;

    const username = rollNo.toLowerCase();
    const password = name.toLowerCase().replace(/\s+/g, '') + '123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, password: hashedPassword, role: 'student' });
    await user.save();

    const parentUsername = 'parent_' + rollNo.toLowerCase();
    const parentUser = new User({ username: parentUsername, password: hashedPassword, role: 'parent' });
    await parentUser.save();

    const student = new Student({
      userId: user._id,
      name,
      rollNo,
      branch,
      standard,
      phone,
      parentUsername,
      parentPassword: password
    });
    await student.save();

    res.status(201).json({
      id: student._id,
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
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    await User.findByIdAndDelete(student.userId);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Create `backend/routes/faculties.js`:

```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Faculty = require('../models/Faculty');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const faculties = await Faculty.find();
    res.json(faculties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, username, password, subject, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, password: hashedPassword, role: 'faculty' });
    await user.save();

    const faculty = new Faculty({ userId: user._id, name, subject, email });
    await faculty.save();

    res.status(201).json({ id: faculty._id, name, username, subject, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    await User.findByIdAndDelete(faculty.userId);
    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Create `backend/routes/attendance.js`:

```javascript
const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { auth, authorize } = require('../middleware/auth');

router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = { studentId: req.params.studentId };

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(filter).sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, authorize('faculty'), async (req, res) => {
  try {
    const { studentId, date, time, subject, status } = req.body;

    let attendance = await Attendance.findOne({ studentId, date });

    if (attendance) {
      attendance.lectures.push({ time, subject, status, markedBy: req.user.id });
      await attendance.save();
    } else {
      attendance = new Attendance({
        studentId,
        date,
        lectures: [{ time, subject, status, markedBy: req.user.id }]
      });
      await attendance.save();
    }

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/:studentId', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    const attendance = await Attendance.find({
      studentId: req.params.studentId,
      date: { $gte: startDate, $lte: endDate }
    });

    let totalDays = 0;
    let presentDays = 0;

    attendance.forEach(record => {
      const date = new Date(record.date);
      if (date.getDay() !== 0) {
        totalDays++;
        const hasPresent = record.lectures.some(l => l.status === 'present');
        if (hasPresent) presentDays++;
      }
    });

    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

    res.json({ total: totalDays, present: presentDays, absent: totalDays - presentDays, percentage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Create `backend/routes/results.js`:

```javascript
const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const { auth, authorize } = require('../middleware/auth');

router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, authorize('faculty'), async (req, res) => {
  try {
    const { studentId, subject, marks, pdfFile, pdfFilename } = req.body;

    if (pdfFile) {
      const sizeInBytes = (pdfFile.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      if (sizeInMB > 5) {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }
    }

    const result = new Result({
      studentId,
      subject,
      marks,
      pdfFile: pdfFile || null,
      pdfFilename: pdfFilename || null,
      uploadedBy: req.user.id
    });
    await result.save();

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, authorize('faculty'), async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## Step 11: Create Main Server File

Create `backend/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const facultyRoutes = require('./routes/faculties');
const attendanceRoutes = require('./routes/attendance');
const resultRoutes = require('./routes/results');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/results', resultRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', db: 'MongoDB' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
```

## Step 12: Create Test Connection File

Create `backend/test-connection.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    console.log('📊 Database:', mongoose.connection.name);
    
    mongoose.connection.db.listCollections().toArray((err, collections) => {
      console.log('📁 Collections:', collections.map(c => c.name));
      mongoose.connection.close();
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
  });
```

## Step 13: Test Backend

```bash
# Test database connection
npm run test

# Start backend server
npm run dev
```

Expected output:
```
✅ MongoDB connected successfully
🚀 Server running on port 5000
📊 Health check: http://localhost:5000/api/health
```

## Step 14: Test API Endpoints

Open browser or Postman:
- http://localhost:5000/api/health

You should see:
```json
{
  "status": "OK",
  "message": "Server is running",
  "db": "MongoDB"
}
```

## ✅ Backend is Ready!

Your backend is now running with:
- ✅ MongoDB connection
- ✅ All API routes
- ✅ Authentication with JWT
- ✅ Role-based access control
- ✅ File upload support (Base64)

## Next Steps

1. ✅ Backend running on http://localhost:5000
2. 🔄 Update React frontend to use API
3. 🔄 Test login and CRUD operations
4. 🔄 Deploy to production

**Backend setup complete!** 🎉
