import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';

const Login = () => {
  const [userType, setUserType] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated()) {
      const currentUserType = auth.getUserType();
      const routes = {
        admin: '/admin',
        student: '/student',
        faculty: '/faculty',
        parent: '/parent'
      };
      navigate(routes[currentUserType] || '/login');
    }
  }, [navigate]);

  const handleUserTypeChange = (type) => {
    setUserType(type);
    setUsername('');
    setPassword('');
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await auth.login(userType, username, password);
    setLoading(false);

    if (result.success) {
      const routes = {
        admin: '/admin',
        student: '/student',
        faculty: '/faculty',
        parent: '/parent'
      };
      navigate(routes[userType] || '/login');
    } else {
      setError(result.error);
    }
  };

  const roles = [
    { key: 'student', label: 'Student' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'parent', label: 'Parent' },
    { key: 'admin', label: 'Admin' }
  ];

  return (
    <div className="login-page">
      <div className="login-right">
        <div className="login-card">
          <h2 className="login-title">Student Portal</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>Sign in to access your portal</p>

          <div className="login-role-tabs">
            {roles.map((role) => (
              <button
                key={role.key}
                type="button"
                className={`login-role-tab ${userType === role.key ? 'active' : ''}`}
                onClick={() => handleUserTypeChange(role.key)}
              >
                {role.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin}>
            <div className="login-input-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>

            <div className="login-input-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;