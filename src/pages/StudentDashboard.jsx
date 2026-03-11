import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';
import { studentData } from '../utils/studentData';

const StudentDashboard = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [student, setStudent] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const currentStudentId = auth.getCurrentStudentId();

  useEffect(() => {
    if (currentStudentId) {
      loadStudentData();
    }
  }, [currentStudentId]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const studentInfo = await studentData.getStudentById(currentStudentId);
      setStudent(studentInfo);
      if (studentInfo) {
        await calculateAttendanceStats();
        await loadResults();
      }
    } catch (error) {
      alert('Error loading student data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceStats = async () => {
    try {
      const attendance = await studentData.getAttendance(currentStudentId);
      const present = attendance.filter(a => a.status === 'present').length;
      const absent = attendance.filter(a => a.status === 'absent').length;
      const total = attendance.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      setAttendanceStats({ present, absent, total, percentage });
    } catch (error) {
      setAttendanceStats({ present: 0, absent: 0, total: 0, percentage: 0 });
    }
  };

  const loadResults = async () => {
    try {
      const studentResults = await studentData.getResults(currentStudentId);
      setResults(studentResults || []);
    } catch (error) {
      setResults([]);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login');
  };

  const showSection = (section) => {
    setActiveSection(section);
    loadStudentData();
  };

  const getGradeClass = (marks) => {
    if (marks >= 90) return 'excellent';
    if (marks >= 75) return 'good';
    if (marks >= 60) return 'average';
    return 'poor';
  };

  if (loading || !student) {
    return <div className="loading-screen"><div className="loading-spinner"></div> Loading...</div>;
  }

  const navItems = [
    { key: 'profile', icon: '👤', label: 'My Profile' },
    { key: 'attendance', icon: '📊', label: 'Attendance' },
    { key: 'results', icon: '📝', label: 'Results' }
  ];

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">Student Portal</div>
          <span className="sidebar-brand-badge">Student</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`sidebar-nav-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => showSection(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-avatar">{getInitials(student.name)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{student.name}</div>
            <div className="sidebar-user-role">Student</div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard-main">
        {/* Bug 4 fix — header */}
        <div className="dashboard-header">
          <h1 className="header-title">
            {activeSection === 'profile' ? '👤 My Profile' : activeSection === 'attendance' ? '📊 My Attendance' : '📋 My Results'}
          </h1>
          <div className="header-meta">
            <span className="header-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <div className="header-avatar">{student?.name?.[0] || 'S'}</div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="profile-card">
              <div className="profile-banner"></div>
              <div className="profile-body">
                <div className="profile-avatar">{student.name?.[0]}</div>
                <h2 className="profile-name">{student.name}</h2>
                <span className="profile-badge">Student</span>
                <div className="profile-info-grid">
                  <div className="profile-info-item">
                    <span className="info-label">🎫 Roll Number</span>
                    <span className="info-value">{student.rollNo}</span>
                  </div>
                  <div className="profile-info-item">
                    <span className="info-label">🏫 Branch</span>
                    <span className="info-value">{student.branch}</span>
                  </div>
                  <div className="profile-info-item">
                    <span className="info-label">📚 Year</span>
                    <span className="info-value">{student.standard}</span>
                  </div>
                  <div className="profile-info-item">
                    <span className="info-label">📞 Phone</span>
                    <span className="info-value">{student.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Section */}
          {activeSection === 'attendance' && (
            <div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <h3>{attendanceStats.percentage}%</h3>
                  <p>Attendance Rate</p>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">✅</div>
                  <h3>{attendanceStats.present}</h3>
                  <p>Present Days</p>
                </div>
                <div className="stat-card danger">
                  <div className="stat-icon">❌</div>
                  <h3>{attendanceStats.absent}</h3>
                  <p>Absent Days</p>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">📊</div>
                  <h3>{attendanceStats.total}</h3>
                  <p>Total Days</p>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {activeSection === 'results' && (
            <div>
              {results.length === 0 ? (
                <div className="empty-state">
                  <h3>No Results Yet</h3>
                  <p>No results available yet.</p>
                </div>
              ) : (
                <div>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">🏆</div>
                      <h3>{Math.round(results.reduce((sum, r) => sum + r.marks, 0) / results.length)}</h3>
                      <p>Average Score / 100</p>
                    </div>
                    <div className="stat-card success">
                      <div className="stat-icon">📚</div>
                      <h3>{results.length}</h3>
                      <p>Total Subjects</p>
                    </div>
                  </div>

                  <div className="results-list">
                    {results.map((result, index) => (
                      <div key={result._id || result.id || index} className="result-card">
                        <div className="result-card-info">
                          <h4>{result.subject}</h4>
                          <span className="result-date">📅 {new Date(result.createdAt).toLocaleDateString()}</span>
                          {(result.pdfFilename || result.fileName) && (
                            <div>
                              <a href={result.pdfFile || result.fileData} download={result.pdfFilename || result.fileName} className="result-pdf-link">📄 {result.pdfFilename || result.fileName}</a>
                            </div>
                          )}
                        </div>
                        <div className={`result-score ${getGradeClass(result.marks)}`}>
                          {result.marks}
                          <span className="score-max">/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;