# React Student Portal

A complete student management system built with React, Vite, and React Router.

## Features

- **Role-based Authentication**: Separate login for Admin and Students
- **Admin Dashboard**: Manage students, attendance, and results
- **Student Dashboard**: View profile, attendance, and results
- **Protected Routes**: Role-based access control
- **Local Storage**: Data persistence using browser localStorage

## Project Structure

```
react-student-portal/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx    # Route protection component
│   ├── pages/
│   │   ├── Login.jsx             # Login page
│   │   ├── AdminDashboard.jsx    # Admin dashboard
│   │   └── StudentDashboard.jsx  # Student dashboard
│   ├── utils/
│   │   ├── auth.js               # Authentication utilities
│   │   └── studentData.js        # Student data management
│   ├── App.jsx                   # Main app with routing
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── package.json
├── vite.config.js
└── index.html
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## Login Credentials

### Admin Login
- Username: `admin`
- Password: `admin123`

### Student Login
Students are created by admin. When admin adds a student:
- Username: Roll number (lowercase)
- Password: Name (lowercase, no spaces) + "123"

Example: Name "John Doe", Roll "CS001" → Username: `cs001`, Password: `johndoe123`

## Usage

1. **Admin Functions**:
   - Add/Delete students
   - Mark attendance for any student
   - Upload results for students
   - View all student data

2. **Student Functions**:
   - View personal profile
   - Check attendance statistics
   - View results and grades

## Technical Details

- **React 18** with functional components and hooks
- **React Router 6** for navigation and route protection
- **Vite** for fast development and building
- **localStorage** for data persistence
- **CSS** for styling (no external UI library)

## Key Components

- **ProtectedRoute**: Ensures only authenticated users with correct roles can access routes
- **Auth Utils**: Handle login, logout, and authentication state
- **Student Data Utils**: Manage student records, attendance, and results
- **Responsive Design**: Works on desktop and mobile devices