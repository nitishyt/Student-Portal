import { authAPI, setAccessToken, getAccessToken, clearAccessToken } from './api';

export const auth = {
  isAuthenticated: () => {
    return getAccessToken() !== null;
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
      const { data } = await authAPI.login(username, password, userType);
      setAccessToken(data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('userType', data.user.role);
      return { success: true, mustChangePassword: data.user.mustChangePassword };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  },

  register: async (username, email, password) => {
    try {
      const { data } = await authAPI.register(username, email, password);
      setAccessToken(data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('userType', data.user.role);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Registration failed' };
    }
  },

  verifySession: async () => {
    try {
      // If no access token in memory, try to refresh from cookie
      if (!getAccessToken()) {
        try {
          const { data } = await authAPI.refresh();
          setAccessToken(data.token);
        } catch {
          return false;
        }
      }
      await authAPI.verify();
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch {
      // Continue with local cleanup even if server call fails
    }
    clearAccessToken();
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userType');
  }
};
