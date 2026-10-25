import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Grid, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Snackbar, Stack
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getFarms, createFarm, updateFarm, deleteFarm } from '../../services/api';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const FarmManagement = () => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', district: '', total_area: '' });
  const [formErrors, setFormErrors] = useState({ name: '', total_area: '' });

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const data = await getFarms();
      setFarms(Array.isArray(data) ? data : (data?.results || []));
    } catch (error) {
      showMessage('error', 'Failed to fetch farms');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => setMessage({ type, text });

  const handleOpen = (farm = null) => {
    setFormErrors({ name: '', total_area: '' });
    if (farm) {
      setIsEditing(true);
      setCurrentId(farm.id);
      setFormData({ name: farm.name, location: farm.location || '', district: farm.district || '', total_area: farm.total_area });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', location: '', district: '', total_area: '' });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Farm name is required.';
    }
    const areaStr = String(formData.total_area || '').trim();
    const areaVal = parseFloat(areaStr);
    if (!areaStr) {
      errors.total_area = 'Total area is required.';
    } else if (isNaN(areaVal)) {
      errors.total_area = 'Total area must be a valid number.';
    } else if (areaVal <= 0) {
      errors.total_area = 'Total area must be greater than 0.';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showMessage('error', 'Please fix validation errors before submitting.');
      return;
    }

    setSaving(true);

    const payload = {
      name: (formData.name || '').trim(),
      location: (formData.location || '').trim() || null,
      district: (formData.district || '').trim() || null,
      state: 'Kerala',
      total_area: parseFloat(formData.total_area),
    };

    try {
      if (isEditing) {
        await updateFarm(currentId, payload);
        showMessage('success', 'Farm updated successfully');
      } else {
        await createFarm(payload);
        showMessage('success', 'Farm created successfully');
      }
      handleClose();
      fetchFarms();
    } catch (error) {
      console.error("Farm save error:", error.response?.data || error);
      const errData = error.response?.data;
      let errMsg = isEditing ? 'Failed to update farm' : 'Failed to create farm';
      
      if (errData && typeof errData === 'object') {
        const fieldErrs = {};
        if (errData.name) fieldErrs.name = Array.isArray(errData.name) ? errData.name.join(', ') : String(errData.name);
        if (errData.total_area) fieldErrs.total_area = Array.isArray(errData.total_area) ? errData.total_area.join(', ') : String(errData.total_area);
        if (Object.keys(fieldErrs).length > 0) {
          setFormErrors(prev => ({ ...prev, ...fieldErrs }));
        }

        const details = Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        if (details) errMsg += `: ${details}`;
      } else if (typeof errData === 'string') {
        errMsg = errData;
      }

      showMessage('error', errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this farm?')) {
      try {
        await deleteFarm(id);
        showMessage('success', 'Farm deleted successfully');
        fetchFarms();
      } catch (error) {
        showMessage('error', 'Failed to delete farm');
      }
    }
  };

  return (
    <DashboardLayout title="Farm Management">
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>My Farms</Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Manage registered farm holdings and land details.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: '8px' }}>
            Add Farm
          </Button>
        </Box>
        
        {loading ? (
          <Typography sx={{ py: 3, textAlign: 'center', color: '#64748b' }}>Loading farms...</Typography>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Farm Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>District</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Total Area (Acres)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created At</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {farms.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center">No farms found.</TableCell></TableRow>
                ) : farms.map((farm) => (
                  <TableRow key={farm.id} hover>
                    <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{farm.name}</TableCell>
                    <TableCell>{farm.location || '-'}</TableCell>
                    <TableCell>{farm.district || '-'}</TableCell>
                    <TableCell>{farm.total_area} Acres</TableCell>
                    <TableCell>{farm.created_at ? new Date(farm.created_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" size="small" onClick={() => handleOpen(farm)} title="Edit Farm">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" size="small" onClick={() => handleDelete(farm.id)} title="Delete Farm">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      
      {/* Add / Edit Farm Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isEditing ? 'Edit Farm' : 'Add New Farm'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Farm Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Location" name="location" value={formData.location} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="District" name="district" value={formData.district} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Total Area (acres) *"
                  name="total_area"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={formData.total_area}
                  onChange={handleChange}
                  error={!!formErrors.total_area}
                  helperText={formErrors.total_area}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="inherit" disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar open={!!message.text} autoHideDuration={4000} onClose={() => setMessage({ type: '', text: '' })}>
        <Alert severity={message.type || 'info'} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default FarmManagement;
