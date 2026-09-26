import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Alert, CircularProgress,
  IconButton, Tooltip as MuiTooltip
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import PeopleIcon from '@mui/icons-material/People';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import VerifiedIcon from '@mui/icons-material/Verified';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { analytics } from '../../data/analytics';
import {
  getFields, verifyField,
  getWaterAllocationRequests, verifyWaterAllocationRequest
} from '../../services/api';

const COLORS = ['#2E7D32', '#FF9800', '#F44336'];

const STATUS_COLOR = {
  pending: 'warning',
  pending_review: 'warning',
  verified: 'success',
  rejected: 'error',
  approved: 'success'
};

const SupervisorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      setSuccessMsg(`Water request #${selectedReq.id} supervisor status set to '${actionType}'.`);
      setNotesModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || `Failed to verify water allocation request.`);
    }
  };

  // Summary Metrics
  const pendingFieldsCount = fieldList.filter(f => f.verification_status === 'pending').length;
  const verifiedFieldsCount = fieldList.filter(f => f.verification_status === 'verified').length;
  const pendingWaterReqsCount = waterRequests.filter(r => r.supervisor_status === 'pending_review').length;

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
          { title: 'Pending Water Reviews', value: pendingWaterReqsCount.toString(), icon: <WaterDropIcon />, color: '#0288D1' },
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
                    { name: 'Rejected', value: fieldList.filter(f => f.verification_status === 'rejected').length }
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

        {/* Weekly Usage Overview */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Weekly Water Usage Overview
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.weeklyWaterUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="usage" fill="#1565C0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* 1. Field Verification Table */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Field Ground Truth Verification List
              </Typography>
              <Chip label={`${fieldList.length} Total Fields`} size="small" color="primary" variant="outlined" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Field Name', 'Farm', 'Crop Type', 'Soil Type', 'Stage', 'Location', 'Verification Status', 'Actions'].map((h) => (
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
                  ) : fieldList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                        No fields available for verification.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fieldList.map((f) => (
                      <TableRow key={f.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{f.name}</TableCell>
                        <TableCell>{f.farm_name || 'N/A'}</TableCell>
                        <TableCell>{f.crop_type_name || 'N/A'}</TableCell>
                        <TableCell>{f.soil_type_name || 'N/A'}</TableCell>
                        <TableCell>{f.crop_stage || 'N/A'}</TableCell>
                        <TableCell>{f.district || f.location_display || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={(f.verification_status || 'pending').toUpperCase()}
                            color={STATUS_COLOR[f.verification_status] || 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {f.verification_status !== 'verified' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleVerifyField(f.id, 'verified')}
                                sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}
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
                                sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}
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

        {/* 2. Water Allocation Request Verification Table */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Water Allocation Requests — Supervisor Field Review
              </Typography>
              <Chip label={`${waterRequests.length} Requests`} size="small" color="secondary" variant="outlined" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    {['Req #', 'Farmer', 'Farm', 'Field', 'Requested Vol (L)', 'Priority', 'Supervisor Status', 'Actions'].map((h) => (
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
                        No water allocation requests found for supervisor review.
                      </TableCell>
                    </TableRow>
                  ) : (
                    waterRequests.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>#{r.id}</TableCell>
                        <TableCell>{r.farmer_name || r.farmer_username}</TableCell>
                        <TableCell>{r.farm_name}</TableCell>
                        <TableCell>{r.field_name}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1565C0' }}>
                          {Number(r.requested_amount_liters).toLocaleString()} L
                        </TableCell>
                        <TableCell>
                          <Chip label={r.priority_display || r.priority} size="small" color={r.priority === 'critical' || r.priority === 'high' ? 'error' : 'default'} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={(r.supervisor_status_display || r.supervisor_status || 'pending_review').toUpperCase()}
                            color={STATUS_COLOR[r.supervisor_status] || 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {r.supervisor_status !== 'verified' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleOpenReqModal(r, 'verified')}
                                sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}
                              >
                                Verify Ground Truth
                              </Button>
                            )}
                            {r.supervisor_status !== 'rejected' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleOpenReqModal(r, 'rejected')}
                                sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0.3 }}
                              >
                                Reject Request
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
      </Grid>

      {/* Supervisor Review Notes Modal */}
      <Dialog open={notesModalOpen} onClose={() => setNotesModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {actionType === 'verified' ? 'Confirm Supervisor Verification' : 'Reject Water Allocation Request'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2, color: '#475569' }}>
            Request #{selectedReq?.id} for field <strong>{selectedReq?.field_name}</strong> ({selectedReq?.requested_amount_liters} L)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Supervisor Inspection Notes"
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            placeholder="Enter field observation details or reasons for verification outcome..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setNotesModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleVerifyRequestSubmit}
            variant="contained"
            color={actionType === 'verified' ? 'success' : 'error'}
          >
            Submit {actionType.toUpperCase()}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default SupervisorDashboard;
