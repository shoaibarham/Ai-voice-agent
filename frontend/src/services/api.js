import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Agent Configuration API
export const agentConfigApi = {
  getAll: () => api.get('/agent-configs'),
  getById: (id) => api.get(`/agent-configs/${id}`),
  create: (data) => api.post('/agent-configs', data),
  update: (id, data) => api.put(`/agent-configs/${id}`, data),
  delete: (id) => api.delete(`/agent-configs/${id}`),
};

// Calls API
export const callsApi = {
  getAll: () => api.get('/calls'),
  getById: (id) => api.get(`/calls/${id}`),
  getResults: (id) => api.get(`/calls/${id}/results`),
  startWebRTC: (data) => api.post('/calls/start', data),

};

// Dashboard API

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;