import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';

const Login = () => {
  const [userType, setUserType] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
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