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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const NAV_CONFIG = {
  farmer: [
    { label: 'Dashboard', path: '/farmer', icon: <DashboardIcon /> },
    { label: 'Crop Health AI', path: '/farmer/crop-health', icon: <MedicalServicesIcon /> },
    { label: 'My Farms', path: '/farmer/farms', icon: <AgricultureIcon /> },
    { label: 'My Fields', path: '/farmer/fields', icon: <GrassIcon /> },
    { label: 'Irrigation History', path: '/farmer/irrigation-history', icon: <WaterDropIcon /> },
    { label: 'Supervisor Visits', path: '/farmer/supervisor-visits', icon: <AssignmentIcon /> },
    { label: 'Maintenance', path: '/farmer/complaints', icon: <BuildIcon /> },
    { label: 'Reports', path: '/farmer/reports', icon: <BarChartIcon /> },
    { label: 'Alerts', path: '/farmer/alerts', icon: <NotificationsIcon /> },
    { label: 'Profile', path: '/farmer/profile', icon: <PersonIcon /> },
  ],
  supervisor: [
    { label: 'Dashboard', path: '/supervisor', icon: <DashboardIcon /> },
    { label: 'Assigned Farmers', path: '/supervisor/farmers', icon: <PeopleIcon /> },
    { label: 'Farm Visits', path: '/supervisor/visits', icon: <AssignmentIcon /> },
    { label: 'Field Verification', path: '/supervisor/verification', icon: <VerifiedIcon /> },
    { label: 'Crop Validation', path: '/supervisor/crops', icon: <GrassIcon /> },
    { label: 'Profile', path: '/supervisor/profile', icon: <PersonIcon /> },
  ],
  manager: [
    { label: 'Dashboard', path: '/manager', icon: <DashboardIcon /> },
    { label: 'Decision Intelligence', path: '/manager/decision-intelligence', icon: <AutoAwesomeIcon /> },
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
    { label: 'Decision Intelligence', path: '/admin/decision-intelligence', icon: <AutoAwesomeIcon /> },
    { label: 'Users', path: '/admin/users', icon: <PeopleIcon /> },
    { label: 'Farm Management', path: '/admin/farms', icon: <AgricultureIcon /> },
    { label: 'Supervisor Visits', path: '/admin/supervisor-visits', icon: <AssignmentIcon /> },
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
  const isDark = theme.palette.mode === 'dark';

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
    <Box sx={{ width: SIDEBAR_WIDTH, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Brand */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: color }}>
        <Avatar src="/agriflow-logo.jpg" alt="AgriFlow Logo" sx={{ width: 38, height: 38, border: "2px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }} />
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
          AgriFlow AI
        </Typography>
      </Box>

      {/* User Info */}
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }}>
        <Avatar sx={{ bgcolor: color, width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700 }}>
          {(user?.full_name?.trim() || user?.name?.trim() || user?.username?.trim() || 'U')[0].toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.1 }}>
            {user.full_name || user.name || user.username}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>{user.role}</Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* Nav Items */}
      <List sx={{ flex: 1, py: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              onClick={() => handleNav(item.path)}
              sx={{
                mx: 1.5,
                mb: 0.5,
                py: 0.8,
                height: 40,
                maxHeight: 40,
                borderRadius: '10px',
                bgcolor: active ? color : 'transparent',
                color: active ? '#fff' : (isDark ? '#cbd5e1' : '#475569'),
                transition: 'all 0.2s ease-in-out',
                '&:hover': { bgcolor: active ? color : `${color}18`, color: active ? '#fff' : color },
              }}
            >
              <ListItemIcon sx={{ color: active ? '#fff' : (isDark ? '#94a3b8' : '#64748b'), minWidth: 34 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 500 }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ mx: 2, borderColor: 'divider' }} />

      {/* Visually Attractive Compact Logout */}
      <Box sx={{ p: 1.5, mt: 'auto' }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            height: 40,
            maxHeight: 40,
            borderRadius: '10px',
            bgcolor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
              color: '#dc2626',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)',
              transform: 'translateY(-1px)',
              '& .MuiListItemIcon-root': {
                color: '#dc2626',
              },
            },
          }}
        >
          <ListItemIcon sx={{ color: '#ef4444', minWidth: 34, transition: 'color 0.2s ease-in-out' }}>
            <LogoutIcon sx={{ fontSize: 19 }} />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.01em' }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, bgcolor: 'background.paper', borderColor: 'divider' }
        }}
      >
        {content}
      </Drawer>
      {/* Desktop permanent */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box', bgcolor: 'background.paper', borderColor: 'divider' }
        }}
      >
        {content}
      </Drawer>
    </>
  );
};

export default Sidebar;
