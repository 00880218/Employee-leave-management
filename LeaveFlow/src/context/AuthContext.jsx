import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

// Determine API base URL dynamically:
// If frontend is run via Vite dev server (usually port 5173), direct requests to the backend (port 5000).
// Otherwise (production/served by Express), use relative path /api.
const API_BASE_URL = window.location.hostname === 'localhost' && window.location.port === '5173'
  ? 'http://localhost:5000/api'
  : '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Load token and user from localStorage on init
  useEffect(() => {
    const savedToken = localStorage.getItem('leaveflow_token');
    const savedUser = localStorage.getItem('leaveflow_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Show a visual toast notification
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Perform API Requests helper
  const apiFetch = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error(`API Fetch Error [${endpoint}]:`, error);
      throw error;
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('leaveflow_token', data.token);
      localStorage.setItem('leaveflow_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      
      showToast('Logged in successfully', 'success');
      return data.user;
    } catch (error) {
      showToast(error.message || 'Login failed', 'error');
      throw error;
    }
  };

  // Register
  const register = async (name, email, password, role, managerSecret) => {
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role, managerSecret }),
      });

      localStorage.setItem('leaveflow_token', data.token);
      localStorage.setItem('leaveflow_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      showToast('Registered successfully', 'success');
      return data.user;
    } catch (error) {
      showToast(error.message || 'Registration failed', 'error');
      throw error;
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('leaveflow_token');
    localStorage.removeItem('leaveflow_user');
    setToken(null);
    setUser(null);
    showToast('Logged out successfully', 'info');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      notification,
      showToast,
      apiFetch,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
