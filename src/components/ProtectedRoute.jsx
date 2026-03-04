import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../utils/auth';

// Protected Route component to control access based on user type.
// Performs a lightweight backend token verification on mount so that
// tampered sessionStorage values are caught quickly.
const ProtectedRoute = ({ children, requiredRole }) => {
  const [status, setStatus] = useState('loading'); // loading | ok | denied
  const isAuthenticated = auth.isAuthenticated();
  const userType = auth.getUserType();

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus('denied');
      return;
    }
    // Verify token with backend to catch revoked / tampered tokens
    auth.verifySession().then((valid) => {
      setStatus(valid ? 'ok' : 'denied');
      if (!valid) auth.logout(); // clear stale session
    });
  }, [isAuthenticated]);

  if (status === 'loading') {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (status === 'denied') {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but wrong role, redirect to appropriate dashboard
  if (requiredRole && userType !== requiredRole) {
    const routes = { admin: '/admin', faculty: '/faculty', student: '/student', parent: '/parent' };
    return <Navigate to={routes[userType] || '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;