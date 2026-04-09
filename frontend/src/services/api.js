/**
 * API Service Layer
 * Centralized axios instance with auth, error handling, and token refresh
 */

import axios from 'axios';
import authService from './authService';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        await authService.refreshToken();
        
        // Retry the original request with new token
        const token = authService.getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * API Service Object with all endpoints
 */
const api = {
  // ============ Auth APIs ============
  auth: {
    login: (email, password) => 
      apiClient.post('/api/auth/login', { email, password }),
    
    register: (userData) => 
      apiClient.post('/api/auth/register', userData),
    
    getCurrentUser: () => 
      apiClient.get('/api/auth/me'),
    
    refreshToken: (refreshToken) => 
      apiClient.post('/api/auth/refresh', { refresh_token: refreshToken }),
    
    logout: () => 
      apiClient.post('/api/auth/logout'),
  },

  // ============ Portfolio APIs ============
  portfolio: {
    getOverview: () => 
      apiClient.get('/api/portfolio/overview'),
    
    getStartups: (filters = {}) => 
      apiClient.get('/api/portfolio/startups', { params: filters }),
  },

  // ============ Startup APIs ============
  startups: {
    getById: (id) => 
      apiClient.get(`/api/startups/${id}`),
    
    getMetrics: (id) => 
      apiClient.get(`/api/startups/${id}/metrics`),
    
    getAlerts: (id) => 
      apiClient.get(`/api/startups/${id}/alerts`),
    
    create: (startupData) => 
      apiClient.post('/api/startups', startupData),
    
    update: (id, startupData) => 
      apiClient.put(`/api/startups/${id}`, startupData),
  },

  // ============ Integration APIs ============
  integrations: {
    // Zoho Books
    zoho: {
      getStatus: (orgId) => 
        apiClient.get('/api/auth/zoho/status', { params: { organization_id: orgId } }),
      
      initiateAuth: (orgId) => 
        apiClient.get('/api/auth/zoho/authorize', { params: { organization_id: orgId } }),
      
      disconnect: (orgId) => 
        apiClient.post('/api/auth/zoho/disconnect', { organization_id: orgId }),
      
      getFinancials: (orgId) => 
        apiClient.get('/api/financial/overview', { params: { organization_id: orgId } }),
    },

    // HubSpot
    hubspot: {
      getStatus: (orgId) => 
        apiClient.get('/api/auth/hubspot/status', { params: { organization_id: orgId } }),
      
      initiateAuth: (orgId) => 
        apiClient.get('/api/auth/hubspot/authorize', { params: { organization_id: orgId } }),
      
      disconnect: (orgId) => 
        apiClient.post('/api/auth/hubspot/disconnect', { organization_id: orgId }),
      
      getContacts: (orgId) => 
        apiClient.get('/api/hubspot/contacts', { params: { organization_id: orgId } }),
    },

    // Razorpay
    razorpay: {
      getStatus: (orgId) => 
        apiClient.get('/api/payments/razorpay/status', { params: { organization_id: orgId } }),
      
      configure: (orgId, credentials) => 
        apiClient.post('/api/payments/razorpay/configure', { organization_id: orgId, ...credentials }),
      
      disconnect: (orgId) => 
        apiClient.post('/api/payments/razorpay/disconnect', { organization_id: orgId }),
      
      getPayments: (orgId) => 
        apiClient.get('/api/payments/razorpay/payments', { params: { organization_id: orgId } }),
    },

    // GitHub
    github: {
      getStatus: (orgId) => 
        apiClient.get('/api/auth/github/status', { params: { organization_id: orgId } }),
      
      initiateAuth: (orgId) => 
        apiClient.get('/api/auth/github/authorize', { params: { organization_id: orgId } }),
      
      disconnect: (orgId) => 
        apiClient.post('/api/auth/github/disconnect', { organization_id: orgId }),
      
      getRepos: (orgId) => 
        apiClient.get('/api/github/repositories', { params: { organization_id: orgId } }),
    },
  },

  // ============ Financial APIs ============
  financial: {
    getOverview: (orgId) => 
      apiClient.get('/api/financial/overview', { params: { organization_id: orgId } }),
    
    getCashFlow: (orgId) => 
      apiClient.get('/api/financial/cashflow', { params: { organization_id: orgId } }),
    
    getRevenue: (orgId) => 
      apiClient.get('/api/financial/revenue', { params: { organization_id: orgId } }),
  },

  // ============ Alerts APIs ============
  alerts: {
    getAll: (filters = {}) => 
      apiClient.get('/api/alerts', { params: filters }),
    
    getById: (id) => 
      apiClient.get(`/api/alerts/${id}`),
    
    markAsRead: (id) => 
      apiClient.put(`/api/alerts/${id}/read`),
    
    dismiss: (id) => 
      apiClient.delete(`/api/alerts/${id}`),
  },

  // ============ Reports APIs ============
  reports: {
    getAll: (filters = {}) => 
      apiClient.get('/api/reports', { params: filters }),
    
    getById: (id) => 
      apiClient.get(`/api/reports/${id}`),
    
    create: (reportData) => 
      apiClient.post('/api/reports', reportData),
    
    update: (id, reportData) => 
      apiClient.put(`/api/reports/${id}`, reportData),
  },

  // ============ Feed APIs ============
  feed: {
    getActivities: (filters = {}) => 
      apiClient.get('/api/feed', { params: filters }),
  },
};

export default api;
export { apiClient };
