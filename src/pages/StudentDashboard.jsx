import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';
import { studentData } from '../utils/studentData';

const StudentDashboard = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [student, setStudent] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [results, setResults] = useState([]);
  
  const navigate = useNavigate();
  const currentStudentId = auth.getCurrentStudentId();

  // Load student data on component mount
  useEffect(() => {
    if (currentStudentId) {
      loadStudentData();
    }
  }, [currentStudentId]);

  // Load all student data
  const loadStudentData = () => {
    const studentInfo = studentData.getStudentById(currentStudentId);
    setStudent(studentInfo);
    
    if (studentInfo) {
      calculateAttendanceStats();
      loadResults();
    }
  };

  // Calculate attendance statistics
  const calculateAttendanceStats = () => {
    const attendance = studentData.getAttendance(currentStudentId);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    let present = 0, absent = 0, total = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
      if (attendance[dateKey]) {
        total++;
        if (attendance[dateKey] === 'present') present++;
        else absent++;
      }
    }
    
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    setAttendanceStats({ present, absent, total, percentage });
  };

  // Load student results
  const loadResults = () => {
    const studentResults = studentData.getResults(currentStudentId);
    setResults(studentResults);
  };

  // Handle logout
  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  // Handle section change
  const showSection = (section) => {
    setActiveSection(section);
  };

  // Get grade class for result
  const getGradeClass = (marks) => {
    if (marks >= 90) return 'excellent';
    if (marks >= 75) return 'good';
    if (marks >= 60) return 'average';
    return 'poor';
  };

  if (!student) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="header" style={{background: '#667eea'}}>
        <h1>Student Dashboard</h1>
        <button 
          onClick={handleLogout} 
          style={{padding: '10px 20px', background: 'white', color: '#667eea', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
        >
          Logout
        </button>
      </div>
      
      <div className="nav">
        <button 
          onClick={() => showSection('profile')} 
          className={activeSection === 'profile' ? 'active' : ''}
          style={{background: '#667eea'}}
        >
          Profile
        </button>
        <button 
          onClick={() => showSection('attendance')} 
          className={activeSection === 'attendance' ? 'active' : ''}
          style={{background: '#667eea'}}
        >
          Attendance
        </button>
        <button 
          onClick={() => showSection('results')} 
          className={activeSection === 'results' ? 'active' : ''}
          style={{background: '#667eea'}}
        >
          Results
        </button>
      </div>

      <div className="content">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div>
            <h2>My Profile</h2>
            <div className="info-card">
              <h3>{student.name}</h3>
              <p><strong>Roll Number:</strong> {student.rollNo}</p>
              <p><strong>Branch:</strong> {student.branch}</p>
              <p><strong>Standard:</strong> {student.standard}</p>
              <p><strong>Phone:</strong> {student.phone}</p>
            </div>
          </div>
        )}

        {/* Attendance Section */}
        {activeSection === 'attendance' && (
          <div>
            <h2>My Attendance</h2>
            <div className="attendance-summary">
              <div className="stat-card">
                <h3>{attendanceStats.percentage}%</h3>
                <p>Attendance Rate</p>
              </div>
              <div className="stat-card">
                <h3>{attendanceStats.present}</h3>
                <p>Present Days</p>
              </div>
              <div className="stat-card">
                <h3>{attendanceStats.absent}</h3>
                <p>Absent Days</p>
              </div>
              <div className="stat-card">
                <h3>{attendanceStats.total}</h3>
                <p>Total Days</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {activeSection === 'results' && (
          <div>
            <h2>My Results</h2>
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
                  <div key={index} className="result-item">
                    <div>
                      <h4>{result.subject}</h4>
                      <small>Date: {result.date}</small>
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

export default StudentDashboard;