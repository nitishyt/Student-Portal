import { Navigate } from 'react-router-dom';
import { auth } from '../utils/auth';

// Protected Route component to control access based on user type
const ProtectedRoute = ({ children, requiredRole }) => {
  const isAuthenticated = auth.isAuthenticated();
  const userType = auth.getUserType();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but wrong role, redirect to appropriate dashboard
  if (requiredRole && userType !== requiredRole) {
    if (userType === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/student" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;