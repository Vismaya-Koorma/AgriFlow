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
import Profile from './pages/Farmer/Profile';
import FarmManagement from './pages/Farmer/FarmManagement';
import FieldManagement from './pages/Farmer/FieldManagement';
import IrrigationHistory from './pages/Farmer/IrrigationHistory';
import Reports from './pages/Farmer/Reports';
import AlertsPage from './pages/Farmer/Alerts';

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
            <Route path="/farmer/farms" element={
              <ProtectedRoute role="farmer"><FarmManagement /></ProtectedRoute>
            } />
            <Route path="/farmer/fields" element={
              <ProtectedRoute role="farmer"><FieldManagement /></ProtectedRoute>
            } />
            <Route path="/farmer/irrigation-history" element={
              <ProtectedRoute role="farmer"><IrrigationHistory /></ProtectedRoute>
            } />
            <Route path="/farmer/reports" element={
              <ProtectedRoute role="farmer"><Reports /></ProtectedRoute>
            } />
            <Route path="/farmer/alerts" element={
              <ProtectedRoute role="farmer"><AlertsPage /></ProtectedRoute>
            } />
            <Route path="/farmer/profile" element={
              <ProtectedRoute role="farmer"><Profile /></ProtectedRoute>
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
