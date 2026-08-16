import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Tabs, Tab, IconButton,
  InputAdornment, Snackbar, Alert, Paper, CircularProgress, Switch, Tooltip
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';

import PeopleIcon from '@mui/icons-material/People';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import DevicesIcon from '@mui/icons-material/Devices';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CategoryIcon from '@mui/icons-material/Category';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import {
  getAdminDashboardSummary,
  getAdminUsers,
  toggleUserStatus,
  createAdminUser,
  getAdminFarmsOverview
} from '../../services/api';

const ROLE_COLOR = {
  farmer: '#2E7D32',
  supervisor: '#1565C0',
  manager: '#00695C',
  maintenance: '#E65100',
  admin: '#6A1B9A'
};

const PIE_COLORS = ['#2E7D32', '#1565C0', '#00695C', '#E65100', '#6A1B9A', '#D81B60', '#8E24AA'];

const AdminDashboard = ({ initialTab = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname === '/admin/users') return 1;
    if (location.pathname === '/admin/farms') return 2;
    return initialTab;
  };

  const [tabIndex, setTabIndex] = useState(getTabFromPath);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  // Users Tab State
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Farms Tab State
  const [farmsOverview, setFarmsOverview] = useState([]);
  const [farmsLoading, setFarmsLoading] = useState(false);

  // Dialogs & Toasts
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: 'password123',
    role: 'farmer',
    district: 'Kottayam'
  });

  const showNotification = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Fetch Dashboard Aggregated Data
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDashboardSummary();
      setSummaryData(data);
    } catch (err) {
      console.error("Failed to load admin summary:", err);
      if (err.response?.status === 403) {
        setError("Access Denied: You do not have Administrator permissions.");
      } else {
        setError("Unable to load Admin Dashboard. Please check backend connection.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Users List
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await getAdminUsers({
        search: searchQuery,
        role: selectedRole,
        status: selectedStatus
      });
      const list = Array.isArray(res) ? res : (res.results || []);
      setUsersList(list);
    } catch (err) {
      console.error("Failed to load user management list:", err);
      showNotification("Failed to load user accounts list.", "error");
    } finally {
      setUsersLoading(false);
    }
  }, [searchQuery, selectedRole, selectedStatus]);

  // Fetch Platform Farms Directory
  const fetchFarms = useCallback(async () => {
    setFarmsLoading(true);
    try {
      const res = await getAdminFarmsOverview();
      setFarmsOverview(res.farms || []);
    } catch (err) {
      console.error("Failed to load farms overview:", err);
    } finally {
      setFarmsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (tabIndex === 1) fetchUsers();
    if (tabIndex === 2) fetchFarms();
  }, [tabIndex, fetchUsers, fetchFarms]);

  useEffect(() => {
    setTabIndex(getTabFromPath());
  }, [location.pathname, initialTab]);

  const handleTabChange = (e, val) => {
    setTabIndex(val);
    if (val === 0) navigate('/admin');
    else if (val === 1) navigate('/admin/users');
    else if (val === 2) navigate('/admin/farms');
  };

  // Toggle User Active Status
  const handleToggleStatus = async (user) => {
    try {
      const res = await toggleUserStatus(user.id);
      showNotification(res.message || `Status updated for ${user.username}`);
      fetchUsers();
      fetchSummary();
    } catch (err) {
      console.error("Failed to toggle status:", err);
      showNotification("Could not update user status.", "error");
    }
  };

  // Create User Submit
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.full_name) {
      showNotification("Please fill in Name, Username, and Email.", "error");
      return;
    }
    try {
      await createAdminUser(formData);
      showNotification(`User "${formData.username}" created successfully!`);
      setOpenAddDialog(false);
      setFormData({ full_name: '', username: '', email: '', password: 'password123', role: 'farmer', district: 'Kottayam' });
      fetchUsers();
      fetchSummary();
    } catch (err) {
      console.error("User creation error:", err);
      const errMsg = err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || "Failed to create user.";
      showNotification(errMsg, "error");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="System Administrator Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 2 }}>
          <CircularProgress color="primary" />
          <Typography color="text.secondary">Loading Platform Administration Analytics...</Typography>
        </Box>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="System Administrator Dashboard">
        <Alert severity="error" sx={{ borderRadius: '12px', mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchSummary}>
          Retry Loading
        </Button>
      </DashboardLayout>
    );
  }

  const cards = summaryData?.summary_cards || {};
  const userOverview = summaryData?.user_overview || {};
  const farmField = summaryData?.farm_field_overview || {};
  const crops = summaryData?.crop_distribution || [];
  const activityTrend = summaryData?.platform_activity_7_days || [];
  const aiStats = summaryData?.ai_system_overview || {};
  const notifStats = summaryData?.notification_statistics || {};
  const health = summaryData?.system_health || {};
  const recentActivity = summaryData?.recent_activity || [];

  return (
    <DashboardLayout title="System Administrator Dashboard">
      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '& .MuiTab-root': { fontWeight: 700, fontSize: '0.95rem', textTransform: 'none', px: 3 }
          }}
        >
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="Platform Monitoring" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label={`User Accounts (${cards.total_users || 0})`} />
          <Tab icon={<AgricultureIcon />} iconPosition="start" label={`Platform Farms & Fields (${cards.total_farms || 0})`} />
        </Tabs>
      </Box>

      {/* TAB 0: PLATFORM OVERVIEW & MONITORING */}
      {tabIndex === 0 && (
        <Box>
          {/* 1. SUMMARY CARDS */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard title="Total Users" value={String(cards.total_users || 0)} icon={<PeopleIcon />} color="#6A1B9A" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard title="Farmers" value={String(cards.farmers || 0)} icon={<VerifiedUserIcon />} color="#2E7D32" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard title="Water Managers" value={String(cards.water_resource_managers || 0)} icon={<MonitorHeartIcon />} color="#00695C" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard title="Total Farms" value={String(cards.total_farms || 0)} icon={<AgricultureIcon />} color="#1565C0" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard title="Total Fields" value={String(cards.total_fields || 0)} icon={<LocationOnIcon />} color="#E65100" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard title="Crop Types" value={String(cards.registered_crop_types || 0)} icon={<CategoryIcon />} color="#D81B60" />
            </Grid>
          </Grid>

          <Grid container spacing={2.5}>
            {/* 2. PLATFORM ACTIVITY (LAST 7 DAYS) */}
            <Grid item xs={12} md={8}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      Platform Growth & Activity (Last 7 Days)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tracks real-time additions of farmers, farms, fields, and AI recommendations
                    </Typography>
                  </Box>
                  <Button size="small" startIcon={<RefreshIcon />} onClick={fetchSummary}>Refresh</Button>
                </Stack>
                {activityTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={activityTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="farmers" name="New Farmers" stroke="#2E7D32" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="farms" name="New Farms" stroke="#1565C0" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="fields" name="New Fields" stroke="#E65100" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="ai_recommendations" name="AI Recommendations" stroke="#6A1B9A" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No platform activity recorded yet.</Typography>
                  </Box>
                )}
              </Card>
            </Grid>

            {/* 3. USER OVERVIEW & ROLE BREAKDOWN */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, color: '#1e293b' }}>
                  User Role Distribution
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Active Users: {userOverview.active || 0} / {userOverview.total || 0}
                </Typography>
                <Stack spacing={2}>
                  {(userOverview.role_distribution || []).map((item) => (
                    <Box key={item.role}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.role}</Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.count}</Typography>
                      </Stack>
                      <Box sx={{ width: '100%', bgcolor: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ width: `${cards.total_users ? (item.count / cards.total_users) * 100 : 0}%`, bgcolor: item.color, height: '100%' }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* 4. FARM & FIELD OVERVIEW (FIELDS BY LOCATION) */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, color: '#1e293b' }}>
                  Fields Distribution by Location / District
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Aggregated fields coverage across registered Kerala districts
                </Typography>
                {(farmField.location_distribution || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={farmField.location_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="location" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip />
                      <Bar dataKey="fields" name="Fields Count" fill="#00695C" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No farm locations registered yet.</Typography>
                  </Box>
                )}
              </Card>
            </Grid>

            {/* 5. CROP DISTRIBUTION CHART */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, color: '#1e293b' }}>
                  Registered Crop Types Distribution
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Share of registered fields per crop variety
                </Typography>
                {crops.length > 0 ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie data={crops} dataKey="count" nameKey="crop" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.crop} (${e.percentage}%)`}>
                        {crops.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No crop data available yet.</Typography>
                  </Box>
                )}
              </Card>
            </Grid>

            {/* 6. AI SYSTEM OVERVIEW */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <AutoAwesomeIcon sx={{ color: '#6A1B9A' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    AI Recommendation Engine Overview
                  </Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f3e5f5', borderRadius: '10px', textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#4a148c' }}>{aiStats.today || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Today</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#e8eaf6', borderRadius: '10px', textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1a237e' }}>{aiStats.this_month || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">This Month</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#e8f5e9', borderRadius: '10px', textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1b5e20' }}>{aiStats.average_confidence || 90}%</Typography>
                      <Typography variant="caption" color="text.secondary">Avg Confidence</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#e0f2f1', borderRadius: '10px', textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d40' }}>{aiStats.success_rate || 100}%</Typography>
                      <Typography variant="caption" color="text.secondary">Success Rate</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            {/* 7. NOTIFICATION SYSTEM STATISTICS */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <NotificationsIcon sx={{ color: '#E65100' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Notification System Statistics
                  </Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#fff3e0', borderRadius: '10px', textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#e65100' }}>{notifStats.total_notifications || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Total Sent</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#fbe9e7', borderRadius: '10px', textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#d84315' }}>{notifStats.today || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Today</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#ffebee', borderRadius: '10px', textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#c62828' }}>{notifStats.unread || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Unresolved</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f8e9', borderRadius: '10px', textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#33691e' }}>{notifStats.read || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Resolved</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            {/* 8. SYSTEM HEALTH */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                  Platform Services Health Monitor
                </Typography>
                <Stack spacing={1.5}>
                  {[
                    { name: 'Django REST API Backend', icon: <StorageIcon />, status: health.django_api?.status, label: health.django_api?.label },
                    { name: 'PostgreSQL Database Engine', icon: <StorageIcon />, status: health.postgresql?.status, label: health.postgresql?.label },
                    { name: 'AI Recommendation Service', icon: <AutoAwesomeIcon />, status: health.ai_service?.status, label: health.ai_service?.label },
                    { name: 'Live Weather API Integration', icon: <CloudIcon />, status: health.weather_service?.status, label: health.weather_service?.label },
                    { name: 'Alert & Notification Service', icon: <NotificationsIcon />, status: health.notification_service?.status, label: health.notification_service?.label },
                  ].map((service) => (
                    <Paper key={service.name} elevation={0} sx={{ p: 1.2, px: 2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ color: '#475569' }}>{service.icon}</Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{service.name}</Typography>
                        </Stack>
                        <Chip
                          icon={<CheckCircleIcon />}
                          label={service.label || 'Healthy'}
                          color={service.status === 'offline' ? 'error' : 'success'}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* 9. RECENT PLATFORM ACTIVITY */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                  Recent System Audit Activity Stream
                </Typography>
                <Stack spacing={1.2}>
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 5).map((log) => (
                      <Paper key={log.id} elevation={0} sx={{ p: 1.2, px: 2, bgcolor: '#fafafa', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                              {log.action}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {log.details}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
                            {log.timestamp}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))
                  ) : (
                    <Typography color="text.secondary">No recent platform activity recorded.</Typography>
                  )}
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TAB 1: USERS MANAGEMENT */}
      {tabIndex === 1 && (
        <Box>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 2.5, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by name, username, email, district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ bgcolor: '#f8fafc', borderRadius: '8px' }}
                />
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select value={selectedRole} label="Role" onChange={(e) => setSelectedRole(e.target.value)}>
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="farmer">Farmer</MenuItem>
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                    <MenuItem value="manager">Water Manager</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={selectedStatus} label="Status" onChange={(e) => setSelectedStatus(e.target.value)}>
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchUsers}>
                  Refresh
                </Button>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)} sx={{ bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}>
                  Add User
                </Button>
              </Grid>
            </Grid>
          </Card>

          {/* User Management Table */}
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, bgcolor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                System User Directory ({usersList.length} Accounts in PostgreSQL)
              </Typography>
            </Box>
            {usersLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={30} /></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      {['User', 'Username', 'Role', 'District', 'Email', 'Status Toggle', 'Actions'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usersList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No matching user accounts found in PostgreSQL.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersList.map((u) => (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Avatar sx={{ bgcolor: ROLE_COLOR[u.role] || '#666', width: 34, height: 34, fontSize: '0.85rem', fontWeight: 700 }}>
                                {u.full_name ? u.full_name[0].toUpperCase() : u.username[0].toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{u.full_name || u.username}</Typography>
                                <Typography variant="caption" color="text.secondary">{u.phone_number || 'No phone'}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{u.username}</TableCell>
                          <TableCell>
                            <Chip
                              label={u.role}
                              size="small"
                              sx={{
                                bgcolor: `${ROLE_COLOR[u.role] || '#666'}15`,
                                color: ROLE_COLOR[u.role] || '#666',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                fontSize: '0.7rem'
                              }}
                            />
                          </TableCell>
                          <TableCell>{u.district || 'Kerala'}</TableCell>
                          <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>{u.email}</TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Switch
                                size="small"
                                checked={u.is_active !== false}
                                onChange={() => handleToggleStatus(u)}
                                color="success"
                              />
                              <Typography variant="caption" sx={{ fontWeight: 600, color: u.is_active !== false ? '#2E7D32' : '#d32f2f' }}>
                                {u.is_active !== false ? 'Active' : 'Inactive'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.is_active !== false ? "Active" : "Disabled"}
                              color={u.is_active !== false ? "success" : "default"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Box>
      )}

      {/* TAB 2: PLATFORM FARMS & FIELDS DIRECTORY */}
      {tabIndex === 2 && (
        <Box>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 2.5, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
              Platform Farms & Registered Fields Directory
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              High-level administrative directory of all farms and fields in PostgreSQL across Kerala districts
            </Typography>
            {farmsLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={30} /></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Farm Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Owner Farmer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>District / State</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fields Count</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Registered Crops</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {farmsOverview.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No registered farms found in PostgreSQL.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      farmsOverview.map((farm) => (
                        <TableRow key={farm.id} hover>
                          <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{farm.name}</TableCell>
                          <TableCell>{farm.owner} (<em>{farm.owner_username}</em>)</TableCell>
                          <TableCell>{farm.district || 'Kottayam'}, {farm.state || 'Kerala'}</TableCell>
                          <TableCell><Chip label={`${farm.fields_count} Fields`} color="primary" size="small" /></TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                              {(farm.fields || []).map((f) => (
                                <Chip key={f.id} label={`${f.name} (${f.crop_type || 'Crop'})`} size="small" variant="outlined" />
                              ))}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Box>
      )}

      {/* CREATE USER DIALOG */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create System User</DialogTitle>
        <form onSubmit={handleAddUserSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Full Name *" fullWidth required size="small" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Username *" fullWidth required size="small" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email *" type="email" fullWidth required size="small" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Password *" type="password" fullWidth required size="small" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select value={formData.role} label="Role" onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <MenuItem value="farmer">Farmer</MenuItem>
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                    <MenuItem value="manager">Water Manager</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="District" fullWidth size="small" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenAddDialog(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}>Create User</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* SNACKBAR NOTIFICATION */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default AdminDashboard;
