import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import ParentDashboard from './pages/ParentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { auth } from './utils/auth';
import './styles.css';
function App() {
  return (
    <Router>
      <Routes>
        {/* Public route - Login page */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Admin route */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Student route */}
        <Route 
          path="/student" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Faculty route */}
        <Route 
          path="/faculty" 
          element={
            <ProtectedRoute requiredRole="faculty">
              <FacultyDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Parent route */}
        <Route 
          path="/parent" 
          element={
            <ProtectedRoute requiredRole="parent">
              <ParentDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Default route - redirect based on authentication */}
        <Route 
          path="/" 
          element={
            auth.isAuthenticated() 
              ? <Navigate to={
                  auth.getUserType() === 'admin' ? '/admin' :
                  auth.getUserType() === 'faculty' ? '/faculty' :
                  auth.getUserType() === 'parent' ? '/parent' :
                  '/student'
                } replace />
              : <Navigate to="/login" replace />
          } 
        />
        
        {/* Catch all route - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;