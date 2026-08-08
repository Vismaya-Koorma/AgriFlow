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
      // Don't retry auth-related endpoints or if already on the login page
      if (
        originalRequest.url.includes('/auth/login/') ||
        originalRequest.url.includes('/auth/refresh/') ||
        originalRequest.url.includes('/auth/profile/') ||
        window.location.pathname === '/login'
      ) {
        clearAuthTokens();
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

// ─── Master APIs ──────────────────────────────────────────────────────────

export const getCropTypes = async () => {
  const response = await api.get('/crop-types/');
  return response.data;
};

export const getSoilTypes = async () => {
  const response = await api.get('/soil-types/');
  return response.data;
};

// ─── Irrigation History APIs ───────────────────────────────────────────────

export const getIrrigationHistory = async (params = {}) => {
  let url = '/irrigation/';
  const queryParams = new URLSearchParams();
  if (typeof params === 'object' && params !== null) {
    if (params.field) queryParams.append('field', params.field);
    if (params.search) queryParams.append('search', params.search);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
  } else if (params) {
    queryParams.append('field', params);
  }
  if (queryParams.toString()) url += `?${queryParams.toString()}`;
  const response = await api.get(url);
  return response.data;
};

export const createIrrigationHistory = async (data) => {
  const response = await api.post('/irrigation/', data);
  return response.data;
};

export const updateIrrigationHistory = async (id, data) => {
  const response = await api.put(`/irrigation/${id}/`, data);
  return response.data;
};

export const deleteIrrigationHistory = async (id) => {
  const response = await api.delete(`/irrigation/${id}/`);
  return response.data;
};

// ─── Weather APIs ──────────────────────────────────────────────────────────

export const getCurrentWeather = async (fieldId = null) => {
  const url = fieldId ? `/weather/current/?field_id=${fieldId}` : '/weather/current/';
  const response = await api.get(url);
  return response.data;
};

export const getWeatherForecast = async (fieldId = null) => {
  const url = fieldId ? `/weather/forecast/?field_id=${fieldId}` : '/weather/forecast/';
  const response = await api.get(url);
  return response.data;
};

// ─── Rainfall Confirmation APIs ───────────────────────────────────────────

export const getLatestRainfallConfirmation = async () => {
  const response = await api.get('/rainfall/latest/');
  return response.data;
};

export const submitRainfallConfirmation = async (data) => {
  const response = await api.post('/rainfall/', data);
  return response.data;
};

// ─── Irrigation Recommendation APIs ───────────────────────────────────────

export const getLatestRecommendation = async (fieldId = null) => {
  const url = fieldId ? `/recommendation/latest/?field_id=${fieldId}` : '/recommendation/latest/';
  const response = await api.get(url);
  return response.data;
};

// ─── Reports APIs ─────────────────────────────────────────────────────────

export const getReportSummary = async () => {
  const response = await api.get('/reports/summary/');
  return response.data;
};

export const exportReportCSV = async () => {
  const response = await api.get('/reports/export-csv/', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'AgriFlow_Irrigation_Report.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// ─── Alerts APIs ──────────────────────────────────────────────────────────

export const getAlerts = async (params = {}) => {
  let url = '/alerts/';
  const queryParams = new URLSearchParams();
  if (params.severity) queryParams.append('severity', params.severity);
  if (params.alert_type) queryParams.append('alert_type', params.alert_type);
  if (queryParams.toString()) url += `?${queryParams.toString()}`;
  const response = await api.get(url);
  return response.data;
};

export const getUnreadAlertCount = async () => {
  const response = await api.get('/alerts/unread_count/');
  return response.data;
};

export const resolveAlert = async (id) => {
  const response = await api.patch(`/alerts/${id}/resolve/`);
  return response.data;
};

export default api;
