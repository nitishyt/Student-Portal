# MongoDB Setup Guide - Student Portal

## Why MongoDB for This Project?

### ✅ Advantages
- **Easier Setup** - No complex SQL, just JSON-like documents
- **Flexible Schema** - Easy to add new fields later
- **Fast Development** - No need to define strict table structure
- **MongoDB Atlas** - Free cloud hosting (no local installation needed!)
- **JSON Native** - Works perfectly with Node.js and React
- **Good for Attendance** - Can store arrays of lectures per day easily

### ⚠️ Considerations
- Different from SQL (learning curve if you know SQL)
- No built-in relationships (we handle manually)
- Queries are different from SQL

## Setup Options

### Option 1: MongoDB Compass (Local - Recommended for You) ⭐
- ✅ Visual interface (easy to use)
- ✅ Full control
- ✅ Works offline
- ✅ See data in real-time
- ⏱️ Setup time: 5 minutes
- 📖 **See MONGODB_COMPASS_GUIDE.md for detailed steps**

### Option 2: MongoDB Atlas (Cloud)
- ✅ No installation needed
- ✅ Free 512MB storage
- ✅ Access from anywhere
- ✅ Automatic backups
- ⏱️ Setup time: 5 minutes

---

## Quick Start: MongoDB Compass (Local)

### Step 1: Install MongoDB (3 minutes)

1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Run installer with default settings
3. MongoDB will run on `localhost:27017`

### Step 2: Install MongoDB Compass (1 minute)

1. Download: https://www.mongodb.com/try/download/compass
2. Install (or it comes with MongoDB Community Server)
3. Open MongoDB Compass

### Step 3: Connect to Database (1 minute)

1. Open MongoDB Compass
2. Connection String: `mongodb://localhost:27017`
3. Click **Connect**

### Step 4: Create Database & Collections

**📖 Follow detailed steps in `MONGODB_COMPASS_GUIDE.md`**

Quick summary:
1. Create database: `student_portal`
2. Create 5 collections:
   - `users`
   - `students`
   - `faculties`
   - `attendances`
   - `results`
3. Insert admin user
4. Done!

### Connection String for Backend

```env
MONGODB_URI=mongodb://localhost:27017/student_portal
```

---

## Quick Start: MongoDB Atlas (Cloud)

### Step 1: Create Free Account (2 minutes)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google
3. Choose **FREE** tier (M0 Sandbox)
4. Select cloud provider: **AWS**
5. Region: Choose closest to you
6. Cluster name: `StudentPortal`
7. Click **Create Cluster**

### Step 2: Setup Database Access (1 minute)

1. Click **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Username: `admin`
4. Password: `admin123` (or generate strong password)
5. User Privileges: **Read and write to any database**
6. Click **Add User**

### Step 3: Setup Network Access (1 minute)

1. Click **Network Access** (left sidebar)
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for development)
4. Click **Confirm**

⚠️ **Note**: For production, restrict to specific IPs

### Step 4: Get Connection String (1 minute)

1. Click **Database** (left sidebar)
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Driver: **Node.js**
5. Version: **4.1 or later**
6. Copy connection string:
```
mongodb+srv://admin:<password>@studentportal.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
7. Replace `<password>` with your actual password

---

## MongoDB Schema Design

### Collections (like tables in SQL)

```javascript
// 1. users collection
{
  _id: ObjectId("..."),
  username: "admin",
  password: "$2a$10$hashed...",
  role: "admin", // admin, faculty, student, parent
  createdAt: ISODate("2024-01-01T00:00:00Z")
}

// 2. students collection
{
  _id: ObjectId("..."),
  userId: ObjectId("..."), // Reference to users
  name: "John Doe",
  rollNo: "CS001",
  branch: "IT",
  standard: "TE",
  phone: "1234567890",
  parentUsername: "parent_cs001",
  parentPassword: "johndoe123",
  createdAt: ISODate("2024-01-01T00:00:00Z")
}

// 3. faculties collection
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  name: "Dr. Smith",
  subject: "Data Structures",
  email: "smith@college.edu",
  createdAt: ISODate("2024-01-01T00:00:00Z")
}

// 4. attendance collection (lecture-wise)
{
  _id: ObjectId("..."),
  studentId: ObjectId("..."),
  date: "2024-01-15",
  lectures: [
    {
      time: "09:00",
      subject: "Data Structures",
      status: "present",
      markedBy: ObjectId("...")
    },
    {
      time: "11:00",
      subject: "DBMS",
      status: "absent",
      markedBy: ObjectId("...")
    }
  ],
  createdAt: ISODate("2024-01-15T00:00:00Z")
}

// 5. results collection
{
  _id: ObjectId("..."),
  studentId: ObjectId("..."),
  subject: "Data Structures",
  marks: 85,
  pdfFile: "base64string...", // or S3 URL
  pdfFilename: "result.pdf",
  uploadedBy: ObjectId("..."),
  createdAt: ISODate("2024-01-01T00:00:00Z")
}
```

---

## Backend Setup with MongoDB

### 1. Install Dependencies

```bash
cd student-portal-backend
npm install express mongoose bcryptjs jsonwebtoken cors dotenv body-parser
npm install --save-dev nodemon
```

### 2. Environment Variables (.env)

```env
PORT=5000
MONGODB_URI=mongodb+srv://admin:admin123@studentportal.xxxxx.mongodb.net/student_portal?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Database Configuration (config/db.js)

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 4. Mongoose Models

