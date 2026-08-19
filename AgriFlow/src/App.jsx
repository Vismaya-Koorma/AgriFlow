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
import CropHealthAssistant from './pages/Farmer/CropHealthAssistant';

import AdminFarmManagement from './pages/Admin/AdminFarmManagement';
import AdminSettings from './pages/Admin/AdminSettings';

import ErrorBoundary from './components/common/ErrorBoundary';


import DecisionIntelligence from './pages/Manager/DecisionIntelligence';

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
              <ProtectedRoute role="farmer">
                <ErrorBoundary>
                  <FarmerDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/farmer/farms" element={
              <ProtectedRoute role="farmer"><FarmManagement /></ProtectedRoute>
            } />
            <Route path="/farmer/crop-health" element={
              <ProtectedRoute role="farmer"><CropHealthAssistant /></ProtectedRoute>
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
            {/* Supervisor Routes */}
            <Route path="/supervisor" element={
              <ProtectedRoute role="supervisor"><SupervisorDashboard /></ProtectedRoute>
            } />
            <Route path="/supervisor/farmers" element={
              <ProtectedRoute role="supervisor"><SupervisorDashboard /></ProtectedRoute>
            } />
            <Route path="/supervisor/verification" element={
              <ProtectedRoute role="supervisor"><SupervisorDashboard /></ProtectedRoute>
            } />
            <Route path="/supervisor/crops" element={
              <ProtectedRoute role="supervisor"><SupervisorDashboard /></ProtectedRoute>
            } />
            <Route path="/supervisor/priority" element={
              <ProtectedRoute role="supervisor"><SupervisorDashboard /></ProtectedRoute>
            } />
            <Route path="/supervisor/reports" element={
              <ProtectedRoute role="supervisor"><Reports /></ProtectedRoute>
            } />
            <Route path="/supervisor/notifications" element={
              <ProtectedRoute role="supervisor"><AlertsPage /></ProtectedRoute>
            } />
            <Route path="/supervisor/profile" element={
              <ProtectedRoute role="supervisor"><Profile /></ProtectedRoute>
            } />

            {/* Manager Routes */}
            <Route path="/manager" element={
              <ProtectedRoute role="manager"><WaterManagerDashboard initialTab={0} /></ProtectedRoute>
            } />
            <Route path="/manager/decision-intelligence" element={
              <ProtectedRoute role="manager"><DecisionIntelligence /></ProtectedRoute>
            } />
            <Route path="/manager/demand" element={
              <ProtectedRoute role="manager"><WaterManagerDashboard initialTab={2} /></ProtectedRoute>
            } />
            <Route path="/manager/allocation" element={
              <ProtectedRoute role="manager"><WaterManagerDashboard initialTab={3} /></ProtectedRoute>
            } />
            <Route path="/manager/schedules" element={
              <ProtectedRoute role="manager"><WaterManagerDashboard initialTab={3} /></ProtectedRoute>
            } />
            <Route path="/manager/complaints" element={
              <ProtectedRoute role="manager"><WaterManagerDashboard initialTab={4} /></ProtectedRoute>
            } />
            <Route path="/manager/reports" element={
              <ProtectedRoute role="manager"><Reports /></ProtectedRoute>
            } />
            <Route path="/manager/notifications" element={
              <ProtectedRoute role="manager"><AlertsPage /></ProtectedRoute>
            } />
            <Route path="/manager/profile" element={
              <ProtectedRoute role="manager"><Profile /></ProtectedRoute>
            } />

            {/* Maintenance Routes */}
            <Route path="/maintenance" element={
              <ProtectedRoute role="maintenance"><MaintenanceDashboard /></ProtectedRoute>
            } />
            <Route path="/maintenance/complaints" element={
              <ProtectedRoute role="maintenance"><MaintenanceDashboard /></ProtectedRoute>
            } />
            <Route path="/maintenance/tasks" element={
              <ProtectedRoute role="maintenance"><MaintenanceDashboard /></ProtectedRoute>
            } />
            <Route path="/maintenance/history" element={
              <ProtectedRoute role="maintenance"><MaintenanceDashboard /></ProtectedRoute>
            } />
            <Route path="/maintenance/notifications" element={
              <ProtectedRoute role="maintenance"><AlertsPage /></ProtectedRoute>
            } />
            <Route path="/maintenance/profile" element={
              <ProtectedRoute role="maintenance"><Profile /></ProtectedRoute>
            } />

            {/* Admin Portal Top Functionalities */}
            <Route path="/admin" element={
              <ProtectedRoute role="admin"><AdminDashboard initialTab={0} /></ProtectedRoute>
            } />
            <Route path="/admin/decision-intelligence" element={
              <ProtectedRoute role="admin"><DecisionIntelligence /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute role="admin"><AdminDashboard initialTab={1} /></ProtectedRoute>
            } />
            <Route path="/admin/farms" element={
              <ProtectedRoute role="admin"><AdminFarmManagement /></ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute role="admin"><AdminDashboard initialTab={2} /></ProtectedRoute>
            } />
            <Route path="/admin/alerts" element={
              <ProtectedRoute role="admin"><AlertsPage /></ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>
            } />
            <Route path="/admin/profile" element={
              <ProtectedRoute role="admin"><Profile /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
