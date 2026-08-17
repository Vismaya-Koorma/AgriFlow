import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Alert as MuiAlert, CircularProgress, IconButton, Tooltip as MuiTooltip
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';

import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import OpacityIcon from '@mui/icons-material/Opacity';
import StorageIcon from '@mui/icons-material/Storage';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RefreshIcon from '@mui/icons-material/Refresh';

import {
  getWaterSources, createWaterSource, updateWaterSource, updateWaterLevel, getWaterSourceHistory,
  getWaterAllocationRequests, approveWaterAllocationRequest, rejectWaterAllocationRequest,
  getWaterAllocations, getWaterUsages, recordWaterUsage,
  getWaterManagerDashboard, getWaterManagerReports
} from '../../services/api';

const STATUS_COLOR = {
  normal: 'success',
  low: 'warning',
  critical: 'error',
  approved: 'success',
  partially_approved: 'info',
  pending: 'warning',
  rejected: 'error',
  active: 'success',
  used: 'default'
};

const WaterManagerDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [sources, setSources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [usages, setUsages] = useState([]);

  // Modal States
  const [openSourceModal, setOpenSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [sourceForm, setSourceForm] = useState({ name: '', source_type: 'reservoir', location: '', capacity_liters: '', current_level_liters: '' });

  const [openLevelModal, setOpenLevelModal] = useState(false);
  const [selectedSourceForLevel, setSelectedSourceForLevel] = useState(null);
  const [levelForm, setLevelForm] = useState({ new_level_liters: '', reason: '' });

  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [sourceHistory, setSourceHistory] = useState([]);
  const [historySourceName, setHistorySourceName] = useState('');

  const [openApproveModal, setOpenApproveModal] = useState(false);
  const [selectedReqForApprove, setSelectedReqForApprove] = useState(null);
  const [approveForm, setApproveForm] = useState({ water_source_id: '', approved_amount_liters: '' });

  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [selectedReqForReject, setSelectedReqForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [openUsageModal, setOpenUsageModal] = useState(false);
  const [usageForm, setUsageForm] = useState({ water_source: '', field: '', volume_liters: '', notes: '' });

  // Filter States
  const [sourceSearch, setSourceSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [dashRes, sourcesRes, reqsRes, allocsRes, usagesRes] = await Promise.all([
        getWaterManagerDashboard().catch(() => null),
        getWaterSources().catch(() => []),
        getWaterAllocationRequests().catch(() => []),
        getWaterAllocations().catch(() => []),
        getWaterUsages().catch(() => [])
      ]);

      setDashboardData(dashRes);
      setSources(Array.isArray(sourcesRes) ? sourcesRes : sourcesRes?.results || []);
      setRequests(Array.isArray(reqsRes) ? reqsRes : reqsRes?.results || []);
      setAllocations(Array.isArray(allocsRes) ? allocsRes : allocsRes?.results || []);
      setUsages(Array.isArray(usagesRes) ? usagesRes : usagesRes?.results || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load water resource management data from PostgreSQL server.');
    } finally {
      setLoading(false);
    }
  };

  // Helper Formatter
  const formatLiters = (val) => {
    const num = Number(val || 0);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)} ML`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)} kL`;
    return `${num.toLocaleString()} L`;
  };

  // Water Source Handlers
  const handleSaveSource = async () => {
    try {
      if (editingSource) {
        await updateWaterSource(editingSource.id, sourceForm);
        setSuccessMsg(`Water source '${sourceForm.name}' updated successfully.`);
      } else {
        await createWaterSource(sourceForm);
        setSuccessMsg(`New water source '${sourceForm.name}' created successfully.`);
      }
      setOpenSourceModal(false);
      fetchAllData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.response?.data?.name?.[0] || 'Failed to save water source.');
    }
  };

  const handleUpdateLevelSubmit = async () => {
    try {
      await updateWaterLevel(selectedSourceForLevel.id, levelForm);
      setSuccessMsg(`Water level updated for '${selectedSourceForLevel.name}'.`);
      setOpenLevelModal(false);
      fetchAllData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update water level.');
    }
  };

  const handleViewHistory = async (source) => {
    setHistorySourceName(source.name);
    try {
      const hist = await getWaterSourceHistory(source.id);
      setSourceHistory(hist);
      setOpenHistoryModal(true);
    } catch (err) {
      setErrorMsg('Failed to load level history.');
    }
  };

  // Request Handlers
  const handleApproveSubmit = async () => {
    try {
      await approveWaterAllocationRequest(selectedReqForApprove.id, approveForm);
      setSuccessMsg(`Allocation request #${selectedReqForApprove.id} approved successfully.`);
      setOpenApproveModal(false);
      fetchAllData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to approve allocation request.');
    }
  };

  const handleRejectSubmit = async () => {
    try {
      await rejectWaterAllocationRequest(selectedReqForReject.id, { reason: rejectReason });
      setSuccessMsg(`Allocation request #${selectedReqForReject.id} rejected.`);
      setOpenRejectModal(false);
      fetchAllData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to reject allocation request.');
    }
  };

  const handleRecordUsageSubmit = async () => {
    try {
      await recordWaterUsage(usageForm);
      setSuccessMsg('Water usage recorded successfully.');
      setOpenUsageModal(false);
      fetchAllData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to record water usage.');
    }
  };

  const summary = dashboardData?.summary || {
    total_available_liters: sources.reduce((acc, s) => acc + Number(s.available_liters || 0), 0),
    total_allocated_liters: allocations.reduce((acc, a) => acc + Number(a.allocated_amount_liters || 0), 0),
    total_used_liters: allocations.reduce((acc, a) => acc + Number(a.used_amount_liters || 0), 0),
    remaining_water_liters: 0,
    active_sources_count: sources.filter(s => s.is_active).length,
    pending_requests_count: requests.filter(r => r.status === 'pending').length,
  };
  summary.remaining_water_liters = Math.max(0, summary.total_available_liters - summary.total_allocated_liters);

  return (
    <DashboardLayout title="Water Resource Manager & Allocation Center">
      {/* Alert Notifications */}
      {errorMsg && <MuiAlert severity="error" onClose={() => setErrorMsg('')} sx={{ mb: 2 }}>{errorMsg}</MuiAlert>}
      {successMsg && <MuiAlert severity="success" onClose={() => setSuccessMsg('')} sx={{ mb: 2 }}>{successMsg}</MuiAlert>}

      {/* Top Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
          💧 Water Management Console
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAllData}>
            Refresh
          </Button>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => {
            setEditingSource(null);
            setSourceForm({ name: '', source_type: 'reservoir', location: 'Pala', capacity_liters: '', current_level_liters: '' });
            setOpenSourceModal(true);
          }}>
            Add Water Source
          </Button>
        </Stack>
      </Box>

      {/* Top Executive Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Total Water Available', value: formatLiters(summary.total_available_liters), icon: <WaterDropIcon />, color: '#00695C' },
          { title: 'Water Allocated', value: formatLiters(summary.total_allocated_liters), icon: <CheckCircleIcon />, color: '#1565C0' },
          { title: 'Water Used', value: formatLiters(summary.total_used_liters), icon: <OpacityIcon />, color: '#2E7D32' },
          { title: 'Remaining Water', value: formatLiters(summary.remaining_water_liters), icon: <StorageIcon />, color: '#0284C7' },
          { title: 'Active Water Sources', value: summary.active_sources_count, icon: <StorageIcon />, color: '#475569' },
          { title: 'Pending Requests', value: summary.pending_requests_count, icon: <HourglassEmptyIcon />, color: '#E65100' },
        ].map((c) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={c.title}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* Console Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, val) => setCurrentTab(val)} textColor="primary" indicatorColor="primary">
          <Tab label="📊 Overview & Analytics" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="🌊 Water Sources" icon={<StorageIcon />} iconPosition="start" />
          <Tab label="📝 Allocation Requests" icon={<HourglassEmptyIcon />} iconPosition="start" />
          <Tab label="📋 Allocations & Usage" icon={<CheckCircleIcon />} iconPosition="start" />
          <Tab label="🚨 Resource Alerts" icon={<WarningIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* TAB 0: OVERVIEW & ANALYTICS */}
          {currentTab === 0 && (
            <Grid container spacing={2.5}>
              {/* Regional Demand vs Availability */}
              <Grid item xs={12} md={7}>
                <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                    Water Demand vs Availability by Region (Liters)
                  </Typography>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dashboardData?.demand_vs_availability || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="district" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString()} L`} />
                      <Bar dataKey="available_liters" name="Available Water" fill="#00695C" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="demand_liters" name="Requested Demand" fill="#E65100" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>

              {/* Water Source Capacity Breakdown */}
              <Grid item xs={12} md={5}>
                <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                    Active Source Level Capacity (%)
                  </Typography>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sources.map(s => ({ name: s.name, level_pct: s.percentage_level }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="level_pct" name="Storage Level %" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Grid>

              {/* Weather Impact Summary Card */}
              <Grid item xs={12}>
                <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                    ⛅ Weather Impact & Water Recharge Analysis
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569' }}>
                    {dashboardData?.weather_impact?.expected_water_contribution || 'Normal weather conditions observed across regional catchments.'}
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* TAB 1: WATER SOURCES */}
          {currentTab === 1 && (
            <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Regional Water Sources Directory
                </Typography>
                <TextField size="small" placeholder="Search sources..." value={sourceSearch} onChange={(e) => setSourceSearch(e.target.value)} sx={{ width: 220 }} />
              </Box>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      {['Source Name', 'Type', 'Location', 'Capacity', 'Current Level', 'Reserved', 'Available', 'Status', 'Actions'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sources
                      .filter(s => s.name.toLowerCase().includes(sourceSearch.toLowerCase()) || s.location.toLowerCase().includes(sourceSearch.toLowerCase()))
                      .map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                          <TableCell>{s.source_type_display || s.source_type}</TableCell>
                          <TableCell>{s.location}</TableCell>
                          <TableCell>{formatLiters(s.capacity_liters)}</TableCell>
                          <TableCell>{formatLiters(s.current_level_liters)} ({s.percentage_level}%)</TableCell>
                          <TableCell>{formatLiters(s.reserved_liters)}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#00695C' }}>{formatLiters(s.available_liters)}</TableCell>
                          <TableCell>
                            <Chip label={(s.status || 'normal').toUpperCase()} color={STATUS_COLOR[s.status] || 'default'} size="small" />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <MuiTooltip title="Update Level">
                                <IconButton size="small" color="primary" onClick={() => {
                                  setSelectedSourceForLevel(s);
                                  setLevelForm({ new_level_liters: s.current_level_liters, reason: '' });
                                  setOpenLevelModal(true);
                                }}>
                                  <OpacityIcon fontSize="small" />
                                </IconButton>
                              </MuiTooltip>
                              <MuiTooltip title="Level History">
                                <IconButton size="small" color="info" onClick={() => handleViewHistory(s)}>
                                  <HistoryIcon fontSize="small" />
                                </IconButton>
                              </MuiTooltip>
                              <MuiTooltip title="Edit Source">
                                <IconButton size="small" color="secondary" onClick={() => {
                                  setEditingSource(s);
                                  setSourceForm({ name: s.name, source_type: s.source_type, location: s.location, capacity_liters: s.capacity_liters, current_level_liters: s.current_level_liters });
                                  setOpenSourceModal(true);
                                }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </MuiTooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* TAB 2: ALLOCATION REQUESTS */}
          {currentTab === 2 && (
            <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Farmer Water Allocation Requests
                </Typography>
                <TextField select size="small" value={reqStatusFilter} onChange={(e) => setReqStatusFilter(e.target.value)} sx={{ width: 180 }} displayEmpty>
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="partially_approved">Partially Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </TextField>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      {['Farmer', 'Farm & Field', 'Location', 'Requested Water', 'Priority', 'Status', 'Approved Water', 'Actions'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests
                      .filter(r => !reqStatusFilter || r.status === reqStatusFilter)
                      .map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{r.farmer_name || r.farmer_username || 'Farmer'}</TableCell>
                          <TableCell>{r.farm_name} — {r.field_name}</TableCell>
                          <TableCell>{r.location}</TableCell>
                          <TableCell>{formatLiters(r.requested_amount_liters)}</TableCell>
                          <TableCell><Chip label={(r.priority || 'medium').toUpperCase()} size="small" /></TableCell>
                          <TableCell>
                            <Chip label={(r.status_display || r.status).toUpperCase()} color={STATUS_COLOR[r.status] || 'default'} size="small" />
                          </TableCell>
                          <TableCell>{r.approved_amount_liters ? formatLiters(r.approved_amount_liters) : '-'}</TableCell>
                          <TableCell>
                            {r.status === 'pending' && (
                              <Stack direction="row" spacing={1}>
                                <Button size="small" variant="contained" color="success" onClick={() => {
                                  setSelectedReqForApprove(r);
                                  setApproveForm({ water_source_id: sources[0]?.id || '', approved_amount_liters: r.requested_amount_liters });
                                  setOpenApproveModal(true);
                                }}>Approve</Button>
                                <Button size="small" variant="outlined" color="error" onClick={() => {
                                  setSelectedReqForReject(r);
                                  setRejectReason('');
                                  setOpenRejectModal(true);
                                }}>Reject</Button>
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* TAB 3: ALLOCATIONS & USAGE */}
          {currentTab === 3 && (
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      Active Water Allocations
                    </Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
                      setUsageForm({ water_source: sources[0]?.id || '', field: '', volume_liters: '', notes: '' });
                      setOpenUsageModal(true);
                    }}>
                      Record Usage
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          {['Alloc ID', 'Source', 'Farm & Field', 'Allocated Water', 'Used Water', 'Remaining Water', 'Status'].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allocations.map((a) => (
                          <TableRow key={a.id} hover>
                            <TableCell>#{a.id}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{a.water_source_name}</TableCell>
                            <TableCell>{a.farm_name} — {a.field_name}</TableCell>
                            <TableCell>{formatLiters(a.allocated_amount_liters)}</TableCell>
                            <TableCell>{formatLiters(a.used_amount_liters)}</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#00695C' }}>{formatLiters(a.remaining_amount_liters)}</TableCell>
                            <TableCell><Chip label={(a.status || 'active').toUpperCase()} color={STATUS_COLOR[a.status] || 'default'} size="small" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* TAB 4: RESOURCE ALERTS */}
          {currentTab === 4 && (
            <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                Resource Shortage & Capacity Warnings
              </Typography>
              <Stack spacing={2}>
                {(dashboardData?.resource_alerts || []).length === 0 ? (
                  <Typography color="text.secondary">No critical water shortage alerts active.</Typography>
                ) : (
                  dashboardData.resource_alerts.map((al) => (
                    <MuiAlert key={al.id} severity="warning" variant="outlined">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{al.title}</Typography>
                      <Typography variant="body2">{al.message}</Typography>
                    </MuiAlert>
                  ))
                )}
              </Stack>
            </Card>
          )}
        </>
      )}

      {/* MODAL 1: ADD/EDIT WATER SOURCE */}
      <Dialog open={openSourceModal} onClose={() => setOpenSourceModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingSource ? 'Edit Water Source' : 'Add New Water Source'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Source Name" fullWidth value={sourceForm.name} onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} />
            <TextField select label="Source Type" fullWidth value={sourceForm.source_type} onChange={(e) => setSourceForm({ ...sourceForm, source_type: e.target.value })}>
              <MenuItem value="reservoir">Reservoir</MenuItem>
              <MenuItem value="pond">Pond</MenuItem>
              <MenuItem value="well">Well</MenuItem>
              <MenuItem value="canal">Canal</MenuItem>
              <MenuItem value="river">River</MenuItem>
              <MenuItem value="rainwater">Rainwater Storage</MenuItem>
            </TextField>
            <TextField label="Location / District" fullWidth value={sourceForm.location} onChange={(e) => setSourceForm({ ...sourceForm, location: e.target.value })} />
            <TextField label="Total Capacity (Liters)" type="number" fullWidth value={sourceForm.capacity_liters} onChange={(e) => setSourceForm({ ...sourceForm, capacity_liters: e.target.value })} />
            <TextField label="Current Water Level (Liters)" type="number" fullWidth value={sourceForm.current_level_liters} onChange={(e) => setSourceForm({ ...sourceForm, current_level_liters: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSourceModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSource}>Save Source</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 2: UPDATE WATER LEVEL */}
      <Dialog open={openLevelModal} onClose={() => setOpenLevelModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Water Level — {selectedSourceForLevel?.name}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current Level: {formatLiters(selectedSourceForLevel?.current_level_liters)}
            </Typography>
            <TextField label="New Water Level (Liters)" type="number" fullWidth value={levelForm.new_level_liters} onChange={(e) => setLevelForm({ ...levelForm, new_level_liters: e.target.value })} />
            <TextField label="Reason / Notes" multiline rows={2} fullWidth value={levelForm.reason} onChange={(e) => setLevelForm({ ...levelForm, reason: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLevelModal(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleUpdateLevelSubmit}>Update Level</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 3: APPROVE ALLOCATION REQUEST */}
      <Dialog open={openApproveModal} onClose={() => setOpenApproveModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Approve Water Allocation Request #{selectedReqForApprove?.id}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              <strong>Farmer:</strong> {selectedReqForApprove?.farmer_name} <br />
              <strong>Requested:</strong> {formatLiters(selectedReqForApprove?.requested_amount_liters)}
            </Typography>
            <TextField select label="Select Water Source" fullWidth value={approveForm.water_source_id} onChange={(e) => setApproveForm({ ...approveForm, water_source_id: e.target.value })}>
              {sources.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} (Avail: {formatLiters(s.available_liters)})
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Approved Amount (Liters)" type="number" fullWidth value={approveForm.approved_amount_liters} onChange={(e) => setApproveForm({ ...approveForm, approved_amount_liters: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApproveModal(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApproveSubmit}>Approve Allocation</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 4: REJECT ALLOCATION REQUEST */}
      <Dialog open={openRejectModal} onClose={() => setOpenRejectModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Allocation Request #{selectedReqForReject?.id}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Rejection Reason" multiline rows={3} fullWidth value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required error={!rejectReason} helperText={!rejectReason ? 'Rejection reason is required.' : ''} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRejectModal(false)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!rejectReason} onClick={handleRejectSubmit}>Reject Request</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default WaterManagerDashboard;
