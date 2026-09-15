import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, TextField,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Alert as MuiAlert, Tabs, Tab, CircularProgress,
  Paper, Slider
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import api from '../../services/api';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'default' },
  { value: 'medium', label: 'Medium', color: 'info' },
  { value: 'high', label: 'High', color: 'warning' },
  { value: 'urgent', label: 'Urgent', color: 'error' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'warning', icon: '🟡' },
  accepted: { label: 'Accepted', color: 'info', icon: '🔵' },
  in_progress: { label: 'In Progress', color: 'primary', icon: '🟠' },
  on_hold: { label: 'On Hold', color: 'secondary', icon: '🟣' },
  completed: { label: 'Completed', color: 'success', icon: '🟢' },
};

const MaintenanceDashboard = ({ initialTab = 'all' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname === '/maintenance/complaints') return 'pending';
    if (location.pathname === '/maintenance/tasks') return 'assigned';
    if (location.pathname === '/maintenance/history') return 'completed';
    return initialTab;
  };

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(getTabFromPath);
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    setTabValue(getTabFromPath());
  }, [location.pathname, initialTab]);

  const handleTabChange = (e, val) => {
    setTabValue(val);
    if (val === 'all') navigate('/maintenance');
    else if (val === 'pending') navigate('/maintenance/complaints');
    else if (val === 'assigned' || val === 'in_progress') navigate('/maintenance/tasks');
    else if (val === 'completed') navigate('/maintenance/history');
  };

  // Modals
  const [selectedTask, setSelectedTask] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openProgressModal, setOpenProgressModal] = useState(false);
  const [openCompleteModal, setOpenCompleteModal] = useState(false);

  // Form states
  const [progressVal, setProgressVal] = useState(0);
  const [statusVal, setStatusVal] = useState('in_progress');
  const [progressNote, setProgressNote] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionImage, setCompletionImage] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/maintenance/complaints/');
      setComplaints(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Failed to load maintenance tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTask = async (task) => {
    try {
      await api.post(`/maintenance/complaints/${task.id}/accept/`);
      setActionSuccess(`Task ${task.complaint_id || task.id} accepted.`);
      fetchTasks();
    } catch (err) {
      console.error('Accept task error:', err);
      setActionError('Failed to accept task.');
    }
  };

  const handleOpenProgress = (task) => {
    if (!task) return;
    setSelectedTask(task);
    setProgressVal(Number(task.progress) || 0);
    setStatusVal(task.status === 'pending' ? 'accepted' : (task.status || 'in_progress'));
    setProgressNote('');
    setActionError('');
    setOpenProgressModal(true);
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    setActionError('');
    setUpdating(true);
    try {
      await api.post(`/maintenance/complaints/${selectedTask.id}/update_progress/`, {
        progress: progressVal,
        status: statusVal,
        message: progressNote,
      });
      setActionSuccess(`Progress updated for ${selectedTask.complaint_id || selectedTask.id}.`);
      setOpenProgressModal(false);
      fetchTasks();
    } catch (err) {
      console.error('Update progress error:', err);
      setActionError(err.response?.data?.detail || 'Failed to update progress.');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenComplete = (task) => {
    setSelectedTask(task);
    setCompletionNotes('');
    setCompletionImage(null);
    setActionError('');
    setOpenCompleteModal(true);
  };

  const handleSaveCompletion = async (e) => {
    e.preventDefault();
    setActionError('');
    if (!completionNotes.trim()) {
      setActionError('Please enter completion notes.');
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('completion_notes', completionNotes.trim());
      if (completionImage) {
        formData.append('completion_image', completionImage);
      }

      await api.post(`/maintenance/complaints/${selectedTask.id}/complete/`, formData);

      setActionSuccess(`Task ${selectedTask.complaint_id || selectedTask.id} marked as completed!`);
      setOpenCompleteModal(false);
      fetchTasks();
    } catch (err) {
      console.error('Completion error:', err);
      setActionError(err.response?.data?.detail || 'Failed to mark task completed.');
    } finally {
      setUpdating(false);
    }
  };

  const counts = {
    pending: complaints.filter(c => c.status === 'pending').length,
    accepted: complaints.filter(c => c.status === 'accepted').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    on_hold: complaints.filter(c => c.status === 'on_hold').length,
    completed: complaints.filter(c => c.status === 'completed').length,
  };

  const filteredComplaints = complaints.filter(c => {
    if (tabValue === 'pending' && c.status !== 'pending') return false;
    if ((tabValue === 'assigned' || tabValue === 'in_progress') && c.status !== 'accepted' && c.status !== 'in_progress') return false;
    if (tabValue === 'completed' && c.status !== 'completed') return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <DashboardLayout title="Maintenance Dashboard">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1e293b">
            Maintenance Worker Tasks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage assigned repair complaints, update task progress, and submit work completion proof.
          </Typography>
        </Box>
      </Box>

      {actionSuccess && (
        <MuiAlert severity="success" onClose={() => setActionSuccess('')} sx={{ mb: 2.5 }}>
          {actionSuccess}
        </MuiAlert>
      )}

      {/* Summary Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Pending" value={String(counts.pending)} icon={<HourglassEmptyIcon />} color="#E65100" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Accepted" value={String(counts.accepted)} icon={<CheckIcon />} color="#1565C0" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="In Progress" value={String(counts.in_progress)} icon={<AssignmentIcon />} color="#0288D1" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="On Hold" value={String(counts.on_hold)} icon={<BuildIcon />} color="#7B1FA2" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Completed" value={String(counts.completed)} icon={<CheckCircleIcon />} color="#2E7D32" />
        </Grid>
      </Grid>

      {/* Main Table Card */}
      <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
            <Tab label={`All (${complaints.length})`} value="all" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`Pending (${counts.pending})`} value="pending" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`Assigned / Active (${counts.accepted + counts.in_progress})`} value="assigned" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`Completed (${counts.completed})`} value="completed" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>

          <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Priority:</Typography>
            <TextField
              select
              size="small"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              sx={{ width: 130, bg: '#fff' }}
            >
              <MenuItem value="all">All</MenuItem>
              {PRIORITIES.map(p => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={36} color="primary" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading maintenance tasks...</Typography>
          </Box>
        ) : filteredComplaints.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <BuildIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
            <Typography variant="subtitle1" fontWeight={600} color="#475569">No tasks found</Typography>
            <Typography variant="body2" color="text.secondary">No maintenance tasks match your selected filter.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  {['Complaint ID', 'Farmer', 'Farm / Field', 'Issue Title', 'Priority', 'Progress', 'Status', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredComplaints.map((c) => {
                  const statusInfo = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                  const priorityObj = PRIORITIES.find(p => p.value === c.priority) || PRIORITIES[1];

                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#1565C0' }}>
                        {c.complaint_id || `CMP-${c.id}`}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="#1e293b">{c.submitted_by_name || 'Farmer'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{c.farm_name || 'Farm'}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.field_name || 'Field'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{c.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {c.category?.replace('_', ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={priorityObj.label} color={priorityObj.color} size="small" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ width: 130 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={c.progress || 0}
                            color={c.progress === 100 ? 'success' : 'primary'}
                            sx={{ flex: 1, height: 7, borderRadius: 4 }}
                          />
                          <Typography variant="caption" fontWeight={700}>{c.progress || 0}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${statusInfo.icon} ${statusInfo.label}`}
                          color={statusInfo.color}
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                          {c.status === 'pending' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleAcceptTask(c)}
                              sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}
                            >
                              Accept
                            </Button>
                          )}
                          {c.status !== 'completed' && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                startIcon={<EditIcon />}
                                onClick={() => handleOpenProgress(c)}
                                sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}
                              >
                                Progress
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleOpenComplete(c)}
                                sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}
                              >
                                Complete
                              </Button>
                            </>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => { setSelectedTask(c); setOpenDetails(true); }}
                            sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}
                          >
                            Details
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Modal 1: Update Progress */}
      {selectedTask && (
        <Dialog open={openProgressModal} onClose={() => setOpenProgressModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            Update Progress — {selectedTask.complaint_id || selectedTask.id}
          </DialogTitle>
          <form onSubmit={handleSaveProgress}>
            <DialogContent sx={{ pt: 1 }}>
              <Stack spacing={2.5}>
                {actionError && <MuiAlert severity="error">{actionError}</MuiAlert>}

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Progress Percentage: {progressVal}%
                  </Typography>
                  <Slider
                    value={progressVal}
                    onChange={(e, val) => setProgressVal(val)}
                    valueLabelDisplay="auto"
                    step={5}
                    min={0}
                    max={100}
                    color="primary"
                  />
                </Box>

                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  size="small"
                >
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="on_hold">On Hold</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Progress Note"
                  placeholder="Describe current inspection or repair work completed..."
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  size="small"
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpenProgressModal(false)} color="inherit">Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={updating}>
                {updating ? 'Saving...' : 'Save Update'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Modal 2: Mark Completed */}
      {selectedTask && (
        <Dialog open={openCompleteModal} onClose={() => setOpenCompleteModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#166534' }}>
            🟢 Mark Task Completed — {selectedTask.complaint_id || selectedTask.id}
          </DialogTitle>
          <form onSubmit={handleSaveCompletion}>
            <DialogContent sx={{ pt: 1 }}>
              <Stack spacing={2.5}>
                {actionError && <MuiAlert severity="error">{actionError}</MuiAlert>}

                <Typography variant="body2" color="text.secondary">
                  Please provide repair completion notes and upload a photo showing the finished maintenance work.
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Completion Notes *"
                  placeholder="Describe repair work done (e.g., Replacement pipe installed, water leak tested and resolved)..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  size="small"
                />

                <Box>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoCameraIcon />}
                    sx={{ borderRadius: '8px', textTransform: 'none' }}
                  >
                    {completionImage ? 'Change Photo' : 'Upload Completion Image (Optional)'}
                    <input type="file" hidden accept="image/*" onChange={(e) => setCompletionImage(e.target.files[0] || null)} />
                  </Button>
                  {completionImage && (
                    <Typography variant="caption" display="block" color="success.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                      Selected: {completionImage.name}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpenCompleteModal(false)} color="inherit">Cancel</Button>
              <Button type="submit" variant="contained" color="success" disabled={updating} sx={{ px: 3 }}>
                {updating ? 'Completing...' : 'Mark Completed (100%)'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Modal 3: View Details */}
      {selectedTask && (
        <Dialog open={openDetails} onClose={() => setOpenDetails(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {selectedTask.complaint_id || `CMP-${selectedTask.id}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Submitted by {selectedTask.submitted_by_name || 'Farmer'}
              </Typography>
            </Box>
            <Chip
              label={STATUS_CONFIG[selectedTask.status]?.label || selectedTask.status}
              color={STATUS_CONFIG[selectedTask.status]?.color || 'default'}
              sx={{ fontWeight: 700 }}
            />
          </DialogTitle>

          <DialogContent dividers>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">LOCATION</Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {selectedTask.farm_name || 'Farm'} — {selectedTask.field_name || 'Field'}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mt: 1.5 }}>TYPE & PRIORITY</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                    {selectedTask.category?.replace('_', ' ')} ({selectedTask.priority?.toUpperCase()} Priority)
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">CURRENT PROGRESS</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={selectedTask.progress || 0}
                      color={selectedTask.progress === 100 ? 'success' : 'primary'}
                      sx={{ flex: 1, height: 10, borderRadius: 5 }}
                    />
                    <Typography variant="h6" fontWeight={800} color="#1565C0">
                      {selectedTask.progress || 0}%
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">DESCRIPTION</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: '#334155' }}>
                    {selectedTask.description}
                  </Typography>
                  {selectedTask.complaint_image && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>FARMER REPORTED IMAGE</Typography>
                      <img
                        src={selectedTask.complaint_image}
                        alt="Farmer reported image"
                        style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid #cbd5e1' }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Activity History Timeline */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1e293b' }}>
                  📋 Activity History
                </Typography>
                {(!selectedTask.updates || selectedTask.updates.length === 0) ? (
                  <Typography variant="body2" color="text.secondary">No updates logged.</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {selectedTask.updates.map((upd, idx) => (
                      <Paper key={upd.id || idx} variant="outlined" sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#f8fafc' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                            {upd.updated_by_name || 'User'} — Progress {upd.progress}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(upd.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="#475569" sx={{ mt: 0.5 }}>
                          {upd.message}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenDetails(false)} variant="contained" color="inherit">Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default MaintenanceDashboard;
