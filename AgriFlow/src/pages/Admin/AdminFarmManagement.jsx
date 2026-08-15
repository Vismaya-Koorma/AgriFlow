import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, IconButton, InputAdornment,
  Snackbar, Alert, Tooltip, Paper
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';

import AgricultureIcon from '@mui/icons-material/Agriculture';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import GrassIcon from '@mui/icons-material/Grass';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';

import { farms as defaultFarms } from '../../data/farms';

const DISTRICTS = [
  'Thrissur', 'Ernakulam', 'Thiruvananthapuram', 'Alappuzha',
  'Kollam', 'Palakkad', 'Wayanad', 'Kottayam', 'Idukki',
  'Kozhikode', 'Malappuram', 'Kannur', 'Kasaragod'
];

const INITIAL_ADMIN_FARMS = [
  { id: 1, name: 'Green Valley Farm', owner: 'Ramesh Kumar', district: 'Thrissur', location: 'Paddy Zone B', total_area: 12.5, crop: 'Paddy', fieldsCount: 3, status: 'Active' },
  { id: 2, name: 'Highland Plantation', owner: 'Anil Menon', district: 'Ernakulam', location: 'Hill Sector 4', total_area: 8.0, crop: 'Cardamom', fieldsCount: 2, status: 'Active' },
  { id: 3, name: 'Coastal Agro Field', owner: 'Priya Nair', district: 'Thiruvananthapuram', location: 'South Coast', total_area: 15.2, crop: 'Coconut', fieldsCount: 4, status: 'Active' },
  { id: 4, name: 'Kuttanad Organic Paddy', owner: 'Meena Devi', district: 'Alappuzha', location: 'Lake Basin', total_area: 20.0, crop: 'Paddy', fieldsCount: 5, status: 'Under Review' },
  { id: 5, name: 'Wayanad Spice Estate', owner: 'Suresh Pillai', district: 'Wayanad', location: 'Mananthavady', total_area: 18.5, crop: 'Pepper & Spices', fieldsCount: 4, status: 'Active' },
];

