import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Grid, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, Snackbar,
  Chip, InputAdornment, Stack, Tooltip
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  getIrrigationHistory, createIrrigationHistory, updateIrrigationHistory, deleteIrrigationHistory,
  getFields, submitRainfallConfirmation, getLatestRainfallConfirmation
} from '../../services/api';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CloudRainIcon from '@mui/icons-material/Thunderstorm';

const IrrigationHistory = () => {
  const [history, setHistory] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dialogs
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Rainfall Confirmation Modal
  const [rainModalOpen, setRainModalOpen] = useState(false);
  const [rainOption, setRainOption] = useState('light_rain');
  const [rainField, setRainField] = useState('');
  const [rainNotes, setRainNotes] = useState('');
  const [latestRain, setLatestRain] = useState(null);

  const [formData, setFormData] = useState({
    field: '', method: 'drip', water_source: 'canal', volume_litres: '', duration_minutes: '', field_condition: '', notes: ''
  });

  useEffect(() => {
    fetchFieldsAndRain();
    fetchHistory();
  }, []);

  const fetchFieldsAndRain = async () => {
    try {
      const [fData, rData] = await Promise.all([getFields(), getLatestRainfallConfirmation()]);
      setFields(fData);
      if (fData.length > 0) setRainField(fData[0].id);
      setLatestRain(rData);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedField) params.field = selectedField;
      if (searchTerm) params.search = searchTerm;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await getIrrigationHistory(params);
      setHistory(data);
    } catch (error) {
      showMessage('error', 'Failed to fetch irrigation records');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFilter = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setSelectedField('');
    setStartDate('');
    setEndDate('');
    getIrrigationHistory({}).then((data) => setHistory(data));
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
        showMessage('success', 'Record logged successfully');
      }
      handleClose();
      fetchHistory();
    } catch (error) {
      showMessage('error', isEditing ? 'Failed to update record' : 'Failed to log record');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this irrigation record?')) {
      try {
        await deleteIrrigationHistory(id);
        showMessage('success', 'Record deleted successfully');
        fetchHistory();
      } catch (error) {
        showMessage('error', 'Failed to delete record');
      }
    }
  };

  const handleRainSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await submitRainfallConfirmation({
        field: rainField,
        rainfall_option: rainOption,
        notes: rainNotes
      });
      setLatestRain(res);
      showMessage('success', 'Rainfall confirmation logged! Recommendations updated.');
      setRainModalOpen(false);
      setRainNotes('');
    } catch (err) {
      showMessage('error', 'Failed to confirm rainfall');
    }
  };

  return (
    <DashboardLayout title="Irrigation History">
      {/* Header Banner / Summary Banner */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Irrigation History & Logs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor, record, and filter your field watering history and confirm recent rainfall.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="info"
            startIcon={<CloudRainIcon />}
            onClick={() => setRainModalOpen(true)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Confirm Rainfall
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            disabled={fields.length === 0}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Add Irrigation Record
          </Button>
        </Stack>
      </Box>

      {/* Latest Rainfall Banner */}
      {latestRain && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '12px', bgcolor: '#e0f2fe', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: 2 }}>
          <WaterDropIcon sx={{ color: '#0284c7', fontSize: 32 }} />
          <Box flexGrow={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1' }}>
              Latest Rainfall Logged: {latestRain.rainfall_option_display} ({latestRain.rainfall_mm} mm)
            </Typography>
            <Typography variant="body2" color="#0c4a6e">
              Field: <strong>{latestRain.field_name}</strong> | Date: {new Date(latestRain.confirmed_at).toLocaleString()}
            </Typography>
          </Box>
          <Chip label="Impacts Recommendation Engine" color="primary" size="small" variant="outlined" />
        </Paper>
      )}

      {/* Search & Filter Bar */}
      <Card elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <form onSubmit={handleSearchFilter}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search notes or method..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter by Field"
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
              >
                <MenuItem value="">All Fields</MenuItem>
                {fields.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={2} sx={{ display: 'flex', gap: 1 }}>
              <Button type="submit" variant="contained" fullWidth size="small" startIcon={<FilterListIcon />} sx={{ borderRadius: '8px' }}>
                Filter
              </Button>
              <Button variant="outlined" color="inherit" size="small" onClick={handleResetFilter} sx={{ borderRadius: '8px' }}>
                Reset
              </Button>
            </Grid>
          </Grid>
        </form>
      </Card>

      {/* Main Records Table */}
      <Card elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <Typography sx={{ py: 4, textAlign: 'center' }}>Loading irrigation history...</Typography>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Field</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Volume (L)</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Water Source</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Notes</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No irrigation records match your criteria.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{record.field_name}</TableCell>
                      <TableCell>{new Date(record.irrigated_at).toLocaleString()}</TableCell>
                      <TableCell>{record.duration_minutes} min</TableCell>
                      <TableCell>
                        <Chip label={`${record.volume_litres} L`} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>
                        <Chip label={record.method} size="small" color="success" sx={{ textTransform: 'capitalize' }} />
                      </TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{record.water_source}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.notes || '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton color="primary" onClick={() => handleOpen(record)} size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton color="error" onClick={() => handleDelete(record.id)} size="small">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Add/Edit Irrigation Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{isEditing ? 'Edit Irrigation Record' : 'Add Irrigation Record'}</DialogTitle>
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
                <TextField select fullWidth label="Water Source" name="water_source" value={formData.water_source} onChange={handleChange}>
                  {['canal', 'borewell', 'rain', 'river', 'tank'].map((s) => (
                    <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Field Condition" name="field_condition" value={formData.field_condition} onChange={handleChange} placeholder="e.g. Moist, Dry topsoil" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Additional details..." />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Record</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Rainfall Confirmation Dialog */}
      <Dialog open={rainModalOpen} onClose={() => setRainModalOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleRainSubmit}>
          <DialogTitle sx={{ fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudRainIcon color="info" /> Confirm Recent Rainfall
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">
                Log rainfall to update AgriFlow's smart rule-based irrigation recommendation algorithm.
              </Typography>
              <TextField select fullWidth label="Select Field" value={rainField} onChange={(e) => setRainField(e.target.value)} required>
                {fields.map((f) => ( <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem> ))}
              </TextField>
              <TextField select fullWidth label="Rainfall Amount" value={rainOption} onChange={(e) => setRainOption(e.target.value)} required>
                <MenuItem value="no_rain">☀️ No Rain (0 mm)</MenuItem>
                <MenuItem value="light_rain">🌦️ Light Rain (1 - 10 mm)</MenuItem>
                <MenuItem value="moderate_rain">🌧️ Moderate Rain (10 - 30 mm)</MenuItem>
                <MenuItem value="heavy_rain">⛈️ Heavy Rain (&gt; 30 mm)</MenuItem>
              </TextField>
              <TextField fullWidth multiline rows={2} label="Observations / Notes" value={rainNotes} onChange={(e) => setRainNotes(e.target.value)} placeholder="e.g. Rain lasted 45 mins" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRainModalOpen(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="info">Confirm & Update Engine</Button>
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
