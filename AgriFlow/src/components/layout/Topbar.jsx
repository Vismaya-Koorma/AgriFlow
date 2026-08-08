import React from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Badge,
  Avatar, Tooltip, useTheme, useMediaQuery, TextField, InputAdornment,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_COLORS = {
  farmer: '#2E7D32',
  supervisor: '#1565C0',
  manager: '#00695C',
  maintenance: '#E65100',
  admin: '#6A1B9A',
};

const Topbar = ({ onMenuClick, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!user) return null;

  const color = ROLE_COLORS[user.role] || '#2E7D32';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: '#fff',
        borderBottom: '1px solid #e2e8f0',
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

        <TextField
          placeholder="Search fields or data..."
          size="small"
          sx={{
            flex: 1,
            maxWidth: 420,
            display: { xs: 'none', md: 'block' },
            '& .MuiOutlinedInput-root': {
              borderRadius: '24px',
              bgcolor: '#f8fafc',
              fontSize: '0.875rem',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ flex: 1, display: { xs: 'block', md: 'none' } }} />

        <Typography
          variant="body2"
          sx={{ color: '#64748b', fontWeight: 500, display: { xs: 'none', lg: 'block' }, whiteSpace: 'nowrap' }}
        >
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Typography>

        <Tooltip title="Notifications">
          <IconButton sx={{ color: '#475569' }}>
            <Badge badgeContent={2} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title={user.full_name || user.name || user.username || 'User'}>
          <Avatar
            sx={{ bgcolor: color, width: 34, height: 34, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            onClick={() => {}}
          >
            {(user.full_name || user.name || user.username || 'U')[0].toUpperCase()}
          </Avatar>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
