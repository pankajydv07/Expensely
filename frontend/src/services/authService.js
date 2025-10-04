import api from './api';

const authService = {
  // Sign up new company and admin
  signup: async (data) => {
    const response = await api.post('/auth/signup', data);
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Clear auth data (for invalid states)
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    // Both token and user must exist
    if (!token || !user) {
      return false;
    }
    
    try {
      // Validate user object can be parsed
      JSON.parse(user);
      return true;
    } catch (error) {
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    if (!user) return null;
    
    try {
      return JSON.parse(user);
    } catch (error) {
      // Clear invalid data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
};

export default authService;

// Named exports for convenience
export const { forgotPassword } = authService;

