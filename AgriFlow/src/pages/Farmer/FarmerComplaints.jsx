import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, TextField,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Alert as MuiAlert, Tabs, Tab, Avatar, CircularProgress,
  Divider, Paper
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { getFarms, getFields } from '../../services/api';
import api from '../../services/api';

const COMPLAINT_TYPES = [
  { value: 'irrigation', label: 'Irrigation System Problem' },
  { value: 'water_leakage', label: 'Water Leakage' },
  { value: 'pump', label: 'Pump Problem' },
  { value: 'pipe', label: 'Pipe Problem' },
  { value: 'sprinkler', label: 'Sprinkler Problem' },
  { value: 'drip', label: 'Drip System Problem' },
  { value: 'watering', label: 'Field Watering Issue' },
  { value: 'other', label: 'Other' },
];

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

const FarmerComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [filteredFields, setFilteredFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tabValue, setTabValue] = useState('all');

  // Modal states
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    farm: '',
    field: '',
    category: 'water_leakage',
    title: '',
    description: '',
    priority: 'medium',
  });
  const [complaintImage, setComplaintImage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, farmsData, fieldsData] = await Promise.all([
        api.get('/maintenance/complaints/').catch(err => { console.error('Complaints fetch error:', err); return { data: [] }; }),
        getFarms().catch(err => { console.error('Farms fetch error:', err); return []; }),
        getFields().catch(err => { console.error('Fields fetch error:', err); return []; })
      ]);

      const compList = Array.isArray(compRes.data) ? compRes.data : (compRes.data.results || []);
      const farmList = Array.isArray(farmsData) ? farmsData : (farmsData.results || []);
      const fieldList = Array.isArray(fieldsData) ? fieldsData : (fieldsData.results || []);

      setComplaints(compList);
      setFarms(farmList);
      setFields(fieldList);

      // Auto-select initial farm and field if available
      let initFarmId = '';
      let initFieldId = '';
      let activeFields = fieldList;

      if (farmList.length > 0) {
        initFarmId = String(farmList[0].id);
        const matchingFields = fieldList.filter(f =>
          String(f.farm) === initFarmId ||
          (f.farm && String(f.farm.id) === initFarmId)
        );
        if (matchingFields.length > 0) {
          activeFields = matchingFields;
          initFieldId = String(matchingFields[0].id);
        } else if (fieldList.length > 0) {
          initFieldId = String(fieldList[0].id);
        }
      }

      setFilteredFields(activeFields);
      setFormData(prev => ({
        ...prev,
        farm: prev.farm ? String(prev.farm) : initFarmId,
        field: prev.field ? String(prev.field) : initFieldId,
      }));
    } catch (err) {
      console.error('Failed to load complaints data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setFormError('');
    setFormSuccess('');

    let selectedFarmId = formData.farm ? String(formData.farm) : '';
    if (!selectedFarmId && farms.length > 0) {
      selectedFarmId = String(farms[0].id);
    }

    let availableFields = fields;
    if (selectedFarmId) {
      const matchingFields = fields.filter(f =>
        String(f.farm) === selectedFarmId ||
        (f.farm && String(f.farm.id) === selectedFarmId)
      );
      if (matchingFields.length > 0) availableFields = matchingFields;
    }

    setFilteredFields(availableFields);

    let selectedFieldId = formData.field ? String(formData.field) : '';
    if (!selectedFieldId && availableFields.length > 0) {
      selectedFieldId = String(availableFields[0].id);
    }

    setFormData(prev => ({
      ...prev,
      farm: selectedFarmId,
      field: selectedFieldId,
    }));

    setOpenCreate(true);
  };

  const handleFarmChange = (e) => {
    const selectedFarmId = String(e.target.value || '');
    let availableFields = fields;
    let selectedFieldId = '';

    if (selectedFarmId) {
      const matchingFields = fields.filter(f =>
        String(f.farm) === selectedFarmId ||
        (f.farm && String(f.farm.id) === selectedFarmId)
      );
      if (matchingFields.length > 0) {
        availableFields = matchingFields;
        selectedFieldId = String(matchingFields[0].id);
      }
    }

    setFilteredFields(availableFields);
    setFormData(prev => ({
      ...prev,
      farm: selectedFarmId,
      field: selectedFieldId,
    }));
  };

  const handleFieldChange = (e) => {
    const selectedFieldId = String(e.target.value || '');
    setFormData(prev => ({
      ...prev,
      field: selectedFieldId,
    }));
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.farm) {
      setFormError('Please select a farm.');
      return;
    }
    if (!formData.field) {
      setFormError('Please select a field.');
      return;
    }
    if (!formData.title.trim()) {
      setFormError('Please enter a complaint title.');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Please enter a complaint description.');
      return;
    }

    setSubmitting(true);
    try {
      const postData = new FormData();
      postData.append('farm', formData.farm);
      postData.append('field', formData.field);
      postData.append('category', formData.category);
      postData.append('title', formData.title.trim());
      postData.append('description', formData.description.trim());
      postData.append('priority', formData.priority);
      if (complaintImage) {
        postData.append('complaint_image', complaintImage);
      }

      await api.post('/maintenance/complaints/', postData);

      setFormSuccess('Complaint submitted successfully!');
      setFormData(prev => ({
        ...prev,
        title: '',
        description: '',
      }));
      setComplaintImage(null);
      setOpenCreate(false);
      fetchData();
    } catch (err) {
      console.error('Submit complaint error:', err);
      let errorMsg = 'Unable to submit complaint. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else {
          const fieldErrors = Object.entries(err.response.data)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join(' | ');
          if (fieldErrors) errorMsg = fieldErrors;
        }
      }
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };


  const counts = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending' || c.status === 'accepted').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    completed: complaints.filter(c => c.status === 'completed').length,
  };

  const displayComplaints = complaints.filter(c => {
    if (tabValue === 'all') return true;
    if (tabValue === 'pending') return c.status === 'pending' || c.status === 'accepted';
    return c.status === tabValue;
  });

  return (
    <DashboardLayout title="Maintenance Requests">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1e293b">
            My Maintenance Complaints
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Report issues with your farm equipment and track repair progress in real time.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
          sx={{
            bgcolor: '#2E7D32',
            '&:hover': { bgcolor: '#1b5e20' },
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
            py: 1
          }}
        >
          Report Maintenance Issue
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Complaints" value={String(counts.total)} icon={<BuildIcon />} color="#1565C0" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Pending / Accepted" value={String(counts.pending)} icon={<HourglassEmptyIcon />} color="#E65100" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="In Progress" value={String(counts.in_progress)} icon={<AssignmentIcon />} color="#0288D1" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Completed" value={String(counts.completed)} icon={<CheckCircleIcon />} color="#2E7D32" />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#f8fafc' }}>
          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} indicatorColor="primary" textColor="primary">
            <Tab label={`All (${counts.total})`} value="all" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`Pending (${counts.pending})`} value="pending" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`In Progress (${counts.in_progress})`} value="in_progress" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`Completed (${counts.completed})`} value="completed" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={36} color="success" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading complaints...</Typography>
          </Box>
        ) : displayComplaints.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <BuildIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
            <Typography variant="subtitle1" fontWeight={600} color="#475569">No complaints found</Typography>
            <Typography variant="body2" color="text.secondary">You have not submitted any complaints under this filter.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  {['Complaint ID', 'Farm / Field', 'Issue Title', 'Priority', 'Progress', 'Status', 'Date', 'Action'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayComplaints.map((c) => {
                  const statusInfo = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                  const priorityObj = PRIORITIES.find(p => p.value === c.priority) || PRIORITIES[1];

                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#1b5e20' }}>
                        {c.complaint_id || `CMP-${c.id}`}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="#1e293b">{c.farm_name || 'Farm'}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.field_name || 'Field'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{c.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {c.category?.replace('_', ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={priorityObj.label} color={priorityObj.color} size="small" sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
                      </TableCell>
                      <TableCell sx={{ width: 140 }}>
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
                      <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => { setSelectedComplaint(c); setOpenDetails(true); }}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Modal 1: Report Maintenance Issue Form */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
          🛠️ Report Maintenance Issue
        </DialogTitle>
        <form onSubmit={handleSubmitComplaint}>
          <DialogContent sx={{ py: 2.5 }}>
            <Stack spacing={2.5}>
              {formError && <MuiAlert severity="error">{formError}</MuiAlert>}

              {/* Farm & Field Selection */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Farm *"
                    value={String(formData.farm || '')}
                    onChange={handleFarmChange}
                    size="small"
                  >
                    <MenuItem value="">-- Select Farm --</MenuItem>
                    {farms.map(f => (
                      <MenuItem key={f.id} value={String(f.id)}>{f.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Field *"
                    value={String(formData.field || '')}
                    onChange={handleFieldChange}
                    size="small"
                    disabled={!formData.farm}
                  >
                    <MenuItem value="">-- Select Field --</MenuItem>
                    {filteredFields.map(f => (
                      <MenuItem key={f.id} value={String(f.id)}>{f.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              {/* Category & Priority */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Complaint Type *"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    size="small"
                  >
                    {COMPLAINT_TYPES.map(ct => (
                      <MenuItem key={ct.value} value={ct.value}>{ct.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Priority"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    size="small"
                  >
                    {PRIORITIES.map(p => (
                      <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              {/* Title & Description */}
              <TextField
                fullWidth
                label="Complaint Title *"
                placeholder="e.g. Water Leakage in Main Drip Line"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                size="small"
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Complaint Description *"
                placeholder="Describe the issue in detail (location of damage, pressure drops, observed leak, etc.)..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />

              {/* Optional Photo Upload */}
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoCameraIcon />}
                  sx={{ borderRadius: '8px', textTransform: 'none' }}
                >
                  {complaintImage ? 'Change Photo' : 'Upload Image (Optional)'}
                  <input type="file" hidden accept="image/*" onChange={(e) => setComplaintImage(e.target.files[0] || null)} />
                </Button>
                {complaintImage && (
                  <Typography variant="caption" display="block" color="success.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                    Selected: {complaintImage.name}
                  </Typography>
                )}
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid #f1f5f9' }}>
            <Button onClick={() => setOpenCreate(false)} color="inherit" sx={{ borderRadius: '8px' }}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1b5e20' }, borderRadius: '8px', px: 3 }}
            >
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal 2: View Complaint Details & Timeline */}
      {selectedComplaint && (
        <Dialog open={openDetails} onClose={() => setOpenDetails(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {selectedComplaint.complaint_id || `CMP-${selectedComplaint.id}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Submitted on {new Date(selectedComplaint.created_at).toLocaleString()}
              </Typography>
            </Box>
            <Chip
              label={STATUS_CONFIG[selectedComplaint.status]?.label || selectedComplaint.status}
              color={STATUS_CONFIG[selectedComplaint.status]?.color || 'default'}
              sx={{ fontWeight: 700 }}
            />
          </DialogTitle>

          <DialogContent dividers>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">FARM & FIELD</Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                    {selectedComplaint.farm_name || 'Farm'} — {selectedComplaint.field_name || 'Field'}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mt: 1.5 }}>COMPLAINT TYPE</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                    {selectedComplaint.category?.replace('_', ' ')}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mt: 1.5 }}>ASSIGNED WORKER</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1565C0">
                    {selectedComplaint.assigned_to_name || 'Assigned to Maintenance Team'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">REPAIR PROGRESS</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={selectedComplaint.progress || 0}
                      color={selectedComplaint.progress === 100 ? 'success' : 'primary'}
                      sx={{ flex: 1, height: 10, borderRadius: 5 }}
                    />
                    <Typography variant="h6" fontWeight={800} color="#2E7D32">
                      {selectedComplaint.progress || 0}%
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mt: 1 }}>ISSUE TITLE</Typography>
                  <Typography variant="body2" fontWeight={700}>{selectedComplaint.title}</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">DESCRIPTION</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: '#334155' }}>
                    {selectedComplaint.description}
                  </Typography>
                  {selectedComplaint.complaint_image && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>REPORTED IMAGE</Typography>
                      <img
                        src={selectedComplaint.complaint_image}
                        alt="Reported complaint"
                        style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid #cbd5e1' }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Completion Section if Completed */}
              {selectedComplaint.status === 'completed' && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#166534" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon color="success" /> Maintenance Completed
                    </Typography>
                    {selectedComplaint.completed_at && (
                      <Typography variant="caption" color="#15803d" display="block">
                        Completed at: {new Date(selectedComplaint.completed_at).toLocaleString()}
                      </Typography>
                    )}
                    {selectedComplaint.completion_notes && (
                      <Typography variant="body2" sx={{ mt: 1, color: '#14532d', fontWeight: 500 }}>
                        <strong>Completion Notes:</strong> {selectedComplaint.completion_notes}
                      </Typography>
                    )}
                    {selectedComplaint.completion_image && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="#166534" fontWeight={600} display="block" sx={{ mb: 0.5 }}>COMPLETION PROOF IMAGE</Typography>
                        <img
                          src={selectedComplaint.completion_image}
                          alt="Completion proof"
                          style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid #86efac' }}
                        />
                      </Box>
                    )}
                  </Paper>
                </Grid>
              )}

              {/* Updates History Timeline */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1e293b' }}>
                  📋 Maintenance Activity Timeline
                </Typography>
                {(!selectedComplaint.updates || selectedComplaint.updates.length === 0) ? (
                  <Typography variant="body2" color="text.secondary">No activity updates yet.</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {selectedComplaint.updates.map((upd, idx) => (
                      <Paper key={upd.id || idx} variant="outlined" sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#f8fafc' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                            {upd.updated_by_name || 'Worker'} — Progress {upd.progress}%
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

export default FarmerComplaints;
