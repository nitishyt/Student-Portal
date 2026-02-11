import axios from 'axios';


const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
  getByStudent: (studentId) => api.get(`/attendance/student/${studentId}`),
  mark: (data) => api.post('/attendance', {
    studentId: data.studentId,
    date: data.date,
    time: data.time,
    subject: data.subject,
    status: data.status
  })
};

export const resultAPI = {
  getByStudent: (studentId) => api.get(`/results/student/${studentId}`),
  create: (data) => api.post('/results', data)
};

export default api;
