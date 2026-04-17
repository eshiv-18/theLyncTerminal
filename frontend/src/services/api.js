/**
 * API Service Layer
 * Centralized axios instance with auth, error handling, and token refresh
 */

import axios from 'axios';
import authService from './authService';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

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

    // Network error (no response from server)
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

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
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Better error messages for common status codes
    // Pydantic v2 returns `detail` as an array of validation error objects on 422
    const rawDetail = error.response?.data?.detail;
    const errorMessage = rawDetail
      ? (Array.isArray(rawDetail)
          ? rawDetail.map((e) => e.msg || JSON.stringify(e)).join('; ')
          : String(rawDetail))
      : getErrorMessage(error.response?.status);
    error.message = errorMessage;

    return Promise.reject(error);
  }
);

// Helper to get user-friendly error messages
function getErrorMessage(status) {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 403:
      return 'You don\'t have permission to access this resource.';
    case 404:
      return 'Resource not found.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    case 503:
      return 'Service temporarily unavailable.';
    default:
      return 'An error occurred. Please try again.';
  }
}

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
    
    completeOnboarding: () => 
      apiClient.post('/api/auth/complete-onboarding'),
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
      apiClient.get(`/api/portfolio/startups/${id}`),
    
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
    
    markAllAsRead: () => 
      apiClient.post('/api/alerts/read-all'),
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
    
    exportPDF: async (reportId) => {
      const response = await apiClient.get(`/api/reports/${reportId}/export/pdf`, {
        responseType: 'blob'
      });
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return response;
    }
  },

  // ============ Admin Onboarding APIs ============
  adminOnboarding: {
    createWorkspace: (data) => 
      apiClient.post('/api/admin/workspace', data),
    
    bulkImportCompanies: (data) => 
      apiClient.post('/api/admin/companies/bulk', data),
    
    inviteTeamMembers: (data) => 
      apiClient.post('/api/admin/team/invite', data),
    
    inviteFounders: (data) => 
      apiClient.post('/api/admin/founders/invite', data),
  },

  // ============ Founder Onboarding APIs ============
  founderOnboarding: {
    verifyInvitation: (token) => 
      apiClient.get(`/api/founder/invitation/${token}`),
    
    completeOnboarding: (data) => 
      apiClient.post('/api/founder/onboarding/complete', data),
    
    // NEW: Save onboarding for self-registered founders
    saveOnboarding: (data) =>
      apiClient.post('/api/founder/onboarding/save', data),
    
    getOnboardingStatus: (startupId) => 
      apiClient.get(`/api/founder/onboarding/status/${startupId}`),
    
    getStartupData: () =>
      apiClient.get('/api/founder/startup/data'),
  },

  // ============ Activity Feed APIs ============
  feed: {
    getActivities: (filters = {}) => 
      apiClient.get('/api/feed', { params: filters }),
    
    createActivity: (data) => 
      apiClient.post('/api/feed/activity', data),
  },
};

export default api;
export { apiClient };