const AdminFarmManagement = () => {
  const [farmList, setFarmList] = useState(() => {
    const saved = localStorage.getItem('agriflow_admin_farms');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved farms", e);
      }
    }
    return INITIAL_ADMIN_FARMS;
  });

  useEffect(() => {
    localStorage.setItem('agriflow_admin_farms', JSON.stringify(farmList));
  }, [farmList]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [currentFarm, setCurrentFarm] = useState(null);
  const [confirmDeleteFarm, setConfirmDeleteFarm] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    district: 'Thrissur',
    location: '',
    total_area: '',
    crop: 'Paddy',
    status: 'Active'
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // CREATE Farm
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      owner: 'Ramesh Kumar',
      district: 'Thrissur',
      location: '',
      total_area: '10',
      crop: 'Paddy',
      status: 'Active'
    });
    setOpenAddDialog(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.owner || !formData.total_area) {
      showNotification('Please fill in Farm Name, Owner Name, and Total Area.', 'error');
      return;
    }

    const newFarm = {
      id: Date.now(),
      name: formData.name.trim(),
      owner: formData.owner.trim(),
      district: formData.district,
      location: formData.location || 'Central Plot',
      total_area: parseFloat(formData.total_area) || 5.0,
      crop: formData.crop,
      fieldsCount: Math.floor(Math.random() * 3) + 1,
      status: formData.status
    };

    setFarmList(prev => [newFarm, ...prev]);
    setOpenAddDialog(false);
    showNotification(`Farm "${newFarm.name}" added successfully!`);
  };

  // EDIT Farm
  const handleEditClick = (farm) => {
    setCurrentFarm(farm);
    setFormData({
      name: farm.name,
      owner: farm.owner,
      district: farm.district,
      location: farm.location,
      total_area: String(farm.total_area),
      crop: farm.crop,
      status: farm.status
    });
    setOpenEditDialog(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.owner) {
      showNotification('Farm Name and Owner are required.', 'error');
      return;
    }

    setFarmList(prev => prev.map(f => f.id === currentFarm.id ? {
      ...f,
      name: formData.name.trim(),
      owner: formData.owner.trim(),
      district: formData.district,
      location: formData.location,
      total_area: parseFloat(formData.total_area) || f.total_area,
      crop: formData.crop,
      status: formData.status
    } : f));

    setOpenEditDialog(false);
    showNotification(`Farm "${formData.name}" updated successfully!`);
  };

  // DELETE Farm with Confirmation
  const handleDeleteClick = (farm) => {
    setConfirmDeleteFarm(farm);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteFarm) return;
    setFarmList(prev => prev.filter(f => f.id !== confirmDeleteFarm.id));
    setOpenDeleteDialog(false);
    showNotification(`Farm "${confirmDeleteFarm.name}" deleted successfully.`, 'info');
    setConfirmDeleteFarm(null);
  };

  // RESTORE DEFAULT FARMS
  const handleRestoreDefaults = () => {
    setFarmList(INITIAL_ADMIN_FARMS);
    localStorage.setItem('agriflow_admin_farms', JSON.stringify(INITIAL_ADMIN_FARMS));
    showNotification('Admin farm directory reset to default records.', 'success');
  };

  // VIEW Farm
  const handleViewClick = (farm) => {
    setCurrentFarm(farm);
    setOpenViewDialog(true);
  };

  // Filtered Farms
  const filteredFarms = farmList.filter(f => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDistrict = selectedDistrict === 'all' || f.district === selectedDistrict;
    const matchesStatus = selectedStatus === 'all' || f.status === selectedStatus;
    return matchesSearch && matchesDistrict && matchesStatus;
  });

  const totalAcreage = farmList.reduce((acc, f) => acc + (f.total_area || 0), 0);

  return (
    <DashboardLayout title="System Farm Management">
      {/* Executive Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Total Registered Farms', value: String(farmList.length), icon: <AgricultureIcon />, color: '#2E7D32' },
          { title: 'Total Managed Acreage', value: `${totalAcreage.toFixed(1)} Acres`, icon: <GrassIcon />, color: '#00695C' },
          { title: 'Covered Districts', value: '7 Districts', icon: <LocationOnIcon />, color: '#1565C0' },
          { title: 'Monitored Fields', value: '19 Fields', icon: <WaterDropIcon />, color: '#6A1B9A' },
        ].map((c) => (
          <Grid item xs={12} sm={6} lg={3} key={c.title}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* Search and Action Bar */}
      <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', p: 2.5, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search farm name, owner, district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: '#f8fafc', borderRadius: '8px' }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>District</InputLabel>
              <Select
                value={selectedDistrict}
                label="District"
                onChange={(e) => setSelectedDistrict(e.target.value)}
              >
                <MenuItem value="all">All Districts</MenuItem>
                {DISTRICTS.map(d => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Under Review">Under Review</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRestoreDefaults}
              sx={{ borderRadius: '8px' }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
              onClick={handleOpenAdd}
              sx={{ borderRadius: '8px', bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
            >
              Add New Farm
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Farms Table */}
      <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Registered Farm Directory ({filteredFarms.length} Farms)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            System Farm Management & Field Allocation
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                {['Farm Name', 'Owner / Farmer', 'District & Location', 'Crop Type', 'Area (Acres)', 'Fields', 'Status', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFarms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No matching farms found.</Typography>
                    <Button size="small" onClick={handleRestoreDefaults} sx={{ mt: 1 }}>Restore Default Farms</Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFarms.map((farm) => (
                  <TableRow key={farm.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar sx={{ bgcolor: '#2E7D32', width: 34, height: 34, fontSize: '0.9rem' }}>
                          <AgricultureIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>{farm.name}</Typography>
                          <Typography variant="caption" color="text.secondary">ID: FARM-{farm.id}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{farm.owner}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{farm.district}</Typography>
                      <Typography variant="caption" color="text.secondary">{farm.location}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={farm.crop} size="small" variant="outlined" color="success" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{farm.total_area} Acres</TableCell>
                    <TableCell>{farm.fieldsCount || 3} Fields</TableCell>
                    <TableCell>
                      <Chip
                        label={farm.status}
                        color={farm.status === 'Active' ? 'success' : 'warning'}
                        size="small"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View Details">
                          <IconButton size="small" color="primary" onClick={() => handleViewClick(farm)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Farm">
                          <IconButton size="small" color="info" onClick={() => handleEditClick(farm)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Farm">
                          <IconButton size="small" color="error" onClick={() => handleDeleteClick(farm)}>
                            <DeleteIcon fontSize="small" />
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
      </Card>

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px', p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d32f2f', fontWeight: 700 }}>
          <WarningIcon color="error" /> Confirm Delete Farm
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1, color: '#1e293b' }}>
            Are you sure you want to delete farm <strong>{confirmDeleteFarm?.name}</strong> owned by <em>{confirmDeleteFarm?.owner}</em>?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            This action will unbind linked fields and irrigation records for this farm.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit" variant="outlined" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD FARM MODAL */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Register New Farm Account
        </DialogTitle>
        <form onSubmit={handleAddSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Farm Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Owner / Farmer Name *"
                  name="owner"
                  value={formData.owner}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>District</InputLabel>
                  <Select label="District" name="district" value={formData.district} onChange={handleFormChange}>
                    {DISTRICTS.map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Location / Zone"
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Total Area (Acres) *"
                  name="total_area"
                  type="number"
                  inputProps={{ step: '0.1' }}
                  value={formData.total_area}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Primary Crop</InputLabel>
                  <Select label="Primary Crop" name="crop" value={formData.crop} onChange={handleFormChange}>
                    {['Paddy', 'Coconut', 'Cardamom', 'Pepper & Spices', 'Banana', 'Vegetables', 'Tea / Coffee'].map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenAddDialog(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" sx={{ borderRadius: '8px', bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}>
              Register Farm
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT FARM MODAL */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Edit Farm: {currentFarm?.name}
        </DialogTitle>
        <form onSubmit={handleEditSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Farm Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Owner / Farmer Name *"
                  name="owner"
                  value={formData.owner}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>District</InputLabel>
                  <Select label="District" name="district" value={formData.district} onChange={handleFormChange}>
                    {DISTRICTS.map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Location / Zone"
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Total Area (Acres) *"
                  name="total_area"
                  type="number"
                  inputProps={{ step: '0.1' }}
                  value={formData.total_area}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Primary Crop</InputLabel>
                  <Select label="Primary Crop" name="crop" value={formData.crop} onChange={handleFormChange}>
                    {['Paddy', 'Coconut', 'Cardamom', 'Pepper & Spices', 'Banana', 'Vegetables', 'Tea / Coffee'].map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenEditDialog(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ borderRadius: '8px' }}>
              Save Changes
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* VIEW FARM MODAL */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Farm Details Overview
          <IconButton size="small" onClick={() => setOpenViewDialog(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {currentFarm && (
            <Stack spacing={2} alignItems="center" sx={{ pt: 1, pb: 1 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: '#2E7D32' }}>
                <AgricultureIcon fontSize="large" />
              </Avatar>
              <Box text-align="center" sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{currentFarm.name}</Typography>
                <Typography variant="body2" color="text.secondary">Owned by {currentFarm.owner}</Typography>
              </Box>
              <Chip label={currentFarm.status} color="success" size="small" />

              <Box sx={{ width: '100%', mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">District:</Typography>
                  <Typography variant="body2" fontWeight={600}>{currentFarm.district}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">Location Zone:</Typography>
                  <Typography variant="body2" fontWeight={600}>{currentFarm.location}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="body2" color="text.secondary">Total Area:</Typography>
                  <Typography variant="body2" fontWeight={600}>{currentFarm.total_area} Acres</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                  <Typography variant="body2" color="text.secondary">Primary Crop:</Typography>
                  <Typography variant="body2" fontWeight={600}>{currentFarm.crop}</Typography>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: '10px', boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default AdminFarmManagement;
