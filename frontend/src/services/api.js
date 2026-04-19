/**
 * API Service Layer
 * Centralized axios instance with auth, error handling, and token refresh
 *
 * FIXES APPLIED:
 *  1. Zoho metrics endpoint: /api/financial/overview → /api/financial/metrics
 *  2. GitHub metrics endpoint added: /api/github/metrics
 *  3. Zoho disconnect: POST → DELETE (matches backend @router.delete)
 *  4. GitHub disconnect: POST → DELETE (matches backend @router.delete)
 *  5. OAuth connect: now calls backend to get auth_url, then redirects
 */

import axios from 'axios';
import authService from './authService';
import { toast } from 'sonner';

// FIX: This is the backend URL. The frontend origin (window.location.origin)
// is WRONG to use for OAuth — it points at port 3000, not the backend port.
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
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
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await authService.refreshToken();
        const token = authService.getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        authService.logout();
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    const rawDetail = error.response?.data?.detail;
    const errorMessage = rawDetail
      ? Array.isArray(rawDetail)
        ? rawDetail.map((e) => e.msg || JSON.stringify(e)).join('; ')
        : String(rawDetail)
      : getErrorMessage(error.response?.status);
    error.message = errorMessage;

    return Promise.reject(error);
  }
);

function getErrorMessage(status) {
  switch (status) {
    case 400: return 'Invalid request. Please check your input.';
    case 403: return "You don't have permission to access this resource.";
    case 404: return 'Resource not found.';
    case 429: return 'Too many requests. Please try again later.';
    case 500: return 'Server error. Please try again later.';
    case 503: return 'Service temporarily unavailable.';
    default:  return 'An error occurred. Please try again.';
  }
}

/**
 * Initiate OAuth for an integration.
 * Calls backend /authorize → gets auth_url → redirects browser.
 * orgId must be the stable organization_id from the DB (not a temp value).
 */
export async function initiateOAuth(integrationId, orgId) {
  try {
    const response = await apiClient.get(`/api/auth/${integrationId}/authorize`, {
      params: { organization_id: orgId },
    });
    const authUrl = response.data?.auth_url;
    if (!authUrl) throw new Error('No auth URL returned from backend');
    window.location.href = authUrl;
  } catch (err) {
    throw err;
  }
}

