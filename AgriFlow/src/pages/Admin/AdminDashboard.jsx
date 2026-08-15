import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Tabs, Tab, IconButton,
  InputAdornment, Snackbar, Alert, Tooltip, Paper, Divider
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FilterListIcon from '@mui/icons-material/FilterList';

import { users as defaultUsers } from '../../data/users';
import { analytics } from '../../data/analytics';
import { farms } from '../../data/farms';

const ROLE_COLOR = {
  farmer: '#2E7D32',
  supervisor: '#1565C0',
  manager: '#00695C',
  maintenance: '#E65100',
  admin: '#6A1B9A'
};

const PIE_COLORS = ['#2E7D32', '#1565C0', '#00695C', '#E65100', '#6A1B9A'];

const DISTRICTS = [
  'Thrissur', 'Ernakulam', 'Thiruvananthapuram', 'Alappuzha',
  'Kollam', 'Palakkad', 'Wayanad', 'Kottayam', 'Idukki',
  'Kozhikode', 'Malappuram', 'Kannur', 'Kasaragod'
];

const INITIAL_AUDIT_LOGS = [
  { id: 'LOG-109', action: 'User Restored', target: 'Ramesh Kumar (farmer)', user: 'System Admin', time: 'Just now', status: 'Success' },
  { id: 'LOG-108', action: 'Login Success', target: 'System Dashboard', user: 'admin', time: '10 mins ago', status: 'Success' },
  { id: 'LOG-107', action: 'Farm Registered', target: 'Green Valley Farm', user: 'Anil Menon', time: '1 hour ago', status: 'Success' },
  { id: 'LOG-106', action: 'Alert Resolved', target: 'Pump Failure C-002', user: 'Suresh Pillai', time: '3 hours ago', status: 'Resolved' },
  { id: 'LOG-105', action: 'Water Schedule', target: 'Block A Thrissur', user: 'Priya Nair', time: '5 hours ago', status: 'Approved' },
];

