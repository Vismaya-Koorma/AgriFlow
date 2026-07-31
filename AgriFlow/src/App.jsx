import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import FarmerDashboard from './pages/Farmer/FarmerDashboard';
import SupervisorDashboard from './pages/Supervisor/SupervisorDashboard';
import WaterManagerDashboard from './pages/WaterManager/WaterManagerDashboard';
import MaintenanceDashboard from './pages/Maintenance/MaintenanceDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/farmer" element={
              <ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>
            } />
            <Route path="/supervisor" element={
              <ProtectedRoute role="supervisor"><SupervisorDashboard /></ProtectedRoute>
            } />
            <Route path="/manager" element={
              <ProtectedRoute role="manager"><WaterManagerDashboard /></ProtectedRoute>
            } />
            <Route path="/maintenance" element={
              <ProtectedRoute role="maintenance"><MaintenanceDashboard /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
