import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Grid, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Switch, FormControlLabel, Alert, Snackbar } from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getFields, createField, updateField, deleteField, getFarms, getCropTypes, getSoilTypes } from '../../services/api';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const FieldManagement = () => {
  const [fields, setFields] = useState([]);
  const [farms, setFarms] = useState([]);
  const [cropTypes, setCropTypes] = useState([]);
  const [soilTypes, setSoilTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', area: '', farm: '', crop_type: '', soil_type: '', crop_stage: 'germination',
    planting_date: '', district: '', state: 'Kerala', latitude: '', longitude: '', status: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fieldsData, farmsData, cropsData, soilsData] = await Promise.all([
        getFields(), getFarms(), getCropTypes(), getSoilTypes()
      ]);
      setFields(fieldsData);
      setFarms(farmsData);
      setCropTypes(cropsData);
      setSoilTypes(soilsData);
    } catch (error) {
      showMessage('error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => setMessage({ type, text });

  const handleOpen = (field = null) => {
    if (field) {
      setIsEditing(true);
      setCurrentId(field.id);
      setFormData({
        name: field.name, area: field.area, farm: field.farm, crop_type: field.crop_type || '',
        soil_type: field.soil_type || '', crop_stage: field.crop_stage || 'germination', planting_date: field.planting_date || '',
        district: field.district || '', state: field.state || 'Kerala',
        latitude: field.latitude !== null && field.latitude !== undefined ? field.latitude : '',
        longitude: field.longitude !== null && field.longitude !== undefined ? field.longitude : '',
        status: field.status !== undefined ? field.status : true
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        name: '', area: '', farm: farms[0]?.id || '', crop_type: '', soil_type: '', crop_stage: 'germination',
        planting_date: '', district: farms[0]?.district || '', state: farms[0]?.state || 'Kerala',
        latitude: '', longitude: '', status: true
      });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    console.log("Field payload (raw):", formData);

    const payload = {
      farm: parseInt(formData.farm, 10),
      name: (formData.name || '').trim(),
      area: parseFloat(formData.area) || 0,
      crop_type: formData.crop_type !== '' && formData.crop_type != null ? parseInt(formData.crop_type, 10) : null,
      soil_type: formData.soil_type !== '' && formData.soil_type != null ? parseInt(formData.soil_type, 10) : null,
      crop_stage: formData.crop_stage || 'germination',
      planting_date: formData.planting_date && formData.planting_date.trim() !== '' ? formData.planting_date : null,
      district: formData.district ? formData.district.trim() : null,
      state: formData.state ? formData.state.trim() : 'Kerala',
      latitude: formData.latitude !== '' && formData.latitude != null ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude !== '' && formData.longitude != null ? parseFloat(formData.longitude) : null,
      status: Boolean(formData.status),
    };

    console.log("Field payload (clean):", payload);

    try {
      if (isEditing) {
        await updateField(currentId, payload);
        showMessage('success', 'Field updated successfully');
      } else {
        await createField(payload);
        showMessage('success', 'Field created successfully');
      }
      handleClose();
      fetchData(); // Refresh fields
    } catch (error) {
      console.error("Field save error:", error.response?.data || error);
      const errData = error.response?.data;
      let errMsg = isEditing ? 'Failed to update field' : 'Failed to create field';
      if (errData) {
        if (typeof errData === 'string') {
          errMsg = errData;
        } else if (typeof errData === 'object') {
          const details = Object.entries(errData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
          if (details) errMsg += `: ${details}`;
        }
      }
      showMessage('error', errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      try {
        await deleteField(id);
        showMessage('success', 'Field deleted successfully');
        fetchData();
      } catch (error) {
        showMessage('error', 'Failed to delete field');
      }
    }
  };

  return (
    <DashboardLayout title="Field Management">
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>My Fields</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} disabled={farms.length === 0}>
            Add Field
          </Button>
        </Box>
        
        {loading ? ( <Typography>Loading fields...</Typography> ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Field Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Farm</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Location (District, State)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Crop Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Soil Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Area (Acres)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center">No fields found.</TableCell></TableRow>
                ) : fields.map((field) => (
                  <TableRow key={field.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{field.name}</TableCell>
                    <TableCell>{field.farm_name}</TableCell>
                    <TableCell>{field.location_display || field.effective_district || '-'}</TableCell>
                    <TableCell>{field.crop_type_name || '-'}</TableCell>
                    <TableCell>{field.soil_type_name || '-'}</TableCell>
                    <TableCell>{field.area}</TableCell>
                    <TableCell>{field.status ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleOpen(field)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(field.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isEditing ? 'Edit Field' : 'Add New Field'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField select fullWidth label="Farm" name="farm" value={formData.farm} onChange={handleChange} required>
                  {farms.map((f) => ( <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem> ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Field Name" name="name" value={formData.name} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Area (acres)" name="area" type="number" inputProps={{ step: '0.01' }} value={formData.area} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Crop Type" name="crop_type" value={formData.crop_type} onChange={handleChange}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {cropTypes.map((c) => ( <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem> ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Soil Type" name="soil_type" value={formData.soil_type} onChange={handleChange}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {soilTypes.map((s) => ( <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem> ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Crop Stage" name="crop_stage" value={formData.crop_stage} onChange={handleChange}>
                  {['germination', 'vegetative', 'flowering', 'fruiting', 'harvesting'].map((stage) => (
                    <MenuItem key={stage} value={stage}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Planting Date" name="planting_date" type="date" value={formData.planting_date} onChange={handleChange} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel control={<Switch checked={formData.status} onChange={handleChange} name="status" />} label="Active Status" />
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

export default FieldManagement;
