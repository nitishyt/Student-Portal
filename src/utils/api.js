import axios from 'axios';

// ─── Access token stored in memory only (never in storage) ──────────
let accessToken = null;

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => { accessToken = null; };

// ─── Base URL ────────────────────────────────────────────────────────
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true // needed for httpOnly refresh cookie
});

// ─── Request interceptor: attach access token ───────────────────────
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ─── Response interceptor: auto-refresh on 401 TOKEN_EXPIRED ────────
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh once per request, and only for TOKEN_EXPIRED
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Deduplicate concurrent refresh calls
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
          .then((res) => {
            const newToken = res.data.token;
            setAccessToken(newToken);
            return newToken;
          })
          .catch((refreshErr) => {
            clearAccessToken();
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('userType');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshErr);
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    }

    // For non-TOKEN_EXPIRED 401s (e.g. invalid credentials), redirect
    if (error.response?.status === 401) {
      clearAccessToken();
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('userType');
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
  register: (username, email, password) =>
    api.post('/auth/register', { username, email, password }),
  verify: () => api.get('/auth/verify'),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword })
};

export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  delete: (id) => api.delete(`/students/${id}`),
  resetPassword: (id, target) => api.post(`/students/${id}/reset-password`, { target })
};

export const facultyAPI = {
  getAll: () => api.get('/faculties'),
  create: (data) => api.post('/faculties', data),
  delete: (id) => api.delete(`/faculties/${id}`),
  resetPassword: (id) => api.post(`/faculties/${id}/reset-password`)
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
