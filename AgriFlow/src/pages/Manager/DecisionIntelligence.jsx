import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Paper, Card, CardContent, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, TextField, Slider, Alert, IconButton, Tooltip, CircularProgress,
  Divider, InputAdornment, LinearProgress, Stack, Dialog, DialogTitle,
  DialogContent, DialogActions, Tabs, Tab
} from '@mui/material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ScienceIcon from '@mui/icons-material/Science';

import {
  getDecisionIntelligenceDashboard,
  runWhatIfSimulation,
  getSimulationHistory
} from '../../services/api';


const DecisionIntelligence = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Simulation state
  const [simulationMode, setSimulationMode] = useState(false);
  const [reductionPct, setReductionPct] = useState(30);
  const [customWater, setCustomWater] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // Filter & Search
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Explanation Dialog
  const [selectedExplanation, setSelectedExplanation] = useState(null);

  // History Tab
  const [activeTab, setActiveTab] = useState(0);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await getDecisionIntelligenceDashboard();
      setData(res);
      if (res.total_available_water) {
        setCustomWater(Math.round(res.total_available_water * 0.7).toString());
      }
    } catch (err) {
      console.error('Failed to load Decision Intelligence dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getSimulationHistory();
      setHistoryList(res);
    } catch (err) {
      console.error('Failed to load simulation history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 1) {
      loadHistory();
    }
  };

  const handleRunSimulation = async (pct = null, customVal = null, saveHist = false) => {
    setSimulating(true);
    try {
      const payload = {};
      if (pct !== null) {
        payload.reduction_percentage = pct;
      } else if (customVal !== null) {
        payload.custom_water_liters = parseFloat(customVal);
      } else if (customWater) {
        payload.custom_water_liters = parseFloat(customWater);
      } else {
        payload.reduction_percentage = reductionPct;
      }
      payload.save_history = saveHist;

      const res = await runWhatIfSimulation(payload);
      setSimulationResult(res);
      setSimulationMode(true);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    setSimulationMode(false);
    setSimulationResult(null);
  };

  if (loading) {
    return (
      <DashboardLayout title="Decision Intelligence">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress color="primary" />
        </Box>
      </DashboardLayout>
    );
  }

  // Active view data (Simulated or Real)
  const currentScenario = simulationMode && simulationResult
    ? simulationResult.simulated_scenario
    : {
        allocations: data?.priorities || [],
        total_available_water: data?.total_available_water || 0,
        total_requested_water: data?.total_requested_water || 0,
        total_allocated_water: data?.total_allocated_water || 0,
        water_deficit_surplus: data?.water_deficit_surplus || 0,
        utilization_percentage: data?.utilization_percentage || 0,
        summary_counts: data?.summary || { total_fields: 0, fields_full: 0, fields_partial: 0, fields_zero: 0, high_priority_count: 0 }
      };

  const actionPlan = simulationMode && simulationResult
    ? simulationResult.action_plan
    : data?.action_plan || [];

  const impactAnalysis = simulationResult?.impact_analysis;

  // Filtered Priority Items
  const filteredPriorities = (currentScenario.allocations || []).filter(item => {
    const matchesPriority = priorityFilter === 'ALL' || item.priority_level === priorityFilter;
    const matchesSearch = !searchTerm ||
      item.field_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.crop_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  const getPriorityBadgeColor = (level) => {
    switch (level) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getAllocStatusBadgeColor = (status) => {
    switch (status) {
      case 'FULL': return 'success';
      case 'PARTIAL': return 'warning';
      case 'NONE': return 'error';
      default: return 'default';
    }
  };

  return (
    <DashboardLayout title="Decision Intelligence">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        
        {/* Header Title */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#00695C', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AutoAwesomeIcon sx={{ fontSize: 36, color: '#00897B' }} />
              Decision Intelligence Module
            </Typography>
            <Typography variant="body2" sx={{ color: '#546E7A', mt: 0.5 }}>
              System-level agricultural water allocation & risk decision support for drought & water scarcity.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ bgcolor: '#E0F2F1', borderRadius: 2, p: 0.5 }}>
              <Tab label="Live Dashboard" icon={<ScienceIcon fontSize="small" />} iconPosition="start" />
              <Tab label="Simulation History" icon={<HistoryIcon fontSize="small" />} iconPosition="start" />
            </Tabs>
          </Stack>
        </Box>

        {activeTab === 0 ? (
          <>
            {/* Simulation Warning Banner */}
            {simulationMode && (
              <Alert
                severity="warning"
                icon={<ScienceIcon />}
                action={
                  <Stack direction="row" spacing={1}>
                    <Button color="warning" size="small" variant="contained" onClick={() => handleRunSimulation(null, null, true)} startIcon={<SaveIcon />}>
                      Save Simulation Log
                    </Button>
                    <Button color="inherit" size="small" variant="outlined" onClick={handleResetSimulation} startIcon={<RefreshIcon />}>
                      Reset to Real Data
                    </Button>
                  </Stack>
                }
                sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}
              >
                <strong>SIMULATION MODE ACTIVE:</strong> {impactAnalysis?.impact_summary || `Simulated Available Water: ${currentScenario.total_available_water?.toLocaleString()} L. Actual database records are untouched.`}
              </Alert>
            )}

            {/* What-If Simulation Controls Toolbar */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 4, borderRadius: 3, border: '1px solid #B2DFDB', bgcolor: '#F4FBFB' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#004D40', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScienceIcon sx={{ color: '#00897B' }} /> What-If Water Availability Simulator
              </Typography>
              <Typography variant="body2" sx={{ color: '#455A64', mb: 2 }}>
                Simulate drought scenarios by reducing available water to analyze impact on crop irrigation without modifying live database records.
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#37474F', mb: 1, display: 'block' }}>
                    Quick Preset Reductions:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {[10, 20, 30, 50].map((pct) => (
                      <Button
                        key={pct}
                        variant={simulationMode && reductionPct === pct ? "contained" : "outlined"}
                        color="teal"
                        size="small"
                        sx={{
                          bgcolor: simulationMode && reductionPct === pct ? '#00695C' : '#fff',
                          borderColor: '#00897B',
                          color: simulationMode && reductionPct === pct ? '#fff' : '#00695C',
                          fontWeight: 600,
                          '&:hover': { bgcolor: '#004D40', color: '#fff' }
                        }}
                        onClick={() => {
                          setReductionPct(pct);
                          handleRunSimulation(pct, null, false);
                        }}
                      >
                        -{pct}% Reduction
                      </Button>
                    ))}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Custom Available Water (L)"
                    type="number"
                    size="small"
                    fullWidth
                    value={customWater}
                    onChange={(e) => setCustomWater(e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">Liters</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={simulating}
                    startIcon={simulating ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                    onClick={() => handleRunSimulation(null, customWater, false)}
                    sx={{ bgcolor: '#00695C', '&:hover': { bgcolor: '#004D40' }, height: 40, fontWeight: 700 }}
                  >
                    Simulate
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Summary Stat KPI Cards */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ borderRadius: 3, borderLeft: '5px solid #00897B', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="caption" sx={{ color: '#546E7A', fontWeight: 600 }}>AVAILABLE WATER</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#004D40', mt: 0.5 }}>
                      {currentScenario.total_available_water?.toLocaleString()} L
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#00897B' }}>
                      {simulationMode ? 'Simulated Supply' : 'Live System Supply'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ borderRadius: 3, borderLeft: '5px solid #1976D2', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="caption" sx={{ color: '#546E7A', fontWeight: 600 }}>TOTAL REQUIREMENT</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0', mt: 0.5 }}>
                      {currentScenario.total_requested_water?.toLocaleString()} L
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#1976D2' }}>
                      Across {currentScenario.summary_counts?.total_fields || 0} Active Fields
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{
                  borderRadius: 3,
                  borderLeft: `5px solid ${currentScenario.water_deficit_surplus < 0 ? '#D32F2F' : '#388E3C'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="caption" sx={{ color: '#546E7A', fontWeight: 600 }}>DEFICIT / SURPLUS</Typography>
                    <Typography variant="h5" sx={{
                      fontWeight: 700,
                      color: currentScenario.water_deficit_surplus < 0 ? '#C62828' : '#2E7D32',
                      mt: 0.5
                    }}>
                      {currentScenario.water_deficit_surplus > 0 ? '+' : ''}{currentScenario.water_deficit_surplus?.toLocaleString()} L
                    </Typography>
                    <Typography variant="caption" sx={{ color: currentScenario.water_deficit_surplus < 0 ? '#D32F2F' : '#388E3C' }}>
                      {currentScenario.water_deficit_surplus < 0 ? 'Water Shortage' : 'Sufficient Supply'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ borderRadius: 3, borderLeft: '5px solid #E65100', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="caption" sx={{ color: '#546E7A', fontWeight: 600 }}>FIELDS AT RISK</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#E65100', mt: 0.5 }}>
                      {currentScenario.summary_counts?.fields_zero || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#EF6C00' }}>
                      0 Water Allocated
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ borderRadius: 3, borderLeft: '5px solid #7B1FA2', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="caption" sx={{ color: '#546E7A', fontWeight: 600 }}>WATER UTILIZATION</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#6A1B9A', mt: 0.5 }}>
                      {currentScenario.utilization_percentage}%
                    </Typography>
                    <LinearProgress variant="determinate" value={Math.min(currentScenario.utilization_percentage, 100)} color="secondary" sx={{ mt: 1, borderRadius: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Impact Analysis & Action Plan Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Impact Analysis Card */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #CFD8DC', height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#37474F', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDownIcon sx={{ color: '#D32F2F' }} /> Water Scarcity Impact Analysis
                  </Typography>

                  {impactAnalysis ? (
                    <Box>
                      <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        <strong>Potential Major Impact Field:</strong> {impactAnalysis.major_affected_field}
                      </Alert>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#ECEFF1' }}>
                              <TableCell sx={{ fontWeight: 700 }}>Metric</TableCell>
                              <TableCell sx={{ fontWeight: 700 }} align="right">Actual Supply</TableCell>
                              <TableCell sx={{ fontWeight: 700 }} align="right">Simulated Supply</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>Available Water</TableCell>
                              <TableCell align="right">{impactAnalysis.current_available_water?.toLocaleString()} L</TableCell>
                              <TableCell align="right" sx={{ color: '#D32F2F', fontWeight: 700 }}>
                                {impactAnalysis.simulated_available_water?.toLocaleString()} L
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Full Allocation Fields</TableCell>
                              <TableCell align="right">{impactAnalysis.current_full_fields}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>{impactAnalysis.simulated_full_fields}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Partial Allocation Fields</TableCell>
                              <TableCell align="right">{impactAnalysis.current_partial_fields}</TableCell>
                              <TableCell align="right" sx={{ color: '#ED6C02', fontWeight: 700 }}>{impactAnalysis.simulated_partial_fields}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Fields Receiving No Water</TableCell>
                              <TableCell align="right">{impactAnalysis.current_zero_fields}</TableCell>
                              <TableCell align="right" sx={{ color: '#D32F2F', fontWeight: 700 }}>{impactAnalysis.simulated_zero_fields}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: '#616161' }}>
                        Currently showing real system metrics. Run a What-If simulation above to compare current vs simulated water stress scenarios.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Action Plan Card */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #CFD8DC', height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#37474F', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlineIcon sx={{ color: '#2E7D32' }} /> Agricultural Action Plan
                  </Typography>
                  <Stack spacing={1.5}>
                    {actionPlan.map((act) => (
                      <Box key={act.step} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F9FBE7', borderLeft: '4px solid #9E9D24' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#33691E' }}>
                            Step {act.step}: {act.action}
                          </Typography>
                          <Chip label={act.badge} size="small" color={act.badge === 'CRITICAL' ? 'error' : act.badge === 'WARNING' ? 'warning' : 'success'} />
                        </Stack>
                        <Typography variant="body2" sx={{ color: '#558B2F' }}>
                          {act.detail}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* Field Priority & Allocation Table */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #CFD8DC' }}>
              <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#004D40' }}>
                  Transparent Field Priority Ranking & Recommended Allocations
                </Typography>

                <Stack direction="row" spacing={2}>
                  <TextField
                    placeholder="Search field, crop, farmer..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                    }}
                  />
                  <Stack direction="row" spacing={0.5}>
                    {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                      <Button
                        key={lvl}
                        size="small"
                        variant={priorityFilter === lvl ? "contained" : "outlined"}
                        color={lvl === 'HIGH' ? 'error' : lvl === 'MEDIUM' ? 'warning' : lvl === 'LOW' ? 'success' : 'primary'}
                        onClick={() => setPriorityFilter(lvl)}
                        sx={{ fontSize: '0.75rem', px: 1.5 }}
                      >
                        {lvl}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Box>

              <TableContainer sx={{ maxHeight: 500 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }}>Field / Farmer</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }}>Crop & Stage</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }}>Soil / Moisture</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }}>Irrigation Gap</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }}>Rain Forecast</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }}>Priority Score</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }} align="right">Required (L)</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }} align="right">Recommended (L)</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#E0F2F1' }} align="center">Decision Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPriorities.map((row) => (
                      <TableRow key={row.field_id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#263238' }}>{row.field_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#78909C' }}>{row.farmer_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.crop_type}</Typography>
                          <Typography variant="caption" sx={{ color: '#00897B', textTransform: 'capitalize' }}>{row.crop_stage}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.soil_type}</Typography>
                          <Chip label={row.moisture_status.toUpperCase()} size="small" color={row.moisture_status === 'dry' ? 'error' : row.moisture_status === 'moderate' ? 'warning' : 'success'} sx={{ height: 20, fontSize: '0.65rem' }} />
                        </TableCell>
                        <TableCell>{row.days_since_irrigation} days</TableCell>
                        <TableCell>{row.rainfall_mm} mm</TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.priority_score}</Typography>
                            <Chip label={row.priority_level} size="small" color={getPriorityBadgeColor(row.priority_level)} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{row.water_requirement_liters?.toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#00695C' }}>
                          {row.recommended_water_liters?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip label={row.allocation_status} size="small" color={getAllocStatusBadgeColor(row.allocation_status)} sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="teal" onClick={() => setSelectedExplanation(row)}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Decision Explanation Dialog */}
            <Dialog open={Boolean(selectedExplanation)} onClose={() => setSelectedExplanation(null)} maxWidth="md" fullWidth>
              {selectedExplanation && (
                <>
                  <DialogTitle sx={{ bgcolor: '#00695C', color: '#fff', fontWeight: 700 }}>
                    Transparent Decision Explanation — {selectedExplanation.field_name}
                  </DialogTitle>
                  <DialogContent dividers sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#004D40', mb: 1 }}>
                      Human-Readable Summary:
                    </Typography>
                    <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3, borderRadius: 2 }}>
                      {selectedExplanation.explanation}
                    </Alert>

                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#004D40', mb: 1.5 }}>
                      Contributing Factor Points Breakdown:
                    </Typography>
                    <Stack spacing={1}>
                      {selectedExplanation.contributing_factors?.map((f, idx) => (
                        <Paper key={idx} elevation={0} sx={{ p: 1.5, bgcolor: '#F4FBFB', border: '1px solid #B2DFDB', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#004D40' }}>{f.factor}</Typography>
                            <Typography variant="caption" sx={{ color: '#546E7A' }}>{f.detail}</Typography>
                          </Box>
                          <Chip label={`${f.points > 0 ? '+' : ''}${f.points} pts`} color={f.points > 0 ? "teal" : "secondary"} size="small" sx={{ fontWeight: 700 }} />
                        </Paper>
                      ))}
                    </Stack>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setSelectedExplanation(null)} variant="contained" sx={{ bgcolor: '#00695C' }}>Close</Button>
                  </DialogActions>
                </>
              )}
            </Dialog>
          </>
        ) : (
          /* Simulation History Audit Tab */
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #CFD8DC' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#004D40', mb: 2 }}>
              Saved What-If Simulation Audit Logs
            </Typography>

            {historyLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
            ) : historyList.length === 0 ? (
              <Alert severity="info">No saved simulation history logs found. Run a simulation and click 'Save Simulation Log' to record an audit snapshot.</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#ECEFF1' }}>
                      <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Saved By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Original Water (L)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Simulated Water (L)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">% Reduction</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Major Affected Field</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyList.map((sim) => (
                      <TableRow key={sim.id} hover>
                        <TableCell>#{sim.id}</TableCell>
                        <TableCell>{new Date(sim.created_at).toLocaleString()}</TableCell>
                        <TableCell>{sim.created_by_username || 'Manager'}</TableCell>
                        <TableCell align="right">{parseFloat(sim.original_water_liters).toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#D32F2F' }}>
                          {parseFloat(sim.simulated_water_liters).toLocaleString()}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={`-${sim.reduction_percentage}%`} size="small" color="error" />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{sim.major_affected_field || 'N/A'}</TableCell>
                        <TableCell>{sim.summary}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}

      </Container>
    </DashboardLayout>
  );
};

export default DecisionIntelligence;
