import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from '@/components/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import PortfolioDashboard from '@/pages/PortfolioDashboard';
import StartupDetail from '@/pages/StartupDetail';
import EnhancedFounderOnboarding from '@/pages/EnhancedFounderOnboarding';
import AlertsPage from '@/pages/AlertsPage';
import ReportsPage from '@/pages/ReportsPage';
import ReportDetailPage from '@/pages/ReportDetailPage';
import LiveFeedPage from '@/pages/LiveFeedPage';
import AdminPage from '@/pages/AdminPage';
import AdminOnboarding from '@/pages/AdminOnboarding';
import IntegrationsPage from '@/pages/IntegrationsPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import FounderHome from './pages/FounderHome';
// FIX: New page that handles the OAuth redirect landing (GitHub + Zoho callback)
import OAuthCallback from './pages/OAuthCallback';
import '@/App.css';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />

              {/* Default redirect to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/*
                FIX: OAuth callback landing page.
                GitHub and Zoho redirect to the BACKEND which processes the code,
                stores the token in DB, then redirects to this frontend page.
                This page shows success/error and routes the user appropriately.

                Backend redirects land here:
                  GitHub callback → backend processes → redirects to /oauth/callback?integration=github&status=success&org=<orgId>
                  Zoho callback   → backend processes → redirects to /oauth/callback?integration=zoho&status=success&org=<orgId>
              */}
              <Route path="/oauth/callback" element={<OAuthCallback />} />

              {/* Onboarding routes (no MainLayout wrapper) */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <EnhancedFounderOnboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/founder/onboarding"
                element={
                  <ProtectedRoute>
                    <EnhancedFounderOnboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/onboarding"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'investor']}>
                    <AdminOnboarding />
                  </ProtectedRoute>
                }
              />

              {/* Main app routes with MainLayout */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                {/* Investor routes */}
                <Route
                  path="/portfolio"
                  element={
                    <ProtectedRoute allowedRoles={['investor', 'admin']}>
                      <PortfolioDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/startup/:id"
                  element={
                    <ProtectedRoute allowedRoles={['investor', 'admin']}>
                      <StartupDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute allowedRoles={['investor', 'admin']}>
                      <AlertsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute allowedRoles={['investor', 'admin']}>
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report/:id"
                  element={
                    <ProtectedRoute allowedRoles={['investor', 'admin']}>
                      <ReportDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/feed"
                  element={
                    <ProtectedRoute allowedRoles={['investor', 'admin']}>
                      <LiveFeedPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />

                {/* Founder dashboard */}
                <Route
                  path="/founder"
                  element={
                    <ProtectedRoute allowedRoles={['founder']}>
                      <FounderHome />
                    </ProtectedRoute>
                  }
                />

                {/* Integrations page (all roles) */}
                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute>
                      <IntegrationsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <Toaster position="top-right" />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;