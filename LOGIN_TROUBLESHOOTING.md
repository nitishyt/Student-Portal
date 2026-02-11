# Login Troubleshooting Guide

## Quick Fix Steps:

### Step 1: Create Admin User
```bash
cd backend
npm run seed
```

### Step 2: Check Backend is Running
```bash
cd backend
npm run dev
```
Should see: "🚀 Server running on port 5000"

### Step 3: Check Frontend is Running
```bash
cd react-student-portal
npm run dev
```
Should see: "Local: http://localhost:5173"

### Step 4: Check MongoDB is Running
- If using local MongoDB, ensure MongoDB service is running
- Windows: Check Services for "MongoDB"
- Mac: `brew services list`

### Step 5: Test Backend Directly
Open browser console and run:
```javascript
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(console.log)
```

### Step 6: Test Login API
```javascript
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  })
})
.then(r => r.json())
.then(console.log)
```

## Common Issues:

### Issue 1: "Network Error"
- ❌ Backend not running
- ✅ Run: `cd backend && npm run dev`

### Issue 2: "Invalid credentials"
- ❌ No admin user in database
- ✅ Run: `cd backend && npm run seed`

### Issue 3: "Cannot connect to MongoDB"
- ❌ MongoDB not running
- ✅ Start MongoDB service

### Issue 4: CORS Error
- ❌ Frontend/Backend on different ports
- ✅ Already configured in backend

### Issue 5: "Loading..." forever
- ❌ API URL wrong in frontend
- ✅ Check `.env` file: `VITE_API_URL=http://localhost:5000/api`

## Check Console Errors:

### Browser Console (F12):
- Look for red errors
- Check Network tab for failed requests

### Backend Terminal:
- Look for error messages
- Check if requests are being received

## Manual Test:

1. Open: http://localhost:5173
2. Open Browser DevTools (F12)
3. Go to Network tab
4. Try to login
5. Check if request to `/api/auth/login` appears
6. Click on it to see response

## If Still Not Working:

Run this in backend terminal:
```bash
node seed-admin.js
```

Then restart backend:
```bash
npm run dev
```
