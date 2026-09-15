import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Card, Grid, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, Snackbar,
  Chip, InputAdornment, Stack, Tooltip, CircularProgress
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AIRecommendationCard from '../../components/cards/AIRecommendationCard';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  getIrrigationHistory, createIrrigationHistory, updateIrrigationHistory, deleteIrrigationHistory,
  getFarms, getFields, submitRainfallConfirmation, getLatestRainfallConfirmation, getAIRecommendation
} from '../../services/api';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CloudRainIcon from '@mui/icons-material/Thunderstorm';

const IrrigationHistory = () => {
  const location = useLocation();
  const navState = location.state || {};

  const [history, setHistory] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarm, setSelectedFarm] = useState(navState.selectedFarmId || '');
  const [selectedField, setSelectedField] = useState(navState.selectedFieldId || navState.fieldId || '');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dialogs
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // AI Recommendation State for Modal
  const [aiRec, setAiRec] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Rainfall Confirmation Modal
  const [rainModalOpen, setRainModalOpen] = useState(false);
  const [rainOption, setRainOption] = useState('light_rain');
  const [rainField, setRainField] = useState('');
  const [rainNotes, setRainNotes] = useState('');
  const [latestRain, setLatestRain] = useState(null);

  const [formData, setFormData] = useState({
    farm: navState.selectedFarmId || '',
    field: navState.selectedFieldId || navState.fieldId || '',
    status: 'completed',
    volume_litres: '',
    recommended_water_litres: '',
    duration_minutes: '30',
    method: 'drip',
    water_source: 'canal',
    field_condition: '',
    notes: ''
  });

  useEffect(() => {
    fetchFarmsFieldsAndRain();
  }, []);

  const fetchFarmsFieldsAndRain = async () => {
    try {
      const [farmsData, fieldsData, rData] = await Promise.all([
        getFarms().catch((err) => { console.error('getFarms error:', err); return []; }),
        getFields().catch((err) => { console.error('getFields error:', err); return []; }),
        getLatestRainfallConfirmation().catch((err) => { console.error('getLatestRainfallConfirmation error:', err); return null; })
      ]);
      const farmList = Array.isArray(farmsData) ? farmsData : (farmsData?.results || []);
      const fieldList = Array.isArray(fieldsData) ? fieldsData : (fieldsData?.results || []);
      setFarms(farmList);
      setFields(fieldList);
      if (fieldList.length > 0) setRainField(fieldList[0].id);
      setLatestRain(rData);

      // Handle preselected farm & field from location state or default
      let initField = navState.selectedFieldId || navState.fieldId || '';
      let initFarm = navState.selectedFarmId || '';

      if (initField && fieldList.length > 0) {
        const found = fieldList.find(f => String(f.id) === String(initField));
        if (found) {
          initFarm = found.farm || found.farm_id || initFarm;
          setSelectedField(found.id);
          setSelectedFarm(initFarm);
        }
      }

      fetchHistory({ farm: initFarm, field: initField });
    } catch (e) {
      console.error('Error fetching farms/fields', e);
      fetchHistory({});
    }
  };

  const fetchHistory = async (overrideParams = null) => {
    setLoading(true);
    try {
      const params = {};
      const farmVal = overrideParams?.farm !== undefined ? overrideParams.farm : selectedFarm;
      const fieldVal = overrideParams?.field !== undefined ? overrideParams.field : selectedField;

      if (farmVal) params.farm = farmVal;
      if (fieldVal) params.field = fieldVal;
      if (selectedStatus) params.status = selectedStatus;
      if (searchTerm) params.search = searchTerm;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await getIrrigationHistory(params);
      const list = Array.isArray(data) ? data : (data?.results || []);
      setHistory(list);
    } catch (error) {
      showMessage('error', 'Failed to fetch irrigation records');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIForField = async (fieldId) => {
    if (!fieldId) {
      setAiRec(null);
      return;
    }
    setAiLoading(true);
    try {
      const res = await getAIRecommendation({ fieldId });
      setAiRec(res);
      if (res && res.recommended_water != null) {
        setFormData(prev => ({
          ...prev,
          recommended_water_litres: String(res.recommended_water)
        }));
      }
    } catch (e) {
      console.error('Failed to fetch AI recommendation for modal:', e);
      setAiRec(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSearchFilter = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setSelectedFarm('');
    setSelectedField('');
    setSelectedStatus('');
    setStartDate('');
    setEndDate('');
    fetchHistory({ farm: '', field: '' });
  };

  const showMessage = (type, text) => setMessage({ type, text });

  const handleOpen = (record = null) => {
    if (record) {
      setIsEditing(true);
      setCurrentId(record.id);
      setFormData({
        farm: record.farm || '',
        field: record.field || '',
        status: record.status || 'completed',
        volume_litres: record.volume_litres || '0',
        recommended_water_litres: record.recommended_water_litres || '',
        duration_minutes: record.duration_minutes || '0',
        method: record.method || 'drip',
        water_source: record.water_source || 'canal',
        field_condition: record.field_condition || '',
        notes: record.notes || ''
      });
      if (record.field) fetchAIForField(record.field);
    } else {
      setIsEditing(false);
      setCurrentId(null);

      let defaultFarm = selectedFarm || navState.selectedFarmId || farms[0]?.id || '';
      let availableFieldsForDefaultFarm = fields.filter((f) => !defaultFarm || f.farm === defaultFarm || f.farm?.id === defaultFarm);
      let defaultField = selectedField || navState.selectedFieldId || availableFieldsForDefaultFarm[0]?.id || '';

      if (defaultField && !defaultFarm) {
        const foundF = fields.find(f => String(f.id) === String(defaultField));
        if (foundF) defaultFarm = foundF.farm;
      }

      setFormData({
        farm: defaultFarm,
        field: defaultField,
        status: 'completed',
        volume_litres: '',
        recommended_water_litres: '',
        duration_minutes: '30',
        method: 'drip',
        water_source: 'canal',
        field_condition: '',
        notes: ''
      });

      if (defaultField) fetchAIForField(defaultField);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleFarmChange = (e) => {
    const newFarmId = e.target.value;
    const availableFields = fields.filter((f) => f.farm === newFarmId || f.farm?.id === newFarmId);
    const newFieldId = availableFields[0]?.id || '';
    setFormData({
      ...formData,
      farm: newFarmId,
      field: newFieldId
    });
    if (newFieldId) fetchAIForField(newFieldId);
  };

  const handleFieldChangeInModal = (e) => {
    const newFieldId = e.target.value;
    setFormData({ ...formData, field: newFieldId });
    if (newFieldId) fetchAIForField(newFieldId);
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setFormData({
      ...formData,
      status: newStatus,
      volume_litres: newStatus === 'not_done' ? '0' : formData.volume_litres
    });
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.field) {
      showMessage('error', 'Please select a valid field.');
      return;
    }

    if (formData.status === 'completed' && (formData.volume_litres === '' || parseFloat(formData.volume_litres) < 0)) {
      showMessage('error', 'Please enter a valid positive volume for completed irrigation.');
      return;
    }

    const payload = {
      ...formData,
      volume_litres: formData.status === 'not_done' ? 0 : parseFloat(formData.volume_litres || 0),
      recommended_water_litres: formData.recommended_water_litres ? parseFloat(formData.recommended_water_litres) : null,
      duration_minutes: parseInt(formData.duration_minutes || 0, 10)
    };

    try {
      if (isEditing) {
        await updateIrrigationHistory(currentId, payload);
        showMessage('success', 'Record updated successfully');
      } else {
        await createIrrigationHistory(payload);
        showMessage('success', 'Record logged successfully');
      }
      handleClose();
      fetchHistory();
      setRefreshTrigger(prev => prev + 1);
      if (formData.field) fetchAIForField(formData.field);
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save record';
      showMessage('error', errDetail);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this irrigation record?')) {
      try {
        await deleteIrrigationHistory(id);
        showMessage('success', 'Record deleted successfully');
        fetchHistory();
        setRefreshTrigger(prev => prev + 1);
        if (selectedField) fetchAIForField(selectedField);
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
      setRefreshTrigger(prev => prev + 1);
      if (rainField) fetchAIForField(rainField);
    } catch (err) {
      showMessage('error', 'Failed to confirm rainfall');
    }
  };

  // Filtered fields for Farm dropdown selection in Filter bar
  const filterAvailableFields = selectedFarm
    ? fields.filter((f) => f.farm === selectedFarm || f.farm?.id === selectedFarm)
    : fields;

  // Filtered fields for Modal form
  const modalAvailableFields = formData.farm
    ? fields.filter((f) => f.farm === formData.farm || f.farm?.id === formData.farm)
    : fields;

  return (
    <DashboardLayout title="Irrigation History">
      {/* Header Banner */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Irrigation History & Logs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor, record, and filter your field watering history and confirm actual water consumption.
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

      {/* AI Recommendation Card for Selected/Active Field */}
      {fields.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <AIRecommendationCard
            fieldId={selectedField || fields[0]?.id}
            farmId={selectedFarm || null}
            refreshTrigger={refreshTrigger}
          />
        </Box>
      )}

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

      {/* Search & Cascading Filter Bar */}
      <Card elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <form onSubmit={handleSearchFilter}>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} sm={2.5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search notes/method..."
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
            {/* Farm Filter */}
            <Grid item xs={12} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Farm"
                value={selectedFarm}
                onChange={(e) => {
                  setSelectedFarm(e.target.value);
                  setSelectedField('');
                }}
              >
                <MenuItem value="">All Farms</MenuItem>
                {farms.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            {/* Field Filter (Cascading) */}
            <Grid item xs={12} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Field"
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
              >
                <MenuItem value="">All Fields</MenuItem>
                {filterAvailableFields.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            {/* Status Filter */}
            <Grid item xs={12} sm={1.5}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="completed">Done</MenuItem>
                <MenuItem value="not_done">Not Done</MenuItem>
              </TextField>
            </Grid>
            {/* Date Range */}
            <Grid item xs={6} sm={1.5}>
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
            <Grid item xs={6} sm={1.5}>
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
            {/* Actions */}
            <Grid item xs={12} sm={1} sx={{ display: 'flex', gap: 1 }}>
              <Button type="submit" variant="contained" fullWidth size="small" startIcon={<FilterListIcon />} sx={{ borderRadius: '8px' }}>
                Filter
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
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Farm</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Field</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Rec. Water</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Actual Water Used</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Method / Source</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Notes</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No irrigation records match your criteria.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>{new Date(record.irrigated_at).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{record.farm_name || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{record.field_name || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={record.status === 'completed' ? 'Done' : 'Not Done'}
                          size="small"
                          color={record.status === 'completed' ? 'success' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        {record.recommended_water_litres != null
                          ? `${Number(record.recommended_water_litres).toLocaleString()} L`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${Number(record.volume_litres).toLocaleString()} L`}
                          size="small"
                          color={record.status === 'completed' ? 'primary' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>
                        {record.method} ({record.water_source})
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          <DialogTitle sx={{ fontWeight: 700 }}>{isEditing ? 'Edit Irrigation Record' : 'Record Irrigation Event'}</DialogTitle>
          <DialogContent dividers>
            {/* AI Recommendation Preview Box */}
            {aiLoading ? (
              <Box sx={{ p: 2, mb: 2.5, borderRadius: '12px', bgcolor: '#f5f3ff', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={20} sx={{ color: '#6366f1' }} />
                <Typography variant="body2" sx={{ color: '#4c1d95', fontWeight: 600 }}>
                  Fetching current AI recommendation for selected field...
                </Typography>
              </Box>
            ) : aiRec && !aiRec.error ? (
              <Box sx={{
                p: 2, mb: 2.5, borderRadius: '14px',
                border: '1px solid',
                borderColor: aiRec.irrigation_needed ? '#c7d2fe' : '#bbf7d0',
                bgcolor: aiRec.irrigation_needed ? '#f5f3ff' : '#f0fdf4'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesomeIcon sx={{ color: '#6366f1', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e1b4b' }}>
                      Current AI Recommendation
                    </Typography>
                  </Box>
                  <Chip
                    label={aiRec.priority ? `${aiRec.priority} PRIORITY` : (aiRec.irrigation_needed ? 'HIGH PRIORITY' : 'LOW PRIORITY')}
                    size="small"
                    sx={{
                      bgcolor: aiRec.priority === 'HIGH' || aiRec.irrigation_needed ? '#fee2e2' : '#dcfce7',
                      color: aiRec.priority === 'HIGH' || aiRec.irrigation_needed ? '#dc2626' : '#16a34a',
                      fontWeight: 800, fontSize: '0.7rem'
                    }}
                  />
                </Box>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={7}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: aiRec.irrigation_needed ? '#4338ca' : '#15803d' }}>
                      {aiRec.irrigation_needed ? '💧 Irrigation Needed' : '❌ No Irrigation Needed'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Field: <strong>{aiRec.field_name || 'Selected Field'}</strong> ({aiRec.crop_name || 'Crop'} • {aiRec.crop_stage || 'Stage'})
                    </Typography>
                  </Grid>
                  <Grid item xs={5} sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Recommended Water</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                      {aiRec.recommended_water ? `${Number(aiRec.recommended_water).toLocaleString()} L` : '0 L'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            ) : null}

            <Grid container spacing={2}>
              {/* Farm Select */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Farm *"
                  name="farm"
                  value={formData.farm}
                  onChange={handleFarmChange}
                  required
                >
                  {farms.map((f) => ( <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem> ))}
                </TextField>
              </Grid>
              {/* Field Select (Cascading) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Field *"
                  name="field"
                  value={formData.field}
                  onChange={handleFieldChangeInModal}
                  required
                >
                  {modalAvailableFields.map((f) => ( <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem> ))}
                </TextField>
              </Grid>

              {/* Status Select (Done / Not Done) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Irrigation Status *"
                  name="status"
                  value={formData.status}
                  onChange={handleStatusChange}
                  required
                >
                  <MenuItem value="completed">Done / Completed</MenuItem>
                  <MenuItem value="not_done">Not Done</MenuItem>
                </TextField>
              </Grid>

              {/* Actual Water Used */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Actual Water Used (Litres) *"
                  name="volume_litres"
                  type="number"
                  inputProps={{ step: '0.01', min: '0' }}
                  value={formData.volume_litres}
                  onChange={handleChange}
                  disabled={formData.status === 'not_done'}
                  required={formData.status === 'completed'}
                  helperText={formData.status === 'not_done' ? 'Set to 0 when status is Not Done' : 'Enter actual litres recorded'}
                />
              </Grid>

              {/* Recommended Water (Optional / Reference) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Recommended Water (Litres)"
                  name="recommended_water_litres"
                  type="number"
                  inputProps={{ step: '0.01', min: '0' }}
                  value={formData.recommended_water_litres}
                  onChange={handleChange}
                  placeholder="Optional recommendation"
                />
              </Grid>

              {/* Duration */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  name="duration_minutes"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                />
              </Grid>

              {/* Method */}
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Irrigation Method" name="method" value={formData.method} onChange={handleChange}>
                  {['drip', 'sprinkler', 'flood', 'manual', 'surface'].map((m) => (
                    <MenuItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Water Source */}
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Water Source" name="water_source" value={formData.water_source} onChange={handleChange}>
                  {['canal', 'borewell', 'rain', 'river', 'tank'].map((s) => (
                    <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Additional details or observations..." />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Irrigation Record</Button>
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
