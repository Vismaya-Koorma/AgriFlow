import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Access Token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to avoid multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Automatic JWT Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/login/') || originalRequest.url.includes('/auth/refresh/')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        clearAuthTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        clearAuthTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Token helpers
export const setAuthTokens = (tokens) => {
  if (tokens.access) localStorage.setItem('access_token', tokens.access);
  if (tokens.refresh) localStorage.setItem('refresh_token', tokens.refresh);
};

export const clearAuthTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('agriflow_user');
};

// ─── Authentication APIs ───────────────────────────────────────────────────

export const registerUser = async (formData) => {
  const payload = {
    username: formData.username?.trim().toLowerCase(),
    email: formData.email?.trim().toLowerCase(),
    full_name: formData.fullName || formData.full_name || formData.name,
    phone_number: formData.phoneNumber || formData.phone_number || '',
    district: formData.district || '',
    state: formData.state || 'Kerala',
    role: formData.role || 'farmer',
    password: formData.password,
    confirm_password: formData.confirmPassword || formData.password,
    terms_accepted: Boolean(formData.termsAccepted),
  };

  const response = await api.post('/auth/register/', payload);
  if (response.data.tokens) {
    setAuthTokens(response.data.tokens);
    localStorage.setItem('agriflow_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const registerFarmer = registerUser;

export const loginUser = async (username, password) => {
  const response = await api.post('/auth/login/', { username, password });
  if (response.data.tokens) {
    setAuthTokens(response.data.tokens);
    localStorage.setItem('agriflow_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const logoutUser = async () => {
  try {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      await api.post('/auth/logout/', { refresh });
    }
  } catch (e) {
    console.error('Logout error:', e);
  } finally {
    clearAuthTokens();
  }
};

export const getUserProfile = async () => {
  const response = await api.get('/auth/profile/');
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const response = await api.put('/auth/profile/', profileData);
  localStorage.setItem('agriflow_user', JSON.stringify(response.data));
  return response.data;
};

export const changePassword = async (oldPassword, newPassword, confirmPassword) => {
  const response = await api.post('/auth/change-password/', {
    old_password: oldPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return response.data;
};

// ─── Dashboard API ─────────────────────────────────────────────────────────

export const getDashboard = async () => {
  const response = await api.get('/dashboard/');
  return response.data;
};

// ─── Farm APIs ─────────────────────────────────────────────────────────────

export const getFarms = async () => {
  const response = await api.get('/farms/');
  return response.data;
};

export const createFarm = async (farmData) => {
  const response = await api.post('/farms/', farmData);
  return response.data;
};

export const updateFarm = async (id, farmData) => {
  const response = await api.put(`/farms/${id}/`, farmData);
  return response.data;
};

export const deleteFarm = async (id) => {
  const response = await api.delete(`/farms/${id}/`);
  return response.data;
};

// ─── Field APIs ────────────────────────────────────────────────────────────

export const getFields = async (farmId = null) => {
  const url = farmId ? `/fields/?farm=${farmId}` : '/fields/';
  const response = await api.get(url);
  return response.data;
};

export const createField = async (fieldData) => {
  const response = await api.post('/fields/', fieldData);
  return response.data;
};

export const updateField = async (id, fieldData) => {
  const response = await api.put(`/fields/${id}/`, fieldData);
  return response.data;
};

export const deleteField = async (id) => {
  const response = await api.delete(`/fields/${id}/`);
  return response.data;
};

export default api;
