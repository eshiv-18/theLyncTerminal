import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Routes that are part of the onboarding flow (should NOT redirect to onboarding)
const ONBOARDING_ROUTES = ['/onboarding', '/founder/onboarding', '/admin/onboarding'];

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isOnboarded } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to unauthorized page or default route based on role
    const defaultRoutes = {
      admin: '/admin',
      investor: '/portfolio',
      founder: '/founder'
    };
    return <Navigate to={defaultRoutes[user.role] || '/'} replace />;
  }

  // If user hasn't completed onboarding and is NOT already on an onboarding route,
  // redirect them to their role-specific onboarding page
  const isOnboardingRoute = ONBOARDING_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );

  if (!isOnboarded && !isOnboardingRoute) {
    const onboardingRoutes = {
      admin: '/admin/onboarding',
      investor: '/admin/onboarding',
      founder: '/onboarding'
    };
    const onboardingPath = onboardingRoutes[user.role] || '/onboarding';
    return <Navigate to={onboardingPath} replace />;
  }

  return children;
}
