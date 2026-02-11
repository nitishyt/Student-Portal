import axios from 'axios';

const api = axios.create({
  baseURL:
    window.location.hostname === 'localhost'
      ? 'http://localhost:5000/api'
      : 'https://student-academic-management-portal-ksgd.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (username, password, role) =>
    api.post('/auth/login', { username, password, role })
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
