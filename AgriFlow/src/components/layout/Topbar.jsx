import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Badge,
  Avatar, Tooltip, useTheme, useMediaQuery, TextField, InputAdornment,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider, Popover, List, ListItem,
  Chip, Button, CircularProgress
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import GrassIcon from '@mui/icons-material/Grass';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useThemeMode } from '../../context/ThemeContext';

import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUnreadAlertCount, getAlerts, resolveAlert, markAlertAsRead, getFields, getFarms } from '../../services/api';

const ROLE_COLORS = {
  farmer: '#2E7D32',
  supervisor: '#1565C0',
  manager: '#00695C',
  maintenance: '#E65100',
  admin: '#6A1B9A',
};

const ROLE_PAGES = {
  farmer: [
    { name: 'Dashboard', path: '/farmer', icon: DashboardIcon },
    { name: 'Crop Health AI', path: '/farmer/crop-health', icon: AssessmentIcon },
    { name: 'My Farms', path: '/farmer/farms', icon: GrassIcon },
    { name: 'My Fields', path: '/farmer/fields', icon: GrassIcon },
    { name: 'Irrigation History', path: '/farmer/irrigation-history', icon: WaterDropIcon },
    { name: 'Supervisor Visits', path: '/farmer/supervisor-visits', icon: AssessmentIcon },
    { name: 'Maintenance', path: '/farmer/complaints', icon: AssessmentIcon },
    { name: 'Reports & Analytics', path: '/farmer/reports', icon: AssessmentIcon },
    { name: 'Alerts', path: '/farmer/alerts', icon: NotificationsIcon },
    { name: 'User Profile', path: '/farmer/profile', icon: PersonIcon },
  ],
  supervisor: [
    { name: 'Supervisor Dashboard', path: '/supervisor', icon: DashboardIcon },
    { name: 'Assigned Farmers', path: '/supervisor/farmers', icon: PersonIcon },
    { name: 'Farm Visits', path: '/supervisor/visits', icon: AssessmentIcon },
    { name: 'Field Ground Truth Verification', path: '/supervisor/verification', icon: GrassIcon },
    { name: 'Crop Validation', path: '/supervisor/crops', icon: GrassIcon },
    { name: 'User Profile', path: '/supervisor/profile', icon: PersonIcon },
  ],
  manager: [
    { name: 'Dashboard', path: '/manager', icon: DashboardIcon },
    { name: 'Decision Intelligence', path: '/manager/decision-intelligence', icon: AssessmentIcon },
    { name: 'Water Demand', path: '/manager/demand', icon: WaterDropIcon },
    { name: 'Water Allocation', path: '/manager/allocation', icon: WaterDropIcon },
    { name: 'Reports', path: '/manager/reports', icon: AssessmentIcon },
    { name: 'Profile', path: '/manager/profile', icon: PersonIcon },
  ],
  maintenance: [
    { name: 'Dashboard', path: '/maintenance', icon: DashboardIcon },
    { name: 'Complaints', path: '/maintenance/complaints', icon: AssessmentIcon },
    { name: 'Assigned Tasks', path: '/maintenance/tasks', icon: AssessmentIcon },
    { name: 'Repair History', path: '/maintenance/history', icon: AssessmentIcon },
    { name: 'Profile', path: '/maintenance/profile', icon: PersonIcon },
  ],
  admin: [
    { name: 'Admin Dashboard', path: '/admin', icon: DashboardIcon },
    { name: 'User Management', path: '/admin/users', icon: PersonIcon },
    { name: 'Farm Management', path: '/admin/farms', icon: GrassIcon },
    { name: 'Supervisor Visits', path: '/admin/supervisor-visits', icon: AssessmentIcon },
    { name: 'Analytics', path: '/admin/analytics', icon: AssessmentIcon },
    { name: 'System Settings', path: '/admin/settings', icon: AssessmentIcon },
  ],
};

