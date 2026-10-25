import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Alert, CircularProgress,
  IconButton, InputAdornment, Paper, Divider
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
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import {
  getFields, verifyField, getFieldCriteria, inspectField,
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

const CATEGORY_LABELS = {
  crop_health: '🌿 Crop Health & Stand Vigour',
  irrigation_water: '💧 Irrigation & Water Adequacy',
  soil_drainage: '🟤 Soil Condition & Drainage',
  pest_disease: '🐛 Pest & Disease Protection',
  fertilizer_practices: '🧪 Fertilizer & Agronomic Practices',
  field_maintenance: '🚜 Field Maintenance & Bunds',
  corrective_actions: '📋 Past Corrective Actions'
};

const FALLBACK_CRITERIA = [
  { id: 1, name: 'Plant Canopy Vigour & Uniformity', category: 'crop_health', is_critical: false, is_mandatory: true, description: 'Assess vegetative vigour, foliage density, leaf coloration, and stand uniformity across the field plot.', acceptance_guideline: 'Canopy must demonstrate healthy green coloration and consistent stand density (>80% uniformity).' },
  { id: 2, name: 'Vegetative / Reproductive Stage Alignment', category: 'crop_health', is_critical: false, is_mandatory: true, description: 'Verify actual physiological crop stage matches expected crop variety growth duration baseline.', acceptance_guideline: 'Crop stage corresponds to recorded planting date without abnormal physiological stunting.' },
  { id: 3, name: 'Water Source Adequacy & Supply Reliability', category: 'irrigation_water', is_critical: true, is_mandatory: true, description: 'Check operational availability of water source (canal branch, borewell, or storage pond) and delivery capacity.', acceptance_guideline: 'Water source must be active and sufficient to meet crop water requirements without acute depletion.' },
  { id: 4, name: 'Irrigation Distribution & Moisture Uniformity', category: 'irrigation_water', is_critical: false, is_mandatory: true, description: 'Assess whether water is evenly distributed across rows without severe dry patches or unintended runoff.', acceptance_guideline: 'Even moisture distribution across field sectors without visible drought stress signs.' },
  { id: 5, name: 'Soil Drainage & Absence of Severe Waterlogging', category: 'soil_drainage', is_critical: true, is_mandatory: true, description: 'Ensure field plot has adequate drainage slope and channels; absence of prolonged root zone inundation.', acceptance_guideline: 'No stagnant waterlogging exceeding crop tolerance (sub-surface drainage functioning).' },
  { id: 6, name: 'Soil Tilth, Structure & Root Zone Health', category: 'soil_drainage', is_critical: false, is_mandatory: true, description: 'Evaluate soil structure, aeration, and absence of severe soil compaction or crusting.', acceptance_guideline: 'Adequate tilth and crumb structure suitable for root respiration.' },
  { id: 7, name: 'Absence of Quarantine / Severe Pathogen Outbreak', category: 'pest_disease', is_critical: true, is_mandatory: true, description: 'Inspect field for destructive quarantine pests or critical unchecked fungal/bacterial leaf blight epidemics.', acceptance_guideline: 'Zero quarantine pathogens; severe economic pest damage absent.' },
  { id: 8, name: 'Pest Infestation Below Economic Injury Level', category: 'pest_disease', is_critical: false, is_mandatory: true, description: 'Verify scouting practices and that minor pest activity remains below actionable economic injury thresholds.', acceptance_guideline: 'Foliar or stem pest symptoms well below actionable economic threshold levels.' },
  { id: 9, name: 'Balanced Nutrient & Fertilizer Application', category: 'fertilizer_practices', is_critical: false, is_mandatory: true, description: 'Verify application of required basal/top-dress fertilizers or bio-fertilizers according to crop stage.', acceptance_guideline: 'Nutrient application adheres to stage-specific agronomic recommendations.' },
  { id: 10, name: 'Standard Agronomic & Mulching Practices', category: 'fertilizer_practices', is_critical: false, is_mandatory: true, description: 'Check weed control, mulching, row spacing, and adherence to approved agronomic recommendations.', acceptance_guideline: 'Appropriate planting density, inter-row spacing, and weed suppressing mulch/cover.' },
  { id: 11, name: 'Weed Management & Boundary Cleanliness', category: 'field_maintenance', is_critical: false, is_mandatory: true, description: 'Check field plot boundaries, perimeter bunds, and inter-row weed clearance.', acceptance_guideline: 'Clean perimeter boundaries free of noxious invasive weeds.' },
  { id: 12, name: 'Field Bund Integrity & Erosion Protection', category: 'field_maintenance', is_critical: false, is_mandatory: true, description: 'Inspect field bunds, water retention dikes, and soil erosion mitigation measures.', acceptance_guideline: 'Intact bunds preventing soil erosion and uncontrolled irrigation spillover.' },
  { id: 13, name: 'Resolution of Past Inspection Deficiencies', category: 'corrective_actions', is_critical: true, is_mandatory: false, description: 'Verify that all previously flagged non-conformances and corrective actions have been satisfactorily resolved.', acceptance_guideline: 'Documented closure of all previous non-conformances.' }
];

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

  // Inspection Checklist Modal State for Field Verification
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [checklistAction, setChecklistAction] = useState('verify'); // 'verify' or 'reject'
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [criteriaList, setCriteriaList] = useState([]);
  const [evaluations, setEvaluations] = useState({});
  const [overallNotes, setOverallNotes] = useState('');
  const [reinspectionDate, setReinspectionDate] = useState('');
  const [submittingChecklist, setSubmittingChecklist] = useState(false);

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

  // Open Inspection Checklist Modal
  const handleOpenChecklist = async (field, action = 'verify') => {
    setActiveField(field);
    setChecklistAction(action);
    setChecklistOpen(true);
    setCriteriaLoading(true);
    setErrorMsg('');

    try {
      let crits = [];
      try {
        const resp = await getFieldCriteria(field.id);
        crits = resp?.criteria || [];
      } catch (e) {
        console.warn('Could not fetch field criteria from server, using standard criteria:', e);
      }

      if (!crits || crits.length === 0) {
        crits = FALLBACK_CRITERIA;
      }

      setCriteriaList(crits);

      // Pre-populate evaluation states
      const initialEvals = {};
      crits.forEach((c) => {
        initialEvals[c.id] = {
          result: action === 'verify' ? 'pass' : (c.is_critical ? 'fail' : 'pass'),
          notes: ''
        };
      });
      setEvaluations(initialEvals);
      setOverallNotes(action === 'verify' ? 'Field ground truth verified by supervisor.' : 'Field inspection rejected due to critical deficiencies.');
      setReinspectionDate('');
    } catch (err) {
      console.error('Error opening checklist:', err);
      setErrorMsg('Failed to load inspection criteria checklist.');
    } finally {
      setCriteriaLoading(false);
    }
  };

  // Handle Inspection Checklist Submission
  const handleSubmitChecklist = async () => {
    if (!activeField) return;
    setSubmittingChecklist(true);
    setErrorMsg('');

    try {
      const criterion_results = criteriaList.map((c) => ({
        criterion_id: c.id,
        result: evaluations[c.id]?.result || 'pass',
        notes: evaluations[c.id]?.notes || ''
      }));

      const hasCriticalFail = criteriaList.some(
        (c) => c.is_critical && evaluations[c.id]?.result === 'fail'
      );

      const payload = {
        criterion_results,
        overall_notes: overallNotes,
        reinspection_scheduled_date: reinspectionDate || undefined,
        status: hasCriticalFail ? 'rejected' : 'verified'
      };

      const resp = await inspectField(activeField.id, payload);
      const decisionText = resp?.decision ? resp.decision.toUpperCase() : (hasCriticalFail ? 'REJECTED' : 'VERIFIED');
      setSuccessMsg(`Field '${activeField.name}' inspection submitted successfully! Decision: ${decisionText}.`);
      setChecklistOpen(false);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to submit field inspection checklist.');
    } finally {
      setSubmittingChecklist(false);
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
      const crop = String(f.crop_type_name || f.crop_name || '').toLowerCase();
      const variety = String(f.crop_variety || '').toLowerCase();
      const status = String(f.verification_status || '').toLowerCase();
      const loc = String(f.location || '').toLowerCase();
      return (
        name.includes(term) ||
        farm.includes(term) ||
        crop.includes(term) ||
        variety.includes(term) ||
        status.includes(term) ||
        loc.includes(term)
      );
    });
  }, [fieldList, searchTerm]);

  // Dynamic Statistics
  const pendingCount = fieldList.filter(f => f.verification_status === 'pending' || f.verification_status === 'pending_review').length;
  const verifiedCount = fieldList.filter(f => f.verification_status === 'verified').length;
  const rejectedCount = fieldList.filter(f => f.verification_status === 'rejected').length;
  const pendingRequestsCount = waterRequests.filter(r => r.supervisor_status === 'pending' || r.status === 'pending').length;

  const chartData = [
    { name: 'Verified', value: verifiedCount },
    { name: 'Pending', value: pendingCount },
    { name: 'Rejected', value: rejectedCount },
  ];

  const hasCriticalFail = useMemo(() => {
    return criteriaList.some((c) => c.is_critical && evaluations[c.id]?.result === 'fail');
  }, [criteriaList, evaluations]);

  return (
    <DashboardLayout role="supervisor">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1e293b">
            Supervisor Operations Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage field ground-truth verification checklists and review pending water allocation requests.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="success"
          startIcon={<RefreshIcon />}
          onClick={fetchDashboardData}
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          Refresh Data
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Registered Fields"
            value={fieldList.length}
            icon={<PeopleIcon />}
            color="#1565C0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Field Verification"
            value={pendingCount}
            icon={<HourglassEmptyIcon />}
            color="#ED6C02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Verified Fields"
            value={verifiedCount}
            icon={<VerifiedIcon />}
            color="#2E7D32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Water Requests"
            value={pendingRequestsCount}
            icon={<WaterDropIcon />}
            color="#0288D1"
          />
        </Grid>
      </Grid>

      {/* Charts & Ground Truth Verification Queue */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, height: '100%', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Verification Overview
            </Typography>
            <Box sx={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 1 }}>
              {chartData.map((d, idx) => (
                <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[idx] }} />
                  <Typography variant="caption" color="text.secondary">
                    {d.name}: <strong>{d.value}</strong>
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Field Ground Truth Verification List
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Inspect and verify ground truth status of registered fields with the criteria checklist.
                </Typography>
              </Box>

              {/* Search Bar */}
              <TextField
                size="small"
                placeholder="Search fields, crop, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  minWidth: 240,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    bgcolor: '#f8fafc'
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />
            </Box>

            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Field Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Farm</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Crop & Variety</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Soil Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Stage</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Verification Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredFields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                        {searchTerm ? 'No matching fields found.' : 'No fields currently awaiting verification.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFields.map((f) => (
                      <TableRow key={f.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{f.name}</TableCell>
                        <TableCell>{f.farm_name || '—'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {f.crop_type_name || f.crop_name || '—'}
                          </Typography>
                          {f.crop_variety ? (
                            <Typography variant="caption" color="text.secondary">
                              Var: {f.crop_variety}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>{f.soil_type_name || f.soil_name || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={f.crop_variety ? (f.crop_stage || '—') : '—'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', textTransform: 'uppercase' }}
                          />
                        </TableCell>
                        <TableCell>{f.location || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={f.verification_status?.toUpperCase() || 'PENDING'}
                            color={STATUS_COLOR[f.verification_status] || 'warning'}
                            size="small"
                            sx={{ fontWeight: 700 }}
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
                                onClick={() => handleOpenChecklist(f, 'verify')}
                                sx={{ fontSize: '0.7rem', py: 0.3, textTransform: 'none', borderRadius: '6px' }}
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
                                onClick={() => handleOpenChecklist(f, 'reject')}
                                sx={{ fontSize: '0.7rem', py: 0.3, textTransform: 'none', borderRadius: '6px' }}
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
      </Grid>

      {/* Field Inspection Checklist Modal */}
      <Dialog
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', maxHeight: '90vh' } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            bgcolor: checklistAction === 'verify' ? '#f0fdf4' : '#fef2f2',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <FactCheckIcon color={checklistAction === 'verify' ? 'success' : 'error'} />
            <Box>
              <Typography variant="h6" fontWeight={700} color="#1e293b" sx={{ lineHeight: 1.2 }}>
                Field Ground Truth Inspection Checklist
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Field: <strong>{activeField?.name}</strong> • Farm: <strong>{activeField?.farm_name || 'Farm'}</strong>
              </Typography>
            </Box>
          </Box>
          <Chip
            label={checklistAction === 'verify' ? 'Standard Verification' : 'Deficiency Inspection'}
            color={checklistAction === 'verify' ? 'success' : 'error'}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {/* Field Summary Card */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: '12px', bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">CROP</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {activeField?.crop_type_name || activeField?.crop_name || 'Crop'}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">VARIETY</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {activeField?.crop_variety || '—'}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">STAGE</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                  {activeField?.crop_variety ? (activeField?.crop_stage || '—') : '—'}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">SOIL TYPE</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {activeField?.soil_type_name || activeField?.soil_name || 'Soil'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Quick Mark All Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
              Assessing Applicable Criteria ({criteriaList.length} Items)
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={() => {
                  const updated = { ...evaluations };
                  criteriaList.forEach((c) => {
                    updated[c.id] = { ...updated[c.id], result: 'pass' };
                  });
                  setEvaluations(updated);
                }}
                sx={{ fontSize: '0.75rem', textTransform: 'none', borderRadius: '8px' }}
              >
                ✅ Mark All Pass
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => {
                  const updated = { ...evaluations };
                  criteriaList.forEach((c) => {
                    if (c.is_critical) {
                      updated[c.id] = { ...updated[c.id], result: 'fail' };
                    }
                  });
                  setEvaluations(updated);
                }}
                sx={{ fontSize: '0.75rem', textTransform: 'none', borderRadius: '8px' }}
              >
                ❌ Mark Critical Deficiencies
              </Button>
            </Stack>
          </Box>

          {/* Criteria Checklist Items */}
          {criteriaLoading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <CircularProgress size={36} color="success" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Loading field inspection checklist criteria...
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {criteriaList.map((criterion, idx) => {
                const evalItem = evaluations[criterion.id] || { result: 'pass', notes: '' };
                const isPass = evalItem.result === 'pass';
                const isFail = evalItem.result === 'fail';

                return (
                  <Paper
                    key={criterion.id || idx}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      borderLeft: isPass ? '5px solid #16a34a' : (isFail ? '5px solid #dc2626' : '5px solid #94a3b8'),
                      bgcolor: isFail ? '#fef2f2' : '#ffffff',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 260 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#047857', bgcolor: '#dcfce7', px: 0.8, py: 0.2, borderRadius: '4px' }}>
                            {CATEGORY_LABELS[criterion.category] || criterion.category}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                            {idx + 1}. {criterion.name}
                          </Typography>
                          {criterion.is_critical && (
                            <Chip
                              label="CRITICAL"
                              color="error"
                              size="small"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                            />
                          )}
                          {criterion.is_mandatory && !criterion.is_critical && (
                            <Chip
                              label="MANDATORY"
                              color="default"
                              size="small"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>

                        {criterion.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {criterion.description}
                          </Typography>
                        )}
                        {criterion.acceptance_guideline && (
                          <Typography variant="caption" color="#0369a1" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                            ✓ Pass Guideline: {criterion.acceptance_guideline}
                          </Typography>
                        )}
                      </Box>

                      {/* Toggle Options: Pass / Fail / N/A */}
                      <Stack direction="row" spacing={0.8} sx={{ mt: { xs: 1, sm: 0 } }}>
                        <Button
                          size="small"
                          variant={evalItem.result === 'pass' ? 'contained' : 'outlined'}
                          color="success"
                          onClick={() => {
                            setEvaluations((prev) => ({
                              ...prev,
                              [criterion.id]: { ...prev[criterion.id], result: 'pass' }
                            }));
                          }}
                          sx={{ minWidth: 70, fontSize: '0.75rem', py: 0.4, borderRadius: '6px' }}
                        >
                          Pass
                        </Button>
                        <Button
                          size="small"
                          variant={evalItem.result === 'fail' ? 'contained' : 'outlined'}
                          color="error"
                          onClick={() => {
                            setEvaluations((prev) => ({
                              ...prev,
                              [criterion.id]: { ...prev[criterion.id], result: 'fail' }
                            }));
                          }}
                          sx={{ minWidth: 70, fontSize: '0.75rem', py: 0.4, borderRadius: '6px' }}
                        >
                          Fail
                        </Button>
                        <Button
                          size="small"
                          variant={evalItem.result === 'na' ? 'contained' : 'outlined'}
                          color="inherit"
                          onClick={() => {
                            setEvaluations((prev) => ({
                              ...prev,
                              [criterion.id]: { ...prev[criterion.id], result: 'na' }
                            }));
                          }}
                          sx={{ minWidth: 55, fontSize: '0.75rem', py: 0.4, borderRadius: '6px' }}
                        >
                          N/A
                        </Button>
                      </Stack>
                    </Box>

                    {/* Defect observation notes */}
                    {isFail && (
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Detail deficiency observation or reason for criterion failure..."
                        value={evalItem.notes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEvaluations((prev) => ({
                            ...prev,
                            [criterion.id]: { ...prev[criterion.id], notes: val }
                          }));
                        }}
                        sx={{ mt: 1.5, '& .MuiOutlinedInput-root': { bgcolor: '#ffffff' } }}
                      />
                    )}
                  </Paper>
                );
              })}
            </Stack>
          )}

          {/* Re-inspection Scheduled Date if deficiences exist */}
          {hasCriticalFail && (
            <Box sx={{ mt: 3, p: 2, bgcolor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#991b1b" gutterBottom>
                ⚠️ Critical Deficiencies Detected — Schedule Re-inspection
              </Typography>
              <Typography variant="caption" color="#7f1d1d" display="block" sx={{ mb: 1.5 }}>
                When rejecting or requiring improvement, indicate the target date when the farmer should be re-inspected after corrective actions.
              </Typography>
              <TextField
                type="date"
                size="small"
                label="Target Re-inspection Date"
                InputLabelProps={{ shrink: true }}
                value={reinspectionDate}
                onChange={(e) => setReinspectionDate(e.target.value)}
                sx={{ bgcolor: '#ffffff', borderRadius: '8px' }}
              />
            </Box>
          )}

          {/* Overall Notes */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} color="#1e293b" gutterBottom>
              Overall Supervisor Notes & Field Observations
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Summarize field health, water distribution, and ground-truth observations..."
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              size="small"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setChecklistOpen(false)} color="inherit" disabled={submittingChecklist}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={hasCriticalFail ? 'error' : 'success'}
            onClick={handleSubmitChecklist}
            disabled={submittingChecklist || criteriaLoading}
            startIcon={
              submittingChecklist ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <CheckCircleIcon />
              )
            }
            sx={{ px: 3, borderRadius: '8px', fontWeight: 700 }}
          >
            {submittingChecklist
              ? 'Submitting...'
              : hasCriticalFail
              ? 'Submit Field Rejection'
              : 'Submit & Verify Field'}
          </Button>
        </DialogActions>
      </Dialog>

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
