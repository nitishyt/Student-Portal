import axios from 'axios';

const api = axios.create({
  baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:10000/api'
    : 'https://student-academic-management-portal-ksqd.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle session expiration or unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear session storage and redirect to login
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('userType');

      // Force redirect to login page if we're not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password, role) =>
    api.post('/auth/login', { username, password, role }),
  verify: () => api.get('/auth/verify')
};

export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  delete: (id) => api.delete(`/students/${id}`)
};

export const facultyAPI = {
  getAll: () => api.get('/faculties'),
  create: (data) => api.post('/faculties', data),
  delete: (id) => api.delete(`/faculties/${id}`)
};

export const attendanceAPI = {
  getByStudent: (studentId) =>
    api.get(`/attendance/student/${studentId}`),
  mark: (data) =>
    api.post('/attendance', data),
  delete: (studentId, attendanceId) =>
    api.delete(`/attendance/${attendanceId}`)
};

export const resultAPI = {
  getByStudent: (studentId) =>
    api.get(`/results/student/${studentId}`),
  create: (data) => api.post('/results', data),
  delete: (studentId, resultId) =>
    api.delete(`/results/${resultId}`)
};

export default api;
