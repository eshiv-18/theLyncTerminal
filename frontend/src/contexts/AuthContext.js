/**
 * AuthContext.js
 *
 * FIX: completeOnboarding() is no longer exported from context.
 *
 * The previous flow was:
 *   submitOnboarding()
 *     -> api.founderOnboarding.saveOnboarding()    [backend sets onboarding_completed=true]
 *     -> await completeOnboarding()                [called AGAIN via AuthContext]
 *        -> authService.completeOnboarding()
 *           -> fetch('/api/auth/complete-onboarding')
 *              -> if token expired during 10-step flow → 401
 *                 → interceptor retries → api.post() → "api.post is not a function"
 *
 * The fix: backend already sets onboarding_completed=true in saveOnboarding/completeOnboarding.
 * We only call refreshUser() to pull the updated flag from /api/auth/me.
 * completeOnboarding is kept internally but NOT exported so nothing calls it redundantly.
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ── Initialise from persisted tokens on mount ───────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const { user: userData } = await authService.login(email, password);
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────────
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      return await authService.register(userData);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Register + auto-login ────────────────────────────────────────────────────
  const registerAndLogin = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const { user: loggedInUser } = await authService.registerAndLogin(userData);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Refresh user from backend ────────────────────────────────────────────────
  // Call this after onboarding submit so the context picks up onboarding_completed=true
  // that was set by the backend's saveOnboarding / completeOnboarding endpoint.
  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Refresh user error:', err);
      throw err;
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  // ── Role helpers ─────────────────────────────────────────────────────────────
  const hasRole    = (role)   => user?.role === role;
  const hasAnyRole = (roles)  => roles.includes(user?.role);

  // ── Context value ────────────────────────────────────────────────────────────
  // NOTE: completeOnboarding is intentionally NOT exported.
  // The backend handles marking onboarding complete during saveOnboarding/completeOnboarding.
  // Call refreshUser() after the onboarding API call to sync context state.
  const value = {
    user,
    loading,
    error,
    login,
    register,
    registerAndLogin,
    refreshUser,
    logout,
    hasRole,
    hasAnyRole,
    isAuthenticated: !!user,
    isOnboarded:     !!user?.onboarding_completed,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};