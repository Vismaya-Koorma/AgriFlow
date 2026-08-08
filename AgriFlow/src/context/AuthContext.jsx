import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  loginUser as apiLogin,
  registerUser as apiRegister,
  logoutUser as apiLogout,
  getUserProfile,
} from '../services/api';

// Role → Dashboard route mapping
export const ROLE_PATHS = {
  farmer: '/farmer',
  supervisor: '/supervisor',
  manager: '/manager',
  maintenance: '/maintenance',
  admin: '/admin',
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('agriflow_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);

  // Re-validate the saved JWT on page load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      getUserProfile()
        .then((profile) => {
          const normProfile = {
            ...profile,
            name: profile.full_name || profile.name || profile.username,
            full_name: profile.full_name || profile.name || profile.username,
          };
          setUser(normProfile);
          localStorage.setItem('agriflow_user', JSON.stringify(normProfile));
        })
        .catch(() => {
          // Token expired / invalid — session cleared by interceptor
        });
    }
  }, []);

  // ─── Register ───────────────────────────────────────────────────────────────
  const registerUser = async (userData) => {
    try {
      setLoading(true);
      const data = await apiRegister(userData);
      const newUser = data.user || {
        username: userData.username,
        role: userData.role || 'farmer',
        full_name: userData.fullName || userData.full_name || userData.name,
        email: userData.email,
      };
      setUser(newUser);
      localStorage.setItem('agriflow_user', JSON.stringify(newUser));
      return { success: true, user: newUser, message: data.message || 'Account created successfully!' };
    } catch (err) {
      const errData = err.response?.data;
      let errorMsg = 'Registration failed. Please try again.';
      let fieldErrors = {};

      if (errData) {
        if (typeof errData === 'object' && !Array.isArray(errData)) {
          fieldErrors = errData;
          const firstKey = Object.keys(errData)[0];
          const val = errData[firstKey];
          const msg = Array.isArray(val) ? val[0] : val;
          errorMsg = msg;
        } else if (Array.isArray(errData)) {
          errorMsg = errData[0];
        } else if (typeof errData === 'string') {
          errorMsg = errData;
        }
      }
      return { success: false, error: errorMsg, errors: fieldErrors };
    } finally {
      setLoading(false);
    }
  };

  // ─── Login ───────────────────────────────────────────────────────────────────
  const login = async (identifier, password) => {
    const cleanId = identifier?.trim().toLowerCase();
    try {
      setLoading(true);
      const data = await apiLogin(cleanId, password);
      const loggedUser = {
        ...data.user,
        name: data.user.full_name || data.user.name || data.user.username,
        full_name: data.user.full_name || data.user.name || data.user.username,
      };
      setUser(loggedUser);
      localStorage.setItem('agriflow_user', JSON.stringify(loggedUser));
      return { success: true, user: loggedUser };
    } catch (err) {
      const errData = err.response?.data;
      let errorMsg = 'Invalid username/email or password.';

      if (!err.response) {
        errorMsg = 'Cannot reach the server. Please make sure the backend is running on http://localhost:8000';
      } else if (errData) {
        if (errData.detail) {
          errorMsg = errData.detail;
        } else if (errData.non_field_errors) {
          errorMsg = Array.isArray(errData.non_field_errors) ? errData.non_field_errors[0] : errData.non_field_errors;
        } else if (Array.isArray(errData)) {
          errorMsg = errData[0];
        } else if (typeof errData === 'object') {
          const firstKey = Object.keys(errData)[0];
          const val = errData[firstKey];
          errorMsg = Array.isArray(val) ? val[0] : val;
        }
      }
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, registerUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
