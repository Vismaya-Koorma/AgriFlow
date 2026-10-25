import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Tabs, Tab, IconButton, Alert,
  CircularProgress, Switch, Tooltip, Paper, InputAdornment
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';

import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import {
  getSupervisorAssignments,
  createSupervisorAssignment,
  updateSupervisorAssignment,
  toggleSupervisorAssignmentStatus,
  getAssignmentOptions,
  getFarmVisits,
  triggerGenerateVisits
} from '../../services/api';

const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

const STATUS_COLOR = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  RESCHEDULED: 'secondary',
  MISSED: 'error',
  CANCELLED: 'default',
};

const AdminSupervisorVisits = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data states
  const [assignments, setAssignments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [options, setOptions] = useState({ supervisors: [], farmers: [], farms: [], fields: [] });
  const [searchQuery, setSearchQuery] = useState('');

  // Modal: New Assignment
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    supervisor: '',
    farmer: '',
    farm: '',
    field: '',
    weekly_visit_day: 0,
    preset_slot: 'morning',
    start_time: '09:00',
    end_time: '12:00',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  // Modal: Change Schedule
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editForm, setEditForm] = useState({
    weekly_visit_day: 0,
    start_time: '09:00',
    end_time: '12:00',
    change_reason: '',
  });

  // Modal: History Log
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [assignData, visitsData, optData] = await Promise.all([
        getSupervisorAssignments(),
        getFarmVisits(),
        getAssignmentOptions()
      ]);
      setAssignments(assignData.results || assignData || []);
      setVisits(visitsData.results || visitsData || []);
      setOptions(optData || { supervisors: [], farmers: [], farms: [], fields: [] });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to load supervisor visit records.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSlotChange = (preset) => {
    if (preset === 'morning') {
      setAssignForm({ ...assignForm, preset_slot: 'morning', start_time: '09:00', end_time: '12:00' });
    } else if (preset === 'afternoon') {
      setAssignForm({ ...assignForm, preset_slot: 'afternoon', start_time: '13:00', end_time: '16:00' });
    } else {
      setAssignForm({ ...assignForm, preset_slot: 'custom' });
    }
  };

  const handleFarmerSelect = (farmerId) => {
    setAssignForm({
      ...assignForm,
      farmer: farmerId,
      farm: '',
      field: ''
    });
  };

  const handleFarmSelect = (farmId) => {
    setAssignForm({
      ...assignForm,
      farm: farmId,
      field: ''
    });
  };

  const handleCreateAssignment = async () => {
    setErrorMsg('');
    try {
      await createSupervisorAssignment({
        supervisor: assignForm.supervisor,
        farmer: assignForm.farmer,
        farm: assignForm.farm,
        field: assignForm.field || null,
        weekly_visit_day: assignForm.weekly_visit_day,
        start_time: assignForm.start_time.length === 5 ? `${assignForm.start_time}:00` : assignForm.start_time,
        end_time: assignForm.end_time.length === 5 ? `${assignForm.end_time}:00` : assignForm.end_time,
        start_date: assignForm.start_date,
        end_date: assignForm.end_date || null,
        is_active: true
      });
      setSuccessMsg('Supervisor assigned successfully! 4 weeks of visits pre-generated.');
      setOpenAssignModal(false);
      fetchData();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.schedule_conflict) {
        setErrorMsg(resp.schedule_conflict);
      } else if (resp?.farmer) {
        setErrorMsg(Array.isArray(resp.farmer) ? resp.farmer[0] : resp.farmer);
      } else {
        setErrorMsg(resp?.detail || 'Failed to create assignment. Please verify inputs.');
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleSupervisorAssignmentStatus(id);
      fetchData();
      setSuccessMsg('Assignment status toggled successfully.');
    } catch (err) {
      setErrorMsg('Failed to update assignment status.');
    }
  };

  const handleOpenEdit = (assignment) => {
    setEditingAssignment(assignment);
    setEditForm({
      weekly_visit_day: assignment.weekly_visit_day,
      start_time: assignment.start_time ? assignment.start_time.slice(0, 5) : '09:00',
      end_time: assignment.end_time ? assignment.end_time.slice(0, 5) : '12:00',
      change_reason: 'Routine seasonal schedule adjustment',
    });
    setOpenEditModal(true);
  };

  const handleSaveEditSchedule = async () => {
    if (!editingAssignment) return;
    setErrorMsg('');
    try {
      await updateSupervisorAssignment(editingAssignment.id, {
        supervisor: editingAssignment.supervisor,
        farmer: editingAssignment.farmer,
        farm: editingAssignment.farm,
        field: editingAssignment.field,
        weekly_visit_day: editForm.weekly_visit_day,
        start_time: editForm.start_time.length === 5 ? `${editForm.start_time}:00` : editForm.start_time,
        end_time: editForm.end_time.length === 5 ? `${editForm.end_time}:00` : editForm.end_time,
        start_date: editingAssignment.start_date,
        end_date: editingAssignment.end_date,
        is_active: editingAssignment.is_active,
        change_reason: editForm.change_reason
      });
      setSuccessMsg('Recurring visit schedule updated! Future visits regenerated.');
      setOpenEditModal(false);
      fetchData();
    } catch (err) {
      const resp = err.response?.data;
      setErrorMsg(resp?.schedule_conflict || resp?.detail || 'Failed to update schedule.');
    }
  };

  const handleGenerateRollingVisits = async () => {
    setLoading(true);
    try {
      const res = await triggerGenerateVisits(4);
      setSuccessMsg(res.message || 'Successfully generated next 4 weeks of visits.');
      fetchData();
    } catch (err) {
      setErrorMsg('Failed to run rolling schedule generator.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredAssignments = assignments.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      (a.supervisor_name && a.supervisor_name.toLowerCase().includes(q)) ||
      (a.farmer_name && a.farmer_name.toLowerCase().includes(q)) ||
      (a.farm_name && a.farm_name.toLowerCase().includes(q))
    );
  });

  const availableFarmsForFarmer = options.farms.filter(
    (f) => String(f.user_id) === String(assignForm.farmer)
  );

  const availableFieldsForFarm = options.fields.filter(
    (fld) => String(fld.farm_id) === String(assignForm.farm)
  );

  const activeSupervisorsCount = new Set(assignments.filter(a => a.is_active).map(a => a.supervisor)).size;
  const completedVisitsCount = visits.filter(v => v.status === 'COMPLETED').length;

  return (
    <DashboardLayout>
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Field Supervisor & Farm Visit Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Assign supervisors to farms, configure fixed weekly visit slots, and monitor inspection compliance.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<EventRepeatIcon />}
              onClick={handleGenerateRollingVisits}
              disabled={loading}
              sx={{ borderRadius: '8px' }}
            >
              Generate 4-Week Visits
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpenAssignModal(true)}
              sx={{ borderRadius: '8px', bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}
            >
              Assign Supervisor
            </Button>
          </Stack>
        </Stack>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Assignments"
            value={assignments.length}
            icon={<AssignmentIcon />}
            color="#6A1B9A"
            subtitle={`${assignments.filter(a => a.is_active).length} Active`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Supervisors"
            value={activeSupervisorsCount}
            icon={<PeopleIcon />}
            color="#1565C0"
            subtitle={`${options.supervisors.length} Total Registered`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Scheduled Visits"
            value={visits.length}
            icon={<CalendarMonthIcon />}
            color="#00695C"
            subtitle={`${visits.filter(v => v.status === 'SCHEDULED').length} Upcoming`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Inspections Completed"
            value={completedVisitsCount}
            icon={<CheckCircleIcon />}
            color="#2E7D32"
            subtitle="Ground-truth verified"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
            <Tab label={`Supervisor Assignments (${assignments.length})`} sx={{ fontWeight: 600 }} />
            <Tab label={`Generated Visit Schedule (${visits.length})`} sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        {/* Tab 0: Assignments Table */}
        {activeTab === 0 && (
          <Box sx={{ p: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" sx={{ mb: 2.5 }}>
              <TextField
                size="small"
                placeholder="Search by supervisor, farmer, or farm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ maxWidth: 360 }}
              />
              <IconButton onClick={fetchData} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
            </Stack>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Supervisor', 'Farmer', 'Farm & Location', 'Field', 'Weekly Visit Slot', 'Start Date', 'Last Actual Visit', 'Status', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : filteredAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        No supervisor assignments found. Click "Assign Supervisor" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments.map((a) => (
                      <TableRow key={a.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {a.supervisor_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {a.supervisor_phone || a.supervisor_email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.farmer_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>{a.farmer_email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.farm_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>{a.farm_location || 'N/A'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{a.field_name || 'All Fields'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${a.weekly_visit_day_display} (${a.start_time?.slice(0, 5)} - ${a.end_time?.slice(0, 5)})`}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>{a.start_date}</TableCell>
                        <TableCell>
                          {a.last_actual_visit_date ? (
                            <Chip label={a.last_actual_visit_date} size="small" color="success" />
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>None recorded</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            size="small"
                            checked={a.is_active}
                            onChange={() => handleToggleStatus(a.id)}
                            color="success"
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Change Recurring Schedule">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEdit(a)}>
                                <EditIcon fontSize="small" />
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
          </Box>
        )}

        {/* Tab 1: Visit Schedule Table */}
        {activeTab === 1 && (
          <Box sx={{ p: 2.5 }}>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Visit #', 'Scheduled Date', 'Scheduled Slot', 'Supervisor', 'Farmer & Farm', 'Actual Time (Start - End)', 'Status'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : visits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        No visit records generated yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visits.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>#{v.id}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{v.scheduled_date}</TableCell>
                        <TableCell>{v.scheduled_start_time?.slice(0, 5)} - {v.scheduled_end_time?.slice(0, 5)}</TableCell>
                        <TableCell>{v.supervisor_name}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{v.farmer_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>{v.farm_name}</Typography>
                        </TableCell>
                        <TableCell>
                          {v.actual_start_time ? (
                            <Typography variant="body2" sx={{ color: '#2E7D32', fontWeight: 600 }}>
                              {new Date(v.actual_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {v.actual_end_time ? ` - ${new Date(v.actual_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (In Progress)'}
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Pending Actual Visit</Typography>
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Card>

      {/* MODAL: New Supervisor Assignment */}
      <Dialog open={openAssignModal} onClose={() => setOpenAssignModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Assign Field Supervisor to Farm
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            {/* Supervisor Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small">
                <InputLabel>Field Supervisor</InputLabel>
                <Select
                  value={assignForm.supervisor}
                  label="Field Supervisor"
                  onChange={(e) => setAssignForm({ ...assignForm, supervisor: e.target.value })}
                >
                  {options.supervisors.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.full_name || s.username} ({s.district || 'District N/A'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Farmer Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small">
                <InputLabel>Farmer</InputLabel>
                <Select
                  value={assignForm.farmer}
                  label="Farmer"
                  onChange={(e) => handleFarmerSelect(e.target.value)}
                >
                  {options.farmers.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.full_name || f.username} ({f.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Farm Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small" disabled={!assignForm.farmer}>
                <InputLabel>Farm</InputLabel>
                <Select
                  value={assignForm.farm}
                  label="Farm"
                  onChange={(e) => handleFarmSelect(e.target.value)}
                >
                  {availableFarmsForFarmer.map((farm) => (
                    <MenuItem key={farm.id} value={farm.id}>
                      {farm.name} ({farm.location || 'Location N/A'}) — {farm.total_area} acres
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Optional Field Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" disabled={!assignForm.farm}>
                <InputLabel>Specific Field (Optional)</InputLabel>
                <Select
                  value={assignForm.field}
                  label="Specific Field (Optional)"
                  onChange={(e) => setAssignForm({ ...assignForm, field: e.target.value })}
                >
                  <MenuItem value="">
                    <em>All Fields in Farm</em>
                  </MenuItem>
                  {availableFieldsForFarm.map((fld) => (
                    <MenuItem key={fld.id} value={fld.id}>
                      {fld.name} ({fld.area} acres)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Weekday Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small">
                <InputLabel>Fixed Weekly Visit Day</InputLabel>
                <Select
                  value={assignForm.weekly_visit_day}
                  label="Fixed Weekly Visit Day"
                  onChange={(e) => setAssignForm({ ...assignForm, weekly_visit_day: Number(e.target.value) })}
                >
                  {WEEKDAYS.map((w) => (
                    <MenuItem key={w.value} value={w.value}>
                      {w.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Slot Presets */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', display: 'block', mb: 1 }}>
                Time Slot Presets
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant={assignForm.preset_slot === 'morning' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetSlotChange('morning')}
                >
                  Morning (9AM-12PM)
                </Button>
                <Button
                  size="small"
                  variant={assignForm.preset_slot === 'afternoon' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetSlotChange('afternoon')}
                >
                  Afternoon (1PM-4PM)
                </Button>
                <Button
                  size="small"
                  variant={assignForm.preset_slot === 'custom' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetSlotChange('custom')}
                >
                  Custom
                </Button>
              </Stack>
            </Grid>

            {/* Start and End Time */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Slot Start Time"
                value={assignForm.start_time}
                onChange={(e) => setAssignForm({ ...assignForm, start_time: e.target.value, preset_slot: 'custom' })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Slot End Time"
                value={assignForm.end_time}
                onChange={(e) => setAssignForm({ ...assignForm, end_time: e.target.value, preset_slot: 'custom' })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Start Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Assignment Start Date"
                value={assignForm.start_date}
                onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {/* Optional End Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Assignment End Date (Optional)"
                value={assignForm.end_date}
                onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAssignModal(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateAssignment}
            disabled={!assignForm.supervisor || !assignForm.farmer || !assignForm.farm}
          >
            Create Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: Edit / Change Schedule */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Change Recurring Visit Schedule
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
            Changing this schedule will update all future visits for farm <strong>{editingAssignment?.farm_name}</strong>. Past scheduled visits and inspection history will be preserved.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Weekly Visit Day</InputLabel>
                <Select
                  value={editForm.weekly_visit_day}
                  label="Weekly Visit Day"
                  onChange={(e) => setEditForm({ ...editForm, weekly_visit_day: Number(e.target.value) })}
                >
                  {WEEKDAYS.map((w) => (
                    <MenuItem key={w.value} value={w.value}>{w.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Start Time"
                value={editForm.start_time}
                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="End Time"
                value={editForm.end_time}
                onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Reason for Schedule Change (Audit Log)"
                value={editForm.change_reason}
                onChange={(e) => setEditForm({ ...editForm, change_reason: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditModal(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveEditSchedule}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminSupervisorVisits;
