import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/auth';
import { studentData } from '../utils/studentData';

const FacultyDashboard = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeSection, setActiveSection] = useState('students');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [attendanceTime, setAttendanceTime] = useState('');
  const [attendanceSubject, setAttendanceSubject] = useState(JSON.parse(sessionStorage.getItem('user') || '{}').subject || '');
  const [subject, setSubject] = useState(JSON.parse(sessionStorage.getItem('user') || '{}').subject || '');
  const [marks, setMarks] = useState('');
  const facultySubject = JSON.parse(sessionStorage.getItem('user') || '{}').subject;
  const [refresh, setRefresh] = useState(0);
  const [results, setResults] = useState([]);
  const [statsCache, setStatsCache] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [bulkAttendance, setBulkAttendance] = useState({});
  const [studentForm, setStudentForm] = useState({
    name: '', rollNo: '', branch: '', standard: '', phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [classAttendanceData, setClassAttendanceData] = useState({});

  const navigate = useNavigate();

  useEffect(() => { loadStudents(); }, [refresh]);

  useEffect(() => {
    if (students.length > 0) fetchAllStats();
  }, [students, currentMonth, currentYear]);

  const fetchClassAttendance = async () => {
    if (!filterStandard || !filterBranch || !selectedMonthDate) return;
    try {
      const filtered = students.filter(s => s.branch === filterBranch && s.standard === filterStandard);
      const attendanceMap = {};
      for (const student of filtered) {
        const studentId = student._id || student.id;
        const attendance = await studentData.getAttendance(studentId);
        const dayAttendance = attendance.find(r => r.date === selectedMonthDate && (!facultySubject || r.subject === facultySubject));
        attendanceMap[studentId] = dayAttendance || null;
      }
      setClassAttendanceData(attendanceMap);
    } catch (e) { setClassAttendanceData({}); }
  };

  useEffect(() => { fetchClassAttendance(); }, [filterStandard, filterBranch, selectedMonthDate, students]);

  const fetchAllStats = async () => {
    const cache = {};
    for (const student of students) {
      const id = student._id || student.id;
      if (id) { const stats = await calculateStatsForStudent(id); cache[id] = stats; }
    }
    setStatsCache(cache);
  };

  const calculateStatsForStudent = async (studentId) => {
    try {
      const attendance = await studentData.getAttendance(studentId);
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      let workingDays = 0, present = 0;
      const attendanceMap = {};
      attendance.forEach(record => {
        if (facultySubject && record.subject !== facultySubject) return;
        if (!attendanceMap[record.date]) attendanceMap[record.date] = [];
        attendanceMap[record.date].push(record);
      });
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (date.getDay() !== 0 && attendanceMap[dateKey] && attendanceMap[dateKey].length > 0) {
          workingDays++;
          if (attendanceMap[dateKey].filter(r => r.status === 'present').length > 0) present++;
        }
      }
      return { total: workingDays, present, percentage: workingDays ? ((present / workingDays) * 100).toFixed(1) : 0 };
    } catch (e) { return { total: 0, present: 0, percentage: 0 }; }
  };

  const loadStudents = async () => {
    try { setLoading(true); const data = await studentData.getStudents(); setStudents(data); }
    catch (error) { alert('Error loading students: ' + error.message); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => { await auth.logout(); navigate('/login'); };

  const addStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.rollNo || !studentForm.branch || !studentForm.standard || !studentForm.phone) { alert('All fields are required'); return; }
    if (!/^\d{10}$/.test(studentForm.phone)) { alert('Phone number must be exactly 10 digits'); return; }
    try {
      setLoading(true);
      const newStudent = await studentData.addStudent(studentForm);
      alert(`Student added!\n\nStudent Login:\nUsername: ${newStudent.username}\nPassword: ${newStudent._oneTimePassword || '(shown once)'}\n\nParent Login:\nUsername: ${newStudent.parentUsername}\nPassword: ${newStudent._oneTimeParentPassword || '(shown once)'}\n\n⚠️ Save these passwords now.`);
      setStudentForm({ name: '', rollNo: '', branch: '', standard: '', phone: '' });
      await loadStudents();
    } catch (error) { alert('Error adding student: ' + error.message); }
    finally { setLoading(false); }
  };

  const deleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try { setLoading(true); await studentData.deleteStudent(studentId); await loadStudents(); }
      catch (error) { alert('Error deleting student: ' + error.message); }
      finally { setLoading(false); }
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (selectedStudent && attendanceTime && attendanceSubject) {
      const date = new Date(attendanceDate);
      if (date.getDay() === 0) { alert('Cannot mark attendance on Sunday (Holiday)'); return; }
      await studentData.setAttendance(selectedStudent._id || selectedStudent.id, attendanceDate, attendanceStatus, attendanceTime, attendanceSubject);
      setRefresh(prev => prev + 1);
      setAttendanceTime('');
      if (!facultySubject) setAttendanceSubject('');
      alert('Attendance marked successfully!');
    }
  };

  const loadResultsForStudent = async (studentId) => {
    if (!studentId) { setResults([]); return; }
    try { const data = await studentData.getResults(studentId); setResults(data || []); }
    catch (error) { setResults([]); }
  };

  const handleAddResult = async (e) => {
    e.preventDefault();
    if (selectedStudent && subject && marks !== '') {
      const studentId = selectedStudent._id || selectedStudent.id;
      const fileInput = e.target.querySelector('input[type="file"]');
      const file = fileInput?.files[0];
      try {
        if (file) {
          if (file.type !== 'application/pdf') { alert('Please upload only PDF files'); return; }
          if (file.size > 500 * 1024) { alert('File size must be less than 500KB'); return; }
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              await studentData.addResult(studentId, { subject, marks: parseInt(marks), pdfFilename: file.name, pdfFile: event.target.result });
              if (!facultySubject) setSubject('');
              setMarks('');
              if (fileInput) fileInput.value = '';
              await loadResultsForStudent(studentId);
              alert('Result added successfully!');
            } catch (err) { alert('Failed to add result: ' + (err.response?.data?.error || err.message)); }
          };
          reader.readAsDataURL(file);
        } else {
          await studentData.addResult(studentId, { subject, marks: parseInt(marks) });
          if (!facultySubject) setSubject('');
          setMarks('');
          await loadResultsForStudent(studentId);
          alert('Result added successfully!');
        }
      } catch (err) { alert('Failed to add result: ' + (err.response?.data?.error || err.message)); }
    }
  };

  const getGradeClass = (marks) => {
    if (marks >= 90) return 'excellent';
    if (marks >= 75) return 'good';
    if (marks >= 60) return 'average';
    return 'poor';
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'F';
  const userName = JSON.parse(sessionStorage.getItem('user') || '{}').name || 'Faculty';

  const navItems = [
    { key: 'students', icon: '👥', label: 'Manage Students' },
    { key: 'attendance', icon: '✅', label: 'Mark Attendance' },
    { key: 'viewAttendance', icon: '📋', label: 'View Attendance' },
    { key: 'results', icon: '📝', label: 'Manage Results' }
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">Student Portal</div>
          <span className="sidebar-brand-badge">Faculty</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button key={item.key} className={`sidebar-nav-item ${activeSection === item.key ? 'active' : ''}`} onClick={() => setActiveSection(item.key)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-avatar">{getInitials(userName)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-user-role">{facultySubject || 'Faculty'}</div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard-main">
        {/* Bug 4 fix — header */}
        <div className="dashboard-header">
          <h1 className="header-title">
            {activeSection === 'students' ? '👥 Student Management' : activeSection === 'attendance' ? '📋 Mark Attendance' : activeSection === 'viewAttendance' ? '📊 Attendance Report' : '📤 Upload Results'}
          </h1>
          <div className="header-meta">
            <span className="header-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <div className="header-avatar" style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>F</div>
          </div>
        </div>

        <div className="dashboard-content">

          {/* ─── STUDENTS SECTION ──────────────────── */}
          {activeSection === 'students' && (
            <div>
              {/* Bug 1 fix — full-width section title */}
              <h2 className="section-title">👥 Add New Student</h2>

              {/* Bug 2 fix — form-card container */}
              <div className="form-card">
                <form onSubmit={addStudent}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Student Name</label>
                      <input className="form-input" type="text" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} placeholder="Enter full name" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Roll Number</label>
                      <input className="form-input" type="text" value={studentForm.rollNo} onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })} placeholder="Enter roll number" required />
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
                    {filtered.map(student => {
                      const stats = statsCache[student._id || student.id] || { total: 0, present: 0, percentage: 0 };
                      return (
                        <div key={student._id || student.id} className="student-card">
                          <h4>{student.name} ({student.rollNo})</h4>
                          <p>Branch: {student.branch} | Year: {student.standard}</p>
                          <p>Phone: {student.phone}</p>
                          <p><strong>Attendance:</strong> {stats.percentage}% ({stats.present}/{stats.total})</p>
                          <div className="btn-group">
                            <button onClick={() => deleteStudent(student._id || student.id)} className="btn btn-danger btn-sm">Delete</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}


          {/* ─── MARK ATTENDANCE SECTION ────────────── */}
          {activeSection === 'attendance' && (
            <div>
              <h2 className="section-title">📋 Mark Student Attendance</h2>

              {/* Bug 3 fix — horizontal filter bar */}
              <div className="filter-bar">
                <div className="filter-group">
                  <label className="filter-label">Branch</label>
                  <select className="form-select" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                    <option value="">Select Branch</option>
                    <option value="DS">DS</option>
                    <option value="AIML">AIML</option>
                    <option value="IT">IT</option>
                    <option value="COMPS">COMPS</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Year</label>
                  <select className="form-select" value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)}>
                    <option value="">Select Year</option>
                    <option value="FE">FE</option>
                    <option value="SE">SE</option>
                    <option value="TE">TE</option>
                    <option value="BE">BE</option>
                  </select>
                </div>
              </div>

              {filterBranch && filterStandard && (
                <div className="class-indicator">
                  <strong>Selected Class: {filterBranch} - {filterStandard}</strong> ({students.filter(s => s.branch === filterBranch && s.standard === filterStandard).length} students)
                </div>
              )}

              {filterBranch && filterStandard && students.filter(s => s.branch === filterBranch && s.standard === filterStandard).length === 0 && (
                <div className="class-indicator-warning">
                  ⚠️ No students found in this class. Cannot mark attendance.
                </div>
              )}

              {/* Bulk Attendance Form */}
              {filterBranch && filterStandard && students.filter(s => s.branch === filterBranch && s.standard === filterStandard).length > 0 && (
                <div className="form-card" style={{ maxWidth: '100%', marginTop: '24px' }}>
                  <h3 className="section-subtitle">Lecture Details</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input className="form-input" type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Time</label>
                      <input className="form-input" type="time" value={attendanceTime} onChange={(e) => setAttendanceTime(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input className="form-input" type="text" value={attendanceSubject} onChange={(e) => setAttendanceSubject(e.target.value)} placeholder="Subject/Lecture" required disabled={!!facultySubject} />
                  </div>

                  <h3 className="section-subtitle">Mark Attendance for Class</h3>
                  <div className="table-card">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Roll No</th>
                          <th>Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.filter(s => s.branch === filterBranch && s.standard === filterStandard).map(student => (
                          <tr key={student._id || student.id}>
                            <td>{student.rollNo}</td>
                            <td>{student.name}</td>
                            <td>
                              <div className="inline-radio-group">
                                <label className="inline-radio-label">
                                  <input type="radio" name={`status-${student._id || student.id}`} value="present"
                                    checked={(bulkAttendance[student._id || student.id] || 'present') === 'present'}
                                    onChange={(e) => setBulkAttendance({ ...bulkAttendance, [student._id || student.id]: e.target.value })} />
                                  <span className="present-text">Present</span>
                                </label>
                                <label className="inline-radio-label">
                                  <input type="radio" name={`status-${student._id || student.id}`} value="absent"
                                    checked={(bulkAttendance[student._id || student.id] || 'present') === 'absent'}
                                    onChange={(e) => setBulkAttendance({ ...bulkAttendance, [student._id || student.id]: e.target.value })} />
                                  <span className="absent-text">Absent</span>
                                </label>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="btn-group mt-4">
                    <button className="btn btn-success btn-sm" onClick={() => {
                      const classStudents = students.filter(s => s.branch === filterBranch && s.standard === filterStandard);
                      const newBulk = {}; classStudents.forEach(s => newBulk[s._id || s.id] = 'present'); setBulkAttendance(newBulk);
                    }}>Mark All Present</button>
                    <button className="btn btn-danger btn-sm" onClick={() => {
                      const classStudents = students.filter(s => s.branch === filterBranch && s.standard === filterStandard);
                      const newBulk = {}; classStudents.forEach(s => newBulk[s._id || s.id] = 'absent'); setBulkAttendance(newBulk);
                    }}>Mark All Absent</button>
                    <button className="btn btn-primary" onClick={async () => {
                      if (!attendanceDate || !attendanceTime || !attendanceSubject) { alert('Please fill in date, time, and subject'); return; }
                      const date = new Date(attendanceDate);
                      if (date.getDay() === 0) { alert('Cannot mark attendance on Sunday (Holiday)'); return; }
                      const classStudents = students.filter(s => s.branch === filterBranch && s.standard === filterStandard);
                      await Promise.all(classStudents.map(student => {
                        const status = bulkAttendance[student._id || student.id] || 'present';
                        return studentData.setAttendance(student._id || student.id, attendanceDate, status, attendanceTime, attendanceSubject);
                      }));
                      setBulkAttendance({}); setAttendanceTime('');
                      if (!facultySubject) setAttendanceSubject('');
                      setRefresh(prev => prev + 1);
                      alert(`Attendance marked for ${classStudents.length} students!`);
                    }}>Submit Attendance</button>
                  </div>
                </div>
              )}

              {/* Individual Student */}
              {(!filterBranch || !filterStandard) && (
                <div>
                  <h3 className="section-subtitle">Individual Attendance</h3>
                  <div className="form-card">
                    <div className="form-group">
                      <label className="form-label">Select Student</label>
                      <select className="form-select" onChange={(e) => setSelectedStudent(students.find(s => (s._id || s.id) == e.target.value))} value={selectedStudent?._id || selectedStudent?.id || ''}>
                        <option value="">-- Choose student from list --</option>
                        {students.map(student => (
                          <option key={student._id || student.id} value={student._id || student.id}>{student.rollNo} - {student.name}</option>
                        ))}
                      </select>
                    </div>

                    {selectedStudent && (
                      <form onSubmit={handleMarkAttendance}>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Date</label>
                            <input className="form-input" type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Time</label>
                            <input className="form-input" type="time" value={attendanceTime} onChange={(e) => setAttendanceTime(e.target.value)} required />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Subject</label>
                          <input className="form-input" type="text" value={attendanceSubject} onChange={(e) => setAttendanceSubject(e.target.value)} placeholder="Subject" required disabled={!!facultySubject} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Status</label>
                          <div className="radio-group">
                            <label className="radio-label present-label">
                              <input type="radio" name="attendance-status" value="present" checked={attendanceStatus === 'present'} onChange={(e) => setAttendanceStatus(e.target.value)} />
                              Present
                            </label>
                            <label className="radio-label absent-label">
                              <input type="radio" name="attendance-status" value="absent" checked={attendanceStatus === 'absent'} onChange={(e) => setAttendanceStatus(e.target.value)} />
                              Absent
                            </label>
                          </div>
                        </div>
                        <button type="submit" className="btn btn-primary">Mark Attendance</button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ─── VIEW ATTENDANCE SECTION ────────────── */}
          {activeSection === 'viewAttendance' && (
            <div>
              <h2 className="section-title">📊 Class Attendance Report</h2>

              <div className="filter-bar">
                <div className="filter-group">
                  <label className="filter-label">Year</label>
                  <select className="form-select" value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)}>
                    <option value="">Select Year</option>
                    <option value="FE">FE</option>
                    <option value="SE">SE</option>
                    <option value="TE">TE</option>
                    <option value="BE">BE</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Branch</label>
                  <select className="form-select" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                    <option value="">Select Branch</option>
                    <option value="DS">DS</option>
                    <option value="AIML">AIML</option>
                    <option value="IT">IT</option>
                    <option value="COMPS">COMPS</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Date</label>
                  <input className="form-input" type="date" value={selectedMonthDate} onChange={(e) => setSelectedMonthDate(e.target.value)} style={{ width: '180px' }} />
                </div>
                <button className="btn-filter" onClick={fetchClassAttendance}>🔍 Search</button>
                <button className="btn-reset" onClick={() => { setFilterStandard(''); setFilterBranch(''); setSelectedMonthDate(new Date().toISOString().split('T')[0]); }}>↺ Reset</button>
              </div>

              {filterStandard && filterBranch && selectedMonthDate ? (
                <div>
                  <h3 className="section-subtitle">
                    📋 {filterStandard} - {filterBranch} | {new Date(selectedMonthDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>

                  {(() => {
                    const filtered = students.filter(s => s.branch === filterBranch && s.standard === filterStandard);
                    if (filtered.length === 0) return <div className="empty-state"><p>No students found for this standard and branch.</p></div>;
                    return (
                      <div className="table-card">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Roll No</th>
                              <th>Student Name</th>
                              <th>Status</th>
                              <th>Time</th>
                              <th>Subject</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((student) => {
                              const studentId = student._id || student.id;
                              const attendanceRec = classAttendanceData[studentId];
                              return (
                                <tr key={studentId}>
                                  <td>{student.rollNo}</td>
                                  <td><strong>{student.name}</strong></td>
                                  <td>
                                    {attendanceRec ? (
                                      <span className={`status-badge ${attendanceRec.status === 'present' ? 'badge-present' : 'badge-absent'}`}>
                                        {attendanceRec.status.toUpperCase()}
                                      </span>
                                    ) : (
                                      <span className="badge-not-marked">Not Marked</span>
                                    )}
                                  </td>
                                  <td>{attendanceRec?.time || '-'}</td>
                                  <td>{attendanceRec?.subject || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="prompt-select">
                  <p>👆 Select Year, Branch, and Date to view attendance</p>
                </div>
              )}
            </div>
          )}


          {/* ─── RESULTS SECTION ────────────────────── */}
          {activeSection === 'results' && (
            <div>
              <h2 className="section-title">📤 Upload Student Results</h2>

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
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Select Student</label>
                <select className="form-select" onChange={(e) => {
                  const student = students.find(s => (s._id || s.id) == e.target.value);
                  setSelectedStudent(student);
                  if (student) loadResultsForStudent(student._id || student.id);
                  else setResults([]);
                }} value={selectedStudent?._id || selectedStudent?.id || ''}>
                  <option value="">-- Select Student for Results --</option>
                  {students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard)).map(student => (
                    <option key={student._id || student.id} value={student._id || student.id}>{student.rollNo} - {student.name}</option>
                  ))}
                </select>
              </div>

              {selectedStudent && (
                <div className="form-card">
                  <h3 className="section-subtitle">Add Result for {selectedStudent.name}</h3>
                  <form onSubmit={handleAddResult}>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Subject</label>
                        <input className="form-input" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject name" required disabled={!!facultySubject} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Marks (out of 100)</label>
                        <input className="form-input" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="0 - 100" min="0" max="100" required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Upload PDF (optional)</label>
                      <input className="form-input" type="file" accept=".pdf" />
                    </div>
                    <button type="submit" className="btn btn-primary">📤 Upload Result</button>
                  </form>
                </div>
              )}

              {selectedStudent && (
                <div className="mt-8">
                  <h3 className="section-subtitle">Upload History</h3>
                  {results.length === 0 ? (
                    <div className="empty-state"><p>No results have been uploaded yet for this student.</p></div>
                  ) : (
                    <div className="results-list">
                      {results.filter(r => !facultySubject || r.subject === facultySubject).map((result, index) => (
                        <div key={result._id || result.id || index} className="result-card">
                          <div className="result-card-info">
                            <h4>{result.subject}</h4>
                            <span className="result-date">📅 {new Date(result.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {(result.pdfFilename || result.fileName) && (
                              <div><a href={result.pdfFile || result.fileData} download={result.pdfFilename || result.fileName} className="result-pdf-link">📄 {result.pdfFilename || result.fileName}</a></div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className={`result-score ${getGradeClass(result.marks)}`}>
                              {result.marks}
                              <span className="score-max">/100</span>
                            </div>
                            <button onClick={async () => {
                              if (window.confirm('Delete this result?')) {
                                await studentData.deleteResult(selectedStudent._id || selectedStudent.id, result._id || result.id);
                                await loadResultsForStudent(selectedStudent._id || selectedStudent.id);
                              }
                            }} className="btn btn-danger btn-sm">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
