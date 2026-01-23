// Student data management functions
export const studentData = {
  // Get all students
  getStudents: () => {
    return JSON.parse(localStorage.getItem('students') || '[]');
  },

  // Add new student
  addStudent: (studentInfo) => {
    const students = studentData.getStudents();
    const username = studentInfo.rollNo.toLowerCase();
    const password = studentInfo.name.toLowerCase().replace(' ', '') + '123';
    
    const newStudent = {
      ...studentInfo,
      username,
      password,
      id: Date.now()
    };
    
    students.push(newStudent);
    localStorage.setItem('students', JSON.stringify(students));
    return newStudent;
  },

  // Delete student
  deleteStudent: (studentId) => {
    const students = studentData.getStudents().filter(s => s.id !== studentId);
    localStorage.setItem('students', JSON.stringify(students));
    
    // Remove student's attendance and results
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    delete attendance[studentId];
    localStorage.setItem('attendance', JSON.stringify(attendance));
    
    const results = JSON.parse(localStorage.getItem('results') || '{}');
    delete results[studentId];
    localStorage.setItem('results', JSON.stringify(results));
  },

  // Get student by ID
  getStudentById: (id) => {
    const students = studentData.getStudents();
    return students.find(s => s.id == id);
  },

  // Attendance functions
  getAttendance: (studentId) => {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    return attendance[studentId] || {};
  },

  setAttendance: (studentId, date, status) => {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    if (!attendance[studentId]) attendance[studentId] = {};
    attendance[studentId][date] = status;
    localStorage.setItem('attendance', JSON.stringify(attendance));
  },

  // Results functions
  getResults: (studentId) => {
    const results = JSON.parse(localStorage.getItem('results') || '{}');
    return results[studentId] || [];
  },

  addResult: (studentId, subject, marks) => {
    const results = JSON.parse(localStorage.getItem('results') || '{}');
    if (!results[studentId]) results[studentId] = [];
    results[studentId].push({
      subject,
      marks: parseInt(marks),
      date: new Date().toLocaleDateString()
    });
    localStorage.setItem('results', JSON.stringify(results));
  }
};