const Topbar = ({ onMenuClick, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode, isDarkMode, toggleTheme } = useThemeMode();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ── State for User Menu ──
  const [profileAnchor, setProfileAnchor] = useState(null);

  // ── State for Notifications Popover ──
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertsList, setAlertsList] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // ── State for Search Bar ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAnchor, setSearchAnchor] = useState(null);
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [liveFields, setLiveFields] = useState([]);

  // Fetch unread count & initial data with background polling
  useEffect(() => {
    if (user) {
      fetchNotificationData();
      fetchFieldsData();

      // Background polling every 15 seconds for live notification badge updates
      const intervalId = setInterval(() => {
        fetchNotificationData();
      }, 15000);

      const handleFocus = () => {
        fetchNotificationData();
      };
      window.addEventListener('focus', handleFocus);

      return () => {
        clearInterval(intervalId);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [user]);

  const fetchNotificationData = async () => {
    try {
      const countRes = await getUnreadAlertCount();
      if (countRes && typeof countRes.unread_count === 'number') {
        setUnreadCount(countRes.unread_count);
      }
    } catch (e) {
      console.error('Failed to fetch unread count:', e);
    }
  };

  const fetchFieldsData = async () => {
    try {
      const data = await getFields();
      setLiveFields(Array.isArray(data) ? data : (data.results || []));
    } catch (e) {
      console.error('Failed to fetch fields for search:', e);
    }
  };

  const handleOpenNotifications = async (event) => {
    setNotifAnchor(event.currentTarget);
    setLoadingAlerts(true);
    try {
      const data = await getAlerts({ is_resolved: false });
      const list = Array.isArray(data) ? data : (data.results || []);
      setAlertsList(list);
      setUnreadCount(list.length);
    } catch (e) {
      console.error('Failed to fetch alerts:', e);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleAlertItemClick = async (alert) => {
    if (!alert.is_read) {
      try {
        await markAlertAsRead(alert.id);
        setAlertsList(prev => prev.map(a => a.id === alert.id ? { ...a, is_read: true } : a));
      } catch (err) {
        console.error('Failed to mark alert as read:', err);
      }
    }
  };

  const handleResolveSingleAlert = async (e, alertId) => {
    e.stopPropagation();
    try {
      await resolveAlert(alertId);
      setAlertsList(prev => prev.filter(a => a.id !== alertId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Search logic
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 0) {
      setSearchAnchorEl(e.currentTarget);
    } else {
      setSearchAnchorEl(null);
    }
  };

  const currentRolePages = ROLE_PAGES[user?.role] || ROLE_PAGES.farmer;
  const trimmedSearch = searchQuery.trim().toLowerCase();

  const filteredPages = trimmedSearch
    ? currentRolePages.filter(p => p.name.toLowerCase().includes(trimmedSearch))
    : [];

  const filteredFields = trimmedSearch
    ? liveFields.filter(f => {
        const name = (f.name || '').toLowerCase();
        const farm = (f.farm_name || '').toLowerCase();
        const farmer = (f.farmer_name || f.farmer_username || '').toLowerCase();
        const crop = (f.crop_type_name || '').toLowerCase();
        const variety = (f.crop_variety_name || '').toLowerCase();
        const soil = (f.soil_type_name || '').toLowerCase();
        const stage = (f.crop_stage || '').toLowerCase();
        const status = (f.verification_status || '').toLowerCase();
        return (
          name.includes(trimmedSearch) ||
          farm.includes(trimmedSearch) ||
          farmer.includes(trimmedSearch) ||
          crop.includes(trimmedSearch) ||
          variety.includes(trimmedSearch) ||
          soil.includes(trimmedSearch) ||
          stage.includes(trimmedSearch) ||
          status.includes(trimmedSearch)
        );
      }).slice(0, 8)
    : [];

  const getFieldDestination = (field) => {
    if (user?.role === 'supervisor') {
      return `/supervisor?search=${encodeURIComponent(field.name)}`;
    } else if (user?.role === 'admin') {
      return `/admin/farms`;
    }
    return `/farmer/fields`;
  };

  const handleSelectSearchResult = (path) => {
    setSearchQuery('');
    setSearchAnchorEl(null);
    navigate(path);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (filteredPages.length > 0) {
        handleSelectSearchResult(filteredPages[0].path);
      } else if (filteredFields.length > 0) {
        handleSelectSearchResult(getFieldDestination(filteredFields[0]));
      } else if (trimmedSearch) {
        const defaultPath = user?.role === 'supervisor' ? `/supervisor?search=${encodeURIComponent(trimmedSearch)}` : `/${user?.role || 'farmer'}`;
        handleSelectSearchResult(defaultPath);
      }
    }
  };

  if (!user) return null;

  const color = ROLE_COLORS[user.role] || '#2E7D32';
  const roleLabel = (user.role || 'farmer').toUpperCase();
  const alertOpen = Boolean(notifAnchor);
  const profileOpen = Boolean(profileAnchor);
  const searchOpen = Boolean(searchAnchorEl && searchQuery.trim().length > 0);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: theme.zIndex.drawer + 1,
        ml: { md: '240px' },
        width: { md: 'calc(100% - 240px)' },
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        {isMobile && (
          <IconButton onClick={onMenuClick} edge="start" sx={{ color: '#475569' }}>
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: '#1e293b',
            fontSize: '1rem',
            display: { xs: 'block', md: 'none' },
            mr: 1,
          }}
        >
          {title || 'Dashboard'}
        </Typography>

        {/* ── 1. ACTIVE SEARCH BAR ── */}
        <Box sx={{ flex: 1, maxWidth: 420, display: { xs: 'none', md: 'block' }, position: 'relative' }}>
          <TextField
            placeholder="Search fields, crops, or modules..."
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '24px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
                fontSize: '0.875rem',
                '& fieldset': { borderColor: searchQuery ? '#22c55e' : (isDark ? '#334155' : '#e2e8f0') }
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: searchQuery ? '#16a34a' : '#94a3b8', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Search Results Popover Dropdown */}
          <Popover
            open={searchOpen}
            anchorEl={searchAnchorEl}
            onClose={() => setSearchAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            disableAutoFocus
            disableEnforceFocus
            PaperProps={{
              sx: { width: 420, borderRadius: '12px', mt: 1, p: 1, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }
            }}
          >
            <Typography variant="caption" sx={{ px: 2, pt: 1, fontWeight: 700, color: '#64748b', display: 'block' }}>
              MATCHING MODULES & FIELDS
            </Typography>

            <List size="small" sx={{ py: 0.5 }}>
              {filteredPages.map((page) => {
                const IconComp = page.icon;
                return (
                  <ListItem
                    button
                    key={page.path}
                    onClick={() => handleSelectSearchResult(page.path)}
                    sx={{ borderRadius: '8px', '&:hover': { bgcolor: '#f1f5f9' } }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: '#16a34a' }}>
                      <IconComp fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={page.name} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }} />
                  </ListItem>
                );
              })}

              {filteredFields.map((field) => (
                <ListItem
                  button
                  key={`field-${field.id}`}
                  onClick={() => handleSelectSearchResult(getFieldDestination(field))}
                  sx={{ borderRadius: '8px', '&:hover': { bgcolor: '#f1f5f9' } }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: '#0284c7' }}>
                    <GrassIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={field.name}
                    secondary={`${field.farm_name || 'Farm'} • ${field.crop_type_name || 'Crop'}${field.crop_variety_name ? ` (${field.crop_variety_name})` : ''}${field.verification_status ? ` • [${field.verification_status.toUpperCase()}]` : ''}`}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: '0.75rem', color: '#64748b' }}
                  />
                </ListItem>
              ))}

              {filteredPages.length === 0 && filteredFields.length === 0 && (
                <Typography variant="body2" sx={{ px: 2, py: 1.5, color: '#94a3b8', fontStyle: 'italic' }}>
                  No matching fields or data found. Press Enter to view dashboard.
                </Typography>
              )}
            </List>
          </Popover>
        </Box>

        <Box sx={{ flex: 1, display: { xs: 'block', md: 'none' } }} />

        {/* Current Date Display */}
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', fontWeight: 600, display: { xs: 'none', lg: 'block' }, whiteSpace: 'nowrap' }}
        >
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Typography>

        {/* ── THEME TOGGLE (DARK / LIGHT MODE) ── */}
        <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          <IconButton
            onClick={toggleTheme}
            sx={{
              color: isDarkMode ? '#facc15' : '#475569',
              bgcolor: isDark ? 'rgba(250, 204, 21, 0.1)' : 'rgba(0, 0, 0, 0.04)',
              borderRadius: '10px',
              p: 1,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: isDark ? 'rgba(250, 204, 21, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                transform: 'scale(1.05)',
              }
            }}
          >
            {isDarkMode ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* ── 2. ACTIVE NOTIFICATION BELL ── */}
        {user?.role !== 'supervisor' && (
          <Tooltip title="Notifications">
            <IconButton onClick={handleOpenNotifications} sx={{ color: '#475569' }}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        )}

        {/* Notifications Popover Dropdown */}
        <Popover
          open={alertOpen}
          anchorEl={notifAnchor}
          onClose={() => setNotifAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: { width: 360, borderRadius: '16px', mt: 1.5, p: 0, boxShadow: '0 20px 30px -10px rgba(0,0,0,0.15)' }
          }}
        >
          <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsIcon sx={{ color: '#6366f1', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b">Notifications</Typography>
              <Chip label={`${unreadCount} new`} size="small" color="error" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
            </Box>
            <Button
              size="small"
              onClick={() => {
                setNotifAnchor(null);
                const routeMap = {
                  farmer: '/farmer/alerts',
                  maintenance: '/maintenance/notifications',
                  supervisor: '/supervisor/notifications',
                  manager: '/manager/notifications',
                  admin: '/admin/alerts'
                };
                navigate(routeMap[user?.role] || '/farmer/alerts');
              }}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', color: '#16a34a' }}
            >
              View All
            </Button>
          </Box>

          <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {loadingAlerts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} color="success" />
              </Box>
            ) : alertsList.length === 0 ? (
              <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
                <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 36, mb: 0.5 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>All alerts resolved!</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {alertsList.map((alert) => {
                  const isCritical = alert.severity === 'critical' || alert.severity === 'High';
                  const isWarning = alert.severity === 'warning' || alert.severity === 'Medium';
                  const isResolved = alert.is_resolved || alert.status === 'resolved';
                  const isRead = alert.is_read;

                  return (
                    <ListItem
                      key={alert.id}
                      onClick={() => handleAlertItemClick(alert)}
                      sx={{
                        borderBottom: '1px solid #f1f5f9',
                        py: 1.5,
                        px: 2,
                        cursor: 'pointer',
                        bgcolor: isRead ? '#ffffff' : '#f0fdf4',
                        '&:hover': { bgcolor: isRead ? '#f8fafc' : '#dcfce7' }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34 }}>
                        {isCritical ? <ErrorOutlineIcon color="error" fontSize="small" /> :
                         isWarning ? <WarningAmberIcon sx={{ color: '#d97706' }} fontSize="small" /> :
                         <InfoOutlinedIcon color="info" fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: isRead ? 500 : 700, color: '#1e293b' }}>
                              {alert.message || alert.title || 'System Notification'}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {new Date(alert.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            <Chip
                              label={isResolved ? 'Resolved' : 'Pending'}
                              size="small"
                              color={isResolved ? 'success' : 'warning'}
                              variant={isResolved ? 'filled' : 'outlined'}
                              sx={{ height: 16, fontSize: '0.65rem', fontWeight: 700 }}
                            />
                            {!isRead && (
                              <Chip
                                label="Unread"
                                size="small"
                                color="primary"
                                sx={{ height: 16, fontSize: '0.65rem', fontWeight: 700 }}
                              />
                            )}
                          </Box>
                        }
                      />
                      {!isResolved && !alert.complaint && alert.alert_type !== 'maintenance' && user?.role !== 'maintenance' && (
                        <IconButton
                          size="small"
                          onClick={(e) => handleResolveSingleAlert(e, alert.id)}
                          title="Mark as resolved"
                          sx={{ color: '#94a3b8', '&:hover': { color: '#16a34a' } }}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        </Popover>

        {/* ── 3. ACTIVE USER AVATAR ── */}
        <Tooltip title={user?.full_name || user?.name || user?.username || 'User Profile'}>
          <Avatar
            sx={{
              bgcolor: color, width: 36, height: 36, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)', transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.06)' }
            }}
            onClick={(e) => setProfileAnchor(e.currentTarget)}
          >
            {(user?.full_name?.trim() || user?.name?.trim() || user?.username?.trim() || 'U')[0].toUpperCase()}
          </Avatar>
        </Tooltip>

        {/* User Account Profile Menu */}
        <Menu
          anchorEl={profileAnchor}
          open={profileOpen}
          onClose={() => setProfileAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: { width: 220, borderRadius: '16px', mt: 1.5, p: 0.5, boxShadow: '0 15px 25px -5px rgba(0,0,0,0.15)' }
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={800} color="#1e293b">
              {user.full_name || user.username || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {user.email || 'user@agriflow.org'}
            </Typography>
            <Chip
              label={roleLabel}
              size="small"
              sx={{ bgcolor: `${color}15`, color: color, fontWeight: 700, fontSize: '0.65rem', height: 20 }}
            />
          </Box>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem onClick={() => { setProfileAnchor(null); navigate(`/${user?.role || 'farmer'}/profile`); }}>
            <ListItemIcon><PersonIcon fontSize="small" sx={{ color: '#16a34a' }} /></ListItemIcon>
            <ListItemText primary="My Profile" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }} />
          </MenuItem>

          <MenuItem onClick={() => { setProfileAnchor(null); toggleTheme(); }}>
            <ListItemIcon sx={{ color: isDarkMode ? '#facc15' : '#475569' }}>
              {isDarkMode ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
            />
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => {
              setProfileAnchor(null);
              logout();
              navigate('/login');
            }}
            sx={{ color: '#dc2626' }}
          >
            <ListItemIcon><ExitToAppIcon fontSize="small" sx={{ color: '#dc2626' }} /></ListItemIcon>
            <ListItemText primary="Log Out" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 700 }} />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
