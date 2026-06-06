// ─────────────────────────────────────────────────────────────
//  src/services/api.js — Axios client + tous les appels API
// ─────────────────────────────────────────────────────────────
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token JWT automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Gérer les 401 globalement
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fs_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Zones ────────────────────────────────────────────────────
export const zonesAPI = {
  getAll:      (params) => api.get('/zones', { params }),
  getById:     (id)     => api.get(`/zones/${id}`),
  getHistory:  (id)     => api.get(`/zones/${id}/history`),
  getWeather:  (id)     => api.get(`/zones/${id}/weather`),
};

// ── Weather ──────────────────────────────────────────────────
export const weatherAPI = {
  getCurrent:  ()       => api.get('/weather/current'),
  getKinshasa: ()       => api.get('/weather/kinshasa'),
  getHistory:  (params) => api.get('/weather/history', { params }),
};

// ── Predictions ──────────────────────────────────────────────
export const predictionsAPI = {
  getCurrent:  ()       => api.get('/predictions/current'),
  getHistory:  (zoneId, params) => api.get(`/predictions/history/${zoneId}`, { params }),
  getModelInfo:()       => api.get('/predictions/model'),
  trigger:     (body)   => api.post('/predictions/trigger', body),
};

// ── Alerts ───────────────────────────────────────────────────
export const alertsAPI = {
  getAll:      (params) => api.get('/alerts', { params }),
  getActive:   ()       => api.get('/alerts/active'),
  create:      (body)   => api.post('/alerts', body),
  acknowledge: (id)     => api.patch(`/alerts/${id}/acknowledge`),
};

// ── Stats ─────────────────────────────────────────────────────
export const statsAPI = {
  getSummary:   ()      => api.get('/stats/summary'),
  getDashboard: ()      => api.get('/stats/dashboard'),
  getFloodHistory: (p)  => api.get('/stats/flood-history', { params: p }),
};

// ── Events ───────────────────────────────────────────────────
export const eventsAPI = {
  getAll:   (params) => api.get('/events', { params }),
  create:   (body)   => api.post('/events', body),
  confirm:  (id)     => api.patch(`/events/${id}/confirm`),
};

// ── Auth ─────────────────────────────────────────────────────
export const authAPI = {
  login:  (body) => api.post('/auth/login', body),
  getMe:  ()     => api.get('/auth/me'),
};

export default api;
