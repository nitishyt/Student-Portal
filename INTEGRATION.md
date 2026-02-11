# Frontend to Backend Integration

## Changes Made

### 1. Installed Dependencies
- **axios**: HTTP client for API calls

### 2. Created API Service Layer
**File**: `src/utils/api.js`
- Centralized API configuration
- Axios interceptors for JWT token attachment
- API endpoints for:
  - Authentication (login)
  - Students (CRUD operations)
  - Attendance (get, mark)
  - Results (get, create)

### 3. Updated Authentication
**File**: `src/utils/auth.js`
- Changed from localStorage data storage to API calls
- Now stores only JWT token and user info
- Async login function

### 4. Updated Data Management
**File**: `src/utils/studentData.js`
- All functions now async and use API calls
- Removed localStorage data operations
- Simplified function signatures

### 5. Updated Login Component
**File**: `src/pages/Login.jsx`
- Made handleLogin async

## How It Works

1. **Login Flow**:
   - User enters credentials → Frontend calls `/api/auth/login`
   - Backend validates → Returns JWT token + user data
   - Frontend stores token in localStorage
   - Token auto-attached to all subsequent requests

2. **Data Flow**:
   - Components call functions from `studentData.js`
   - Functions make API calls to Express backend
   - Backend queries MongoDB
   - Data returned to frontend

## Next Steps

Update dashboard components to handle async operations:
- AdminDashboard.jsx
- StudentDashboard.jsx
- FacultyDashboard.jsx (if exists)
- ParentDashboard.jsx (if exists)

## Running the Application

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd react-student-portal
   npm run dev
   ```

Backend runs on: http://localhost:5000
Frontend runs on: http://localhost:5173
