import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import PortfolioDashboard from '@/pages/PortfolioDashboard';
import StartupDetail from '@/pages/StartupDetail';
import FounderWorkspace from '@/pages/FounderWorkspace';
import EnhancedFounderOnboarding from '@/pages/EnhancedFounderOnboarding';
import AlertsPage from '@/pages/AlertsPage';
import ReportsPage from '@/pages/ReportsPage';
import ReportDetailPage from '@/pages/ReportDetailPage';
import LiveFeedPage from '@/pages/LiveFeedPage';
import AdminPage from '@/pages/AdminPage';
import AdminOnboarding from '@/pages/AdminOnboarding';
import IntegrationsPage from '@/pages/IntegrationsPage';
import '@/App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Default redirect to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Onboarding */}
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
                <ProtectedRoute allowedRoles={['founder']}>
                  <EnhancedFounderOnboarding />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/onboarding" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
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
              
              {/* Founder routes */}
              <Route 
                path="/founder" 
                element={
                  <ProtectedRoute allowedRoles={['founder']}>
                    <FounderWorkspace />
                  </ProtectedRoute>
                } 
              />
              
              {/* Integrations */}
              <Route 
                path="/integrations" 
                element={
                  <ProtectedRoute>
                    <IntegrationsPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;