import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';
import { studentData } from '../utils/studentData';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('students');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [attendanceCalendar, setAttendanceCalendar] = useState([]);
  const [results, setResults] = useState([]);
  
  // Form states
  const [studentForm, setStudentForm] = useState({
    name: '', rollNo: '', branch: '', standard: '', phone: ''
  });
  const [resultForm, setResultForm] = useState({ subject: '', marks: '' });

  const navigate = useNavigate();

  // Load students on component mount
  useEffect(() => {
    loadStudents();
  }, []);

  // Load students from localStorage
  const loadStudents = () => {
    setStudents(studentData.getStudents());
  };

  // Handle logout
  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  // Add new student
  const addStudent = (e) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!studentForm.name || !studentForm.rollNo || !studentForm.branch || !studentForm.standard || !studentForm.phone) {
      alert('All fields are required');
      return;
    }
    
    // Validate phone number (exactly 10 digits)
    if (!/^\d{10}$/.test(studentForm.phone)) {
      alert('Phone number must be exactly 10 digits');
      return;
    }

    const newStudent = studentData.addStudent(studentForm);
    alert(`Student added!\nUsername: ${newStudent.username}\nPassword: ${newStudent.password}`);
    
    setStudentForm({ name: '', rollNo: '', branch: '', standard: '', phone: '' });
    loadStudents();
  };

  // Delete student
  const deleteStudent = (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      studentData.deleteStudent(studentId);
      loadStudents();
    }
  };

  // Load attendance for selected student
  const loadAttendance = () => {
    if (!selectedStudent) return;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const attendance = studentData.getAttendance(selectedStudent);
    const calendar = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
      calendar.push({
        day,
        dateKey,
        status: attendance[dateKey] || ''
      });
    }
    
    setAttendanceCalendar(calendar);
  };

  // Toggle attendance
  const toggleAttendance = (dateKey, currentStatus) => {
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    studentData.setAttendance(selectedStudent, dateKey, newStatus);
    loadAttendance();
  };

  // Add result
  const addResult = (e) => {
    e.preventDefault();
    if (!selectedStudent || !resultForm.subject || !resultForm.marks) {
      alert('All fields required');
      return;
    }

    studentData.addResult(selectedStudent, resultForm.subject, resultForm.marks);
    setResultForm({ subject: '', marks: '' });
    loadResults();
  };

  // Load results for selected student
  const loadResults = () => {
    if (!selectedStudent) return;
    setResults(studentData.getResults(selectedStudent));
  };

  // Handle section change
  const showSection = (section) => {
    setActiveSection(section);
    if (section === 'attendance' || section === 'results') {
      setSelectedStudent('');
      setAttendanceCalendar([]);
      setResults([]);
    }
  };

  // Handle student selection for attendance/results
  const handleStudentSelect = (studentId, section) => {
    setSelectedStudent(studentId);
    if (section === 'attendance') {
      setTimeout(loadAttendance, 0);
    } else if (section === 'results') {
      setTimeout(loadResults, 0);
    }
  };

  return (
    <div>
      <div className="header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="btn" id='log'>Logout</button>
      </div>
      
      <div className="nav">
        <button 
          onClick={() => showSection('students')} 
          className={activeSection === 'students' ? 'active' : ''}
        >
          Students
        </button>
        <button 
          onClick={() => showSection('attendance')} 
          className={activeSection === 'attendance' ? 'active' : ''}
        >
          Attendance
        </button>
        <button 
          onClick={() => showSection('results')} 
          className={activeSection === 'results' ? 'active' : ''}
        >
          Results
        </button>
      </div>

      <div className="content">
        {/* Students Section */}
        {activeSection === 'students' && (
          <div>
            <h2>Student Management</h2>
            <div className="form-group">
              <h3>Add New Student</h3>
              <form onSubmit={addStudent}>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                  placeholder="Student Name "
                  required
                />
                <input
                  type="text"
                  value={studentForm.rollNo}
                  onChange={(e) => setStudentForm({...studentForm, rollNo: e.target.value})}
                  placeholder="Roll Number "
                  required
                />
                <input
                  type="text"
                  value={studentForm.branch}
                  onChange={(e) => setStudentForm({...studentForm, branch: e.target.value})}
                  placeholder="Branch "
                  required
                />
                <input
                  type="text"
                  value={studentForm.standard}
                  onChange={(e) => setStudentForm({...studentForm, standard: e.target.value})}
                  placeholder="Standard "
                  required
                />
                <input
                  type="tel"
                  value={studentForm.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setStudentForm({...studentForm, phone: value});
                  }}
                  placeholder="Phone Number (10 digits) "
                  pattern="[0-9]{10}"
                  maxLength="10"
                  required
                />
                <button type="submit" className="btn">Add Student</button>
              </form>
            </div>
            
            <div>
              {students.map(student => (
                <div key={student.id} className="student-card">
                  <h4>{student.name} ({student.rollNo})</h4>
                  <p>Branch: {student.branch} | Standard: {student.standard} | Phone: {student.phone}</p>
                  <p><strong>Login:</strong> Username: {student.username} | Password: {student.password}</p>
                  <button 
                    onClick={() => deleteStudent(student.id)}
                    style={{background: '#f44336', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer', marginTop: '10px'}}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Section */}
        {activeSection === 'attendance' && (
          <div>
            <h2>Attendance Management</h2>
            <select 
              value={selectedStudent} 
              onChange={(e) => handleStudentSelect(e.target.value, 'attendance')}
            >
              <option value="">Select Student</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.rollNo})
                </option>
              ))}
            </select>
            
            {attendanceCalendar.length > 0 && (
              <div>
                <h3>Current Month Attendance</h3>
                <div className="attendance-grid">
                  {attendanceCalendar.map(day => (
                    <div
                      key={day.day}
                      className={`day ${day.status}`}
                      onClick={() => toggleAttendance(day.dateKey, day.status)}
                    >
                      {day.day}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {activeSection === 'results' && (
          <div>
            <h2>Results Management</h2>
            <select 
              value={selectedStudent} 
              onChange={(e) => handleStudentSelect(e.target.value, 'results')}
            >
              <option value="">Select Student</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.rollNo})
                </option>
              ))}
            </select>
            
            {selectedStudent && (
              <form onSubmit={addResult}>
                <input
                  type="text"
                  value={resultForm.subject}
                  onChange={(e) => setResultForm({...resultForm, subject: e.target.value})}
                  placeholder="Subject"
                />
                <input
                  type="number"
                  value={resultForm.marks}
                  onChange={(e) => setResultForm({...resultForm, marks: e.target.value})}
                  placeholder="Marks"
                  max="100"
                />
                <button type="submit" className="btn">Add Result</button>
              </form>
            )}
            
            <div>
              {results.map((result, index) => (
                <div key={index} className="student-card">
                  <strong>{result.subject}</strong>: {result.marks}/100 ({result.date})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;