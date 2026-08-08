import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Grid, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, Snackbar } from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getIrrigationHistory, createIrrigationHistory, updateIrrigationHistory, deleteIrrigationHistory, getFields } from '../../services/api';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const IrrigationHistory = () => {
  const [history, setHistory] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    field: '', method: 'drip', water_source: 'canal', volume_litres: '', duration_minutes: '', field_condition: '', notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [histData, fieldsData] = await Promise.all([getIrrigationHistory(), getFields()]);
      setHistory(histData);
      setFields(fieldsData);
    } catch (error) {
      showMessage('error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => setMessage({ type, text });

  const handleOpen = (record = null) => {
    if (record) {
      setIsEditing(true);
      setCurrentId(record.id);
      setFormData({
        field: record.field, method: record.method, water_source: record.water_source,
        volume_litres: record.volume_litres, duration_minutes: record.duration_minutes,
        field_condition: record.field_condition || '', notes: record.notes || ''
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        field: fields[0]?.id || '', method: 'drip', water_source: 'canal',
        volume_litres: '', duration_minutes: '', field_condition: '', notes: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateIrrigationHistory(currentId, formData);
        showMessage('success', 'Record updated successfully');
      } else {
        await createIrrigationHistory(formData);
        showMessage('success', 'Record created successfully');
      }
      handleClose();
      fetchData();
    } catch (error) {
      showMessage('error', isEditing ? 'Failed to update record' : 'Failed to create record');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteIrrigationHistory(id);
        showMessage('success', 'Record deleted successfully');
        fetchData();
      } catch (error) {
        showMessage('error', 'Failed to delete record');
      }
    }
  };

  return (
    <DashboardLayout title="Irrigation History">
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>Irrigation Records</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} disabled={fields.length === 0}>
            Add Record
          </Button>
        </Box>
        
        {loading ? ( <Typography>Loading history...</Typography> ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Field</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Duration (min)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Quantity (L)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Condition</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">No irrigation records found.</TableCell></TableRow>
                ) : history.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{record.field_name}</TableCell>
                    <TableCell>{new Date(record.irrigated_at).toLocaleDateString()}</TableCell>
                    <TableCell>{record.duration_minutes}</TableCell>
                    <TableCell>{record.volume_litres}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{record.method}</TableCell>
                    <TableCell>{record.field_condition || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleOpen(record)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(record.id)}><DeleteIcon fontSize="small" /></IconButton>
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
          <DialogTitle>{isEditing ? 'Edit Record' : 'Add Irrigation Record'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField select fullWidth label="Field" name="field" value={formData.field} onChange={handleChange} required>
                  {fields.map((f) => ( <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem> ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Duration (minutes)" name="duration_minutes" type="number" value={formData.duration_minutes} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Water Quantity (Litres)" name="volume_litres" type="number" inputProps={{ step: '0.01' }} value={formData.volume_litres} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Method" name="method" value={formData.method} onChange={handleChange}>
                  {['drip', 'sprinkler', 'flood', 'manual', 'surface'].map((m) => (
                    <MenuItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Source" name="water_source" value={formData.water_source} onChange={handleChange}>
                  {['canal', 'borewell', 'rain', 'river', 'tank'].map((s) => (
                    <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Field Condition" name="field_condition" value={formData.field_condition} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Notes" name="notes" value={formData.notes} onChange={handleChange} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
      
      <Snackbar open={!!message.text} autoHideDuration={4000} onClose={() => setMessage({ type: '', text: '' })}>
        <Alert severity={message.type || 'info'} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default IrrigationHistory;
