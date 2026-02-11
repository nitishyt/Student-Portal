# MySQL Database Setup Guide - Student Portal

## Step 1: Install XAMPP (5 minutes)

### Download & Install
1. Go to https://www.apachefriends.org/
2. Download XAMPP for Windows
3. Run installer (keep default settings)
4. Install to `C:\xampp`

### Start Services
1. Open **XAMPP Control Panel**
2. Click **Start** next to Apache
3. Click **Start** next to MySQL
4. Both should show green "Running" status

## Step 2: Create Database (2 minutes)

### Using phpMyAdmin (Visual Interface)
1. Open browser: http://localhost/phpmyadmin
2. Click **New** in left sidebar
3. Database name: `student_portal`
4. Collation: `utf8mb4_general_ci`
5. Click **Create**

### Or Using SQL (Command Line)
```sql
CREATE DATABASE student_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE student_portal;
```

## Step 3: Create Tables (Copy-Paste SQL)

Open **SQL** tab in phpMyAdmin and paste this:

```sql
-- 1. Users table (for authentication)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'faculty', 'student', 'parent') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- 2. Students table
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_branch_standard (branch, standard),
    INDEX idx_roll_no (roll_no)
);

-- 3. Faculties table
CREATE TABLE faculties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_email (email)
);

-- 4. Attendance table (lecture-wise)
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
    INDEX idx_student_date (student_id, date),
    INDEX idx_date (date)
);

-- 5. Results table (with PDF support)
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

## Step 4: Insert Default Admin (Copy-Paste)

```sql
-- Insert default admin user
-- Username: admin
-- Password: admin123
INSERT INTO users (username, password, role) 
VALUES ('admin', '$2a$10$rZ5qJ5qJ5qJ5qJ5qJ5qJ5O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'admin');

-- Note: You'll need to hash the password properly using bcrypt in Node.js
-- For now, you can use this temporary plain text (CHANGE IN PRODUCTION!)
-- UPDATE users SET password = 'admin123' WHERE username = 'admin';
```

## Step 5: Verify Database

### Check Tables Created
```sql
SHOW TABLES;
```

You should see:
- attendance
- faculties
- results
- students
- users

### Check Table Structure
```sql
DESCRIBE students;
DESCRIBE attendance;
```

## Step 6: Configure Backend Connection

Create `.env` file in backend folder:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=student_portal
JWT_SECRET=your_secret_key_change_this_in_production
```

**Note**: Default XAMPP MySQL has:
- Username: `root`
- Password: `` (empty)
- Host: `localhost`
- Port: `3306`

## Common Issues & Solutions

### Issue 1: MySQL won't start in XAMPP
**Solution**: Port 3306 might be in use
1. Open XAMPP Control Panel
2. Click **Config** next to MySQL
3. Click **my.ini**
4. Change port from 3306 to 3307
5. Save and restart MySQL

### Issue 2: Can't access phpMyAdmin
**Solution**: Apache not running
1. Start Apache in XAMPP
2. Try http://localhost/phpmyadmin again

### Issue 3: "Access denied" error
**Solution**: Check credentials
1. Default username: `root`
2. Default password: (empty)
3. Update `.env` file if changed

## Testing Database Connection

Create `test-db.js` in backend folder:

```javascript
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'student_portal'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✅ Database connected successfully!');
  
  connection.query('SHOW TABLES', (err, results) => {
    if (err) throw err;
    console.log('📋 Tables in database:', results);
    connection.end();
  });
});
```

Run test:
```bash
node test-db.js
```

## Next Steps

1. ✅ Database created
2. ✅ Tables created
3. ✅ Admin user added
4. 🔄 Set up Node.js backend (see BACKEND_IMPLEMENTATION.md)
5. 🔄 Connect React frontend to backend API

## Useful phpMyAdmin Features

### View Data
1. Click table name (e.g., `students`)
2. Click **Browse** tab
3. See all records

### Add Data Manually
1. Click table name
2. Click **Insert** tab
3. Fill form
4. Click **Go**

### Run Custom Queries
1. Click **SQL** tab
2. Write query
3. Click **Go**

### Export Database (Backup)
1. Click database name
2. Click **Export** tab
3. Choose **Quick** method
4. Click **Go**
5. Save `.sql` file

### Import Database (Restore)
1. Click database name
2. Click **Import** tab
3. Choose `.sql` file
4. Click **Go**

## Database Maintenance

### Backup Database (Daily)
```bash
# From XAMPP shell or CMD
cd C:\xampp\mysql\bin
mysqldump -u root student_portal > backup.sql
```

### Restore Database
```bash
mysql -u root student_portal < backup.sql
```

### Clear All Data (Reset)
```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE attendance;
TRUNCATE TABLE results;
TRUNCATE TABLE students;
TRUNCATE TABLE faculties;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Re-insert admin
INSERT INTO users (username, password, role) 
VALUES ('admin', 'admin123', 'admin');
```

## Security Tips

1. **Change default MySQL password**
   - Open phpMyAdmin
   - Click **User accounts**
   - Edit `root@localhost`
   - Set password

2. **Use strong JWT secret**
   - Generate: https://randomkeygen.com/
   - Update `.env` file

3. **Hash passwords properly**
   - Use bcrypt in Node.js
   - Never store plain text passwords

## Resources

- **XAMPP Docs**: https://www.apachefriends.org/docs/
- **MySQL Tutorial**: https://www.mysqltutorial.org/
- **phpMyAdmin Guide**: https://docs.phpmyadmin.net/
- **SQL Practice**: https://www.w3schools.com/sql/

---

**Your database is now ready!** 🎉

Next: Set up Node.js backend to connect to this database.
