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
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const total = attendance.length;
    const percentage = total ? ((present / total) * 100).toFixed(1) : 0;
    return { total, present, absent, percentage };
  };

  const getGradeClass = (marks) => {
    if (marks >= 90) return 'excellent';
    if (marks >= 75) return 'good';
    if (marks >= 60) return 'average';
    return 'poor';
  };

  if (loading || !child) {
    return (
      <div>
        <div className="header" style={{ background: '#667eea' }}>
          <h1>Parent Dashboard</h1>
          <button onClick={handleLogout} style={{ padding: '10px 20px', background: 'white', color: '#667eea', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
        </div>
        <div className="content">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();

  return (
    <div>
      <div className="header" style={{ background: '#667eea' }}>
        <h1>Parent Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: 'white', color: '#667eea', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      <div className="nav">
        <button onClick={() => { setActiveSection('profile'); loadData(); }} className={activeSection === 'profile' ? 'active' : ''} style={{ background: '#667eea' }}>Child Profile</button>
        <button onClick={() => { setActiveSection('attendance'); loadData(); }} className={activeSection === 'attendance' ? 'active' : ''} style={{ background: '#667eea' }}>Attendance</button>
        <button onClick={() => { setActiveSection('results'); loadData(); }} className={activeSection === 'results' ? 'active' : ''} style={{ background: '#667eea' }}>Results</button>
      </div>

      <div className="content">
        {activeSection === 'profile' && (
          <div>
            <h2>Child Information</h2>
            <div className="info-card">
              <h3>{child.name}</h3>
              <p><strong>Roll Number:</strong> {child.rollNo}</p>
              <p><strong>Branch:</strong> {child.branch}</p>
              <p><strong>Standard:</strong> {child.standard}</p>
              <p><strong>Phone:</strong> {child.phone}</p>
            </div>
          </div>
        )}

        {activeSection === 'attendance' && (
          <div>
            <h2>Attendance Statistics</h2>
            <div className="attendance-summary">
              <div className="stat-card">
                <h3>{stats.percentage}%</h3>
                <p>Attendance Rate</p>
              </div>
              <div className="stat-card">
                <h3>{stats.present}</h3>
                <p>Present Days</p>
              </div>
              <div className="stat-card">
                <h3>{stats.absent}</h3>
                <p>Absent Days</p>
              </div>
              <div className="stat-card">
                <h3>{stats.total}</h3>
                <p>Total Days</p>
              </div>
            </div>

            <h3>Attendance Details</h3>
            {attendance.length === 0 ? (
              <div className="info-card">
                <p>No attendance records found.</p>
              </div>
            ) : (
              <div className="info-card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Time</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{new Date(record.date).toLocaleDateString()}</td>
                        <td style={{ padding: '10px' }}>{record.time || 'N/A'}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '5px 10px',
                            borderRadius: '5px',
                            background: record.status === 'present' ? '#4CAF50' : '#f44336',
                            color: 'white',
                            fontSize: '12px'
                          }}>
                            {record.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>{record.subject || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'results' && (
          <div>
            <h2>Academic Results</h2>
            {results.length === 0 ? (
              <div className="info-card">
                <p>No results available yet.</p>
              </div>
            ) : (
              <div>
                <div className="info-card">
                  <h3>Overall Performance</h3>
                  <p><strong>Average Score:</strong> {Math.round(results.reduce((sum, r) => sum + r.marks, 0) / results.length)}/100</p>
                  <p><strong>Total Subjects:</strong> {results.length}</p>
                </div>

                {results.map((result, index) => (
                  <div key={result._id || result.id || index} className="result-item">
                    <div>
                      <h4>{result.subject}</h4>
                      <small>Date: {new Date(result.createdAt).toLocaleDateString()}</small>
                      {(result.pdfFilename || result.fileName) && (
                        <div>
                          <a href={result.pdfFile || result.fileData} download={result.pdfFilename || result.fileName} style={{ color: '#667eea', textDecoration: 'none' }}>📄 {result.pdfFilename || result.fileName}</a>
                        </div>
                      )}
                    </div>
                    <div className={`grade ${getGradeClass(result.marks)}`}>
                      {result.marks}/100
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
