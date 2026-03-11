import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';
import { studentData } from '../utils/studentData';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('students');
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [attendanceCalendar, setAttendanceCalendar] = useState([]);
  const [results, setResults] = useState([]);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState([]);

  const [studentForm, setStudentForm] = useState({
    name: '', rollNo: '', branch: '', standard: '', phone: ''
  });
  const [facultyForm, setFacultyForm] = useState({
    name: '', username: '', subject: '', email: ''
  });
  const [resultForm, setResultForm] = useState({ subject: '', marks: '' });

  const navigate = useNavigate();

  useEffect(() => {
    // Verify user is authenticated before loading data
    const user = sessionStorage.getItem('user');
    
    if (!user) {
      navigate('/login');
      return;
    }

    loadStudents();
    loadFaculties();
  }, [navigate]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await studentData.getStudents();
      setStudents(data);
    } catch (error) {
      alert('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  const loadFaculties = async () => {
    try {
      setLoading(true);
      const data = await studentData.getFaculties?.() || [];
      setFaculties(data);
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login');
  };

  const addGeneratedCredential = (entry) => {
    setGeneratedCredentials((prev) => [
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toLocaleString()
      },
      ...prev
    ]);
  };

  const copyCredential = async (entry) => {
    const text = [
      `Type: ${entry.type}`,
      `Name: ${entry.name}`,
      `Username: ${entry.username}`,
      `Password: ${entry.password}`,
      entry.parentUsername ? `Parent Username: ${entry.parentUsername}` : null,
      entry.parentPassword ? `Parent Password: ${entry.parentPassword}` : null
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      alert('Credentials copied to clipboard');
    } catch (error) {
      alert('Could not copy credentials automatically. Please copy manually.');
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.rollNo || !studentForm.branch || !studentForm.standard || !studentForm.phone) {
      alert('All fields are required');
      return;
    }
    if (!/^\d{10}$/.test(studentForm.phone)) {
      alert('Phone number must be exactly 10 digits');
      return;
    }
    try {
      setLoading(true);
      const newStudent = await studentData.addStudent(studentForm);
      addGeneratedCredential({
        type: 'Student',
        name: newStudent.name,
        username: newStudent.username,
        password: newStudent._oneTimePassword || '(not returned)',
        parentUsername: newStudent.parentUsername,
        parentPassword: newStudent._oneTimeParentPassword || '(not returned)'
      });
      alert(`Student added!\n\nStudent Login:\nUsername: ${newStudent.username}\nPassword: ${newStudent._oneTimePassword || '(shown once — save it now)'}\n\nParent Login:\nUsername: ${newStudent.parentUsername}\nPassword: ${newStudent._oneTimeParentPassword || '(shown once — save it now)'}\n\n⚠️ These passwords are shown only once. Please save them now.`);
      setStudentForm({ name: '', rollNo: '', branch: '', standard: '', phone: '' });
      await loadStudents();
    } catch (error) {
      alert('Error adding student: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        setLoading(true);
        await studentData.deleteStudent(studentId);
        await loadStudents();
      } catch (error) {
        alert('Error deleting student: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetStudentPassword = async (studentId, studentName, target) => {
    const label = target === 'student' ? 'Student' : 'Parent';
    if (!window.confirm(`Reset ${label} password for ${studentName}?`)) return;
    try {
      setLoading(true);
      const result = await studentData.resetStudentPassword(studentId, target);
      addGeneratedCredential({
        type: `${label} (Reset)`,
        name: studentName,
        username: result.username,
        password: result.newPassword
      });
      alert(`${label} password reset!\n\nUsername: ${result.username}\nNew Password: ${result.newPassword}\n\n⚠️ This password is shown only once. Save it now.`);
    } catch (error) {
      alert('Error resetting password: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const resetFacultyPassword = async (facultyId, facultyName) => {
    if (!window.confirm(`Reset password for faculty ${facultyName}?`)) return;
    try {
      setLoading(true);
      const result = await studentData.resetFacultyPassword(facultyId);
      addGeneratedCredential({
        type: 'Faculty (Reset)',
        name: facultyName,
        username: result.username,
        password: result.newPassword
      });
      alert(`Faculty password reset!\n\nUsername: ${result.username}\nNew Password: ${result.newPassword}\n\n⚠️ This password is shown only once. Save it now.`);
    } catch (error) {
      alert('Error resetting password: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const addFaculty = async (e) => {
    e.preventDefault();
    if (!facultyForm.name || !facultyForm.username || !facultyForm.subject || !facultyForm.email) {
      alert('All fields are required');
      return;
    }
    try {
      setLoading(true);
      const newFaculty = await studentData.addFaculty(facultyForm);
      addGeneratedCredential({
        type: 'Faculty',
        name: newFaculty.name,
        username: newFaculty.username,
        password: newFaculty._oneTimePassword || '(not returned)'
      });
      const msg = newFaculty._oneTimePassword
        ? `Faculty added!\n\nUsername: ${newFaculty.username}\nPassword: ${newFaculty._oneTimePassword}\n\nThis password is shown only once. Please save it now.`
        : 'Faculty added successfully!';
      setFacultyForm({ name: '', username: '', subject: '', email: '' });
      await loadFaculties();
      alert(msg);
    } catch (error) {
      alert('Error adding faculty: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteFaculty = async (facultyId) => {
    if (window.confirm('Are you sure? This will delete the faculty from database.')) {
      try {
        setLoading(true);
        await studentData.deleteFaculty(facultyId);
        await loadFaculties();
        alert('Faculty deleted from database!');
      } catch (error) {
        alert('Error deleting faculty: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const getAttendanceStats = (attendance) => {
    if (!attendance || attendance.length === 0) return { total: 0, present: 0, percentage: 0 };
    const present = attendance.filter(a => a.status === 'present').length;
    const total = attendance.length;
    return { total, present, percentage: total ? ((present / total) * 100).toFixed(1) : 0 };
  };

  const showSection = (section) => {
    setActiveSection(section);
    if (section === 'attendance' || section === 'results') {
      setSelectedStudent('');
      setAttendanceCalendar([]);
      setResults([]);
    }
    if (section === 'students') {
      loadStudents();
    }
  };

  const handleStudentSelect = (studentId, section) => {
    setSelectedStudent(studentId);
    if (section === 'attendance') {
      loadAttendanceForStudent(studentId);
    } else if (section === 'results') {
      loadResultsForStudent(studentId);
    }
  };

  const loadAttendanceForStudent = async (studentId) => {
    if (!studentId) return;
    try {
      setLoading(true);
      const attendance = await studentData.getAttendance(studentId);
      setAttendanceCalendar(attendance || []);
    } catch (error) {
      alert('Error loading attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadResultsForStudent = async (studentId) => {
    if (!studentId) return;
    try {
      setLoading(true);
      const data = await studentData.getResults(studentId);
      setResults(data || []);
    } catch (error) {
      alert('Error loading results: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <div className="header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="btn" id='log'>Logout</button>
      </div>

      <div className="nav" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => showSection('students')} className={activeSection === 'students' ? 'active' : ''}>Students</button>
        <button onClick={() => showSection('faculty')} className={activeSection === 'faculty' ? 'active' : ''}>Faculty</button>
        <button onClick={() => showSection('attendance')} className={activeSection === 'attendance' ? 'active' : ''}>Attendance</button>
        <button onClick={() => showSection('results')} className={activeSection === 'results' ? 'active' : ''}>Results</button>
      </div>

      <div className="content">
        {generatedCredentials.length > 0 && (
          <div className="info-card" style={{ marginBottom: '20px' }}>
            <h3>Recently Generated Credentials</h3>
            <p style={{ marginTop: 0, color: '#666' }}>Visible only in this session. Save them before refreshing the page.</p>
            {generatedCredentials.map((cred) => (
              <div key={cred.id} className="student-card" style={{ marginBottom: '10px' }}>
                <p><strong>{cred.type}</strong> | {cred.name}</p>
                <p><strong>Username:</strong> {cred.username}</p>
                <p><strong>Password:</strong> {cred.password}</p>
                {cred.parentUsername && <p><strong>Parent Username:</strong> {cred.parentUsername}</p>}
                {cred.parentPassword && <p><strong>Parent Password:</strong> {cred.parentPassword}</p>}
                <p><strong>Generated:</strong> {cred.createdAt}</p>
                <button
                  onClick={() => copyCredential(cred)}
                  style={{ background: '#2196f3', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer', marginTop: '5px' }}
                >
                  Copy Credentials
                </button>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'students' && (
          <div>
            <h2>Student Management</h2>
            <div className="form-group">
              <h3>Add New Student</h3>
              <form onSubmit={addStudent}>
                <input type="text" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} placeholder="Student Name " required />
                <input type="text" value={studentForm.rollNo} onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })} placeholder="Roll Number " required />
                <select value={studentForm.branch} onChange={(e) => setStudentForm({ ...studentForm, branch: e.target.value })} required>
                  <option value="">Select Branch</option>
                  <option value="DS">DS</option>
                  <option value="AIML">AIML</option>
                  <option value="IT">IT</option>
                  <option value="COMPS">COMPS</option>
                </select>
                <select value={studentForm.standard} onChange={(e) => setStudentForm({ ...studentForm, standard: e.target.value })} required>
                  <option value="">Select Standard</option>
                  <option value="FE">FE</option>
                  <option value="SE">SE</option>
                  <option value="TE">TE</option>
                  <option value="BE">BE</option>
                </select>
                <input type="tel" value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="Phone Number (10 digits) " pattern="[0-9]{10}" maxLength="10" required />
                <button type="submit" className="btn">Add Student</button>
              </form>
            </div>
            <div>
              <h3>All Students</h3>
              <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}>
                  <option value="">All Branches</option>
                  <option value="DS">DS</option>
                  <option value="AIML">AIML</option>
                  <option value="IT">IT</option>
                  <option value="COMPS">COMPS</option>
                </select>
                <select value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}>
                  <option value="">All Standards</option>
                  <option value="FE">FE</option>
                  <option value="SE">SE</option>
                  <option value="TE">TE</option>
                  <option value="BE">BE</option>
                </select>
              </div>

              {(() => {
                const filtered = students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard));
                if (filtered.length === 0) return (
                  <div style={{ padding: '20px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ddd', color: '#666', marginTop: '20px' }}>
                    <h3>⚠️ No Students Found</h3>
                    <p>Try changing the filters or add new students.</p>
                  </div>
                );
                return filtered.map(student => (
                  <div key={student._id || student.id} className="student-card">
                    <h4>{student.name} ({student.rollNo})</h4>
                    <p>Branch: {student.branch} | Standard: {student.standard} | Phone: {student.phone}</p>
                    <p><strong>Username:</strong> {student.username || 'N/A'}</p>
                    <p><strong>Parent Username:</strong> {student.parentUsername || 'N/A'}</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      <button onClick={() => resetStudentPassword(student._id || student.id, student.name, 'student')} style={{ background: '#2196f3', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Reset Student Password</button>
                      <button onClick={() => resetStudentPassword(student._id || student.id, student.name, 'parent')} style={{ background: '#ff9800', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Reset Parent Password</button>
                      <button onClick={() => deleteStudent(student._id || student.id)} style={{ background: '#f44336', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                ));
              })()}
            </div>

          </div>
        )}

        {activeSection === 'faculty' && (
          <div>
            <h2>Faculty Management</h2>
            <div className="form-group">
              <h3>Add New Faculty</h3>
              <form onSubmit={addFaculty}>
                <input type="text" value={facultyForm.name} onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })} placeholder="Faculty Name" required />
                <input type="text" value={facultyForm.username} onChange={(e) => setFacultyForm({ ...facultyForm, username: e.target.value })} placeholder="Username" required />
                <input type="text" value={facultyForm.subject} onChange={(e) => setFacultyForm({ ...facultyForm, subject: e.target.value })} placeholder="Subject" required />
                <input type="email" value={facultyForm.email} onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })} placeholder="Email" required />
                <button type="submit" className="btn">Add Faculty</button>
              </form>
            </div>
            <div>
              {faculties.map(faculty => (
                <div key={faculty._id || faculty.id} className="student-card">
                  <h4>{faculty.name}</h4>
                  <p>Subject: {faculty.subject} | Email: {faculty.email}</p>
                  <p><strong>Username:</strong> {faculty.username || 'N/A'}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <button onClick={() => resetFacultyPassword(faculty._id || faculty.id, faculty.name)} style={{ background: '#2196f3', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Reset Password</button>
                    <button onClick={() => deleteFaculty(faculty._id || faculty.id)} style={{ background: '#f44336', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'attendance' && (
          <div>
            <h2>View Student Attendance</h2>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
              <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}>
                <option value="">All Branches</option>
                <option value="DS">DS</option>
                <option value="AIML">AIML</option>
                <option value="IT">IT</option>
                <option value="COMPS">COMPS</option>
              </select>
              <select value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}>
                <option value="">All Standards</option>
                <option value="FE">FE</option>
                <option value="SE">SE</option>
                <option value="TE">TE</option>
                <option value="BE">BE</option>
              </select>
            </div>
            <select value={selectedStudent} onChange={(e) => handleStudentSelect(e.target.value, 'attendance')} className="premium-dropdown">
              <option value="">-- Select Student for Attendance --</option>
              {students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard)).map(student => (
                <option key={student._id || student.id} value={student._id || student.id}>{student.name} ({student.rollNo})</option>
              ))}
            </select>
            {(() => {
              const filteredCount = students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard)).length;
              if (filteredCount === 0) return (
                <div style={{ padding: '15px', textAlign: 'center', background: '#f5f5f5', borderRadius: '5px', color: '#666', marginTop: '10px' }}>
                  ⚠️ No students found. Please adjust filters.
                </div>
              );
              return null;
            })()}
            {selectedStudent && (
              <div>
                <div className="info-card">
                  <h3>Attendance Statistics</h3>
                  {(() => {
                    const stats = getAttendanceStats(attendanceCalendar);
                    return (
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
                          <h3>{stats.total - stats.present}</h3>
                          <p>Absent Days</p>
                        </div>
                        <div className="stat-card">
                          <h3>{stats.total}</h3>
                          <p>Total Days</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <h3>Attendance Records</h3>
                <div className="info-card">
                  {attendanceCalendar.length > 0 ? (
                    <div>
                      {attendanceCalendar.map((record, idx) => (
                        <div key={idx} className="student-card">
                          <p><strong>Date:</strong> {new Date(record.date).toLocaleDateString()}</p>
                          <p><strong>Status:</strong> {record.status}</p>
                          {record.subject && <p><strong>Subject:</strong> {record.subject}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No attendance records found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'results' && (
          <div>
            <h2>View Student Results</h2>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
              <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}>
                <option value="">All Branches</option>
                <option value="DS">DS</option>
                <option value="AIML">AIML</option>
                <option value="IT">IT</option>
                <option value="COMPS">COMPS</option>
              </select>
              <select value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}>
                <option value="">All Standards</option>
                <option value="FE">FE</option>
                <option value="SE">SE</option>
                <option value="TE">TE</option>
                <option value="BE">BE</option>
              </select>
            </div>
            <select value={selectedStudent} onChange={(e) => handleStudentSelect(e.target.value, 'results')} className="premium-dropdown">
              <option value="">-- Select Student for Results --</option>
              {students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard)).map(student => (
                <option key={student._id || student.id} value={student._id || student.id}>{student.name} ({student.rollNo})</option>
              ))}
            </select>
            {selectedStudent && results.length > 0 && (
              <div>
                <div className="info-card">
                  <h3>Overall Performance</h3>
                  <p><strong>Average Score:</strong> {Math.round(results.reduce((sum, r) => sum + r.marks, 0) / results.length)}/100</p>
                  <p><strong>Total Subjects:</strong> {results.length}</p>
                </div>
                {results.map((result, index) => (
                  <div key={result._id || result.id || index} className="student-card">
                    <strong>{result.subject}</strong>: {result.marks}/100 ({new Date(result.createdAt).toLocaleDateString()})
                    {(result.pdfFilename || result.fileName) && (
                      <div>
                        <a href={result.pdfFile || result.fileData} download={result.pdfFilename || result.fileName} style={{ color: '#764ba2', textDecoration: 'none' }}>📄 {result.pdfFilename || result.fileName}</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedStudent && results.length === 0 && (
              <div className="info-card">
                <p>No results available for this student.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div >
  );
};

export default AdminDashboard;
