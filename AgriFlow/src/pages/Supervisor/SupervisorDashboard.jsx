import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Alert, CircularProgress,
  IconButton, InputAdornment
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import PeopleIcon from '@mui/icons-material/People';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import VerifiedIcon from '@mui/icons-material/Verified';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {
  getFields, verifyField,
  getWaterAllocationRequests, verifyWaterAllocationRequest
} from '../../services/api';

const COLORS = ['#2E7D32', '#FF9800', '#F44336'];

const STATUS_COLOR = {
  pending: 'warning',
  pending_review: 'warning',
  verified: 'success',
  needs_improvement: 'secondary',
  rejected: 'error',
  approved: 'success'
};

const SupervisorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Real Data States
  const [fieldList, setFieldList] = useState([]);
  const [waterRequests, setWaterRequests] = useState([]);

  // Notes Modal State for Water Request Verification
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState('verified'); // 'verified' or 'rejected'
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [fieldsData, requestsData] = await Promise.all([
        getFields().catch(() => []),
        getWaterAllocationRequests().catch(() => [])
      ]);

      const fieldsArray = Array.isArray(fieldsData) ? fieldsData : (fieldsData?.results || []);
      const requestsArray = Array.isArray(requestsData) ? requestsData : (requestsData?.results || []);

      setFieldList(fieldsArray);
      setWaterRequests(requestsArray);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load supervisor verification data from server.');
    } finally {
      setLoading(false);
    }
  };

  // Field Verification Handler
  const handleVerifyField = async (fieldId, status) => {
    try {
      await verifyField(fieldId, { status });
      setSuccessMsg(`Field verification status updated to '${status}'.`);
      fetchDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || `Failed to update field verification.`);
    }
  };

  // Open Notes Modal for Water Request
  const handleOpenReqModal = (req, type) => {
    setSelectedReq(req);
    setActionType(type);
    setVerificationNotes(type === 'verified' ? 'Field ground truth verified by supervisor.' : 'Water requirement rejected during field inspection.');
    setNotesModalOpen(true);
  };

  // Submit Water Request Verification
  const handleVerifyRequestSubmit = async () => {
    if (!selectedReq) return;
    try {
      await verifyWaterAllocationRequest(selectedReq.id, {
        status: actionType,
        notes: verificationNotes
      });
      setSuccessMsg(`Water request #${selectedReq.id} marked as ${actionType}.`);
      setNotesModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit verification.');
    }
  };

  // Filter fields based on search
  const filteredFields = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return fieldList;
    return fieldList.filter((f) => {
      const name = String(f.name || '').toLowerCase();
      const farm = String(f.farm_name || '').toLowerCase();
      const crop = String(f.crop_type_name || '').toLowerCase();
      const variety = String(f.crop_variety_name || '').toLowerCase();
      const status = String(f.verification_status || '').toLowerCase();
      const location = String(f.district || f.location_display || '').toLowerCase();
      return name.includes(term) || farm.includes(term) || crop.includes(term) || variety.includes(term) || status.includes(term) || location.includes(term);
    });
  }, [fieldList, searchTerm]);

  // Derived metrics
  const verifiedFieldsCount = fieldList.filter((f) => f.verification_status === 'verified').length;
  const pendingFieldsCount = fieldList.filter((f) => f.verification_status === 'pending').length;
  const rejectedFieldsCount = fieldList.filter((f) => f.verification_status === 'rejected' || f.verification_status === 'needs_improvement').length;
  const pendingWaterCount = waterRequests.filter((r) => r.status === 'pending').length;

  return (
    <DashboardLayout title="Field Supervisor Dashboard">
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      {/* Top Bar Action */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchDashboardData}
          disabled={loading}
          sx={{ borderRadius: '8px' }}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Summary Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Total Registered Fields', value: fieldList.length.toString(), icon: <PeopleIcon />, color: '#1565C0' },
          { title: 'Pending Field Verification', value: pendingFieldsCount.toString(), icon: <HourglassEmptyIcon />, color: '#E65100' },
          { title: 'Verified Fields', value: verifiedFieldsCount.toString(), icon: <VerifiedIcon />, color: '#2E7D32' },
          { title: 'Pending Water Requests', value: pendingWaterCount.toString(), icon: <WaterDropIcon />, color: '#00838F' },
        ].map((c) => (
          <Grid item xs={12} sm={6} lg={3} key={c.title}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* Verification Progress Donut */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Verification Overview
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Verified', value: verifiedFieldsCount },
                    { name: 'Pending', value: pendingFieldsCount },
                    { name: 'Rejected', value: rejectedFieldsCount }
                  ]}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                >
                  {[0, 1, 2].map((i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* 1. Field Verification Table */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Field Ground Truth Verification List
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Inspect and verify ground truth status of registered fields.
                </Typography>
              </Box>
              <TextField
                size="small"
                placeholder="Search fields, crop, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ width: { xs: '100%', sm: 260 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Field Name', 'Farm', 'Crop & Variety', 'Soil Type', 'Stage', 'Location', 'Verification Status', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : filteredFields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                        {searchTerm ? 'No matching fields found.' : 'No fields available for verification.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFields.map((f) => (
                      <TableRow key={f.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{f.name}</TableCell>
                        <TableCell>{f.farm_name || 'N/A'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {f.crop_type_name || '-'}
                          </Typography>
                          {f.crop_variety_name && (
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              Var: {f.crop_variety_name}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{f.soil_type_name || '-'}</TableCell>
                        <TableCell>
                          {(f.crop_variety || f.crop_variety_name) && f.crop_stage ? (
                            <Chip
                              label={f.crop_stage.toUpperCase()}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ) : (
                            <Typography variant="body2" sx={{ color: '#94a3b8' }}>-</Typography>
                          )}
                        </TableCell>
                        <TableCell>{f.district || f.location_display || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={(f.verification_status || 'pending').toUpperCase()}
                            color={STATUS_COLOR[f.verification_status] || 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {f.verification_status !== 'verified' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleVerifyField(f.id, 'verified')}
                                sx={{ fontSize: '0.7rem', py: 0.3, textTransform: 'none' }}
                              >
                                Verify
                              </Button>
                            )}
                            {f.verification_status !== 'rejected' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => handleVerifyField(f.id, 'rejected')}
                                sx={{ fontSize: '0.7rem', py: 0.3, textTransform: 'none' }}
                              >
                                Reject
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* 2. Water Allocation Requests Verification Table */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Farmer Water Allocation Requests
              </Typography>
              <Chip label={`${waterRequests.length} Total Requests`} size="small" color="secondary" variant="outlined" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Request ID', 'Field Name', 'Water Required', 'Required Date', 'Urgency', 'Farmer', 'Verification Status', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : waterRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                        No water allocation requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    waterRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>#{req.id}</TableCell>
                        <TableCell>{req.field_name || `Field #${req.field}`}</TableCell>
                        <TableCell>{req.water_amount_litres} Litres</TableCell>
                        <TableCell>{req.required_date}</TableCell>
                        <TableCell>
                          <Chip
                            label={(req.urgency || 'MEDIUM').toUpperCase()}
                            size="small"
                            color={req.urgency === 'high' ? 'error' : req.urgency === 'low' ? 'default' : 'warning'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>{req.farmer_name || req.farmer_username || 'Farmer'}</TableCell>
                        <TableCell>
                          <Chip
                            label={(req.status || 'pending').toUpperCase()}
                            color={STATUS_COLOR[req.status] || 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {req.status === 'pending' && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleOpenReqModal(req, 'verified')}
                                  sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                                >
                                  Verify
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<CancelIcon />}
                                  onClick={() => handleOpenReqModal(req, 'rejected')}
                                  sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {req.status !== 'pending' && (
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Processed
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      {/* Verification Notes Dialog for Water Allocation Requests */}
      <Dialog open={notesModalOpen} onClose={() => setNotesModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'verified' ? 'Verify Water Request Ground Truth' : 'Reject Water Request Ground Truth'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
            Request #{selectedReq?.id} for <strong>{selectedReq?.water_amount_litres}L</strong> ({selectedReq?.field_name}).
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Supervisor Inspection Notes / Observations"
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionType === 'verified' ? 'success' : 'error'}
            onClick={handleVerifyRequestSubmit}
          >
            Confirm {actionType === 'verified' ? 'Verification' : 'Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default SupervisorDashboard;
