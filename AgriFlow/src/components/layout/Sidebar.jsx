import React, { useState } from 'react';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Avatar, Divider, IconButton, useMediaQuery, useTheme,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import DashboardIcon from '@mui/icons-material/Dashboard';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CloudIcon from '@mui/icons-material/Cloud';
import BarChartIcon from '@mui/icons-material/BarChart';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedIcon from '@mui/icons-material/Verified';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ListAltIcon from '@mui/icons-material/ListAlt';
import GrassIcon from '@mui/icons-material/Grass';
import MenuIcon from '@mui/icons-material/Menu';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

const NAV_CONFIG = {
  farmer: [
    { label: 'Dashboard', path: '/farmer', icon: <DashboardIcon /> },
    { label: 'Crop Health AI', path: '/farmer/crop-health', icon: <MedicalServicesIcon /> },
    { label: 'My Farms', path: '/farmer/farms', icon: <AgricultureIcon /> },
    { label: 'My Fields', path: '/farmer/fields', icon: <GrassIcon /> },
    { label: 'Irrigation History', path: '/farmer/irrigation-history', icon: <WaterDropIcon /> },
    { label: 'Reports', path: '/farmer/reports', icon: <BarChartIcon /> },
    { label: 'Alerts', path: '/farmer/alerts', icon: <NotificationsIcon /> },
    { label: 'Profile', path: '/farmer/profile', icon: <PersonIcon /> },
  ],
  supervisor: [
    { label: 'Dashboard', path: '/supervisor', icon: <DashboardIcon /> },
    { label: 'Assigned Farmers', path: '/supervisor/farmers', icon: <PeopleIcon /> },
    { label: 'Field Verification', path: '/supervisor/verification', icon: <VerifiedIcon /> },
    { label: 'Crop Validation', path: '/supervisor/crops', icon: <GrassIcon /> },
    { label: 'Priority List', path: '/supervisor/priority', icon: <ListAltIcon /> },
    { label: 'Reports', path: '/supervisor/reports', icon: <BarChartIcon /> },
    { label: 'Notifications', path: '/supervisor/notifications', icon: <NotificationsIcon /> },
    { label: 'Profile', path: '/supervisor/profile', icon: <PersonIcon /> },
  ],
  manager: [
    { label: 'Dashboard', path: '/manager', icon: <DashboardIcon /> },
    { label: 'Water Demand', path: '/manager/demand', icon: <WaterDropIcon /> },
    { label: 'Water Allocation', path: '/manager/allocation', icon: <AssignmentIcon /> },
    { label: 'Schedules', path: '/manager/schedules', icon: <ListAltIcon /> },
    { label: 'Complaints', path: '/manager/complaints', icon: <BuildIcon /> },
    { label: 'Reports', path: '/manager/reports', icon: <BarChartIcon /> },
    { label: 'Notifications', path: '/manager/notifications', icon: <NotificationsIcon /> },
    { label: 'Profile', path: '/manager/profile', icon: <PersonIcon /> },
  ],
  maintenance: [
    { label: 'Dashboard', path: '/maintenance', icon: <DashboardIcon /> },
    { label: 'Complaints', path: '/maintenance/complaints', icon: <BuildIcon /> },
    { label: 'Assigned Tasks', path: '/maintenance/tasks', icon: <AssignmentIcon /> },
    { label: 'Repair History', path: '/maintenance/history', icon: <ListAltIcon /> },
    { label: 'Notifications', path: '/maintenance/notifications', icon: <NotificationsIcon /> },
    { label: 'Profile', path: '/maintenance/profile', icon: <PersonIcon /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
    { label: 'Users', path: '/admin/users', icon: <PeopleIcon /> },
    { label: 'Farm Management', path: '/admin/farms', icon: <AgricultureIcon /> },
    { label: 'Analytics', path: '/admin/analytics', icon: <BarChartIcon /> },
    { label: 'Alerts', path: '/admin/alerts', icon: <NotificationsIcon /> },
    { label: 'Settings', path: '/admin/settings', icon: <SettingsIcon /> },
    { label: 'Profile', path: '/admin/profile', icon: <PersonIcon /> },
  ],
};

const ROLE_COLORS = {
  farmer: '#2E7D32',
  supervisor: '#1565C0',
  manager: '#00695C',
  maintenance: '#E65100',
  admin: '#6A1B9A',
};

const SIDEBAR_WIDTH = 240;

export const useSidebar = () => {
  const [open, setOpen] = useState(false);
  return { open, toggleSidebar: () => setOpen(prev => !prev), closeSidebar: () => setOpen(false) };
};

const Sidebar = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!user) return null;

  const navItems = NAV_CONFIG[user.role] || [];
  const color = ROLE_COLORS[user.role] || '#2E7D32';

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const content = (
    <Box sx={{ width: SIDEBAR_WIDTH, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
      {/* Brand */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: color }}>
        <AgricultureIcon sx={{ color: '#fff', fontSize: 28 }} />
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
          AgriFlow AI
        </Typography>
      </Box>

      {/* User Info */}
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#f5f5f5' }}>
        <Avatar sx={{ bgcolor: color, width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700 }}>
          {(user?.full_name?.trim() || user?.name?.trim() || user?.username?.trim() || 'U')[0].toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', lineHeight: 1.1 }}>
            {user.full_name || user.name || user.username}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'capitalize' }}>{user.role}</Typography>
        </Box>
      </Box>

      <Divider />

      {/* Nav Items */}
      <List sx={{ flex: 1, py: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              onClick={() => handleNav(item.path)}
              sx={{
                mx: 1,
                mb: 0.3,
                borderRadius: '8px',
                bgcolor: active ? color : 'transparent',
                color: active ? '#fff' : '#475569',
                '&:hover': { bgcolor: active ? color : `${color}10` },
              }}
            >
              <ListItemIcon sx={{ color: active ? '#fff' : '#94a3b8', minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>

      <Divider />

      {/* Logout */}
      <ListItemButton onClick={handleLogout} sx={{ m: 1, borderRadius: '8px', color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
        <ListItemIcon sx={{ color: '#ef4444', minWidth: 36 }}>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.875rem' }} />
      </ListItemButton>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer variant="temporary" open={open} onClose={onClose} ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH } }}>
        {content}
      </Drawer>
      {/* Desktop permanent */}
      <Drawer variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' } }}>
        {content}
      </Drawer>
    </>
  );
};

export default Sidebar;
