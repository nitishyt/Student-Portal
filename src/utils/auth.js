import { authAPI } from './api';

export const auth = {
  isAuthenticated: () => {
    return sessionStorage.getItem('token') !== null;
  },

  getUserType: () => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.role;
  },

  getCurrentUserId: () => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.studentId || user.id;
  },

  getCurrentStudentId: () => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.studentId;
  },

  login: async (userType, username, password) => {
    try {
      // Role is sent as a lookup hint so the backend can find the correct
      // user record, but the authoritative role always comes from the DB.
      const { data } = await authAPI.login(username, password, userType);
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('userType', data.user.role);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  },

  register: async (username, email, password) => {
    try {
      // Frontend sends ONLY username, email, password. Role is set by backend.
      const { data } = await authAPI.register(username, email, password);
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('userType', data.user.role);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Registration failed' };
    }
  },

  verifySession: async () => {
    try {
      if (!sessionStorage.getItem('token')) return false;
      await authAPI.verify();
      return true;
    } catch (error) {
      return false;
    }
  },

  logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userType');
  }
};
