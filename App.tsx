
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LeadList from './pages/LeadList';
import LeadDetail from './pages/LeadDetail';
import Activities from './pages/Activities';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/leads" element={
            <ProtectedRoute>
              <LeadList />
            </ProtectedRoute>
          } />
          
          <Route path="/leads/:id" element={
            <ProtectedRoute>
              <LeadDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/activities" element={
            <ProtectedRoute>
              <Activities />
            </ProtectedRoute>
          } />
          
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } />

          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
