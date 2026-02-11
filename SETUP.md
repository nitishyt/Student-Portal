# Setup & Run Guide

## ✅ Integration Complete!

Your React frontend is now connected to the Express backend with MongoDB.

## 🚀 How to Run

### 1. Start Backend Server
```bash
cd backend
npm run dev
```
Backend runs on: **http://localhost:5000**

### 2. Start Frontend Server
```bash
cd react-student-portal
npm run dev
```
Frontend runs on: **http://localhost:5173**

## 🔑 Default Login

### Admin
- Username: `admin`
- Password: `admin123`

### Students/Parents
Created by admin through the dashboard

## 📝 What Changed

### Frontend Files Updated:
1. ✅ `src/utils/api.js` - NEW: API service layer
2. ✅ `src/utils/auth.js` - Uses API instead of localStorage
3. ✅ `src/utils/studentData.js` - All async API calls
4. ✅ `src/pages/Login.jsx` - Async login
5. ✅ `src/pages/AdminDashboard.jsx` - Async operations + loading states
6. ✅ `src/pages/StudentDashboard.jsx` - Async operations + loading states
7. ✅ `src/pages/FacultyDashboard.jsx` - Async operations + loading states
8. ✅ `src/pages/ParentDashboard.jsx` - Async operations + loading states
9. ✅ `.env` - API URL configuration

### Backend (Already Set Up):
- Express server with REST API
- MongoDB with Mongoose
- JWT authentication
- CORS enabled

## 🔧 Tech Stack

**Frontend:**
- React 18
- Axios (HTTP client)
- React Router 6
- Vite

**Backend:**
- Express 5
- MongoDB + Mongoose
- JWT tokens
- bcryptjs

## 📊 API Endpoints

- `POST /api/auth/login` - Login
- `GET /api/students` - Get all students
- `POST /api/students` - Add student
- `DELETE /api/students/:id` - Delete student
- `GET /api/attendance/student/:id` - Get attendance
- `POST /api/attendance` - Mark attendance
- `GET /api/results/student/:id` - Get results
- `POST /api/results` - Add result

## 🔐 Authentication Flow

1. User logs in → Backend validates credentials
2. Backend returns JWT token + user data
3. Frontend stores token in localStorage
4. Token auto-attached to all API requests via axios interceptor

## ⚠️ Important Notes

- Make sure MongoDB is running before starting backend
- Backend must be running before frontend can fetch data
- Check `.env` file in backend for MongoDB connection string
- CORS is configured to allow frontend requests

## 🐛 Troubleshooting

**"Network Error" in frontend:**
- Ensure backend is running on port 5000
- Check CORS settings in backend

**"Cannot connect to MongoDB":**
- Verify MongoDB is running
- Check connection string in backend/.env

**"Invalid credentials":**
- Use correct admin credentials
- Students must be created by admin first
