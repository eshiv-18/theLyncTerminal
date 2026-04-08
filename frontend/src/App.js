import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import MainLayout from '@/components/MainLayout';
import PortfolioDashboard from '@/pages/PortfolioDashboard';
import StartupDetail from '@/pages/StartupDetail';
import FounderWorkspace from '@/pages/FounderWorkspace';
import AlertsPage from '@/pages/AlertsPage';
import '@/App.css';

// Route guard component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Landing/redirect component
const Landing = () => {
  const { currentUser, isFounder } = useAuth();

  React.useEffect(() => {
    if (currentUser) {
      // Redirect based on user role
      window.location.href = isFounder ? '/founder' : '/portfolio';
    }
  }, [currentUser, isFounder]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            
            {/* Main app routes */}
            <Route element={<MainLayout />}>
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
              
              {/* Founder routes */}
              <Route 
                path="/founder" 
                element={
                  <ProtectedRoute allowedRoles={['founder']}>
                    <FounderWorkspace />
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;