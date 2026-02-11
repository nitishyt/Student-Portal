# Multi-Device Access Setup

## Current Status: ❌ Local Only

Your MongoDB is on `localhost` - only accessible from this computer.

## Solution: Use MongoDB Atlas (Free Cloud Database)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a free cluster (M0 - Free tier)

### Step 2: Get Connection String
1. In Atlas, click "Connect"
2. Choose "Connect your application"
3. Copy connection string (looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/student_portal
   ```

### Step 3: Update Backend .env
```env
PORT=5000
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/student_portal
JWT_SECRET=student_portal_secret_key_2025_change_in_production
```

### Step 4: Whitelist IP Addresses
In Atlas:
- Go to Network Access
- Add IP Address
- Choose "Allow access from anywhere" (0.0.0.0/0) for development

### Step 5: Deploy Backend to Cloud (Optional)

**Option A: Heroku**
```bash
heroku create your-app-name
git push heroku main
```

**Option B: Railway**
```bash
railway login
railway init
railway up
```

**Option C: Render**
- Connect GitHub repo
- Auto-deploy

### Step 6: Update Frontend API URL

If backend is deployed, update `.env`:
```env
VITE_API_URL=https://your-backend-url.com/api
```

## Access Scenarios:

### Scenario 1: Same Network (Local)
- Backend on Computer A (localhost:5000)
- Frontend on Computer B
- Update frontend `.env`:
  ```
  VITE_API_URL=http://192.168.1.X:5000/api
  ```
  (Replace X with Computer A's local IP)
- ✅ Works on same WiFi network

### Scenario 2: Cloud Database + Local Backend
- MongoDB Atlas (cloud)
- Backend on your computer
- Frontend on your computer
- ✅ Data accessible from any device running the app
- ❌ Backend must be running on your computer

### Scenario 3: Full Cloud (Recommended)
- MongoDB Atlas (cloud)
- Backend deployed (Heroku/Railway/Render)
- Frontend deployed (Vercel/Netlify)
- ✅ Access from anywhere, any device
- ✅ No need to run anything locally

## Quick Setup for Multi-Device:

### Minimal Change (Same Network):
1. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update frontend `.env`:
   ```
   VITE_API_URL=http://YOUR_IP:5000/api
   ```
3. Keep backend running
4. Access from other device on same WiFi

### Best Solution (Cloud):
1. Use MongoDB Atlas (free)
2. Deploy backend to Railway/Render (free)
3. Deploy frontend to Vercel/Netlify (free)
4. Access from anywhere!

## Summary:

| Setup | Data Accessible | Backend Needed | Internet Required |
|-------|----------------|----------------|-------------------|
| Current (localhost) | ❌ This device only | ✅ Yes | ❌ No |
| Same Network | ✅ Same WiFi devices | ✅ Yes | ❌ No |
| Cloud DB + Local Backend | ✅ Any device (with backend running) | ✅ Yes | ✅ Yes |
| Full Cloud | ✅ Any device, anywhere | ❌ No | ✅ Yes |
