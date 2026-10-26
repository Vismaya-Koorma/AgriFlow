import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Tabs, Tab, IconButton, Alert,
  CircularProgress, Switch, Tooltip, Paper, FormControlLabel, Divider
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';

import {
  getFarmVisits,
  startFarmVisit,
  completeFarmVisit,
  rescheduleFarmVisit,
  cancelFarmVisit,
  getSupervisorAssignments,
  getVisitStats,
  triggerGenerateVisits
} from '../../services/api';

const STATUS_COLOR = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  RESCHEDULED: 'secondary',
  MISSED: 'error',
  CANCELLED: 'default',
};

const CROP_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Stressed'];
const CROP_STAGES = ['Germination', 'Vegetative', 'Flowering', 'Fruiting', 'Harvesting'];
const IRRIGATION_STATUSES = ['Functional', 'Partially Functional', 'Needs Maintenance', 'Inoperative'];

const SupervisorVisits = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data states
  const [visits, setVisits] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({
    total_assigned_farms: 0,
    today_visits: 0,
    upcoming_visits: 0,
    completed_visits: 0,
    in_progress_visits: 0,
    missed_visits: 0,
    follow_up_tasks: 0,
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Inspection Dialog
  const [openInspectModal, setOpenInspectModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [inspectForm, setInspectForm] = useState({
    crop_condition: 'Good',
    crop_growth_stage: 'Vegetative',
    soil_and_field_observations: '',
    irrigation_system_status: 'Functional',
    water_availability_and_observations: '',
    pest_or_disease_symptoms: 'None observed',
    fertilizer_or_pesticide_observations: '',
    recommended_agricultural_actions: '',
    maintenance_issues: '',
    follow_up_required: false,
    follow_up_notes: '',
    next_recommended_visit_date: '',
    additional_remarks: '',
  });

  // Reschedule Dialog
  const [openRescheduleModal, setOpenRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    new_date: '',
    new_start_time: '09:00:00',
    new_end_time: '12:00:00',
    reason: '',
  });

  // Cancel Dialog
  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // View Report Dialog
  const [openReportModal, setOpenReportModal] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [visitsData, assignData, statsData] = await Promise.all([
        getFarmVisits(),
        getSupervisorAssignments(),
        getVisitStats()
      ]);
      setVisits(visitsData.results || visitsData || []);
      setAssignments(assignData.results || assignData || []);
      if (statsData) setStats(statsData);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to load supervisor visit data.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartVisit = async (visitId) => {
    try {
      await startFarmVisit(visitId);
      setSuccessMsg(`Visit #${visitId} started! Status is now IN_PROGRESS.`);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to start visit.');
    }
  };

  const handleOpenInspect = (visit) => {
    setSelectedVisit(visit);
    setInspectForm({
      crop_condition: 'Good',
      crop_growth_stage: visit.field?.crop_stage || 'Vegetative',
      soil_and_field_observations: 'Soil moisture is satisfactory (approx 35%). Loamy texture with good infiltration.',
      irrigation_system_status: 'Functional',
      water_availability_and_observations: 'Canal flow and field distribution channels are operating normally.',
      pest_or_disease_symptoms: 'None observed',
      fertilizer_or_pesticide_observations: 'Organic compost applied recently.',
      recommended_agricultural_actions: 'Maintain current irrigation cycle; clear field border drainage ditches.',
      maintenance_issues: '',
      follow_up_required: false,
      follow_up_notes: '',
      next_recommended_visit_date: '',
      additional_remarks: 'Farmer accompanied the supervisor during the entire field round.',
    });
    setOpenInspectModal(true);
  };

  const handleSubmitInspection = async () => {
    if (!selectedVisit) return;
    setErrorMsg('');
    try {
      await completeFarmVisit(selectedVisit.id, inspectForm);
      setSuccessMsg(`Inspection report submitted and Visit #${selectedVisit.id} marked COMPLETED!`);
      setOpenInspectModal(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit inspection report.');
    }
  };

  const handleOpenReschedule = (visit) => {
    setSelectedVisit(visit);
    setRescheduleData({
      new_date: '',
      new_start_time: visit.scheduled_start_time,
      new_end_time: visit.scheduled_end_time,
      reason: '',
    });
    setOpenRescheduleModal(true);
  };

  const handleSubmitReschedule = async () => {
    if (!selectedVisit) return;
    try {
      await rescheduleFarmVisit(selectedVisit.id, rescheduleData);
      setSuccessMsg(`Visit #${selectedVisit.id} rescheduled successfully to ${rescheduleData.new_date}.`);
      setOpenRescheduleModal(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to reschedule visit.');
    }
  };

  const handleOpenCancel = (visit) => {
    setSelectedVisit(visit);
    setCancelReason('');
    setOpenCancelModal(true);
  };

  const handleSubmitCancel = async () => {
    if (!selectedVisit) return;
    try {
      await cancelFarmVisit(selectedVisit.id, { reason: cancelReason });
      setSuccessMsg(`Visit #${selectedVisit.id} has been cancelled.`);
      setOpenCancelModal(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to cancel visit.');
    }
  };

  const handleViewReport = (report) => {
    setViewingReport(report);
    setOpenReportModal(true);
  };

  const handleGenerateRolling = async () => {
    setLoading(true);
    try {
      const res = await triggerGenerateVisits(4);
      setSuccessMsg(res.message || 'Generated 4 weeks of farm visits successfully.');
      fetchData();
    } catch (err) {
      setErrorMsg('Failed to generate visits.');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayVisits = visits.filter(v => v.scheduled_date === todayStr);

  const filteredVisits = visits.filter(v => {
    if (statusFilter === 'ALL') return true;
    return v.status === statusFilter;
  });

  return (
    <DashboardLayout>
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Field Supervisor Visit Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Manage your fixed weekly farm visit schedule, conduct inspections, and submit ground-truth reports.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<EventRepeatIcon />}
              onClick={handleGenerateRolling}
              disabled={loading}
              sx={{ borderRadius: '8px' }}
            >
              Generate 4-Week Visits
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              disabled={loading}
              sx={{ borderRadius: '8px' }}
            >
              Refresh Data
            </Button>
          </Stack>
        </Stack>
      </Box>

      {errorMsg && <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Today's Visits"
            value={stats.today_visits}
            icon={<CalendarTodayIcon />}
            color="#1565C0"
            subtitle={`${todayVisits.filter(v => v.status === 'COMPLETED').length} done today`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Assigned Farms"
            value={stats.total_assigned_farms}
            icon={<AgricultureIcon />}
            color="#00695C"
            subtitle={`${assignments.length} Total Assignments`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Upcoming Visits"
            value={stats.upcoming_visits}
            icon={<ScheduleIcon />}
            color="#E65100"
            subtitle="Next 4 weeks"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Completed"
            value={stats.completed_visits}
            icon={<CheckCircleIcon />}
            color="#2E7D32"
            subtitle="Verified reports"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Follow-Ups Due"
            value={stats.follow_up_tasks}
            icon={<WarningAmberIcon />}
            color="#D81B60"
            subtitle="Requires action"
          />
        </Grid>
      </Grid>

      {/* Main Container */}
      <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
            <Tab label={`Today's Schedule (${todayVisits.length})`} sx={{ fontWeight: 600 }} />
            <Tab label={`All Visits (${visits.length})`} sx={{ fontWeight: 600 }} />
            <Tab label={`My Assigned Farms (${assignments.length})`} sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        {/* Tab 0: Today's Visits */}
        {activeTab === 0 && (
          <Box sx={{ p: 2.5 }}>
            {todayVisits.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
                <CalendarTodayIcon sx={{ fontSize: 48, mb: 1.5, color: '#cbd5e1' }} />
                <Typography variant="h6">No visits scheduled for today.</Typography>
                <Typography variant="body2">Check the "All Visits" tab for upcoming farm schedules.</Typography>
              </Box>
            ) : (
              <Grid container spacing={2.5}>
                {todayVisits.map((v) => (
                  <Grid item xs={12} md={6} key={v.id}>
                    <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5, borderLeft: `4px solid ${v.status === 'COMPLETED' ? '#2E7D32' : '#1565C0'}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {v.farm_name} {v.field_name ? `(${v.field_name})` : ''}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            Farmer: <strong>{v.farmer_name}</strong> • Location: {v.farm_location || v.farm_district || 'N/A'}
                          </Typography>
                          {v.farmer_phone && (
                            <Typography variant="caption" sx={{ color: '#1565C0' }}>
                              📞 {v.farmer_phone}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={v.status_display || v.status}
                          size="small"
                          color={STATUS_COLOR[v.status] || 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>

                      <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                        ⏰ Scheduled Slot: <strong>{v.scheduled_start_time?.slice(0, 5)} - {v.scheduled_end_time?.slice(0, 5)}</strong>
                      </Typography>

                      {v.actual_start_time && (
                        <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#2E7D32', fontWeight: 600 }}>
                          Started at: {new Date(v.actual_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {v.actual_end_time && ` • Completed at: ${new Date(v.actual_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1.5} flexWrap="wrap">
                        {v.status === 'SCHEDULED' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => handleStartVisit(v.id)}
                            sx={{ borderRadius: '6px' }}
                          >
                            Start Visit
                          </Button>
                        )}
                        {(v.status === 'IN_PROGRESS' || v.status === 'SCHEDULED') && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<AssignmentTurnedInIcon />}
                            onClick={() => handleOpenInspect(v)}
                            sx={{ borderRadius: '6px' }}
                          >
                            Record Inspection
                          </Button>
                        )}
                        {v.status === 'COMPLETED' && v.inspection_report && (
                          <Button
                            size="small"
                            variant="contained"
                            color="info"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewReport(v.inspection_report)}
                            sx={{ borderRadius: '6px' }}
                          >
                            View Report
                          </Button>
                        )}
                        {v.status !== 'COMPLETED' && v.status !== 'CANCELLED' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<EventIcon />}
                            onClick={() => handleOpenReschedule(v)}
                            sx={{ borderRadius: '6px' }}
                          >
                            Reschedule
                          </Button>
                        )}
                        {v.status !== 'COMPLETED' && v.status !== 'CANCELLED' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleOpenCancel(v)}
                            sx={{ borderRadius: '6px' }}
                          >
                            Cancel
                          </Button>
                        )}
                      </Stack>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* Tab 1: All Visits List */}
        {activeTab === 1 && (
          <Box sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2.5 }} flexWrap="wrap">
              {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'MISSED', 'CANCELLED'].map((st) => (
                <Chip
                  key={st}
                  label={st}
                  clickable
                  color={statusFilter === st ? 'primary' : 'default'}
                  onClick={() => setStatusFilter(st)}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Visit #', 'Date', 'Time Slot', 'Farmer', 'Farm', 'Planned vs Actual', 'Status', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
                  ) : filteredVisits.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>No visits found.</TableCell></TableRow>
                  ) : (
                    filteredVisits.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>#{v.id}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{v.scheduled_date}</TableCell>
                        <TableCell>{v.scheduled_start_time?.slice(0, 5)} - {v.scheduled_end_time?.slice(0, 5)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{v.farmer_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>{v.farmer_phone || 'N/A'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{v.farm_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>{v.farm_location || 'N/A'}</Typography>
                        </TableCell>
                        <TableCell>
                          {v.actual_start_time ? (
                            <Typography variant="caption" sx={{ color: '#2E7D32', fontWeight: 600 }}>
                              Actual: {new Date(v.actual_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {v.actual_end_time ? ` - ${new Date(v.actual_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (In Progress)'}
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Planned only</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={v.status_display || v.status}
                            size="small"
                            color={STATUS_COLOR[v.status] || 'default'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {v.status === 'SCHEDULED' && (
                              <Tooltip title="Start Visit">
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<PlayArrowIcon fontSize="small" />}
                                  onClick={() => handleStartVisit(v.id)}
                                  sx={{ minWidth: 'auto', px: 1, py: 0.3, fontSize: '0.75rem' }}
                                >
                                  Start
                                </Button>
                              </Tooltip>
                            )}
                            {(v.status === 'IN_PROGRESS' || v.status === 'SCHEDULED') && (
                              <Tooltip title="Record Inspection">
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<AssignmentTurnedInIcon fontSize="small" />}
                                  onClick={() => handleOpenInspect(v)}
                                  sx={{ minWidth: 'auto', px: 1, py: 0.3, fontSize: '0.75rem' }}
                                >
                                  Inspect
                                </Button>
                              </Tooltip>
                            )}
                            {v.status === 'COMPLETED' && v.inspection_report && (
                              <Tooltip title="View Report">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                  startIcon={<VisibilityIcon fontSize="small" />}
                                  onClick={() => handleViewReport(v.inspection_report)}
                                  sx={{ minWidth: 'auto', px: 1, py: 0.3, fontSize: '0.75rem' }}
                                >
                                  Report
                                </Button>
                              </Tooltip>
                            )}
                            {v.status !== 'COMPLETED' && v.status !== 'CANCELLED' && (
                              <Tooltip title="Reschedule">
                                <IconButton size="small" color="warning" onClick={() => handleOpenReschedule(v)}>
                                  <EventIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {v.status !== 'COMPLETED' && v.status !== 'CANCELLED' && (
                              <Tooltip title="Cancel">
                                <IconButton size="small" color="error" onClick={() => handleOpenCancel(v)}>
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: Assigned Farms */}
        {activeTab === 2 && (
          <Box sx={{ p: 2.5 }}>
            {assignments.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
                <AgricultureIcon sx={{ fontSize: 48, mb: 1.5, color: '#cbd5e1' }} />
                <Typography variant="h6">No assigned farms found.</Typography>
                <Typography variant="body2">Click "Generate 4-Week Visits" above to automatically assign farms and create scheduled visits.</Typography>
              </Box>
            ) : (
              <Grid container spacing={2.5}>
                {assignments.map((a) => (
                  <Grid item xs={12} sm={6} md={4} key={a.id}>
                    <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {a.farm_name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                        Farmer: <strong>{a.farmer_name}</strong>
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: '#475569', mb: 1.5 }}>
                        📍 Location: {a.farm_location || 'N/A'}
                      </Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography variant="body2" sx={{ color: '#1565C0', fontWeight: 600 }}>
                        🗓️ Every {a.weekly_visit_day_display}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        ⏰ Time: {a.start_time?.slice(0, 5)} - {a.end_time?.slice(0, 5)}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b' }}>
                        Last actual visit: <strong>{a.last_actual_visit_date || 'None yet'}</strong>
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Card>

      {/* MODAL: Record 13-Aspect Inspection Report */}
      <Dialog open={openInspectModal} onClose={() => setOpenInspectModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Record Farm Inspection Report — Visit #{selectedVisit?.id} ({selectedVisit?.farm_name})
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* 1. Crop Condition */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>1. Crop Condition</InputLabel>
                <Select
                  value={inspectForm.crop_condition}
                  label="1. Crop Condition"
                  onChange={(e) => setInspectForm({ ...inspectForm, crop_condition: e.target.value })}
                >
                  {CROP_CONDITIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* 2. Crop Growth Stage */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>2. Crop Growth Stage</InputLabel>
                <Select
                  value={inspectForm.crop_growth_stage}
                  label="2. Crop Growth Stage"
                  onChange={(e) => setInspectForm({ ...inspectForm, crop_growth_stage: e.target.value })}
                >
                  {CROP_STAGES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* 3. Soil Observations */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                required
                multiline
                rows={2}
                label="3. Soil & Field Observations"
                value={inspectForm.soil_and_field_observations}
                onChange={(e) => setInspectForm({ ...inspectForm, soil_and_field_observations: e.target.value })}
                placeholder="e.g. Moisture levels, soil texture, erosion, compaction..."
              />
            </Grid>

            {/* 4. Irrigation System Status */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>4. Irrigation System Status</InputLabel>
                <Select
                  value={inspectForm.irrigation_system_status}
                  label="4. Irrigation System Status"
                  onChange={(e) => setInspectForm({ ...inspectForm, irrigation_system_status: e.target.value })}
                >
                  {IRRIGATION_STATUSES.map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* 5. Water Availability Observations */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                required
                label="5. Water Availability Observations"
                value={inspectForm.water_availability_and_observations}
                onChange={(e) => setInspectForm({ ...inspectForm, water_availability_and_observations: e.target.value })}
                placeholder="Canal flow, well levels, pressure..."
              />
            </Grid>

            {/* 6. Pest / Disease Symptoms */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="6. Pest or Disease Symptoms"
                value={inspectForm.pest_or_disease_symptoms}
                onChange={(e) => setInspectForm({ ...inspectForm, pest_or_disease_symptoms: e.target.value })}
              />
            </Grid>

            {/* 7. Fertilizer / Pesticide Observations */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="7. Fertilizer / Pesticide Observations"
                value={inspectForm.fertilizer_or_pesticide_observations}
                onChange={(e) => setInspectForm({ ...inspectForm, fertilizer_or_pesticide_observations: e.target.value })}
              />
            </Grid>

            {/* 8. Recommended Actions */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                required
                multiline
                rows={2}
                label="8. Recommended Agricultural Actions (Visible to Farmer)"
                value={inspectForm.recommended_agricultural_actions}
                onChange={(e) => setInspectForm({ ...inspectForm, recommended_agricultural_actions: e.target.value })}
                placeholder="Specific guidance for the farmer..."
              />
            </Grid>

            {/* 9. Maintenance Issues */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="9. Maintenance Issues (if any)"
                value={inspectForm.maintenance_issues}
                onChange={(e) => setInspectForm({ ...inspectForm, maintenance_issues: e.target.value })}
                placeholder="e.g. Sluice gate leaking, pipe ruptured..."
              />
            </Grid>

            {/* 12. Next Recommended Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="12. Next Recommended Visit Date"
                value={inspectForm.next_recommended_visit_date}
                onChange={(e) => setInspectForm({ ...inspectForm, next_recommended_visit_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* 10. Follow-Up Required Toggle */}
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={inspectForm.follow_up_required}
                    onChange={(e) => setInspectForm({ ...inspectForm, follow_up_required: e.target.checked })}
                    color="warning"
                  />
                }
                label="10. Follow-Up Required?"
              />
            </Grid>

            {/* 11. Follow-Up Notes */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                disabled={!inspectForm.follow_up_required}
                label="11. Follow-Up Notes"
                value={inspectForm.follow_up_notes}
                onChange={(e) => setInspectForm({ ...inspectForm, follow_up_notes: e.target.value })}
                placeholder="Specific checkpoints for follow-up..."
              />
            </Grid>

            {/* 13. Additional Remarks */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="13. Additional Remarks"
                value={inspectForm.additional_remarks}
                onChange={(e) => setInspectForm({ ...inspectForm, additional_remarks: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenInspectModal(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="success" onClick={handleSubmitInspection}>
            Complete & Submit Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: Reschedule Visit */}
      <Dialog open={openRescheduleModal} onClose={() => setOpenRescheduleModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reschedule Visit #{selectedVisit?.id}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
            Original Schedule: {selectedVisit?.scheduled_date} ({selectedVisit?.scheduled_start_time?.slice(0, 5)} - {selectedVisit?.scheduled_end_time?.slice(0, 5)})
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                type="date"
                required
                label="New Visit Date"
                value={rescheduleData.new_date}
                onChange={(e) => setRescheduleData({ ...rescheduleData, new_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="New Start Time"
                value={rescheduleData.new_start_time}
                onChange={(e) => setRescheduleData({ ...rescheduleData, new_start_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="New End Time"
                value={rescheduleData.new_end_time}
                onChange={(e) => setRescheduleData({ ...rescheduleData, new_end_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                required
                size="small"
                label="Reason for Rescheduling"
                value={rescheduleData.reason}
                onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                placeholder="e.g. Heavy rainfall, road blockage..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRescheduleModal(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleSubmitReschedule} disabled={!rescheduleData.new_date || !rescheduleData.reason}>
            Confirm Reschedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: Cancel Visit */}
      <Dialog open={openCancelModal} onClose={() => setOpenCancelModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Visit #{selectedVisit?.id}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2, color: '#d32f2f' }}>
            Warning: Cancelling a visit requires a recorded reason and notifies the farmer.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            required
            size="small"
            label="Mandatory Cancellation Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCancelModal(false)} color="inherit">Close</Button>
          <Button variant="contained" color="error" onClick={handleSubmitCancel} disabled={!cancelReason}>
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: View Completed Report */}
      <Dialog open={openReportModal} onClose={() => setOpenReportModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Inspection Report Details</DialogTitle>
        <DialogContent dividers>
          {viewingReport && (
            <Grid container spacing={2}>
              <Grid item xs={6}><Typography variant="body2"><strong>Crop Condition:</strong> {viewingReport.crop_condition}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>Growth Stage:</strong> {viewingReport.crop_growth_stage || 'N/A'}</Typography></Grid>
              <Grid item xs={12}><Typography variant="body2"><strong>Soil Observations:</strong> {viewingReport.soil_and_field_observations}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>Irrigation Status:</strong> {viewingReport.irrigation_system_status}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>Water Observations:</strong> {viewingReport.water_availability_and_observations}</Typography></Grid>
              <Grid item xs={12}><Typography variant="body2"><strong>Pest/Disease:</strong> {viewingReport.pest_or_disease_symptoms}</Typography></Grid>
              <Grid item xs={12}><Typography variant="body2" sx={{ color: '#2E7D32' }}><strong>Recommended Actions:</strong> {viewingReport.recommended_agricultural_actions}</Typography></Grid>
              {viewingReport.follow_up_required && (
                <Grid item xs={12}>
                  <Alert severity="warning">Follow-up needed: {viewingReport.follow_up_notes}</Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReportModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default SupervisorVisits;
