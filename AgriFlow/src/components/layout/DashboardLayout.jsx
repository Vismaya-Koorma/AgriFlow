import React from 'react';
import { Box, Toolbar } from '@mui/material';
import Sidebar, { useSidebar } from './Sidebar';
import Topbar from './Topbar';

const SIDEBAR_WIDTH = 240;

const DashboardLayout = ({ children, title }) => {
  const { open, toggleSidebar, closeSidebar } = useSidebar();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Sidebar open={open} onClose={closeSidebar} />
      <Box component="main" sx={{ flex: 1, ml: { md: `${SIDEBAR_WIDTH}px` }, display: 'flex', flexDirection: 'column' }}>
        <Topbar onMenuClick={toggleSidebar} title={title} />
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 }, flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
