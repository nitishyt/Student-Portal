import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { auth } from './utils/auth';

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
        
        {/* Default route - redirect based on authentication */}
        <Route 
          path="/" 
          element={
            auth.isAuthenticated() 
              ? <Navigate to={auth.getUserType() === 'admin' ? '/admin' : '/student'} replace />
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