const AdminDashboard = ({ initialTab = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname === '/admin/users') return 1;
    if (location.pathname === '/admin/analytics') return 2;
    return initialTab;
  };

  const [tabIndex, setTabIndex] = useState(getTabFromPath);

  useEffect(() => {
    setTabIndex(getTabFromPath());
  }, [location.pathname, initialTab]);

  const handleTabChange = (e, val) => {
    setTabIndex(val);
    if (val === 0) navigate('/admin');
    else if (val === 1) navigate('/admin/users');
    else if (val === 2) navigate('/admin/analytics');
  };

  // User Management State with persistence
  const [userList, setUserList] = useState(() => {
    const saved = localStorage.getItem('agriflow_admin_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Guarantee Ramesh Kumar exists if missing (undo deletion)
        const hasRamesh = parsed.some(u => u.name?.toLowerCase().includes('ramesh kumar') || u.username === 'farmer');
        if (!hasRamesh) {
          const ramesh = defaultUsers.find(u => u.name === 'Ramesh Kumar') || {
            id: 1, username: 'farmer', name: 'Ramesh Kumar', role: 'farmer',
            district: 'Thrissur', phone: '9876543210', email: 'ramesh@agriflow.in', status: 'active'
          };
          return [ramesh, ...parsed];
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse saved users", e);
      }
    }
    return defaultUsers;
  });

  useEffect(() => {
    localStorage.setItem('agriflow_admin_users', JSON.stringify(userList));
  }, [userList]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals & Dialogs
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Selected User targets
  const [currentUser, setCurrentUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'farmer',
    district: 'Thrissur',
    status: 'active'
  });

  // Notification Toast
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Form Change Handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // CREATE User
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      role: 'farmer',
      district: 'Thrissur',
      status: 'active'
    });
    setOpenAddDialog(true);
  };

  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.email) {
      showNotification('Please fill in all required fields (Name, Username, Email).', 'error');
      return;
    }

    const newUser = {
      id: Date.now(),
      name: formData.name.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone || '9876500000',
      role: formData.role,
      district: formData.district,
      status: formData.status
    };

    setUserList(prev => [newUser, ...prev]);
    setOpenAddDialog(false);
    showNotification(`User "${newUser.name}" created successfully!`);
  };

  // READ / VIEW User
  const handleViewClick = (user) => {
    setCurrentUser(user);
    setOpenViewDialog(true);
  };

  // UPDATE / EDIT User
  const handleEditClick = (user) => {
    setCurrentUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      district: user.district || 'Thrissur',
      status: user.status || 'active'
    });
    setOpenEditDialog(true);
  };

  const handleEditUserSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.email) {
      showNotification('Name, Username, and Email are required.', 'error');
      return;
    }

    setUserList(prev => prev.map(u => u.id === currentUser.id ? {
      ...u,
      name: formData.name.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone,
      role: formData.role,
      district: formData.district,
      status: formData.status
    } : u));

    setOpenEditDialog(false);
    showNotification(`User "${formData.name}" updated successfully!`);
  };

  // DELETE User with Confirmation
  const handleDeleteClick = (user) => {
    setConfirmDeleteUser(user);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteUser) return;
    setUserList(prev => prev.filter(u => u.id !== confirmDeleteUser.id));
    setOpenDeleteDialog(false);
    showNotification(`User "${confirmDeleteUser.name}" deleted successfully.`, 'info');
    setConfirmDeleteUser(null);
  };

  // UNDO / RESTORE DEFAULT USERS (Including Ramesh Kumar)
  const handleRestoreDefaults = () => {
    setUserList(defaultUsers);
    localStorage.setItem('agriflow_admin_users', JSON.stringify(defaultUsers));
    showNotification('System users restored to default state (including Farmer Ramesh Kumar)!', 'success');
  };

  // Filtered Users
  const filteredUsers = userList.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.district.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Aggregates for Analytics
  const roleDistribution = Object.entries(
    userList.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.toUpperCase(), value }));

  return (
    <DashboardLayout title="System Administrator Dashboard">
      {/* Top Header Tabs */}
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
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="Overview" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label={`Users Management (${userList.length})`} />
          <Tab icon={<TrendingUpIcon />} iconPosition="start" label="Analytics & Reports" />
        </Tabs>
      </Box>

      {/* TAB 0: OVERVIEW */}
      {tabIndex === 0 && (
        <Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {[
              { title: 'Total Registered Users', value: String(userList.length), icon: <PeopleIcon />, color: '#6A1B9A' },
              { title: 'Registered Farms', value: String(farms.length), icon: <AgricultureIcon />, color: '#2E7D32' },
              { title: 'System Health', value: '99.8%', icon: <MonitorHeartIcon />, color: '#00695C' },
              { title: 'Active Sessions', value: '5', icon: <DevicesIcon />, color: '#1565C0' },
            ].map((c) => (
              <Grid item xs={12} sm={6} lg={3} key={c.title}>
                <StatCard {...c} />
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2.5}>
            {/* User Growth Chart */}
            <Grid item xs={12} md={8}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    User Growth & Platform Onboarding
                  </Typography>
                  <Chip label="+24% this month" color="success" size="small" />
                </Stack>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={analytics.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="users" stroke="#6A1B9A" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Grid>

            {/* Users by Role Breakdown */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                  Users Distribution by Role
                </Typography>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  {Object.entries(
                    userList.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
                  ).map(([role, count]) => (
                    <Box key={role}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: ROLE_COLOR[role] || '#666' }} />
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{role}</Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{count} users</Typography>
                      </Stack>
                      <Box sx={{ width: '100%', bgcolor: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ width: `${(count / userList.length) * 100}%`, bgcolor: ROLE_COLOR[role] || '#666', height: '100%' }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* Quick Actions & Recent System Activity */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                  Admin Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => { setTabIndex(1); handleOpenAdd(); }}
                      sx={{ py: 1.2, borderRadius: '10px', bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}
                    >
                      Add User
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      startIcon={<RefreshIcon />}
                      onClick={handleRestoreDefaults}
                      sx={{ py: 1.2, borderRadius: '10px' }}
                    >
                      Restore Defaults
                    </Button>
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: '#1e293b' }}>
                  System Audit Logs
                </Typography>
                <Stack spacing={1}>
                  {INITIAL_AUDIT_LOGS.slice(0, 3).map((log) => (
                    <Paper key={log.id} elevation={0} sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{log.action}: {log.target}</Typography>
                          <Typography variant="caption" color="text.secondary">By {log.user} • {log.time}</Typography>
                        </Box>
                        <Chip label={log.status} color="success" size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TAB 1: USERS MANAGEMENT (CRUD) */}
      {tabIndex === 1 && (
        <Box>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 2.5, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              {/* Search Bar */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search user by name, email, district..."
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

              {/* Role Filter */}
              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={selectedRole}
                    label="Role"
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="farmer">Farmer</MenuItem>
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                    <MenuItem value="manager">Water Manager</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Status Filter */}
              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedStatus}
                    label="Status"
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleRestoreDefaults}
                  sx={{ borderRadius: '8px' }}
                >
                  Restore Defaults
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={handleOpenAdd}
                  sx={{ borderRadius: '8px', bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}
                >
                  Add New User
                </Button>
              </Grid>
            </Grid>
          </Card>

          {/* User Management Table */}
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                System User Accounts ({filteredUsers.length} found)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Actions include Edit, View Details, and Delete with Confirmation
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['User', 'Username', 'Role', 'District', 'Email', 'Status', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No matching users found.</Typography>
                        <Button size="small" onClick={handleRestoreDefaults} sx={{ mt: 1 }}>Restore Default Users</Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar sx={{ bgcolor: ROLE_COLOR[u.role] || '#666', width: 34, height: 34, fontSize: '0.85rem', fontWeight: 700 }}>
                              {u.name ? u.name[0].toUpperCase() : 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{u.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{u.phone || 'No phone'}</Typography>
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
                        <TableCell>{u.district}</TableCell>
                        <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>{u.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={u.status || 'active'}
                            color={u.status === 'inactive' ? 'default' : u.status === 'pending' ? 'warning' : 'success'}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="View Details">
                              <IconButton size="small" color="primary" onClick={() => handleViewClick(u)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit User">
                              <IconButton size="small" color="info" onClick={() => handleEditClick(u)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete User">
                              <IconButton size="small" color="error" onClick={() => handleDeleteClick(u)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* TAB 2: ANALYTICS & REPORTS */}
      {tabIndex === 2 && (
        <Box>
          <Grid container spacing={2.5}>
            {/* Water Consumption Chart */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                  Monthly Regional Water Consumption (Liters)
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.waterConsumption}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Bar dataKey="volume" fill="#1565C0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>

            {/* Verification Progress */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                  Field Verification Status
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={analytics.verificationProgress} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                      {analytics.verificationProgress.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid>

            {/* Crop Stress Trend */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                  Crop Stress Index Trend (Weekly)
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={analytics.cropStressTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="stress" stroke="#E65100" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Grid>

            {/* Priority Distribution */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                  Irrigation Priority Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.priorityDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#00695C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>

            {/* Audit Logs Table */}
            <Grid item xs={12}>
              <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                  Comprehensive System Activity & Audit Trail
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Log ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Target Entity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Performed By</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {INITIAL_AUDIT_LOGS.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{row.id}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.action}</TableCell>
                          <TableCell>{row.target}</TableCell>
                          <TableCell>{row.user}</TableCell>
                          <TableCell color="text.secondary">{row.time}</TableCell>
                          <TableCell>
                            <Chip label={row.status} color="success" size="small" sx={{ fontSize: '0.7rem' }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ─── MODAL DIALOGS ────────────────────────────────────────────────── */}

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px', p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d32f2f', fontWeight: 700 }}>
          <WarningIcon color="error" /> Confirm Delete User
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1, color: '#1e293b' }}>
            Are you sure you want to delete user <strong>{confirmDeleteUser?.name}</strong> (<em>{confirmDeleteUser?.username}</em>)?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            This action will remove the user from the active directory list. You can restore default users anytime using the "Restore Defaults" button.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit" variant="outlined" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD USER MODAL */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Create New System User
        </DialogTitle>
        <form onSubmit={handleAddUserSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Full Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username *"
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select label="Role" name="role" value={formData.role} onChange={handleFormChange}>
                    <MenuItem value="farmer">Farmer</MenuItem>
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                    <MenuItem value="manager">Water Manager</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="admin">Administrator</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>District</InputLabel>
                  <Select label="District" name="district" value={formData.district} onChange={handleFormChange}>
                    {DISTRICTS.map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Account Status</InputLabel>
                  <Select label="Account Status" name="status" value={formData.status} onChange={handleFormChange}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending Approval</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenAddDialog(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" sx={{ borderRadius: '8px', bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}>
              Create Account
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT USER MODAL */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Edit User Profile: {currentUser?.name}
        </DialogTitle>
        <form onSubmit={handleEditUserSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Full Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username *"
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select label="Role" name="role" value={formData.role} onChange={handleFormChange}>
                    <MenuItem value="farmer">Farmer</MenuItem>
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                    <MenuItem value="manager">Water Manager</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="admin">Administrator</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>District</InputLabel>
                  <Select label="District" name="district" value={formData.district} onChange={handleFormChange}>
                    {DISTRICTS.map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Account Status</InputLabel>
                  <Select label="Account Status" name="status" value={formData.status} onChange={handleFormChange}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending Approval</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenEditDialog(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ borderRadius: '8px' }}>
              Save Changes
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* VIEW USER DETAILS MODAL */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          User Details Profile
          <IconButton size="small" onClick={() => setOpenViewDialog(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {currentUser && (
            <Stack spacing={2} alignItems="center" sx={{ pt: 1, pb: 1 }}>
              <Avatar
                sx={{
                  width: 70,
                  height: 70,
                  bgcolor: ROLE_COLOR[currentUser.role] || '#6A1B9A',
                  fontSize: '1.8rem',
                  fontWeight: 700
                }}
              >
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </Avatar>
              <Box text-align="center" sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{currentUser.name}</Typography>
                <Typography variant="body2" color="text.secondary">@{currentUser.username}</Typography>
              </Box>
              <Chip
                label={currentUser.role}
                size="small"
                sx={{
                  bgcolor: `${ROLE_COLOR[currentUser.role] || '#666'}20`,
                  color: ROLE_COLOR[currentUser.role] || '#666',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  px: 1
                }}
              />

              <Box sx={{ width: '100%', mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">Email Address:</Typography>
                  <Typography variant="body2" fontWeight={600}>{currentUser.email}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">Phone Number:</Typography>
                  <Typography variant="body2" fontWeight={600}>{currentUser.phone || 'N/A'}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">District / Zone:</Typography>
                  <Typography variant="body2" fontWeight={600}>{currentUser.district}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                  <Typography variant="body2" color="text.secondary">Account Status:</Typography>
                  <Chip
                    label={currentUser.status || 'active'}
                    color={currentUser.status === 'inactive' ? 'default' : 'success'}
                    size="small"
                  />
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => { setOpenViewDialog(false); handleEditClick(currentUser); }}
            variant="outlined"
            startIcon={<EditIcon />}
            sx={{ borderRadius: '8px' }}
          >
            Edit User
          </Button>
          <Button onClick={() => setOpenViewDialog(false)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR NOTIFICATION */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: '10px', boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default AdminDashboard;
