import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Fetch fresh user data from backend
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError(error.message);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const { user: userData } = await authService.login(email, password);
      setUser(userData);
      return userData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const newUser = await authService.register(userData);
      return newUser;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register a new user and automatically log them in.
   * Returns the logged-in user data with JWT tokens stored.
   */
  const registerAndLogin = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const { user: loggedInUser } = await authService.registerAndLogin(userData);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark the current user's onboarding as completed.
   * Updates both backend and local state.
   */
  const completeOnboarding = async () => {
    try {
      await authService.completeOnboarding();
      setUser(prev => prev ? { ...prev, onboarding_completed: true } : prev);
    } catch (error) {
      console.error('Complete onboarding error:', error);
      throw error;
    }
  };

  /**
   * Refresh user data from backend (useful after onboarding)
   */
  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Refresh user error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    registerAndLogin,
    completeOnboarding,
    refreshUser,
    logout,
    hasRole,
    hasAnyRole,
    isAuthenticated: !!user,
    isOnboarded: !!user?.onboarding_completed,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};