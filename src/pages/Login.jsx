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

  // Redirect if already logged in
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

  // Handle user type change
  const handleUserTypeChange = (type) => {
    setUserType(type);
    setUsername('');
    setPassword('');
    setError('');
  };

  // Handle login form submission
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
    { key: 'student', label: '🎓 Student' },
    { key: 'faculty', label: '📚 Faculty' },
    { key: 'parent', label: '👨‍👩‍👧 Parent' },
    { key: 'admin', label: '🛡️ Admin' }
  ];

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>

        <h1 className="login-left-brand">Student Portal</h1>
        <p className="login-left-tagline">
          Empowering Education, Connecting Communities
        </p>
        <ul className="login-features">
          <li>
            <span className="feature-icon">✓</span>
            Real-time attendance tracking
          </li>
          <li>
            <span className="feature-icon">✓</span>
            Instant result access & PDF reports
          </li>
          <li>
            <span className="feature-icon">✓</span>
            Multi-role secure dashboard
          </li>
        </ul>

        {/* Wave SVG */}
        <svg className="login-wave" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,40 C360,100 1080,0 1440,60 L1440,100 L0,100 Z" fill="rgba(255,255,255,0.05)" />
        </svg>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-card">
          <h2 className="login-title">Welcome Back 👋</h2>
          <p className="login-subtitle">Sign in to your portal</p>

          {/* Role Tabs */}
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
            {/* Username */}
            <div className="login-input-group">
              <span className="input-icon">👤</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`${userType.charAt(0).toUpperCase() + userType.slice(1)} Username`}
              />
            </div>

            {/* Password */}
            <div className="login-input-group">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`${userType.charAt(0).toUpperCase() + userType.slice(1)} Password`}
              />
            </div>

            {/* Submit */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Error */}
            {error && (
              <div className="login-error">
                <span>⚠️</span> {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;