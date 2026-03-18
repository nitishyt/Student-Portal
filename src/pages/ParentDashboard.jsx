import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';
import { studentData } from '../utils/studentData';

const ParentDashboard = () => {
  const [child, setChild] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [results, setResults] = useState([]);
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const studentId = auth.getCurrentUserId();
    if (studentId) {
      try {
        setLoading(true);
        const studentInfo = await studentData.getStudentById(studentId);
        setChild(studentInfo);
        const attendanceData = await studentData.getAttendance(studentId);
        setAttendance(attendanceData || []);
        const resultsData = await studentData.getResults(studentId);
        setResults(resultsData || []);
      } catch (error) {
        alert('Error loading data: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login');
  };

  const getAttendanceStats = () => {
    if (!attendance || attendance.length === 0) return { total: 0, present: 0, absent: 0, percentage: 0 };
    
    // Filter attendance for current month only
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthAttendance = attendance.filter(a => {
      const recordDate = new Date(a.date);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const present = currentMonthAttendance.filter(a => a.status === 'present').length;
    const absent = currentMonthAttendance.filter(a => a.status === 'absent').length;
    const total = currentMonthAttendance.length;
    const percentage = total ? ((present / total) * 100).toFixed(1) : 0;
    return { total, present, absent, percentage };
  };

  const getGradeClass = (marks) => {
    if (marks >= 90) return 'excellent';
    if (marks >= 75) return 'good';
    if (marks >= 60) return 'average';
    return 'poor';
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  const navItems = [
    { key: 'profile', icon: '👶', label: 'Child Profile' },
    { key: 'attendance', icon: '📊', label: 'Attendance' },
    { key: 'results', icon: '📝', label: 'Results' }
  ];

  if (loading || !child) {
    return <div className="loading-screen"><div className="loading-spinner"></div> Loading...</div>;
  }

  const stats = getAttendanceStats();

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">Student Portal</div>
          <span className="sidebar-brand-badge">Parent</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`sidebar-nav-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => { setActiveSection(item.key); loadData(); }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-avatar">{getInitials(child.name)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{child.name}</div>
            <div className="sidebar-user-role">Parent View</div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard-main">
        {/* Bug 4 fix — header */}
        <div className="dashboard-header">
          <h1 className="header-title">
            {activeSection === 'profile' ? '👶 Child Profile' : activeSection === 'attendance' ? '📊 Attendance' : '📋 Results'}
          </h1>
          <div className="header-meta">
            <span className="header-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <div className="header-avatar" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>P</div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Profile */}
          {activeSection === 'profile' && (
            <div className="profile-card">
              <div className="profile-banner"></div>
              <div className="profile-body">
                <div className="profile-avatar">{child.name?.[0]}</div>
                <h2 className="profile-name">{child.name}</h2>
                <span className="profile-badge">Student</span>
                <div className="profile-info-grid">
                  <div className="profile-info-item">
                    <span className="info-label">🎫 Roll Number</span>
                    <span className="info-value">{child.rollNo}</span>
                  </div>
                  <div className="profile-info-item">
                    <span className="info-label">🏫 Branch</span>
                    <span className="info-value">{child.branch}</span>
                  </div>
                  <div className="profile-info-item">
                    <span className="info-label">📚 Year</span>
                    <span className="info-value">{child.standard}</span>
                  </div>
                  <div className="profile-info-item">
                    <span className="info-label">📞 Phone</span>
                    <span className="info-value">{child.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance */}
          {activeSection === 'attendance' && (
            <div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📈</div>
                  <h3>{stats.percentage}%</h3>
                  <p>Attendance Rate</p>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">✅</div>
                  <h3>{stats.present}</h3>
                  <p>Present Lectures</p>
                </div>
                <div className="stat-card danger">
                  <div className="stat-icon">❌</div>
                  <h3>{stats.absent}</h3>
                  <p>Absent Lectures</p>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">📅</div>
                  <h3>{stats.total}</h3>
                  <p>Total Lectures ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</p>
                </div>
              </div>

              <h3 className="section-subtitle">Lectures Details ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</h3>
              {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const currentMonthAttendance = attendance.filter(a => {
                  const recordDate = new Date(a.date);
                  return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
                });
                return currentMonthAttendance.length === 0 ? (
                  <div className="empty-state">
                    <p>No lecture records found for this month.</p>
                  </div>
                ) : (
                  <div className="table-card">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Subject</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentMonthAttendance.map((record, idx) => (
                          <tr key={idx}>
                            <td>{new Date(record.date).toLocaleDateString()}</td>
                            <td>{record.time || 'N/A'}</td>
                            <td>{record.subject || 'N/A'}</td>
                            <td>
                              <span className={`status-badge ${record.status === 'present' ? 'badge-present' : 'badge-absent'}`}>
                                {record.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Results */}
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

export default ParentDashboard;
