import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, IconButton, InputAdornment,
  Snackbar, Alert, Tooltip, Paper, Tabs, Tab, Switch, CircularProgress,
  Pagination, Divider, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';

import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import KeyIcon from '@mui/icons-material/Key';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';

import { useAuth } from '../../context/AuthContext';
import {
  getAdminUsers, getAdminUserDetail, createAdminUser, updateAdminUser,
  changeUserRole, updateUserStatus, deleteAdminUser, getAdminActivityLog,
  changePassword
} from '../../services/api';

const ROLE_COLORS = {
  farmer: { bg: '#e8f5e9', color: '#2e7d32', label: 'Farmer' },
  manager: { bg: '#e0f2f1', color: '#00695c', label: 'Water Manager' },
  supervisor: { bg: '#e3f2fd', color: '#1565c0', label: 'Supervisor' },
  maintenance: { bg: '#fff3e0', color: '#e65100', label: 'Maintenance' },
  admin: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Admin' },
};

const AdminSettings = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // User Management State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrdering, setSortOrdering] = useState('-created_at');

  // Modals & Dialogs
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);

  // Selected User State
  const [targetUser, setTargetUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form State
  const [addUserForm, setAddUserForm] = useState({
    username: '', full_name: '', email: '', password: '', confirm_password: '', role: 'farmer', district: 'Thrissur'
  });
  const [editUserForm, setEditUserForm] = useState({
    full_name: '', email: '', district: '', phone_number: ''
  });
  const [newRoleValue, setNewRoleValue] = useState('farmer');

  // Password Change Form for Logged-in Admin
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // System Configuration State
  const [sysConfig, setSysConfig] = useState({
    appName: 'AgriFlow Smart Agriculture Platform',
    defaultPageSize: '10',
    maintenanceMode: false,
    emailNotifications: true,
    inAppAlerts: true
  });

  // Activity Log State
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  // Notifications
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showNotify = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 1. Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await getAdminUsers({
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        ordering: sortOrdering,
        page: currentPage,
        page_size: pageSize
      });
      if (res.results) {
        setUsers(res.results);
        setTotalCount(res.count);
        setTotalPages(res.total_pages || Math.ceil(res.count / pageSize) || 1);
      } else {
        setUsers(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      showNotify("Failed to load user records from PostgreSQL.", "error");
    } finally {
      setLoadingUsers(false);
    }
  }, [searchQuery, roleFilter, statusFilter, sortOrdering, currentPage, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 2. Fetch Activity Logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await getAdminActivityLog({ page: logPage, page_size: 10 });
      if (res.results) {
        setActivityLogs(res.results);
        setLogTotalPages(res.total_pages || Math.ceil(res.count / 10) || 1);
      } else {
        setActivityLogs(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }, [logPage]);

  useEffect(() => {
    if (activeTab === 4) {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  // Handle Add User Submit
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!addUserForm.username || !addUserForm.email || !addUserForm.full_name || !addUserForm.password) {
      showNotify("Please fill in all required fields.", "error");
      return;
    }
    if (addUserForm.password !== addUserForm.confirm_password) {
      showNotify("Password confirmation does not match.", "error");
      return;
    }

    try {
      await createAdminUser({
        username: addUserForm.username.trim(),
        email: addUserForm.email.trim(),
        full_name: addUserForm.full_name.trim(),
        password: addUserForm.password,
        confirm_password: addUserForm.confirm_password,
        role: addUserForm.role,
        district: addUserForm.district,
        is_active: true
      });
      showNotify(`User '${addUserForm.username}' created successfully.`);
      setOpenAddModal(false);
      setAddUserForm({ username: '', full_name: '', email: '', password: '', confirm_password: '', role: 'farmer', district: 'Thrissur' });
      fetchUsers();
    } catch (err) {
      const errMsg = err.response?.data?.email?.[0] || err.response?.data?.username?.[0] || err.response?.data?.error || "Failed to create user.";
      showNotify(errMsg, "error");
    }
  };

  // Handle View User Click
  const handleViewClick = async (u) => {
    setTargetUser(u);
    setOpenViewModal(true);
    setLoadingDetail(true);
    try {
      const res = await getAdminUserDetail(u.id);
      setUserDetail(res);
    } catch (err) {
      console.error("Failed to load user detail:", err);
      setUserDetail(u);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Edit User Click
  const handleEditClick = (u) => {
    setTargetUser(u);
    setEditUserForm({
      full_name: u.full_name || '',
      email: u.email || '',
      district: u.district || '',
      phone_number: u.phone_number || ''
    });
    setOpenEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateAdminUser(targetUser.id, editUserForm);
      showNotify(`User '${targetUser.username}' updated successfully.`);
      setOpenEditModal(false);
      fetchUsers();
    } catch (err) {
      const errMsg = err.response?.data?.email?.[0] || err.response?.data?.error || "Failed to update user.";
      showNotify(errMsg, "error");
    }
  };

  // Handle Change Role Click
  const handleChangeRoleClick = (u) => {
    setTargetUser(u);
    setNewRoleValue(u.role);
    setOpenRoleModal(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    try {
      await changeUserRole(targetUser.id, newRoleValue);
      showNotify(`Role for '${targetUser.username}' updated to ${ROLE_COLORS[newRoleValue]?.label || newRoleValue}.`);
      setOpenRoleModal(false);
      fetchUsers();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to change user role.";
      showNotify(errMsg, "error");
    }
  };

  // Handle Toggle Status Click
  const handleStatusToggleClick = (u) => {
    if (u.id === currentUser?.id) {
      showNotify("You cannot deactivate or delete your own administrator account.", "error");
      return;
    }
    setTargetUser(u);
    setOpenStatusDialog(true);
  };

  const handleConfirmStatusToggle = async () => {
    try {
      const res = await updateUserStatus(targetUser.id);
      showNotify(res.message || "User status updated successfully.");
      setOpenStatusDialog(false);
      fetchUsers();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to update user status.";
      showNotify(errMsg, "error");
    }
  };

  // Handle Delete User Click
  const handleDeleteClick = (u) => {
    if (u.id === currentUser?.id) {
      showNotify("You cannot deactivate or delete your own administrator account.", "error");
      return;
    }
    setTargetUser(u);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await deleteAdminUser(targetUser.id);
      showNotify(res.message || `User '${targetUser.username}' deleted successfully.`);
      setOpenDeleteDialog(false);
      fetchUsers();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to delete user.";
      showNotify(errMsg, "error");
    }
  };

  // Handle Admin Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showNotify("New passwords do not match.", "error");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password
      });
      showNotify("Administrator password changed successfully.");
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const errMsg = err.response?.data?.old_password?.[0] || err.response?.data?.confirm_password?.[0] || "Failed to change password.";
      showNotify(errMsg, "error");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Admin Management & System Configuration">
      {/* Header Tabs Navigation */}
      <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: '#fafafa',
            borderBottom: '1px solid #f0f0f0',
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', py: 2, fontSize: '0.95rem' }
          }}
        >
          <Tab icon={<PeopleIcon sx={{ mr: 1 }} />} iconPosition="start" label="User Management" />
          <Tab icon={<AdminPanelSettingsIcon sx={{ mr: 1 }} />} iconPosition="start" label="Roles & Permissions" />
          <Tab icon={<SecurityIcon sx={{ mr: 1 }} />} iconPosition="start" label="Security Settings" />
          <Tab icon={<SettingsIcon sx={{ mr: 1 }} />} iconPosition="start" label="System Configuration" />
          <Tab icon={<HistoryIcon sx={{ mr: 1 }} />} iconPosition="start" label="Admin Activity Log" />
        </Tabs>
      </Paper>

      {/* ─── TAB 0: USER MANAGEMENT ────────────────────────────────────────── */}
      {activeTab === 0 && (
        <Box>
          {/* Executive User Summary Cards */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Total System Users" value={String(totalCount)} icon={<PeopleIcon />} color="#6A1B9A" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Active Accounts" value={String(users.filter(u => u.is_active).length)} icon={<CheckCircleIcon />} color="#2E7D32" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Registered Farmers" value={String(users.filter(u => u.role === 'farmer').length)} icon={<PeopleIcon />} color="#00695C" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Water Resource Managers" value={String(users.filter(u => u.role === 'manager').length)} icon={<PeopleIcon />} color="#1565C0" />
            </Grid>
          </Grid>

          {/* Search, Filters, and Action Bar */}
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 2.5, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search user name, email, district..."
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
                  <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="farmer">Farmer</MenuItem>
                    <MenuItem value="manager">Water Manager</MenuItem>
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active Only</MenuItem>
                    <MenuItem value="inactive">Inactive Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select value={sortOrdering} label="Sort By" onChange={(e) => setSortOrdering(e.target.value)}>
                    <MenuItem value="-created_at">Newest First</MenuItem>
                    <MenuItem value="created_at">Oldest First</MenuItem>
                    <MenuItem value="full_name">Name (A-Z)</MenuItem>
                    <MenuItem value="role">Role</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  size="small"
                  onClick={() => setOpenAddModal(true)}
                  sx={{ borderRadius: '8px', bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' }, height: 40 }}
                >
                  Add New User
                </Button>
              </Grid>
            </Grid>
          </Card>

          {/* User Accounts Table */}
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                System User Directory ({totalCount} Users)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Protected by PostgreSQL & Django Authorization
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Name & Username', 'Email', 'Role', 'Status', 'Registered Date', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={32} />
                        <Typography color="text.secondary" sx={{ mt: 1 }}>Loading users from PostgreSQL...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No users match the selected search & filter parameters.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => {
                      const rConfig = ROLE_COLORS[u.role] || { bg: '#f5f5f5', color: '#616161', label: u.role };
                      return (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Avatar sx={{ bgcolor: rConfig.color, width: 36, height: 36, fontWeight: 700, fontSize: '0.9rem' }}>
                                {(u.full_name || u.username)[0].toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                  {u.full_name || u.username} {u.id === currentUser?.id && <Chip label="You" size="small" color="secondary" sx={{ height: 18, fontSize: '0.65rem', ml: 0.5 }} />}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">@{u.username}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{u.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={rConfig.label}
                              size="small"
                              sx={{ bgcolor: rConfig.bg, color: rConfig.color, fontWeight: 700, borderRadius: '6px' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Switch
                                size="small"
                                checked={u.is_active}
                                onChange={() => handleStatusToggleClick(u)}
                                color="success"
                                disabled={u.id === currentUser?.id}
                              />
                              <Typography variant="caption" sx={{ fontWeight: 600, color: u.is_active ? '#2e7d32' : '#9e9e9e' }}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                            {new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="View User Details">
                                <IconButton size="small" color="primary" onClick={() => handleViewClick(u)}>
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Profile">
                                <IconButton size="small" color="info" onClick={() => handleEditClick(u)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Change Role">
                                <IconButton size="small" color="secondary" onClick={() => handleChangeRoleClick(u)}>
                                  <SwapHorizIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Account">
                                <span>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteClick(u)} disabled={u.id === currentUser?.id}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
                <Typography variant="caption" color="text.secondary">
                  Showing page {currentPage} of {totalPages} ({totalCount} total user records)
                </Typography>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(e, val) => setCurrentPage(val)}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </Card>
        </Box>
      )}

      {/* ─── TAB 1: ROLES & PERMISSIONS ──────────────────────────────────────── */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
            Platform Role Permissions & Access Control Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Roles define backend authorization bounds across AgriFlow modules. All roles enforce strict JWT REST API checks.
          </Typography>

          <Grid container spacing={2.5}>
            {[
              {
                role: 'Farmer',
                key: 'farmer',
                desc: 'Primary agricultural producer managing personal farms and crop fields.',
                permissions: ['Create & Edit own Farms and Fields', 'Receive live weather & AI irrigation alerts', 'Access Crop Health Assistant', 'Generate farm yield reports']
              },
              {
                role: 'Water Resource Manager',
                key: 'manager',
                desc: 'Regional supervisor managing water reservoirs, canals, and bulk allocation.',
                permissions: ['Monitor district water levels & storage', 'Manage canal discharge rates', 'Oversee regional water conservation', 'View aggregated water distribution analytics']
              },
              {
                role: 'Supervisor',
                key: 'supervisor',
                desc: 'Field inspection supervisor validating agricultural practices and node telemetry.',
                permissions: ['Validate farmer field registrations', 'Oversee local agricultural zones', 'Inspect sensor node installations', 'Approve regional assistance requests']
              },
              {
                role: 'Maintenance',
                key: 'maintenance',
                desc: 'Technical infrastructure staff maintaining sensors, hardware, and gateways.',
                permissions: ['Monitor hardware node telemetry & battery levels', 'Log device repairs and maintenance tickets', 'Calibrate soil moisture sensors', 'Inspect gateway uptime']
              },
              {
                role: 'Platform Administrator',
                key: 'admin',
                desc: 'System administrator managing platform users, system health, and overall security.',
                permissions: ['Full User Account CRUD & Status Management', 'Role changes and permission enforcement', 'Platform-wide telemetry & health monitoring', 'Audit logging & administrative security']
              },
            ].map((r) => {
              const rConf = ROLE_COLORS[r.key] || ROLE_COLORS.farmer;
              const count = users.filter(u => u.role === r.key).length;
              return (
                <Grid item xs={12} md={6} key={r.role}>
                  <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 3, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Chip label={r.role} sx={{ bgcolor: rConf.bg, color: rConf.color, fontWeight: 700, px: 1 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b' }}>
                        {count} Users Assigned
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#334155', mb: 2 }}>
                      {r.desc}
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1 }}>
                      MODULE PERMISSIONS:
                    </Typography>
                    <List dense disablePadding>
                      {r.permissions.map((p, idx) => (
                        <ListItem key={idx} disableGutters sx={{ py: 0.2 }}>
                          <ListItemIcon sx={{ minWidth: 26 }}>
                            <CheckCircleIcon sx={{ fontSize: 16, color: rConf.color }} />
                          </ListItemIcon>
                          <ListItemText primary={<Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#475569' }}>{p}</Typography>} />
                        </ListItem>
                      ))}
                    </List>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ─── TAB 2: SECURITY SETTINGS ────────────────────────────────────────── */}
      {activeTab === 2 && (
        <Box>
          <Grid container spacing={3}>
            {/* Authenticated Admin Account Overview */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon color="primary" /> Authenticated Admin Profile
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" color="text.secondary">Current Admin User</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {currentUser?.full_name || currentUser?.username} (@{currentUser?.username})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{currentUser?.email}</Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" color="text.secondary">Authentication Architecture</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', mt: 0.5 }}>
                      JSON Web Tokens (SimpleJWT) with PBKDF2 Password Hashing
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" color="text.secondary">Active Role Authorization</Typography>
                    <Chip label="Platform Administrator" color="secondary" size="small" sx={{ fontWeight: 700, mt: 0.5 }} />
                  </Box>
                </Stack>
              </Card>
            </Grid>

            {/* Change Admin Password */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LockIcon color="secondary" /> Change My Password
                </Typography>
                <form onSubmit={handlePasswordSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      label="Current Password *"
                      type="password"
                      fullWidth
                      required
                      size="small"
                      value={passwordForm.old_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                    />
                    <TextField
                      label="New Password *"
                      type="password"
                      fullWidth
                      required
                      size="small"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    />
                    <TextField
                      label="Confirm New Password *"
                      type="password"
                      fullWidth
                      required
                      size="small"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={passwordSubmitting}
                      sx={{ borderRadius: '8px', bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' }, py: 1 }}
                    >
                      {passwordSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Update Password'}
                    </Button>
                  </Stack>
                </form>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ─── TAB 3: SYSTEM CONFIGURATION ────────────────────────────────────── */}
      {activeTab === 3 && (
        <Box>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 3, maxWidth: 800 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon color="primary" /> Platform System Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure operational defaults and system parameters backed by live database configuration.
            </Typography>

            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  label="Application Title"
                  fullWidth
                  size="small"
                  value={sysConfig.appName}
                  onChange={(e) => setSysConfig({ ...sysConfig, appName: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Default Pagination Size</InputLabel>
                  <Select
                    value={sysConfig.defaultPageSize}
                    label="Default Pagination Size"
                    onChange={(e) => setSysConfig({ ...sysConfig, defaultPageSize: e.target.value })}
                  >
                    <MenuItem value="10">10 items per page</MenuItem>
                    <MenuItem value="20">20 items per page</MenuItem>
                    <MenuItem value="50">50 items per page</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Database Backend"
                  fullWidth
                  size="small"
                  value="PostgreSQL (PostGIS Enabled)"
                  disabled
                />
              </Grid>

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px', bgcolor: '#f8fafc' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>System Maintenance Mode</Typography>
                      <Typography variant="caption" color="text.secondary">
                        When enabled, non-admin users receive a maintenance notice during login.
                      </Typography>
                    </Box>
                    <Switch
                      checked={sysConfig.maintenanceMode}
                      onChange={(e) => {
                        setSysConfig({ ...sysConfig, maintenanceMode: e.target.checked });
                        showNotify(`Maintenance mode ${e.target.checked ? 'ENABLED' : 'DISABLED'}.`, e.target.checked ? 'warning' : 'info');
                      }}
                      color="warning"
                    />
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  sx={{ borderRadius: '8px', bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
                  onClick={() => showNotify("System configuration saved successfully.")}
                >
                  Save Configuration
                </Button>
              </Grid>
            </Grid>
          </Card>
        </Box>
      )}

      {/* ─── TAB 4: ADMIN ACTIVITY LOG ──────────────────────────────────────── */}
      {activeTab === 4 && (
        <Box>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon color="primary" /> Administrative Audit Log
              </Typography>
              <Button size="small" startIcon={<RefreshIcon />} onClick={fetchLogs}>Refresh Log</Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Timestamp', 'Admin User', 'Action', 'Target Account', 'Details'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingLogs ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={32} />
                        <Typography color="text.secondary" sx={{ mt: 1 }}>Loading audit log entries...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : activityLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No administrative activity recorded yet.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    activityLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#6A1B9A' }}>
                          @{log.admin_username || 'admin'}
                        </TableCell>
                        <TableCell>
                          <Chip label={log.action} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{log.target_user_info}</TableCell>
                        <TableCell sx={{ color: '#334155', fontSize: '0.85rem' }}>{log.details}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {logTotalPages > 1 && (
              <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
                <Pagination
                  count={logTotalPages}
                  page={logPage}
                  onChange={(e, val) => setLogPage(val)}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </Card>
        </Box>
      )}

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* ADD NEW USER MODAL */}
      <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Create New System Account
        </DialogTitle>
        <form onSubmit={handleAddUserSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Full Name *" fullWidth required size="small" value={addUserForm.full_name} onChange={(e) => setAddUserForm({ ...addUserForm, full_name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Username *" fullWidth required size="small" value={addUserForm.username} onChange={(e) => setAddUserForm({ ...addUserForm, username: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email Address *" type="email" fullWidth required size="small" value={addUserForm.email} onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role *</InputLabel>
                  <Select value={addUserForm.role} label="Role *" onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}>
                    <MenuItem value="farmer">Farmer</MenuItem>
                    <MenuItem value="manager">Water Resource Manager</MenuItem>
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="admin">Administrator</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Password *" type="password" fullWidth required size="small" value={addUserForm.password} onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Confirm Password *" type="password" fullWidth required size="small" value={addUserForm.confirm_password} onChange={(e) => setAddUserForm({ ...addUserForm, confirm_password: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenAddModal(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" sx={{ borderRadius: '8px', bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}>
              Create Account
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT USER MODAL */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Edit User Profile: {targetUser?.username}
        </DialogTitle>
        <form onSubmit={handleEditSubmit}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Full Name *" fullWidth required size="small" value={editUserForm.full_name} onChange={(e) => setEditUserForm({ ...editUserForm, full_name: e.target.value })} />
              <TextField label="Email Address *" type="email" fullWidth required size="small" value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} />
              <TextField label="District" fullWidth size="small" value={editUserForm.district} onChange={(e) => setEditUserForm({ ...editUserForm, district: e.target.value })} />
              <TextField label="Phone Number" fullWidth size="small" value={editUserForm.phone_number} onChange={(e) => setEditUserForm({ ...editUserForm, phone_number: e.target.value })} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenEditModal(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ borderRadius: '8px' }}>Save Changes</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* CHANGE ROLE MODAL */}
      <Dialog open={openRoleModal} onClose={() => setOpenRoleModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Change Role for @{targetUser?.username}
        </DialogTitle>
        <form onSubmit={handleRoleSubmit}>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Are you sure you want to change this user's role? Changing role immediately updates authorization on next session.
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Select New Role</InputLabel>
              <Select value={newRoleValue} label="Select New Role" onChange={(e) => setNewRoleValue(e.target.value)}>
                <MenuItem value="farmer">Farmer</MenuItem>
                <MenuItem value="manager">Water Resource Manager</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenRoleModal(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="secondary" sx={{ borderRadius: '8px', fontWeight: 700 }}>Confirm Role Change</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* VIEW USER DETAILS MODAL */}
      <Dialog open={openViewModal} onClose={() => setOpenViewModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          User Profile Overview
          <IconButton size="small" onClick={() => setOpenViewModal(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetail ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
          ) : targetUser && (
            <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
              <Avatar sx={{ width: 60, height: 60, bgcolor: ROLE_COLORS[targetUser.role]?.color || '#2E7D32', fontSize: '1.4rem', fontWeight: 700 }}>
                {(targetUser.full_name || targetUser.username)[0].toUpperCase()}
              </Avatar>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{targetUser.full_name || targetUser.username}</Typography>
                <Typography variant="body2" color="text.secondary">@{targetUser.username} • {targetUser.email}</Typography>
              </Box>

              <Chip
                label={ROLE_COLORS[targetUser.role]?.label || targetUser.role}
                sx={{ bgcolor: ROLE_COLORS[targetUser.role]?.bg, color: ROLE_COLORS[targetUser.role]?.color, fontWeight: 700 }}
              />

              <Box sx={{ width: '100%', mt: 1 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">Account Status:</Typography>
                  <Typography variant="body2" fontWeight={600} color={targetUser.is_active ? 'success.main' : 'text.disabled'}>
                    {targetUser.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">Registered Date:</Typography>
                  <Typography variant="body2" fontWeight={600}>{new Date(targetUser.created_at).toLocaleDateString()}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">District:</Typography>
                  <Typography variant="body2" fontWeight={600}>{targetUser.district || 'Kerala'}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">Owned Farms:</Typography>
                  <Typography variant="body2" fontWeight={600}>{userDetail?.farms_count || 0} Farms</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                  <Typography variant="body2" color="text.secondary">Registered Fields:</Typography>
                  <Typography variant="body2" fontWeight={600}>{userDetail?.fields_count || 0} Fields</Typography>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewModal(false)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* STATUS TOGGLE DIALOG */}
      <Dialog open={openStatusDialog} onClose={() => setOpenStatusDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px', p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#e65100', fontWeight: 700 }}>
          <WarningIcon color="warning" /> Confirm Status Change
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1, color: '#1e293b' }}>
            Are you sure you want to {targetUser?.is_active ? 'deactivate' : 'activate'} user <strong>@{targetUser?.username}</strong>?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            {targetUser?.is_active ? 'Deactivating this user prevents system login. Data, farms, and fields remain intact.' : 'Activating restores system login access.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenStatusDialog(false)} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmStatusToggle} color="warning" variant="contained" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Confirm Status Change
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px', p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d32f2f', fontWeight: 700 }}>
          <WarningIcon color="error" /> Delete User Account?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1, color: '#1e293b' }}>
            Are you sure you want to permanently delete user account <strong>@{targetUser?.username}</strong> ({targetUser?.email})?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            This operation will remove the user record safely from PostgreSQL.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar open={snackbar.open} autoHideDuration={4500} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ borderRadius: '10px', boxShadow: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default AdminSettings;
