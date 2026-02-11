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
  const [attendanceSubject, setAttendanceSubject] = useState(JSON.parse(localStorage.getItem('user') || '{}').subject || '');
  const [subject, setSubject] = useState(JSON.parse(localStorage.getItem('user') || '{}').subject || '');
  const [marks, setMarks] = useState('');
  const facultySubject = JSON.parse(localStorage.getItem('user') || '{}').subject;
  const [refresh, setRefresh] = useState(0);
  const [results, setResults] = useState([]);
  const [statsCache, setStatsCache] = useState({});
  const [attendanceCalendar, setAttendanceCalendar] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
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
  const navigate = useNavigate();

  useEffect(() => {
    loadStudents();
  }, [refresh]);

  useEffect(() => {
    if (students.length > 0) {
      fetchAllStats();
    }
  }, [students, currentMonth, currentYear]);

  const fetchAllStats = async () => {
    const cache = {};
    for (const student of students) {
      const id = student._id || student.id;
      if (id) {
        const stats = await calculateStatsForStudent(id);
        cache[id] = stats;
      }
    }
    setStatsCache(cache);
  };

  const calculateStatsForStudent = async (studentId) => {
    try {
      const attendance = await studentData.getAttendance(studentId);
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      let workingDays = 0;
      let present = 0;

      // Convert flat array to efficient lookup for stats calculation
      // Actually we can just iterate the date logic
      // But we need to know valid working days

      const attendanceMap = {};
      attendance.forEach(record => {
        // Filter by subject if facultySubject exists
        if (facultySubject && record.subject !== facultySubject) return;

        if (!attendanceMap[record.date]) attendanceMap[record.date] = [];
        attendanceMap[record.date].push(record);
      });

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayOfWeek = date.getDay();
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (dayOfWeek !== 0) {
          // Check if there is ANY record for this day; if so, count as working day
          // Or strictly count past days? 
          // Existing logic checked if attendance[dateKey] exists.
          if (attendanceMap[dateKey] && attendanceMap[dateKey].length > 0) {
            workingDays++;
            const dayRecords = attendanceMap[dateKey];
            const presentCount = dayRecords.filter(r => r.status === 'present').length;
            if (presentCount > 0) present++;
          }
        }
      }
      return { total: workingDays, present, percentage: workingDays ? ((present / workingDays) * 100).toFixed(1) : 0 };
    } catch (e) {
      console.error(e);
      return { total: 0, present: 0, percentage: 0 };
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await studentData.getStudents();
      setStudents(data);
    } catch (error) {
      alert('Error loading students: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
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
      alert(`Student added!\n\nStudent Login:\nUsername: ${newStudent.username}\nPassword: ${newStudent.password}\n\nParent Login:\nUsername: ${newStudent.parentUsername}\nPassword: ${newStudent.parentPassword}`);
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

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (selectedStudent && attendanceTime && attendanceSubject) {
      const date = new Date(attendanceDate);
      if (date.getDay() === 0) {
        alert('Cannot mark attendance on Sunday (Holiday)');
        return;
      }
      await studentData.setAttendance(selectedStudent._id || selectedStudent.id, attendanceDate, attendanceStatus, attendanceTime, attendanceSubject);

      // Update specific student view immediately
      await loadAttendanceForStudent(selectedStudent._id || selectedStudent.id);

      // Trigger global refresh for grid stats
      setRefresh(prev => prev + 1);

      setAttendanceTime('');
      // Don't clear subject for faculty
      if (!facultySubject) setAttendanceSubject('');

      alert('Attendance marked successfully!');
    }
  };

  const loadResultsForStudent = async (studentId) => {
    if (!studentId) { setResults([]); return; }
    try {
      const data = await studentData.getResults(studentId);
      setResults(data || []);
    } catch (error) {
      console.error('Error loading results:', error);
      setResults([]);
    }
  };

  const handleAddResult = async (e) => {
    e.preventDefault();
    if (selectedStudent && subject && marks !== '') {
      const studentId = selectedStudent._id || selectedStudent.id;
      const fileInput = e.target.querySelector('input[type="file"]');
      const file = fileInput?.files[0];

      try {
        if (file) {
          if (file.type !== 'application/pdf') {
            alert('Please upload only PDF files');
            return;
          }
          if (file.size > 500 * 1024) {
            alert('File size must be less than 500KB');
            return;
          }
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              await studentData.addResult(studentId, {
                subject,
                marks: parseInt(marks),
                pdfFilename: file.name,
                pdfFile: event.target.result
              });
              if (!facultySubject) setSubject('');
              setMarks('');
              if (fileInput) fileInput.value = '';
              await loadResultsForStudent(studentId);
              alert('Result added successfully!');
            } catch (err) {
              console.error(err);
              alert('Failed to add result: ' + (err.response?.data?.error || err.message));
            }
          };
          reader.readAsDataURL(file);
        } else {
          await studentData.addResult(studentId, { subject, marks: parseInt(marks) });
          if (!facultySubject) setSubject('');
          setMarks('');
          await loadResultsForStudent(studentId);
          alert('Result added successfully!');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to add result: ' + (err.response?.data?.error || err.message));
      }
    }
  };



  const loadAttendanceForStudent = async (studentId) => {
    if (!studentId) return;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Fix: await the async call
    const flatAttendance = await studentData.getAttendance(studentId);

    // Fix: Group flat array by dateKey for O(1) access
    const attendance = {};
    if (Array.isArray(flatAttendance)) {
      flatAttendance.forEach(record => {
        // STRICT FILTER: Only show records for the faculty's subject
        if (facultySubject && record.subject !== facultySubject) return;

        if (!attendance[record.date]) attendance[record.date] = [];
        attendance[record.date].push(record);
      });
    }

    const calendar = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let status = '';
      const records = attendance[dateKey] || [];
      if (records.length > 0) {
        const presentCount = records.filter(r => r.status === 'present').length;
        status = presentCount > 0 ? 'present' : 'absent';
      }
      if (dayOfWeek === 0 && !status) status = 'holiday';
      calendar.push({ day, dateKey, status, isSunday: dayOfWeek === 0, records });
    }
    setAttendanceCalendar(calendar);
  };

  const getGradeClass = (marks) => {
    if (marks >= 90) return 'excellent';
    if (marks >= 75) return 'good';
    if (marks >= 60) return 'average';
    return 'poor';
  };

  return (
    <div>
      <div className="header" style={{ background: '#667eea' }}>
        <h1>Faculty Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: 'white', color: '#667eea', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      <div className="nav" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveSection('students')} className={activeSection === 'students' ? 'active' : ''} style={{ background: '#667eea' }}>Manage Students</button>
        <button onClick={() => setActiveSection('attendance')} className={activeSection === 'attendance' ? 'active' : ''} style={{ background: '#667eea' }}>Mark Attendance</button>
        <button onClick={() => setActiveSection('viewAttendance')} className={activeSection === 'viewAttendance' ? 'active' : ''} style={{ background: '#667eea' }}>View Attendance</button>
        <button onClick={() => setActiveSection('results')} className={activeSection === 'results' ? 'active' : ''} style={{ background: '#667eea' }}>Manage Results</button>
      </div>

      <div className="content">
        {activeSection === 'students' && (
          <div>
            <h2>Student Management</h2>
            <div className="form-group">
              <h3>Add New Student</h3>
              <form onSubmit={addStudent}>
                <input type="text" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} placeholder="Student Name" required />
                <input type="text" value={studentForm.rollNo} onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })} placeholder="Roll Number" required />
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
                <input type="tel" value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="Phone Number (10 digits)" pattern="[0-9]{10}" maxLength="10" required />
                <button type="submit" className="btn">Add Student</button>
              </form>
            </div>

            <h3>All Students</h3>
            {students.length === 0 ? (
              <p>No students found.</p>
            ) : (
              <div>
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
                  return (
                    <div className="student-grid">
                      {filtered.map(student => {
                        const stats = statsCache[student._id || student.id] || { total: 0, present: 0, percentage: 0 };
                        return (
                          <div key={student._id || student.id} className="student-card">
                            <h4>{student.name} ({student.rollNo})</h4>
                            <p>Branch: {student.branch} | Standard: {student.standard}</p>
                            <p>Phone: {student.phone}</p>
                            <p><strong>Attendance:</strong> {stats.percentage}% ({stats.present}/{stats.total})</p>
                            <p><strong>Student Login:</strong> {student.username} / {student.password}</p>
                            <p><strong>Parent Login:</strong> {student.parentUsername} / {student.parentPassword}</p>
                            <button onClick={() => deleteStudent(student._id || student.id)} style={{ background: '#f44336', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer', marginTop: '10px' }}>Delete</button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}


        {activeSection === 'attendance' && (
          <div>
            <h2>Mark Attendance</h2>

            {/* Quick Class Selection */}
            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0 }}>Quick Class Selection</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', flex: 1 }}>
                  <option value="">Select Branch</option>
                  <option value="DS">DS</option>
                  <option value="AIML">AIML</option>
                  <option value="IT">IT</option>
                  <option value="COMPS">COMPS</option>
                </select>
                <select value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', flex: 1 }}>
                  <option value="">Select Standard</option>
                  <option value="FE">FE</option>
                  <option value="SE">SE</option>
                  <option value="TE">TE</option>
                  <option value="BE">BE</option>
                </select>
              </div>
              {filterBranch && filterStandard && (
                <div style={{ background: '#667eea', color: 'white', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
                  <strong>Selected Class: {filterBranch} - {filterStandard}</strong> ({students.filter(s => s.branch === filterBranch && s.standard === filterStandard).length} students)
                </div>
              )}
              {filterBranch && filterStandard && students.filter(s => s.branch === filterBranch && s.standard === filterStandard).length === 0 && (
                <div style={{ padding: '15px', textAlign: 'center', background: '#ffebee', borderRadius: '5px', color: '#c62828', marginTop: '10px' }}>
                  ⚠️ No students found in this class. Cannot mark attendance.
                </div>
              )}
            </div>

            {/* Bulk Attendance Form */}
            {filterBranch && filterStandard && (
              <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                <h3>Lecture Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} required />
                  <input type="time" value={attendanceTime} onChange={(e) => setAttendanceTime(e.target.value)} placeholder="Lecture Time" style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} required />
                  <input type="text" value={attendanceSubject} onChange={(e) => setAttendanceSubject(e.target.value)} placeholder="Subject/Lecture" style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} required disabled={!!facultySubject} />
                </div>

                <h3>Mark Attendance for Class</h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#667eea', color: 'white' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Roll No</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.filter(s => s.branch === filterBranch && s.standard === filterStandard).map(student => (
                        <tr key={student._id || student.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>{student.rollNo}</td>
                          <td style={{ padding: '10px' }}>{student.name}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <select
                              value={bulkAttendance[student._id || student.id] || 'present'}
                              onChange={(e) => setBulkAttendance({ ...bulkAttendance, [student._id || student.id]: e.target.value })}
                              style={{ padding: '5px 10px', borderRadius: '5px', border: '1px solid #ddd', background: bulkAttendance[student._id || student.id] === 'absent' ? '#ffebee' : '#e8f5e9' }}
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      const classStudents = students.filter(s => s.branch === filterBranch && s.standard === filterStandard);
                      const newBulk = {};
                      classStudents.forEach(s => newBulk[s._id || s.id] = 'present');
                      setBulkAttendance(newBulk);
                    }}
                    style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Mark All Present
                  </button>
                  <button
                    onClick={() => {
                      const classStudents = students.filter(s => s.branch === filterBranch && s.standard === filterStandard);
                      const newBulk = {};
                      classStudents.forEach(s => newBulk[s._id || s.id] = 'absent');
                      setBulkAttendance(newBulk);
                    }}
                    style={{ padding: '10px 20px', background: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Mark All Absent
                  </button>
                  <button
                    onClick={async () => {
                      if (!attendanceDate || !attendanceTime || !attendanceSubject) {
                        alert('Please fill in date, time, and subject');
                        return;
                      }
                      const date = new Date(attendanceDate);
                      if (date.getDay() === 0) {
                        alert('Cannot mark attendance on Sunday (Holiday)');
                        return;
                      }
                      const classStudents = students.filter(s => s.branch === filterBranch && s.standard === filterStandard);

                      // Fix: Await all requests before reloading
                      await Promise.all(classStudents.map(student => {
                        const status = bulkAttendance[student._id || student.id] || 'present';
                        return studentData.setAttendance(student._id || student.id, attendanceDate, status, attendanceTime, attendanceSubject);
                      }));

                      setBulkAttendance({});
                      setAttendanceTime('');
                      if (!facultySubject) setAttendanceSubject('');
                      setRefresh(prev => prev + 1);
                      alert(`Attendance marked for ${classStudents.length} students!`);
                    }}
                    style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: 'auto' }}
                  >
                    Submit Attendance
                  </button>
                </div>
              </div>
            )}

            {/* Individual Student Selection (fallback) */}
            {!filterBranch || !filterStandard ? (
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ borderBottom: '2px solid #667eea', display: 'inline-block', paddingBottom: '5px' }}>Individual Attendance</h3>
                <div className="info-card" style={{ maxWidth: '600px', margin: '20px 0', borderTop: '4px solid #667eea' }}>
                  <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568', fontWeight: 'bold' }}>Select Student</label>
                    <select onChange={(e) => setSelectedStudent(students.find(s => (s._id || s.id) == e.target.value))} value={selectedStudent?._id || selectedStudent?.id || ''} className="premium-dropdown">
                      <option value="">-- Choose student from list --</option>
                      {students.map(student => (
                        <option key={student._id || student.id} value={student._id || student.id}>{student.rollNo} - {student.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedStudent && (
                    <form onSubmit={handleMarkAttendance} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#4a5568', fontSize: '0.9em' }}>Lecture Date</label>
                        <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#4a5568', fontSize: '0.9em' }}>Lecture Time</label>
                        <input type="time" value={attendanceTime} onChange={(e) => setAttendanceTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#4a5568', fontSize: '0.9em' }}>Subject</label>
                        <input type="text" value={attendanceSubject} onChange={(e) => setAttendanceSubject(e.target.value)} placeholder="Subject" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', background: !!facultySubject ? '#f7fafc' : '#fff' }} required disabled={!!facultySubject} />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#4a5568', fontSize: '0.9em' }}>Status</label>
                        <select value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', background: attendanceStatus === 'present' ? '#e8f5e9' : '#ffebee' }}>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </div>
                      <button type="submit" className="btn" style={{ gridColumn: 'span 2', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginTop: '10px' }}>Mark Attendance</button>
                    </form>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeSection === 'viewAttendance' && (
          <div>
            <h2>View Attendance Analysis</h2>
            <div className="faculty-form">
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

              {!selectedStudent ? (
                <>
                  {(() => {
                    const filtered = students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard));
                    if (filtered.length === 0) return (
                      <div style={{ padding: '20px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ddd', color: '#666', marginTop: '20px' }}>
                        <h3>⚠️ No Students Found</h3>
                        <p>Try changing the filters to see students.</p>
                      </div>
                    );
                    return (
                      <div className="student-selection-grid">
                        {filtered.map(student => (
                          <div
                            key={student._id || student.id}
                            onClick={() => {
                              setSelectedStudent(student);
                              loadAttendanceForStudent(student._id || student.id);
                            }}
                            className="student-card-interactive"
                          >
                            <h4>{student.name}</h4>
                            <p>Roll No: {student.rollNo}</p>
                            <p style={{ fontSize: '0.8em', color: '#a0aec0', marginTop: '5px' }}>{student.branch} - {student.standard}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={() => setSelectedStudent(null)} className="btn-back" style={{ margin: 0 }}>
                      ← Back to Student List
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: '600', color: '#4a5568' }}>Select Month:</span>
                      <input
                        type="date"
                        value={selectedMonthDate}
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          setSelectedMonthDate(e.target.value);
                          setCurrentMonth(date.getMonth());
                          setCurrentYear(date.getFullYear());
                          if (selectedStudent) loadAttendanceForStudent(selectedStudent._id || selectedStudent.id);
                        }}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0', outline: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div className="info-card">
                    <h3>Attendance Statistics for {selectedStudent.name} ({new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })})</h3>
                    {(() => {
                      const stats = statsCache[selectedStudent._id || selectedStudent.id] || { total: 0, present: 0, percentage: 0 };
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
                  <h3>Monthly Attendance Calendar (Click day for details)</h3>
                  <div className="info-card">
                    {attendanceCalendar.length > 0 ? (
                      <div className="attendance-grid">
                        {attendanceCalendar.map(day => (
                          <div key={day.day} className={`day ${day.status}`} style={{ cursor: day.records?.length > 0 ? 'pointer' : 'default' }} onClick={() => day.records?.length > 0 && setSelectedDay(day)}>{day.day}</div>
                        ))}
                      </div>
                    ) : (
                      <p>No attendance records found.</p>
                    )}
                  </div>
                  {selectedDay && selectedDay.records.length > 0 && (
                    <div className="info-card" style={{ marginTop: '20px' }}>
                      <h3>Lecture Details for {selectedDay.dateKey}</h3>
                      <button onClick={() => setSelectedDay(null)} style={{ marginBottom: '10px', padding: '5px 10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Close</button>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #ddd', background: '#f5f5f5' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Time</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Subject</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDay.records
                            .filter(record => !facultySubject || record.subject === facultySubject)
                            .map((record, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{record.time}</td>
                                <td style={{ padding: '10px' }}>{record.subject}</td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{ padding: '5px 10px', borderRadius: '5px', background: record.status === 'present' ? '#4CAF50' : '#f44336', color: 'white', fontSize: '12px' }}>
                                    {record.status.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'results' && (
          <div>
            <h2>Manage Results</h2>
            <div className="faculty-form">
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
              <select onChange={(e) => {
                const student = students.find(s => (s._id || s.id) == e.target.value);
                setSelectedStudent(student);
                if (student) loadResultsForStudent(student._id || student.id);
                else setResults([]);
              }} value={selectedStudent?._id || selectedStudent?.id || ''} className="premium-dropdown">
                <option value="">-- Select Student for Results --</option>
                {students.filter(s => (!filterBranch || s.branch === filterBranch) && (!filterStandard || s.standard === filterStandard)).map(student => (
                  <option key={student._id || student.id} value={student._id || student.id}>{student.rollNo} - {student.name}</option>
                ))}
              </select>

              {selectedStudent && (
                <div className="faculty-form" style={{ background: 'white', padding: '20px', borderRadius: '20px', maxWidth: '500px', margin: '20px auto' }}>
                  <h3 style={{ marginBottom: '15px' }}>Add Result for {selectedStudent.name}</h3>
                  <form onSubmit={handleAddResult}>
                    <div className="form-group">
                      <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required disabled={!!facultySubject} style={{ background: facultySubject ? '#f5f5f5' : '#fff' }} />
                    </div>
                    <div className="form-group">
                      <input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="Marks (0-100)" min="0" max="100" required />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '12px', color: '#666' }}>Upload PDF (Optional):</label>
                      <input type="file" accept=".pdf" style={{ marginTop: '5px' }} />
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Submit Result
                    </button>
                  </form>
                </div>
              )}
            </div>

            {selectedStudent && (
              <div className="results-list" style={{ marginTop: '30px' }}>
                <h3 style={{ borderBottom: '2px solid #667eea', display: 'inline-block', paddingBottom: '5px', marginBottom: '20px' }}>Upload History</h3>
                {results.length === 0 ? (
                  <div className="info-card" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                    <p>No results have been uploaded yet for this student.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {results
                      .filter(r => !facultySubject || r.subject === facultySubject)
                      .map((result, index) => (
                        <div key={result._id || result.id || index} className="result-item" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
                          <div style={{ padding: '20px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ margin: '0 0 5px 0', color: '#2d3748', fontSize: '1.1em' }}>{result.subject}</h4>
                                <span style={{ color: '#718096', fontSize: '0.85em' }}>📅 {new Date(result.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                              <div className={`grade ${getGradeClass(result.marks)}`} style={{ fontSize: '1.2em', padding: '8px 15px', height: 'fit-content' }}>
                                {result.marks}<span style={{ fontSize: '0.6em', opacity: 0.8 }}>/100</span>
                              </div>
                            </div>

                            {(result.pdfFilename || result.fileName) && (
                              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #edf2f7' }}>
                                <a
                                  href={result.pdfFile || result.fileData}
                                  download={result.pdfFilename || result.fileName}
                                  style={{ color: '#667eea', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', fontWeight: '600' }}
                                >
                                  <span style={{ fontSize: '1.2em' }}>📄</span> {result.pdfFilename || result.fileName}
                                </a>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this result?')) {
                                await studentData.deleteResult(selectedStudent._id || selectedStudent.id, result._id || result.id);
                                await loadResultsForStudent(selectedStudent._id || selectedStudent.id);
                              }
                            }}
                            style={{
                              background: '#f44336',
                              color: 'white',
                              border: 'none',
                              padding: '5px 15px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '15px',
                              borderRadius: '20px',
                              fontWeight: 'bold',
                              transition: 'all 0.2s',
                              alignSelf: 'center',
                              marginRight: '15px',
                              height: 'fit-content'
                            }}
                            title="Delete Result"
                          >
                            Delete
                          </button>
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
  );
};

export default FacultyDashboard;
