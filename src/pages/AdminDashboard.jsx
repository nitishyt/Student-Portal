import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';
import { studentData } from '../utils/studentData';
import AttendanceDownload from '../components/AttendanceDownload';

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

  const [studentForm, setStudentForm] = useState({ name: '', rollNo: '', branch: '', standard: '', phone: '' });
  const [facultyForm, setFacultyForm] = useState({ name: '', username: '', subject: '', email: '' });

  const navigate = useNavigate();

  useEffect(() => {
    const user = sessionStorage.getItem('user');
    if (!user) { navigate('/login'); return; }
    loadStudents();
    loadFaculties();
  }, [navigate]);

  const loadStudents = async () => {
    try { setLoading(true); const data = await studentData.getStudents(); setStudents(data); }
    catch (error) { alert('Error loading students'); }
    finally { setLoading(false); }
  };

  const loadFaculties = async () => {
    try { setLoading(true); const data = await studentData.getFaculties?.() || []; setFaculties(data); }
    catch (error) { /* silently fail */ }
    finally { setLoading(false); }
  };

  const handleLogout = async () => { await auth.logout(); navigate('/login'); };

  const addGeneratedCredential = (entry) => {
    setGeneratedCredentials((prev) => [{ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toLocaleString() }, ...prev]);
  };

  const copyCredential = async (entry) => {
    const text = [`Type: ${entry.type}`, `Name: ${entry.name}`, `Username: ${entry.username}`, `Password: ${entry.password}`,
      entry.parentUsername ? `Parent Username: ${entry.parentUsername}` : null,
      entry.parentPassword ? `Parent Password: ${entry.parentPassword}` : null
    ].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(text); alert('Credentials copied to clipboard'); }
    catch (error) { alert('Could not copy. Please copy manually.'); }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.rollNo || !studentForm.branch || !studentForm.standard || !studentForm.phone) { alert('All fields are required'); return; }
    if (!/^\d{10}$/.test(studentForm.phone)) { alert('Phone number must be exactly 10 digits'); return; }
    try {
      setLoading(true);
      const newStudent = await studentData.addStudent(studentForm);
      addGeneratedCredential({ type: 'Student', name: newStudent.name, username: newStudent.username, password: newStudent._oneTimePassword || '(not returned)', parentUsername: newStudent.parentUsername, parentPassword: newStudent._oneTimeParentPassword || '(not returned)' });
      alert(`Student added!\n\nStudent Login:\nUsername: ${newStudent.username}\nPassword: ${newStudent._oneTimePassword || '(shown once)'}\n\nParent Login:\nUsername: ${newStudent.parentUsername}\nPassword: ${newStudent._oneTimeParentPassword || '(shown once)'}\n\n⚠️ Save these passwords now.`);
      setStudentForm({ name: '', rollNo: '', branch: '', standard: '', phone: '' });
      await loadStudents();
    } catch (error) { alert('Error adding student: ' + error.message); }
    finally { setLoading(false); }
  };

  const deleteStudent = async (studentId) => {
    if (window.confirm('Delete this student?')) {
      try { setLoading(true); await studentData.deleteStudent(studentId); await loadStudents(); }
      catch (error) { alert('Error deleting student: ' + error.message); }
      finally { setLoading(false); }
    }
  };

  const resetStudentPassword = async (studentId, studentName, target) => {
    const label = target === 'student' ? 'Student' : 'Parent';
    if (!window.confirm(`Reset ${label} password for ${studentName}?`)) return;
    try {
      setLoading(true);
      const result = await studentData.resetStudentPassword(studentId, target);
      addGeneratedCredential({ type: `${label} (Reset)`, name: studentName, username: result.username, password: result.newPassword });
      alert(`${label} password reset!\n\nUsername: ${result.username}\nNew Password: ${result.newPassword}\n\n⚠️ Save it now.`);
    } catch (error) { alert('Error: ' + (error.response?.data?.error || error.message)); }
    finally { setLoading(false); }
  };

  const resetFacultyPassword = async (facultyId, facultyName) => {
    if (!window.confirm(`Reset password for ${facultyName}?`)) return;
    try {
      setLoading(true);
      const result = await studentData.resetFacultyPassword(facultyId);
      addGeneratedCredential({ type: 'Faculty (Reset)', name: facultyName, username: result.username, password: result.newPassword });
      alert(`Password reset!\n\nUsername: ${result.username}\nNew Password: ${result.newPassword}\n\n⚠️ Save it now.`);
    } catch (error) { alert('Error: ' + (error.response?.data?.error || error.message)); }
    finally { setLoading(false); }
  };

  const addFaculty = async (e) => {
    e.preventDefault();
    if (!facultyForm.name || !facultyForm.username || !facultyForm.subject || !facultyForm.email) { alert('All fields are required'); return; }
    try {
      setLoading(true);
      const newFaculty = await studentData.addFaculty(facultyForm);
      addGeneratedCredential({ type: 'Faculty', name: newFaculty.name, username: newFaculty.username, password: newFaculty._oneTimePassword || '(not returned)' });
      const msg = newFaculty._oneTimePassword
        ? `Faculty added!\n\nUsername: ${newFaculty.username}\nPassword: ${newFaculty._oneTimePassword}\n\nSave this password now.`
        : 'Faculty added successfully!';
      setFacultyForm({ name: '', username: '', subject: '', email: '' });
      await loadFaculties();
      alert(msg);
    } catch (error) { alert('Error adding faculty: ' + error.message); }
    finally { setLoading(false); }
  };

  const deleteFaculty = async (facultyId) => {
    if (window.confirm('Delete this faculty?')) {
      try { setLoading(true); await studentData.deleteFaculty(facultyId); await loadFaculties(); alert('Faculty deleted!'); }
      catch (error) { alert('Error: ' + error.message); }
      finally { setLoading(false); }
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
    if (section === 'attendance' || section === 'results') { setSelectedStudent(''); setAttendanceCalendar([]); setResults([]); }
    if (section === 'students') loadStudents();
  };

  const handleStudentSelect = (studentId, section) => {
    setSelectedStudent(studentId);
    if (section === 'attendance') loadAttendanceForStudent(studentId);
    else if (section === 'results') loadResultsForStudent(studentId);
  };

  const loadAttendanceForStudent = async (studentId) => {
    if (!studentId) return;
    try { setLoading(true); const attendance = await studentData.getAttendance(studentId); setAttendanceCalendar(attendance || []); }
    catch (error) { alert('Error loading attendance: ' + error.message); }
    finally { setLoading(false); }
  };

  const loadResultsForStudent = async (studentId) => {
    if (!studentId) return;
    try { setLoading(true); const data = await studentData.getResults(studentId); setResults(data || []); }
    catch (error) { alert('Error loading results: ' + error.message); }
    finally { setLoading(false); }
  };

  const navItems = [
    { key: 'students', icon: '👥', label: 'Students' },
    { key: 'faculty', icon: '🎓', label: 'Faculty' },
    { key: 'attendance', icon: '📊', label: 'Attendance' },
    { key: 'downloadAttendance', icon: '📥', label: 'Download Attendance' },
    { key: 'results', icon: '📝', label: 'Results' }
  ];

  if (loading && students.length === 0) return <div className="loading-screen"><div className="loading-spinner"></div> Loading...</div>;

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">Student Portal</div>
          <span className="sidebar-brand-badge">Admin</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button key={item.key} className={`sidebar-nav-item ${activeSection === item.key ? 'active' : ''}`} onClick={() => showSection(item.key)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-avatar">A</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Admin</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard-main">
        {/* Bug 4 fix — header */}
        <div className="dashboard-header">
          <h1 className="header-title">
            {activeSection === 'students' ? '👥 Student Management' : activeSection === 'faculty' ? '🎓 Faculty Management' : activeSection === 'attendance' ? '📊 View Attendance' : activeSection === 'downloadAttendance' ? '📥 Download Attendance' : '📋 View Results'}
          </h1>
          <div className="header-meta">
            <span className="header-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <div className="header-avatar">A</div>
          </div>
        </div>

        <div className="dashboard-content">

          {/* Credentials Banner */}
          {generatedCredentials.length > 0 && (
            <div className="credentials-banner">
              <h3>🔑 Recently Generated Credentials</h3>
              <p className="credentials-note">Visible only in this session. Save them before refreshing.</p>
              {generatedCredentials.map((cred) => (
                <div key={cred.id} className="credential-item">
                  <p><strong>{cred.type}</strong> | {cred.name}</p>
                  <p><strong>Username:</strong> {cred.username}</p>
                  <p><strong>Password:</strong> {cred.password}</p>
                  {cred.parentUsername && <p><strong>Parent Username:</strong> {cred.parentUsername}</p>}
                  {cred.parentPassword && <p><strong>Parent Password:</strong> {cred.parentPassword}</p>}
                  <p className="text-muted text-sm"><strong>Generated:</strong> {cred.createdAt}</p>
                  <button onClick={() => copyCredential(cred)} className="btn btn-info btn-sm mt-4">Copy</button>
                </div>
              ))}
            </div>
          )}

          {/* ─── STUDENTS SECTION ──────────────────── */}
          {activeSection === 'students' && (
            <div>
              {/* Bug 1 fix */}
              <h2 className="section-title">👥 Add New Student</h2>

              {/* Bug 2 fix */}
              <div className="form-card">
                <form onSubmit={addStudent}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Student Name</label>
                      <input className="form-input" type="text" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} placeholder="Enter full name" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Roll Number</label>
                      <input className="form-input" type="number" value={studentForm.rollNo} onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })} placeholder="Enter roll number" required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Branch</label>
                      <select className="form-select" value={studentForm.branch} onChange={(e) => setStudentForm({ ...studentForm, branch: e.target.value })} required>
                        <option value="">Select Branch</option>
                        <option value="DS">DS</option>
                        <option value="AIML">AIML</option>
                        <option value="IT">IT</option>
                        <option value="COMPS">COMPS</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Year</label>
                      <select className="form-select" value={studentForm.standard} onChange={(e) => setStudentForm({ ...studentForm, standard: e.target.value })} required>
                        <option value="">Select Year</option>
                        <option value="FE">FE</option>
                        <option value="SE">SE</option>
                        <option value="TE">TE</option>
                        <option value="BE">BE</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" type="tel" value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10 digit phone number" pattern="[0-9]{10}" maxLength="10" required />
                  </div>
                  <button type="submit" className="btn btn-primary">➕ Add Student</button>
                </form>
              </div>

              <h2 className="section-title" style={{ marginTop: '32px' }}>📋 All Students</h2>

              {/* Bug 3 fix — horizontal filter bar */}
              <div className="filter-bar">
                <div className="filter-group">
                  <label className="filter-label">Branch</label>
                  <select className="form-select" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                    <option value="">All Branches</option>
                    <option value="DS">DS</option>
                    <option value="AIML">AIML</option>
                    <option value="IT">IT</option>
                    <option value="COMPS">COMPS</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Year</label>
                  <select className="form-select" value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)}>
                    <option value="">All Years</option>
                    <option value="FE">FE</option>
                    <option value="SE">SE</option>
                    <option value="TE">TE</option>
                    <option value="BE">BE</option>
                  </select>
                </div>
                <button className="btn-reset" onClick={() => { setFilterBranch(''); setFilterStandard(''); }}>↺ Reset</button>
              </div>

              {(() => {
                const filtered = students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard));
                if (filtered.length === 0) return <div className="empty-state"><h3>⚠️ No Students Found</h3><p>Try changing the filters or add new students.</p></div>;
                return (
                  <div className="student-grid">
                    {filtered.map(student => (
                      <div key={student._id || student.id} className="student-card">
                        <h4>{student.name} ({student.rollNo})</h4>
                        <p>Branch: {student.branch} | Year: {student.standard} | Phone: {student.phone}</p>
                        <p><strong>Username:</strong> {student.username || 'N/A'}</p>
                        <p><strong>Parent Username:</strong> {student.parentUsername || 'N/A'}</p>
                        <div className="btn-group">
                          <button onClick={() => resetStudentPassword(student._id || student.id, student.name, 'student')} className="btn btn-info btn-sm">Reset Student PW</button>
                          <button onClick={() => resetStudentPassword(student._id || student.id, student.name, 'parent')} className="btn btn-warning btn-sm">Reset Parent PW</button>
                          <button onClick={() => deleteStudent(student._id || student.id)} className="btn btn-danger btn-sm">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ─── FACULTY SECTION ───────────────────── */}
          {activeSection === 'faculty' && (
            <div>
              <h2 className="section-title">🎓 Add New Faculty</h2>

              <div className="form-card">
                <form onSubmit={addFaculty}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Faculty Name</label>
                      <input className="form-input" type="text" value={facultyForm.name} onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })} placeholder="Enter full name" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Username</label>
                      <input className="form-input" type="text" value={facultyForm.username} onChange={(e) => setFacultyForm({ ...facultyForm, username: e.target.value })} placeholder="Enter username" required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Subject</label>
                      <input className="form-input" type="text" value={facultyForm.subject} onChange={(e) => setFacultyForm({ ...facultyForm, subject: e.target.value })} placeholder="Enter subject" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-input" type="email" value={facultyForm.email} onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })} placeholder="Enter email" required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">➕ Add Faculty</button>
                </form>
              </div>

              <h2 className="section-title" style={{ marginTop: '32px' }}>📋 All Faculty</h2>
              <div className="student-grid">
                {faculties.map(faculty => (
                  <div key={faculty._id || faculty.id} className="student-card">
                    <h4>{faculty.name}</h4>
                    <p>Subject: {faculty.subject} | Email: {faculty.email}</p>
                    <p><strong>Username:</strong> {faculty.username || 'N/A'}</p>
                    <div className="btn-group">
                      <button onClick={() => resetFacultyPassword(faculty._id || faculty.id, faculty.name)} className="btn btn-info btn-sm">Reset Password</button>
                      <button onClick={() => deleteFaculty(faculty._id || faculty.id)} className="btn btn-danger btn-sm">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── ATTENDANCE SECTION ────────────────── */}
          {activeSection === 'attendance' && (
            <div>
              <h2 className="section-title">📊 View Student Attendance</h2>

              <div className="filter-bar">
                <div className="filter-group">
                  <label className="filter-label">Branch</label>
                  <select className="form-select" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                    <option value="">All Branches</option>
                    <option value="DS">DS</option>
                    <option value="AIML">AIML</option>
                    <option value="IT">IT</option>
                    <option value="COMPS">COMPS</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Year</label>
                  <select className="form-select" value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)}>
                    <option value="">All Years</option>
                    <option value="FE">FE</option>
                    <option value="SE">SE</option>
                    <option value="TE">TE</option>
                    <option value="BE">BE</option>
                  </select>
                </div>
                <button className="btn-reset" onClick={() => { setFilterBranch(''); setFilterStandard(''); setSelectedStudent(''); setAttendanceCalendar([]); }}>↺ Reset</button>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Select Student</label>
                <select className="form-select" value={selectedStudent} onChange={(e) => handleStudentSelect(e.target.value, 'attendance')}>
                  <option value="">-- Select Student for Attendance --</option>
                  {students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard)).map(student => (
                    <option key={student._id || student.id} value={student._id || student.id}>{student.name} ({student.rollNo})</option>
                  ))}
                </select>
              </div>

              {selectedStudent && (
                <div>
                  <div className="stats-grid">
                    {(() => {
                      const stats = getAttendanceStats(attendanceCalendar);
                      return (<>
                        <div className="stat-card">
                          <div className="stat-icon">📈</div>
                          <h3>{stats.percentage}%</h3>
                          <p>Attendance Rate</p>
                        </div>
                        <div className="stat-card success">
                          <div className="stat-icon">✅</div>
                          <h3>{stats.present}</h3>
                          <p>Present Days</p>
                        </div>
                        <div className="stat-card danger">
                          <div className="stat-icon">❌</div>
                          <h3>{stats.total - stats.present}</h3>
                          <p>Absent Days</p>
                        </div>
                        <div className="stat-card warning">
                          <div className="stat-icon">📅</div>
                          <h3>{stats.total}</h3>
                          <p>Total Days</p>
                        </div>
                      </>);
                    })()}
                  </div>

                  <h3 className="section-subtitle">Attendance Records</h3>
                  {attendanceCalendar.length > 0 ? (
                    <div className="table-card">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Subject</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceCalendar.map((record, idx) => (
                            <tr key={idx}>
                              <td>{new Date(record.date).toLocaleDateString()}</td>
                              <td>
                                <span className={`status-badge ${record.status === 'present' ? 'badge-present' : 'badge-absent'}`}>
                                  {record.status.toUpperCase()}
                                </span>
                              </td>
                              <td>{record.subject || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state"><p>No attendance records found.</p></div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── DOWNLOAD ATTENDANCE SECTION ────────── */}
          {activeSection === 'downloadAttendance' && (
            <AttendanceDownload />
          )}

          {/* ─── RESULTS SECTION ───────────────────── */}
          {activeSection === 'results' && (
            <div>
              <h2 className="section-title">📋 View Student Results</h2>

              <div className="filter-bar">
                <div className="filter-group">
                  <label className="filter-label">Branch</label>
                  <select className="form-select" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                    <option value="">All Branches</option>
                    <option value="DS">DS</option>
                    <option value="AIML">AIML</option>
                    <option value="IT">IT</option>
                    <option value="COMPS">COMPS</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Standard</label>
                  <select className="form-select" value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)}>
                    <option value="">All Standards</option>
                    <option value="FE">FE</option>
                    <option value="SE">SE</option>
                    <option value="TE">TE</option>
                    <option value="BE">BE</option>
                  </select>
                </div>
                <button className="btn-reset" onClick={() => { setFilterBranch(''); setFilterStandard(''); setSelectedStudent(''); setResults([]); }}>↺ Reset</button>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Select Student</label>
                <select className="form-select" value={selectedStudent} onChange={(e) => handleStudentSelect(e.target.value, 'results')}>
                  <option value="">-- Select Student for Results --</option>
                  {students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard)).map(student => (
                    <option key={student._id || student.id} value={student._id || student.id}>{student.name} ({student.rollNo})</option>
                  ))}
                </select>
              </div>

              {selectedStudent && results.length > 0 && (
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
                            <div><a href={result.pdfFile || result.fileData} download={result.pdfFilename || result.fileName} className="result-pdf-link">📄 {result.pdfFilename || result.fileName}</a></div>
                          )}
                        </div>
                        <div className={`result-score ${result.marks >= 90 ? 'excellent' : result.marks >= 75 ? 'good' : result.marks >= 60 ? 'average' : 'poor'}`}>
                          {result.marks}
                          <span className="score-max">/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedStudent && results.length === 0 && (
                <div className="empty-state"><p>No results available for this student.</p></div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
