# MongoDB Compass Setup Guide - Student Portal

## Prerequisites

1. **Install MongoDB Community Server**
   - Download: https://www.mongodb.com/try/download/community
   - Install with default settings
   - MongoDB will run on `localhost:27017`

2. **Install MongoDB Compass** (GUI Tool)
   - Download: https://www.mongodb.com/try/download/compass
   - Or it comes bundled with MongoDB Community Server

---

## Step-by-Step Setup in MongoDB Compass

### Step 1: Connect to Local MongoDB (1 minute)

1. Open **MongoDB Compass**
2. You'll see connection screen
3. Connection String: `mongodb://localhost:27017`
4. Click **Connect**

✅ You should see "My Queries", "Performance", "Databases" tabs

---

### Step 2: Create Database (1 minute)

1. Click **"+"** button next to "Databases" (or click "Create Database")
2. Database Name: `student_portal`
3. Collection Name: `users` (we'll create this first)
4. Click **Create Database**

✅ You should see `student_portal` database in the left sidebar

---

### Step 3: Create Collections (2 minutes)

Click on `student_portal` database, then create these collections:

#### 3.1 Create "users" collection (if not created)
1. Click **"+"** or "Create Collection"
2. Collection Name: `users`
3. Click **Create Collection**

#### 3.2 Create "students" collection
1. Click **"+"** or "Create Collection"
2. Collection Name: `students`
3. Click **Create Collection**

#### 3.3 Create "faculties" collection
1. Click **"+"** or "Create Collection"
2. Collection Name: `faculties`
3. Click **Create Collection**

#### 3.4 Create "attendances" collection
1. Click **"+"** or "Create Collection"
2. Collection Name: `attendances`
3. Click **Create Collection**

#### 3.5 Create "results" collection
1. Click **"+"** or "Create Collection"
2. Collection Name: `results`
3. Click **Create Collection**

✅ You should now have 5 collections in `student_portal` database

---

### Step 4: Insert Default Admin User (2 minutes)

1. Click on **users** collection
2. Click **ADD DATA** button → **Insert Document**
3. Delete the default `{}` and paste this:

```json
{
  "username": "admin",
  "password": "admin123",
  "role": "admin",
  "createdAt": {
    "$date": "2025-01-01T00:00:00.000Z"
  }
}
```

4. Click **Insert**

✅ You should see the admin user in the users collection

**⚠️ Important**: In production, you'll hash the password using bcrypt. For now, plain text is fine for testing.

---

### Step 5: Insert Sample Student (Optional - for testing)

1. Click on **students** collection
2. Click **ADD DATA** → **Insert Document**
3. Paste this:

```json
{
  "userId": null,
  "name": "John Doe",
  "rollNo": "IT001",
  "branch": "IT",
  "standard": "TE",
  "phone": "1234567890",
  "parentUsername": "parent_it001",
  "parentPassword": "johndoe123",
  "createdAt": {
    "$date": "2025-01-01T00:00:00.000Z"
  }
}
```

4. Click **Insert**

---

### Step 6: Insert Sample Attendance (Optional - for testing)

1. Click on **attendances** collection
2. Click **ADD DATA** → **Insert Document**
3. Paste this:

```json
{
  "studentId": null,
  "date": "2025-01-15",
  "lectures": [
    {
      "time": "09:00",
      "subject": "Data Structures",
      "status": "present",
      "markedBy": null
    },
    {
      "time": "11:00",
      "subject": "DBMS",
      "status": "present",
      "markedBy": null
    }
  ],
  "createdAt": {
    "$date": "2025-01-15T00:00:00.000Z"
  }
}
```

4. Click **Insert**

---

## Your Database is Ready! ✅

You should now have:
- ✅ Database: `student_portal`
- ✅ Collections: users, students, faculties, attendances, results
- ✅ Admin user created
- ✅ Sample data (optional)

---

## Backend Configuration

### Update .env file

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/student_portal
JWT_SECRET=your_jwt_secret_key_here_change_in_production
```

### Test Connection

Create `test-connection.js` in backend folder:

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/student_portal')
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    console.log('📊 Database:', mongoose.connection.name);
    
    // List all collections
    mongoose.connection.db.listCollections().toArray((err, collections) => {
      console.log('📁 Collections:', collections.map(c => c.name));
      mongoose.connection.close();
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
  });
```

Run test:
```bash
node test-connection.js
```

Expected output:
```
✅ MongoDB connected successfully!
📊 Database: student_portal
📁 Collections: [ 'users', 'students', 'faculties', 'attendances', 'results' ]
```

---

## Using MongoDB Compass - Quick Guide

### View Data
1. Click on collection name (e.g., `students`)
2. See all documents in the collection
3. Use **Filter** box to search: `{ "branch": "IT" }`

### Add Document
1. Click **ADD DATA** → **Insert Document**
2. Paste JSON or use form
3. Click **Insert**

### Edit Document
1. Hover over document
2. Click **pencil icon** (Edit)
3. Modify fields
4. Click **Update**

### Delete Document
1. Hover over document
2. Click **trash icon** (Delete)
3. Confirm deletion

### Filter/Search
Use the filter box at top:
```json
{ "branch": "IT", "standard": "TE" }
```

### Sort
Click column headers or use sort box:
```json
{ "rollNo": 1 }
```
(1 = ascending, -1 = descending)

### Export Data
1. Click **Export Data** button
2. Choose format (JSON or CSV)
3. Save file

### Import Data
1. Click **ADD DATA** → **Import File**
2. Choose JSON or CSV file
3. Click **Import**

---

## Common MongoDB Compass Operations

### Find All Students in IT Branch
1. Go to `students` collection
2. Filter: `{ "branch": "IT" }`
3. Press Enter

### Find Attendance for Specific Date
1. Go to `attendances` collection
2. Filter: `{ "date": "2025-01-15" }`
3. Press Enter

### Count Documents
1. Go to collection
2. Look at top: "Displaying documents 1-20 of **X**"

### Clear All Data (Reset)
1. Go to collection
2. Filter: `{}`
3. Select all documents
4. Click **Delete** button

---

## Indexes (For Better Performance)

### Create Index on students.rollNo
1. Go to `students` collection
2. Click **Indexes** tab
3. Click **Create Index**
4. Index definition:
```json
{
  "rollNo": 1
}
```
5. Options: Check "Unique"
6. Click **Create Index**

### Create Index on students.branch + standard
1. Go to `students` collection
2. Click **Indexes** tab
3. Click **Create Index**
4. Index definition:
```json
{
  "branch": 1,
  "standard": 1
}
```
5. Click **Create Index**

### Create Index on attendances.studentId + date
1. Go to `attendances` collection
2. Click **Indexes** tab
3. Click **Create Index**
4. Index definition:
```json
{
  "studentId": 1,
  "date": 1
}
```
5. Click **Create Index**

---

## Troubleshooting

### Issue 1: Can't connect to MongoDB
**Solution**: Make sure MongoDB service is running
- Windows: Open Services → Find "MongoDB Server" → Start
- Or restart MongoDB from Services

### Issue 2: Connection refused
**Solution**: Check if MongoDB is running on port 27017
```bash
# Check if MongoDB is running
netstat -an | findstr 27017
```

### Issue 3: Database not showing
**Solution**: Refresh Compass
- Click refresh icon (circular arrow)
- Or disconnect and reconnect

### Issue 4: Can't insert document
**Solution**: Check JSON format
- Make sure JSON is valid
- Use double quotes for keys
- No trailing commas

---

## Sample Data for Testing

### Insert Multiple Students at Once

1. Go to `students` collection
2. Click **ADD DATA** → **Insert Document**
3. Switch to **Array** view (toggle at top)
4. Paste this:

```json
[
  {
    "userId": null,
    "name": "Alice Smith",
    "rollNo": "IT001",
    "branch": "IT",
    "standard": "TE",
    "phone": "1234567890",
    "parentUsername": "parent_it001",
    "parentPassword": "alicesmith123",
    "createdAt": { "$date": "2025-01-01T00:00:00.000Z" }
  },
  {
    "userId": null,
    "name": "Bob Johnson",
    "rollNo": "IT002",
    "branch": "IT",
    "standard": "TE",
    "phone": "1234567891",
    "parentUsername": "parent_it002",
    "parentPassword": "bobjohnson123",
    "createdAt": { "$date": "2025-01-01T00:00:00.000Z" }
  },
  {
    "userId": null,
    "name": "Charlie Brown",
    "rollNo": "DS001",
    "branch": "DS",
    "standard": "SE",
    "phone": "1234567892",
    "parentUsername": "parent_ds001",
    "parentPassword": "charliebrown123",
    "createdAt": { "$date": "2025-01-01T00:00:00.000Z" }
  }
]
```

5. Click **Insert**

---

## Backup & Restore

### Backup Database (Export)
1. Click on `student_portal` database
2. Click **Export Database**
3. Choose location
4. Save as `student_portal_backup.json`

### Restore Database (Import)
1. Click on `student_portal` database
2. Click **Import Database**
3. Select `student_portal_backup.json`
4. Click **Import**

---

## Next Steps

1. ✅ MongoDB Compass connected
2. ✅ Database `student_portal` created
3. ✅ 5 collections created
4. ✅ Admin user inserted
5. ✅ Indexes created (optional but recommended)
6. 🔄 Set up Node.js backend
7. 🔄 Connect backend to MongoDB
8. 🔄 Test API endpoints
9. 🔄 Connect React frontend

**Your MongoDB database is ready to use!** 🎉

---

## Quick Reference

### Connection String
```
mongodb://localhost:27017/student_portal
```

### Collections
- `users` - Authentication
- `students` - Student information
- `faculties` - Faculty information
- `attendances` - Lecture-wise attendance
- `results` - Marks and PDFs

### Default Admin
- Username: `admin`
- Password: `admin123`
- Role: `admin`

### Useful Filters
```json
// Find by branch
{ "branch": "IT" }

// Find by branch and standard
{ "branch": "IT", "standard": "TE" }

// Find by date
{ "date": "2024-01-15" }

// Find by status
{ "lectures.status": "present" }
```
