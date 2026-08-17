import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth, ROLE_PATHS } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  // Wait for auth to finish loading before making any routing decisions
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f3f6f1' }}>
        <CircularProgress sx={{ color: '#2e7d32' }} size={48} />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={ROLE_PATHS[user.role] || '/login'} replace />;

  return children;
};

export default ProtectedRoute;