const api = {
  // ============ Auth APIs ============
  auth: {
    login:              (email, password) => apiClient.post('/api/auth/login', { email, password }),
    register:           (userData)        => apiClient.post('/api/auth/register', userData),
    getCurrentUser:     ()                => apiClient.get('/api/auth/me'),
    refreshToken:       (refreshToken)    => apiClient.post('/api/auth/refresh', { refresh_token: refreshToken }),
    logout:             ()                => apiClient.post('/api/auth/logout'),
    completeOnboarding: ()                => apiClient.post('/api/auth/complete-onboarding'),
  },

  // ============ Portfolio APIs ============
  portfolio: {
    getOverview: ()            => apiClient.get('/api/portfolio/overview'),
    getStartups: (filters={}) => apiClient.get('/api/portfolio/startups', { params: filters }),
  },

  // ============ Startup APIs ============
  startups: {
    getById:  (id)          => apiClient.get(`/api/portfolio/startups/${id}`),
    getAlerts:(id)          => apiClient.get(`/api/startups/${id}/alerts`),
    create:   (data)        => apiClient.post('/api/startups', data),
    update:   (id, data)    => apiClient.put(`/api/startups/${id}`, data),
  },

  // ============ Integration APIs ============
  integrations: {
    // Zoho Books
    zoho: {
      getStatus:   (orgId) => apiClient.get('/api/auth/zoho/status', { params: { organization_id: orgId } }),
      // FIX: use initiateOAuth helper (calls backend for auth_url, then redirects)
      initiateAuth:(orgId) => initiateOAuth('zoho', orgId),
      // FIX: DELETE not POST
      disconnect:  (orgId) => apiClient.delete('/api/auth/zoho/disconnect', { params: { organization_id: orgId } }),
      // FIX: correct endpoint /api/financial/metrics (was /api/financial/overview which doesn't exist)
      getMetrics:  (orgId) => apiClient.get('/api/financial/metrics', { params: { organization_id: orgId } }),
      getInvoices: (orgId) => apiClient.get('/api/financial/invoices', { params: { organization_id: orgId } }),
    },

    // HubSpot
    hubspot: {
      getStatus:   (orgId) => apiClient.get('/api/auth/hubspot/status', { params: { organization_id: orgId } }),
      initiateAuth:(orgId) => initiateOAuth('hubspot', orgId),
      disconnect:  (orgId) => apiClient.delete('/api/auth/hubspot/disconnect', { params: { organization_id: orgId } }),
      getContacts: (orgId) => apiClient.get('/api/hubspot/contacts', { params: { organization_id: orgId } }),
    },

    // Razorpay (API key — not OAuth)
    razorpay: {
      getStatus:  (orgId)               => apiClient.get('/api/payments/razorpay/status', { params: { organization_id: orgId } }),
      configure:  (orgId, credentials)  => apiClient.post('/api/payments/razorpay/configure', { organization_id: orgId, ...credentials }),
      disconnect: (orgId)               => apiClient.post('/api/payments/razorpay/disconnect', { organization_id: orgId }),
      getPayments:(orgId)               => apiClient.get('/api/payments/razorpay/payments', { params: { organization_id: orgId } }),
    },

    // GitHub
    github: {
      getStatus:   (orgId) => apiClient.get('/api/auth/github/status', { params: { organization_id: orgId } }),
      initiateAuth:(orgId) => initiateOAuth('github', orgId),
      // FIX: DELETE not POST
      disconnect:  (orgId) => apiClient.delete('/api/auth/github/disconnect', { params: { organization_id: orgId } }),
      // FIX: metrics endpoint added
      getMetrics:  (orgId) => apiClient.get('/api/github/metrics', { params: { organization_id: orgId } }),
      getRepos:    (orgId) => apiClient.get('/api/github/repositories', { params: { organization_id: orgId } }),
    },
  },

  // ============ Financial APIs ============
  financial: {
    // FIX: /api/financial/metrics is the real endpoint
    getMetrics:  (orgId) => apiClient.get('/api/financial/metrics', { params: { organization_id: orgId } }),
    getInvoices: (orgId) => apiClient.get('/api/financial/invoices', { params: { organization_id: orgId } }),
    getExpenses: (orgId) => apiClient.get('/api/financial/expenses', { params: { organization_id: orgId } }),
  },

  // ============ GitHub APIs ============
  github: {
    getMetrics: (orgId) => apiClient.get('/api/github/metrics', { params: { organization_id: orgId } }),
    getRepos:   (orgId) => apiClient.get('/api/github/repositories', { params: { organization_id: orgId } }),
    sync:       (orgId) => apiClient.post('/api/github/sync', null, { params: { organization_id: orgId } }),
  },

  // ============ Alerts APIs ============
  alerts: {
    getAll:       (filters={}) => apiClient.get('/api/alerts', { params: filters }),
    getById:      (id)         => apiClient.get(`/api/alerts/${id}`),
    markAsRead:   (id)         => apiClient.put(`/api/alerts/${id}/read`),
    dismiss:      (id)         => apiClient.delete(`/api/alerts/${id}`),
    markAllAsRead:()           => apiClient.post('/api/alerts/read-all'),
  },

  // ============ Reports APIs ============
  reports: {
    getAll:  (filters={}) => apiClient.get('/api/reports', { params: filters }),
    getById: (id)         => apiClient.get(`/api/reports/${id}`),
    create:  (data)       => apiClient.post('/api/reports', data),
    update:  (id, data)   => apiClient.put(`/api/reports/${id}`, data),
  },

  // ============ Admin Onboarding APIs ============
  adminOnboarding: {
    createWorkspace:    (data) => apiClient.post('/api/admin/workspace', data),
    bulkImportCompanies:(data) => apiClient.post('/api/admin/companies/bulk', data),
    inviteTeamMembers:  (data) => apiClient.post('/api/admin/team/invite', data),
    inviteFounders:     (data) => apiClient.post('/api/admin/founders/invite', data),
  },

  // ============ Founder Onboarding APIs ============
  founderOnboarding: {
    verifyInvitation:   (token)     => apiClient.get(`/api/founder/invitation/${token}`),
    completeOnboarding: (data)      => apiClient.post('/api/founder/onboarding/complete', data),
    saveOnboarding:     (data)      => apiClient.post('/api/founder/onboarding/save', data),
    getOnboardingStatus:(startupId) => apiClient.get(`/api/founder/onboarding/status/${startupId}`),
    getStartupData:     ()          => apiClient.get('/api/founder/startup/data'),
  },

  // ============ Activity Feed APIs ============
  feed: {
    getActivities: (filters={}) => apiClient.get('/api/feed', { params: filters }),
    createActivity:(data)       => apiClient.post('/api/feed/activity', data),
  },
};

export default api;
export { apiClient };