#### models/User.js
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

#### models/Student.js
```javascript
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

#### models/Faculty.js
```javascript
const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Faculty', facultySchema);
```

#### models/Attendance.js
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
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  lectures: [lectureSchema],
  createdAt: { type: Date, default: Date.now }
});

attendanceSchema.index({ studentId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
```

#### models/Result.js
```javascript
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true },
  marks: { type: Number, required: true, min: 0, max: 100 },
  pdfFile: { type: String }, // Base64 or S3 URL
  pdfFilename: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

resultSchema.index({ studentId: 1 });

module.exports = mongoose.model('Result', resultSchema);
```

### 5. Main Server File (server.js)

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
});
```

---

## API Routes (MongoDB Version)

### routes/students.js (Example)

```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// Get all students with filters
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

// Get student by ID
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

// Add student
router.post('/', auth, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const { name, rollNo, branch, standard, phone } = req.body;

    // Create student user
    const username = rollNo.toLowerCase();
    const password = name.toLowerCase().replace(/\s+/g, '') + '123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword,
      role: 'student'
    });
    await user.save();

    // Create parent user
    const parentUsername = 'parent_' + rollNo.toLowerCase();
    const parentUser = new User({
      username: parentUsername,
      password: hashedPassword,
      role: 'parent'
    });
    await parentUser.save();

    // Create student record
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

// Delete student
router.delete('/:id', auth, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Delete associated user
    await User.findByIdAndDelete(student.userId);
    
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### routes/attendance.js (MongoDB Version)

```javascript
const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { auth, authorize } = require('../middleware/auth');

// Get attendance for student
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

// Mark attendance (single or bulk)
router.post('/', auth, authorize('faculty'), async (req, res) => {
  try {
    const { studentId, date, time, subject, status } = req.body;

    // Check if attendance record exists for this date
    let attendance = await Attendance.findOne({ studentId, date });

    if (attendance) {
      // Add lecture to existing record
      attendance.lectures.push({
        time,
        subject,
        status,
        markedBy: req.user.id
      });
      await attendance.save();
    } else {
      // Create new attendance record
      attendance = new Attendance({
        studentId,
        date,
        lectures: [{
          time,
          subject,
          status,
          markedBy: req.user.id
        }]
      });
      await attendance.save();
    }

    res.status(201).json(attendance);
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
      if (date.getDay() !== 0) { // Exclude Sundays
        totalDays++;
        const hasPresent = record.lectures.some(l => l.status === 'present');
        if (hasPresent) presentDays++;
      }
    });

    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

    res.json({
      total: totalDays,
      present: presentDays,
      absent: totalDays - presentDays,
      percentage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## Testing MongoDB Connection

Create `test-mongodb.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    console.log('📊 Database:', mongoose.connection.name);
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
  });
```

Run test:
```bash
node test-mongodb.js
```

---

## MongoDB vs MySQL Comparison

| Feature | MongoDB | MySQL |
|---------|---------|-------|
| **Setup** | 5 min (Atlas) | 10 min (XAMPP) |
| **Schema** | Flexible | Fixed |
| **Queries** | JavaScript-like | SQL |
| **Relationships** | Manual | Built-in |
| **Arrays** | Native support | Need separate table |
| **JSON** | Native | Need conversion |
| **Learning Curve** | Easy for JS devs | Easy for SQL devs |
| **Best For** | Flexible data | Structured data |

---

## Advantages for Your Project

✅ **Attendance Storage**: Store multiple lectures per day in one document
```javascript
{
  date: "2024-01-15",
  lectures: [
    { time: "09:00", subject: "DS", status: "present" },
    { time: "11:00", subject: "DBMS", status: "absent" }
  ]
}
```

✅ **No Complex Joins**: Get all data in one query
✅ **Easy Filtering**: Branch + Standard filtering is simple
✅ **Cloud Ready**: MongoDB Atlas = instant deployment
✅ **Scalable**: Handles growth easily

---

## Quick Commands

### View Data (MongoDB Compass - GUI Tool)
1. Download: https://www.mongodb.com/try/download/compass
2. Connect using your connection string
3. Browse collections visually

### MongoDB Shell Commands
```javascript
// Show databases
show dbs

// Use database
use student_portal

// Show collections
show collections

// Find all students
db.students.find()

// Find students by branch
db.students.find({ branch: "IT" })

// Count documents
db.students.countDocuments()

// Delete all data
db.students.deleteMany({})
```

---

## Next Steps

1. ✅ Create MongoDB Atlas account
2. ✅ Get connection string
3. ✅ Install mongoose in backend
4. ✅ Create models
5. ✅ Update routes to use MongoDB
6. 🔄 Test API endpoints
7. 🔄 Connect React frontend

**MongoDB is ready to use!** 🎉
