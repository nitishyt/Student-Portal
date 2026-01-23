// Authentication utility functions
export const auth = {
  // Check if user is logged in
  isAuthenticated: () => {
    return localStorage.getItem('userType') !== null;
  },

  // Get current user type (admin or student)
  getUserType: () => {
    return localStorage.getItem('userType');
  },

  // Get current student ID
  getCurrentStudentId: () => {
    return localStorage.getItem('currentStudentId');
  },

  // Login function
  login: (userType, username, password) => {
    if (userType === 'admin') {
      if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('userType', 'admin');
        return { success: true };
      }
    } else {
      const students = JSON.parse(localStorage.getItem('students') || '[]');
      const student = students.find(s => s.username === username && s.password === password);
      
      if (student) {
        localStorage.setItem('userType', 'student');
        localStorage.setItem('currentStudentId', student.id);
        return { success: true };
      }
    }
    return { success: false, error: 'Invalid username or password' };
  },

  // Logout function
  logout: () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('currentStudentId');
  }
};