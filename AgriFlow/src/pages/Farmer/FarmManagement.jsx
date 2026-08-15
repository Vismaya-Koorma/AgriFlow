import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Grid, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Snackbar } from '@mui/material';
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
  
  const [formData, setFormData] = useState({ name: '', location: '', district: '', state: '', total_area: '' });

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const data = await getFarms();
      setFarms(data);
    } catch (error) {
      showMessage('error', 'Failed to fetch farms');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => setMessage({ type, text });

  const handleOpen = (farm = null) => {
    if (farm) {
      setIsEditing(true);
      setCurrentId(farm.id);
      setFormData({ name: farm.name, location: farm.location, district: farm.district, state: farm.state, total_area: farm.total_area });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', location: '', district: '', state: '', total_area: '' });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateFarm(currentId, formData);
        showMessage('success', 'Farm updated successfully');
      } else {
        await createFarm(formData);
        showMessage('success', 'Farm created successfully');
      }
      handleClose();
      fetchFarms();
    } catch (error) {
      showMessage('error', isEditing ? 'Failed to update farm' : 'Failed to create farm');
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>My Farms</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Farm</Button>
        </Box>
        
        {loading ? ( <Typography>Loading farms...</Typography> ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Farm Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Total Area (Acres)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created At</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {farms.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">No farms found.</TableCell></TableRow>
                ) : farms.map((farm) => (
                  <TableRow key={farm.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{farm.name}</TableCell>
                    <TableCell>{farm.location || '-'}</TableCell>
                    <TableCell>{farm.total_area}</TableCell>
                    <TableCell>{new Date(farm.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleOpen(farm)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(farm.id)}><DeleteIcon fontSize="small" /></IconButton>
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
          <DialogTitle>{isEditing ? 'Edit Farm' : 'Add New Farm'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Farm Name" name="name" value={formData.name} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Location" name="location" value={formData.location} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="District" name="district" value={formData.district} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="State" name="state" value={formData.state} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Total Area (acres)" name="total_area" type="number" inputProps={{ step: '0.01' }} value={formData.total_area} onChange={handleChange} required />
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

export default FarmManagement;
