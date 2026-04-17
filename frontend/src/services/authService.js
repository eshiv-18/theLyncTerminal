/**
 * Authentication Service
 * Handles all auth-related API calls and token management
 */

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * Safely extract an error message from a fetch Response.
 * Handles both JSON and non-JSON (HTML 404 pages etc.) bodies.
 */
async function safeErrorMessage(response, fallback) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return data.detail || fallback;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

class AuthService {
  /**
   * Login user
   */
  async login(email, password) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const msg = await safeErrorMessage(response, 'Login failed');
      throw new Error(msg);
    }

    const data = await response.json();
    
    // Store tokens in localStorage
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    // Fetch and store user data
    const user = await this.getCurrentUser();
    localStorage.setItem('user', JSON.stringify(user));
    
    return { tokens: data, user };
  }

  /**
   * Register new user (public registration)
   */
  async register(userData) {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const msg = await safeErrorMessage(response, 'Registration failed');
      throw new Error(msg);
    }

    const user = await response.json();
    return user;
  }

  /**
   * Register and automatically login the new user
   * Returns both user data and tokens for immediate access
   */
  async registerAndLogin(userData) {
    // First register
    await this.register(userData);
    
    // Then automatically login with the same credentials
    const result = await this.login(userData.email, userData.password);
    return result;
  }

  /**
   * Mark onboarding as completed for current user
   */
  async completeOnboarding() {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No access token');
    }

    const response = await fetch(`${API_URL}/api/auth/complete-onboarding`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const msg = await safeErrorMessage(response, 'Failed to complete onboarding');
      throw new Error(msg);
    }

    // Update stored user data
    const storedUser = this.getStoredUser();
    if (storedUser) {
      storedUser.onboarding_completed = true;
      localStorage.setItem('user', JSON.stringify(storedUser));
    }

    return response.json();
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No access token');
    }

    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        try {
          await this.refreshToken();
          return this.getCurrentUser(); // Retry with new token
        } catch {
          this.logout();
          throw new Error('Session expired');
        }
      }
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      this.logout();
      const msg = await safeErrorMessage(response, 'Token refresh failed');
      throw new Error(msg);
    }

    const data = await response.json();
    
    // Update tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
  }

  /**
   * Logout user
   */
  async logout() {
    const token = this.getAccessToken();
    
    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Get stored user from localStorage
   */
  getStoredUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getAccessToken();
  }

  /**
   * Get auth header for API requests
   */
  getAuthHeader() {
    const token = this.getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

export default new AuthService();
